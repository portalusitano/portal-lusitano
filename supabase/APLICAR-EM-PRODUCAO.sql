-- =============================================================================
--  Portal Lusitano — tudo o que falta aplicar em producao, por ordem
-- =============================================================================
--
--  Cole este ficheiro inteiro no editor de SQL do Supabase e corra uma vez.
--
--  Corre dentro de UMA transaccao: se alguma parte falhar, nada fica aplicado
--  e a base fica exactamente como estava.
--
--  E seguro correr mais do que uma vez. Nenhuma apaga tabelas, colunas ou
--  linhas.
--
--  Sao dezoito: as dezassete migracoes novas, mais o
--  `004_user_auth_tools.sql`, que cria a `user_profiles` e que esta base nunca
--  chegou a correr — foi isso que fez a primeira tentativa parar na 16.ª.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 004_user_auth_tools.sql
-- ─────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────
-- Tornada idempotente em 2026-10-14.
--
-- As nove políticas eram `CREATE POLICY` sem o `DROP POLICY IF EXISTS` à
-- frente, e as tabelas e índices já eram `IF NOT EXISTS`. Resultado: esta
-- migração corria bem à primeira e rebentava com nove erros à segunda, o que
-- contraria a regra desta casa — migrações têm de ser idempotentes.
--
-- Apanhado ao aplicar em produção: a base de produção nunca tinha corrido esta
-- migração (a `user_profiles` não existia), e a migração do perfil com
-- fotografia parou a transacção inteira a dizê-lo. Para a poder pôr à frente
-- das outras no mesmo ficheiro, tinha de poder correr duas vezes.
-- ─────────────────────────────────────────────────────────────────────────

-- ============================================
-- Portal Lusitano: User Auth & Tools Tables
-- ============================================

-- Perfis de utilizador (extensao de auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT,
  tools_subscription_status TEXT DEFAULT 'free', -- 'free', 'active', 'cancelled'
  tools_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rastreio de uso das ferramentas (1 uso gratis)
CREATE TABLE IF NOT EXISTS public.tool_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL CHECK (tool_name IN ('calculadora', 'comparador', 'compatibilidade', 'perfil')),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  result_data JSONB,
  form_data JSONB
);

-- Resultados guardados (premium)
CREATE TABLE IF NOT EXISTS public.saved_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL CHECK (tool_name IN ('calculadora', 'comparador', 'compatibilidade', 'perfil')),
  title TEXT NOT NULL,
  form_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  share_id TEXT UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_tool_usage_user ON public.tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool ON public.tool_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_saved_results_user ON public.saved_results(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_results_share ON public.saved_results(share_id);

-- RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_results ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can read/insert their own tool usage
DROP POLICY IF EXISTS "Users can view own usage" ON public.tool_usage;
CREATE POLICY "Users can view own usage" ON public.tool_usage
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own usage" ON public.tool_usage;
CREATE POLICY "Users can insert own usage" ON public.tool_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their own saved results
DROP POLICY IF EXISTS "Users can view own results" ON public.saved_results;
CREATE POLICY "Users can view own results" ON public.saved_results
  FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);
DROP POLICY IF EXISTS "Users can insert own results" ON public.saved_results;
CREATE POLICY "Users can insert own results" ON public.saved_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own results" ON public.saved_results;
CREATE POLICY "Users can update own results" ON public.saved_results
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own results" ON public.saved_results;
CREATE POLICY "Users can delete own results" ON public.saved_results
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile on user signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────
-- 20260829000001_cavalos_venda_user_id.sql
-- ─────────────────────────────────────────────────────────────────────
-- Migration: Ligar anúncios do marketplace ao utilizador autenticado
-- Data: 2026-08-29
--
-- Até aqui um anúncio em cavalos_venda só era identificável pelo vendedor_email
-- preenchido a partir do checkout Stripe. Sem uma ligação ao auth.users não é
-- possível o vendedor gerir os próprios anúncios ("Os meus anúncios"), porque
-- o email do Stripe pode divergir do email da conta e não é uma chave fiável.
--
-- Esta migração adiciona a ligação, faz o backfill dos anúncios existentes por
-- correspondência de email e abre as políticas RLS mínimas para o dono ler e
-- editar o que é seu.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
-- Nenhuma migração cria cavalos_venda: a tabela só é definida no script solto
-- supabase/NOVAS-FUNCIONALIDADES.sql. Sem esta verificação, aplicar a migração
-- a uma base de dados sem essa tabela rebenta com um "42P01: relation
-- cavalos_venda does not exist", que não diz a ninguém o que fazer a seguir.
DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.cavalos_venda nao existe nesta base de dados. Corra primeiro supabase/cavalos-venda-bootstrap.sql (idempotente, sem dados de exemplo) e volte a aplicar esta migracao. Nao corra NOVAS-FUNCIONALIDADES.sql numa base de dados ja povoada: os INSERT desse ficheiro nao tem ON CONFLICT e duplicam os dados.';
  END IF;
END $$;

-- =============================================================================
-- 1. Coluna de ligação ao utilizador
-- =============================================================================
-- ON DELETE SET NULL: apagar a conta não deve apagar o anúncio pago nem partir
-- os registos de pagamento que lhe apontam.
ALTER TABLE cavalos_venda
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Marcas temporais das transições que o vendedor controla
ALTER TABLE cavalos_venda
  ADD COLUMN IF NOT EXISTS vendido_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removido_at TIMESTAMPTZ;

-- =============================================================================
-- 2. Índices
-- =============================================================================
-- Suporta a query principal de "Os meus anúncios": WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_cavalos_venda_user_id
  ON cavalos_venda (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Suporta a reclamação por email dos anúncios que ainda não têm dono. Índice
-- parcial: cobre exactamente as linhas que essa query percorre e encolhe à
-- medida que os anúncios vão sendo reclamados.
CREATE INDEX IF NOT EXISTS idx_cavalos_venda_por_reclamar
  ON cavalos_venda (vendedor_email)
  WHERE user_id IS NULL AND vendedor_email IS NOT NULL;

-- =============================================================================
-- 3. Backfill dos anúncios existentes
-- =============================================================================
-- Liga cada anúncio à conta cujo email coincide (case-insensitive, sem espaços).
-- Anúncios cujo vendedor nunca criou conta ficam com user_id NULL e continuam a
-- ser reclamáveis mais tarde pela aplicação quando esse email autenticar.
UPDATE cavalos_venda cv
SET user_id = u.id
FROM auth.users u
WHERE cv.user_id IS NULL
  AND cv.vendedor_email IS NOT NULL
  AND lower(trim(cv.vendedor_email)) = lower(trim(u.email));

-- =============================================================================
-- 4. Políticas RLS para o dono do anúncio
-- =============================================================================
-- As políticas existentes (cavalos_venda_select_active + service_role) mantêm-se.
-- As políticas são combinadas com OR, por isso isto acrescenta acesso ao dono
-- sem alterar o que o público vê.

-- O dono vê os próprios anúncios em qualquer estado (pending, vendido, expirado…)
DROP POLICY IF EXISTS "cavalos_venda_select_own" ON cavalos_venda;
CREATE POLICY "cavalos_venda_select_own"
  ON cavalos_venda FOR SELECT
  USING (auth.uid() = user_id);

-- O dono edita os próprios anúncios e não pode transferi-los para outra conta
DROP POLICY IF EXISTS "cavalos_venda_update_own" ON cavalos_venda;
CREATE POLICY "cavalos_venda_update_own"
  ON cavalos_venda FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nota: não há política de INSERT nem de DELETE para o dono. A criação continua
-- a passar pelo webhook Stripe (service role) para o anúncio não poder ser criado
-- sem pagamento, e a remoção é lógica (status = 'removido') via UPDATE.


-- ─────────────────────────────────────────────────────────────────────
-- 20260829000002_marketplace_chat.sql
-- ─────────────────────────────────────────────────────────────────────
-- Migration: Mensagens entre comprador e vendedor no marketplace
-- Data: 2026-08-29
--
-- Até aqui, contactar um vendedor obrigava a expor publicamente o telemóvel, o
-- WhatsApp e o email dele na página do anúncio. Isso é um convite ao scraping e
-- tira o negócio do site logo no primeiro contacto.
--
-- Estas duas tabelas guardam a conversa dentro da plataforma. Os contactos
-- directos continuam a existir como alternativa, mas deixam de ser o único
-- caminho.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
-- A conversa aponta para o anúncio e usa cavalos_venda.user_id para saber quem
-- é o vendedor, por isso a migração 20260829000001 tem de estar aplicada.
DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.cavalos_venda nao existe. Corra supabase/cavalos-venda-bootstrap.sql e a migracao 20260829000001 antes desta.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cavalos_venda' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION
      'A coluna cavalos_venda.user_id nao existe. Aplique primeiro a migracao 20260829000001_cavalos_venda_user_id.sql.';
  END IF;
END $$;

-- =============================================================================
-- 1. Conversas
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketplace_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ON DELETE CASCADE: removido o anúncio, a conversa deixa de ter contexto.
  cavalo_id UUID NOT NULL REFERENCES cavalos_venda(id) ON DELETE CASCADE,

  comprador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Nome do comprador no momento do primeiro contacto. Guardado aqui para a
  -- caixa de entrada do vendedor não ter de ler auth.users a cada carregamento
  -- (uma leitura por conversa). O lado do vendedor sai de cavalos_venda.
  comprador_nome TEXT,

  -- Desnormalizado a partir da última mensagem, para ordenar a caixa de entrada
  -- sem ter de agregar a tabela de mensagens a cada leitura.
  ultima_mensagem_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Arquivar é por pessoa: esconder a conversa de um lado não a esconde do outro.
  arquivada_comprador BOOLEAN NOT NULL DEFAULT false,
  arquivada_vendedor BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma única conversa por comprador e anúncio: voltar a contactar continua o
  -- mesmo fio em vez de criar um novo.
  CONSTRAINT marketplace_conversas_unica UNIQUE (cavalo_id, comprador_id),

  -- Ninguém conversa consigo próprio (o dono a ver o próprio anúncio).
  CONSTRAINT marketplace_conversas_partes_distintas CHECK (comprador_id <> vendedor_id)
);

-- Caixa de entrada de cada lado, já ordenada
CREATE INDEX IF NOT EXISTS idx_conversas_vendedor
  ON marketplace_conversas (vendedor_id, ultima_mensagem_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_comprador
  ON marketplace_conversas (comprador_id, ultima_mensagem_at DESC);

-- Conversas de um anúncio (usado ao mostrar o interesse gerado)
CREATE INDEX IF NOT EXISTS idx_conversas_cavalo
  ON marketplace_conversas (cavalo_id);

-- =============================================================================
-- 2. Mensagens
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketplace_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES marketplace_conversas(id) ON DELETE CASCADE,
  remetente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Limite imposto também na base de dados: a API valida, mas a API não é o
  -- único caminho até aqui.
  corpo TEXT NOT NULL CHECK (char_length(trim(corpo)) BETWEEN 1 AND 4000),

  -- Nulo enquanto o destinatário não abrir a conversa.
  lida_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leitura de um fio por ordem cronológica
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa
  ON marketplace_mensagens (conversa_id, created_at ASC);

-- Contagem de não lidas por conversa
CREATE INDEX IF NOT EXISTS idx_mensagens_por_ler
  ON marketplace_mensagens (conversa_id, remetente_id)
  WHERE lida_at IS NULL;

-- =============================================================================
-- 3. RLS
-- =============================================================================
-- As rotas da API usam a service role e filtram por participante em cada query.
-- Estas políticas são a segunda linha: se alguma leitura passar pela chave
-- anónima, continua a ser impossível ler a conversa de outra pessoa.
ALTER TABLE marketplace_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversas_select_participante" ON marketplace_conversas;
CREATE POLICY "conversas_select_participante"
  ON marketplace_conversas FOR SELECT
  USING (auth.uid() = comprador_id OR auth.uid() = vendedor_id);

DROP POLICY IF EXISTS "conversas_update_participante" ON marketplace_conversas;
CREATE POLICY "conversas_update_participante"
  ON marketplace_conversas FOR UPDATE
  USING (auth.uid() = comprador_id OR auth.uid() = vendedor_id)
  WITH CHECK (auth.uid() = comprador_id OR auth.uid() = vendedor_id);

DROP POLICY IF EXISTS "conversas_service_role" ON marketplace_conversas;
CREATE POLICY "conversas_service_role"
  ON marketplace_conversas
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "mensagens_select_participante" ON marketplace_mensagens;
CREATE POLICY "mensagens_select_participante"
  ON marketplace_mensagens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketplace_conversas c
    WHERE c.id = marketplace_mensagens.conversa_id
      AND (auth.uid() = c.comprador_id OR auth.uid() = c.vendedor_id)
  ));

-- Só se pode escrever em nome próprio e dentro de uma conversa de que se faz parte
DROP POLICY IF EXISTS "mensagens_insert_participante" ON marketplace_mensagens;
CREATE POLICY "mensagens_insert_participante"
  ON marketplace_mensagens FOR INSERT
  WITH CHECK (
    auth.uid() = remetente_id
    AND EXISTS (
      SELECT 1 FROM marketplace_conversas c
      WHERE c.id = marketplace_mensagens.conversa_id
        AND (auth.uid() = c.comprador_id OR auth.uid() = c.vendedor_id)
    )
  );

DROP POLICY IF EXISTS "mensagens_service_role" ON marketplace_mensagens;
CREATE POLICY "mensagens_service_role"
  ON marketplace_mensagens
  USING (auth.role() = 'service_role');

-- Nota: não há política de DELETE. Apagar uma mensagem já entregue reescreveria
-- o histórico da outra pessoa; esconder a conversa faz-se com arquivada_*.


-- ─────────────────────────────────────────────────────────────────────
-- 20260829000003_visualizacoes_denuncias.sql
-- ─────────────────────────────────────────────────────────────────────
-- Migration: Visualizações fiáveis e denúncia de anúncios
-- Data: 2026-08-29
--
-- Duas lacunas do marketplace:
--
-- 1. cavalos_venda.views_count existe desde 20260206000001 mas nunca é
--    incrementado para cavalos (só os eventos o fazem). O vendedor paga o
--    anúncio e o único indicador de retorno que recebe está sempre a zero.
--
-- 2. Não há forma de denunciar um anúncio. Num classificados aberto ao público
--    isso é o mínimo de segurança: fraudes, cavalos já vendidos que continuam
--    publicados, dados falsos.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.cavalos_venda nao existe. Corra supabase/cavalos-venda-bootstrap.sql antes desta migracao.';
  END IF;
END $$;

-- =============================================================================
-- 1. Visualizações
-- =============================================================================
-- Uma linha por visitante e por dia. Sem esta desduplicação, o contador conta
-- refrescamentos e o vendedor recebe um número inflacionado, que é pior do que
-- não ter número nenhum.
--
-- visitante_hash é um resumo do IP com o agente do utilizador e um sal diário,
-- calculado na aplicação. O IP em bruto nunca chega aqui, e o sal diário impede
-- que o mesmo visitante seja seguido de um dia para o outro.
CREATE TABLE IF NOT EXISTS cavalos_venda_visualizacoes (
  cavalo_id UUID NOT NULL REFERENCES cavalos_venda(id) ON DELETE CASCADE,
  visitante_hash TEXT NOT NULL,
  dia DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cavalo_id, visitante_hash, dia)
);

-- Suporta a limpeza periódica das linhas antigas: o histórico diário só serve
-- para desduplicar, o total acumulado vive em cavalos_venda.views_count.
CREATE INDEX IF NOT EXISTS idx_visualizacoes_dia
  ON cavalos_venda_visualizacoes (dia);

-- Regista a visualização e devolve true apenas quando ela foi realmente contada.
--
-- O incremento fica dentro da mesma função e só corre quando o INSERT resultou
-- numa linha nova, o que torna o contador imune a duas visualizações em paralelo
-- (o padrão ler-somar-gravar usado nos eventos perde incrementos).
CREATE OR REPLACE FUNCTION registar_visualizacao_cavalo(
  p_cavalo_id UUID,
  p_visitante_hash TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nova BOOLEAN := false;
BEGIN
  INSERT INTO cavalos_venda_visualizacoes (cavalo_id, visitante_hash)
  VALUES (p_cavalo_id, p_visitante_hash)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_nova = ROW_COUNT;

  IF v_nova THEN
    UPDATE cavalos_venda
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_cavalo_id;
  END IF;

  RETURN v_nova;
END;
$$;

ALTER TABLE cavalos_venda_visualizacoes ENABLE ROW LEVEL SECURITY;

-- Sem política de leitura pública: quem visitou o quê não é do domínio de
-- ninguém a não ser da própria plataforma. O vendedor vê o total, não a lista.
DROP POLICY IF EXISTS "visualizacoes_service_role" ON cavalos_venda_visualizacoes;
CREATE POLICY "visualizacoes_service_role"
  ON cavalos_venda_visualizacoes
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 2. Denúncias
-- =============================================================================
CREATE TABLE IF NOT EXISTS cavalos_venda_denuncias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cavalo_id UUID NOT NULL REFERENCES cavalos_venda(id) ON DELETE CASCADE,

  -- ON DELETE SET NULL: apagar a conta não deve apagar a denúncia, que a equipa
  -- pode ainda estar a analisar.
  denunciante_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  motivo TEXT NOT NULL CHECK (motivo IN (
    'fraude',
    'ja_vendido',
    'dados_falsos',
    'conteudo_improprio',
    'duplicado',
    'outro'
  )),
  detalhe TEXT CHECK (detalhe IS NULL OR char_length(detalhe) <= 2000),

  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_analise', 'procedente', 'improcedente')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvida_at TIMESTAMPTZ,
  resolvida_por TEXT,
  nota_interna TEXT,

  -- Uma denúncia por pessoa e anúncio: quem já denunciou não inflaciona a fila
  -- de moderação repetindo o mesmo. Denúncias anónimas (denunciante_id nulo)
  -- não são abrangidas, porque NULL nunca colide num índice único.
  CONSTRAINT cavalos_venda_denuncias_unica UNIQUE (cavalo_id, denunciante_id)
);

-- Fila de moderação: pendentes primeiro, mais antigas no topo
CREATE INDEX IF NOT EXISTS idx_denuncias_pendentes
  ON cavalos_venda_denuncias (created_at ASC)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_denuncias_cavalo
  ON cavalos_venda_denuncias (cavalo_id);

ALTER TABLE cavalos_venda_denuncias ENABLE ROW LEVEL SECURITY;

-- Quem denuncia pode ver o que denunciou; ninguém mais. O anunciante não deve
-- conseguir descobrir quem o denunciou.
DROP POLICY IF EXISTS "denuncias_select_propria" ON cavalos_venda_denuncias;
CREATE POLICY "denuncias_select_propria"
  ON cavalos_venda_denuncias FOR SELECT
  USING (auth.uid() = denunciante_id);

DROP POLICY IF EXISTS "denuncias_service_role" ON cavalos_venda_denuncias;
CREATE POLICY "denuncias_service_role"
  ON cavalos_venda_denuncias
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────────────
-- 20260829000004_alertas_pesquisa.sql
-- ─────────────────────────────────────────────────────────────────────
-- Migration: Alertas de pesquisa no marketplace
-- Data: 2026-08-29
--
-- Quem procura um Lusitano com critérios concretos — égua, Ribatejo, até 20 mil,
-- iniciada em dressage — raramente encontra à primeira. Sem alertas, essa pessoa
-- tem de voltar ao site de sua iniciativa, e a maioria não volta.
--
-- Cada alerta guarda os critérios de uma pesquisa e a data a partir da qual
-- interessa avisar. O cron compara com os anúncios publicados desde então.

DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.cavalos_venda nao existe. Corra supabase/cavalos-venda-bootstrap.sql antes desta migracao.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketplace_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rótulo dado pela pessoa. Sem ele, a lista de alertas fica ilegível assim que
  -- houver mais do que um.
  nome TEXT,

  -- Critérios. Todos opcionais: um alerta sem critérios avisa de tudo o que é
  -- publicado, que é um caso de uso legítimo num nicho pequeno como este.
  sexo TEXT,
  regiao TEXT,
  preco_min NUMERIC,
  preco_max NUMERIC,
  idade_min INTEGER,
  idade_max INTEGER,
  disciplina TEXT,
  nivel TEXT,
  termo TEXT,

  frequencia TEXT NOT NULL DEFAULT 'diaria'
    CHECK (frequencia IN ('diaria', 'semanal')),

  ativo BOOLEAN NOT NULL DEFAULT true,

  -- Fronteira do que já foi comunicado. Começa na criação para o primeiro aviso
  -- não despejar o catálogo inteiro na caixa de correio de quem acabou de criar
  -- o alerta.
  desde TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_envio_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um intervalo invertido não devolveria nada e a pessoa ficaria à espera de um
  -- email que nunca chega, sem perceber porquê.
  CONSTRAINT alertas_preco_coerente CHECK (
    preco_min IS NULL OR preco_max IS NULL OR preco_min <= preco_max
  ),
  CONSTRAINT alertas_idade_coerente CHECK (
    idade_min IS NULL OR idade_max IS NULL OR idade_min <= idade_max
  )
);

-- Lista de alertas de uma pessoa
CREATE INDEX IF NOT EXISTS idx_alertas_user
  ON marketplace_alertas (user_id, created_at DESC);

-- Fila do cron: só os activos interessam, ordenados pelo que está há mais tempo
-- sem envio (NULLS FIRST põe os que nunca foram enviados à cabeça).
CREATE INDEX IF NOT EXISTS idx_alertas_por_enviar
  ON marketplace_alertas (ultimo_envio_at ASC NULLS FIRST)
  WHERE ativo;

ALTER TABLE marketplace_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alertas_select_proprio" ON marketplace_alertas;
CREATE POLICY "alertas_select_proprio"
  ON marketplace_alertas FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertas_update_proprio" ON marketplace_alertas;
CREATE POLICY "alertas_update_proprio"
  ON marketplace_alertas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertas_delete_proprio" ON marketplace_alertas;
CREATE POLICY "alertas_delete_proprio"
  ON marketplace_alertas FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertas_service_role" ON marketplace_alertas;
CREATE POLICY "alertas_service_role"
  ON marketplace_alertas
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────────────
-- 20260829000005_aviso_expiracao.sql
-- ─────────────────────────────────────────────────────────────────────
-- Aviso de fim de anúncio
--
-- O anúncio é pago e tem prazo, mas até aqui o vendedor não era avisado de
-- nada: o anúncio deixava de aparecer e ele só descobria por acaso. Estas
-- colunas guardam qual foi o último aviso enviado para cada anúncio, para o
-- cron diário poder avisar a 7 dias, a 1 dia e no proprio dia sem repetir o
-- mesmo aviso todas as manhas.
--
-- Idempotente: pode correr as vezes que forem precisas.

DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.cavalos_venda nao existe. Corra primeiro supabase/cavalos-venda-bootstrap.sql.';
  END IF;
END $$;

-- Limiar (em dias) do ultimo aviso enviado: 7, 1 ou 0. NULL = ainda sem aviso.
ALTER TABLE public.cavalos_venda
  ADD COLUMN IF NOT EXISTS aviso_expiracao_dias SMALLINT;

-- Prazo a que esse aviso dizia respeito. E o que permite reconhecer uma
-- renovacao: se o listing_expires_at ja nao e este, o ciclo de avisos
-- recomeca do zero sem ninguem ter de limpar nada a mao.
ALTER TABLE public.cavalos_venda
  ADD COLUMN IF NOT EXISTS aviso_expiracao_prazo TIMESTAMPTZ;

ALTER TABLE public.cavalos_venda
  ADD COLUMN IF NOT EXISTS aviso_expiracao_at TIMESTAMPTZ;

-- So os anuncios publicos com prazo entram na varredura diaria; os restantes
-- nao teem nada a expirar e nao vale a pena percorre-los.
CREATE INDEX IF NOT EXISTS idx_cavalos_venda_expiracao
  ON public.cavalos_venda (listing_expires_at)
  WHERE listing_expires_at IS NOT NULL
    AND status IN ('active', 'reservado');

COMMENT ON COLUMN public.cavalos_venda.aviso_expiracao_dias IS
  'Limiar do ultimo aviso de expiracao enviado (7, 1 ou 0). NULL = nenhum aviso enviado.';
COMMENT ON COLUMN public.cavalos_venda.aviso_expiracao_prazo IS
  'listing_expires_at a que o ultimo aviso dizia respeito; um prazo diferente reinicia o ciclo de avisos.';
COMMENT ON COLUMN public.cavalos_venda.aviso_expiracao_at IS
  'Momento em que o ultimo aviso de expiracao foi enviado ao vendedor.';


-- ─────────────────────────────────────────────────────────────────────
-- 20260902000001_coudelarias_distrito_codigo_postal.sql
-- ─────────────────────────────────────────────────────────────────────
-- Preenche `distrito` e `codigo_postal` nas coudelarias.
--
-- Contexto: `docs/auditoria-coudelarias.md`. Das trinta e cinco linhas, as
-- trinta e cinco tinham `distrito` a NULL e as trinta e cinco tinham
-- `codigo_postal` a NULL — duas colunas inteiras por preencher.
--
-- Esta migração é deliberadamente a mais aborrecida que se conseguiu escrever.
-- A auditoria encontrou quarenta e nove afirmações contraditas e cento e
-- vinte e duas por confirmar, e **nada disso se toca aqui**. Um campo vazio é
-- honesto; um campo com um facto plausível e falso é o defeito que se foi
-- caçar. Por isso só entra o que é dedução ou mudança de sítio:
--
--   1. **O distrito sai do concelho.** Que Alpiarça é do distrito de Santarém
--      e Vila Viçosa do de Évora não é um facto sobre a coudelaria — é a
--      divisão administrativa do país. Deduz-se da morada que a linha já tem,
--      e não se acrescenta informação nova nenhuma.
--
--   2. **O código postal já lá estava, no campo errado.** Oito linhas
--      guardam-no dentro de `localizacao` — «Herdade da Agolada de Baixo,
--      2100-047 Coruche» — enquanto a coluna própria está vazia. Aqui só se
--      move o que está escrito, com a expressão regular a fazer a leitura: se
--      não houver um `NNNN-NNN` na morada, não se inventa um.
--
-- O que **não** entra, e porquê:
--
--   - O `dressage-plus` fica sem distrito. A `localizacao` dele é «Portugal»,
--     que é o nome de um país e não de uma localidade. Não há concelho de onde
--     deduzir, e escolher um seria exactamente a invenção que se anda a caçar.
--   - As coordenadas ficam como estão. Nove são o centro de uma povoação e
--     seis discordam da segunda coluna da mesma linha, mas corrigir uma
--     coordenada exige saber onde a coudelaria fica — e isso pergunta-se à
--     casa, não se deduz.
--   - O telefone `+351 243 558 XXX` do `joao-pedro-rodrigues` fica. Apagá-lo
--     seria defensável (não é um número), mas é uma decisão de quem manda no
--     conteúdo, não de uma migração. Fica no relatório, para o dono decidir.
--
-- Idempotente por construção: cria a coluna se faltar, e as duas escritas
-- levam `IS NULL` na condição, pelo que correr isto duas vezes não muda nada
-- na segunda. Também não escreve por cima de nada que alguém tenha corrigido
-- entretanto — quem preencheu à mão ganha sempre a esta migração.

BEGIN;

ALTER TABLE public.coudelarias ADD COLUMN IF NOT EXISTS distrito text;
ALTER TABLE public.coudelarias ADD COLUMN IF NOT EXISTS codigo_postal text;

-- 1. Distrito, deduzido do concelho que a morada nomeia.
--
-- Um por linha, com o concelho escrito ao lado para se poder conferir sem sair
-- do ficheiro. A freguesia vem antes do concelho quando a morada a dá.
UPDATE public.coudelarias AS c
SET distrito = m.distrito
FROM (
  VALUES
    -- slug                          distrito       -- concelho (freguesia)
    ('casa-cadaval',                 'Santarém'),   -- Salvaterra de Magos (Muge)
    ('cavalos-na-areia',             'Setúbal'),    -- Alcácer do Sal (Comporta)
    ('coudelaria-andrade',           'Santarém'),   -- Coruche
    ('companhia-das-lezirias',       'Santarém'),   -- Benavente (Samora Correia)
    ('alter-real',                   'Portalegre'), -- Alter do Chão
    ('santa-margarida',              'Beja'),       -- Ferreira do Alentejo
    ('ferraz-da-costa',              'Beja'),       -- Serpa (Vila Verde de Ficalho)
    ('flor-do-lis',                  'Leiria'),     -- Leiria (Monte Real / Carvide)
    ('henrique-abecasis',            'Lisboa'),     -- Azambuja (Aveiras de Baixo)
    ('herdade-do-azinhal',           'Portalegre'), -- Portalegre (Urra)
    ('joao-lynce',                   'Santarém'),   -- Santarém
    ('joao-pedro-rodrigues',         'Santarém'),   -- Alpiarça
    ('luis-bastos',                  'Santarém'),   -- Cartaxo (Porto de Muge)
    ('luis-folgado',                 'Évora'),      -- Montemor-o-Novo
    ('coudelaria-manuel-veiga',      'Santarém'),   -- Golegã (Azinhaga)
    ('mascarenhas-cardoso',          'Faro'),       -- Albufeira
    ('ortigao-costa',                'Lisboa'),     -- Azambuja
    ('pedro-passanha',               'Beja'),       -- Ferreira do Alentejo
    ('quinta-da-hermida',            'Évora'),      -- Vendas Novas
    ('quinta-dos-cedros',            'Lisboa'),     -- Sintra (Almargem do Bispo)
    ('coudelaria-sa',                'Santarém'),   -- Coruche (Agolada de Baixo)
    ('torres-vaz-freire',            'Portalegre'), -- Alter do Chão (Chança)
    ('veiga-teixeira',               'Santarém'),   -- Coruche
    ('vila-vicosa',                  'Évora'),      -- Vila Viçosa
    ('fundacao-eugenio-almeida',     'Évora'),      -- Évora
    ('malhadinha-nova',              'Beja'),       -- Beja (Albernoa)
    ('herdade-do-pinheiro',          'Setúbal'),    -- Alcácer do Sal
    ('jupiter-classical-dressage',   'Évora'),      -- Vila Viçosa
    ('lusitanos-datela',             'Santarém'),   -- Alpiarça (Casalinho)
    ('monte-velho',                  'Évora'),      -- Arraiolos (Santana do Campo)
    ('morgado-lusitano',             'Lisboa'),     -- Vila Franca de Xira (Alverca)
    ('lago-alva',                    'Santarém'),   -- Alpiarça
    ('quinta-lusitania',             'Viseu'),      -- Santa Comba Dão (Couto do Mosteiro)
    ('quinta-madre-de-agua',         'Guarda')      -- Gouveia (Vinhó)
    -- O `dressage-plus` não está aqui de propósito: `localizacao` = «Portugal».
) AS m(slug, distrito)
WHERE c.slug = m.slug
  AND c.distrito IS NULL;

-- 2. Código postal, retirado de dentro da morada.
--
-- Não há aqui lista nenhuma: quem decide é a expressão regular a ler o campo
-- `localizacao`. Se a morada não tiver um `NNNN-NNN`, a linha não é tocada.
UPDATE public.coudelarias
SET codigo_postal = substring(localizacao FROM '\d{4}-\d{3}')
WHERE codigo_postal IS NULL
  AND localizacao ~ '\d{4}-\d{3}';

COMMIT;


-- ─────────────────────────────────────────────────────────────────────
-- 20260902000002_cavalos_venda_campos_do_formulario.sql
-- ─────────────────────────────────────────────────────────────────────
-- Dá destino aos campos que o formulário de publicar anúncio pede e deita fora.
--
-- Contexto medido, em `docs/campos-do-anuncio.md`: o formulário tem 99 campos,
-- o pedido de checkout envia 103 chaves, o webhook escreve 29 colunas, e das 99
-- respostas do vendedor **só 19 chegam a uma coluna**. As outras 80 viajam do
-- browser até ao servidor, ficam guardadas em `contact_submissions.form_data`
-- (que é a tabela do administrador, não a do anúncio) e nunca mais são lidas
-- por ninguém.
--
-- O dono do site quer que nada seja opcional. O pré-requisito de «nada
-- opcional» é os campos terem onde aterrar: exigir oitenta respostas para as
-- deitar ao lixo é pedir trabalho a troco de nada.
--
-- ─── Como se decidiu o destino de cada campo ─────────────────────────────────
--
-- 1. **Coluna própria** quando o valor tem de ser alcançável por um `WHERE` ou
--    um `ORDER BY` do PostgREST — ou porque já é filtro hoje, ou porque é da
--    mesma classe dos que já são coluna (`sexo`, `idade`, `altura`, `preco`,
--    `regiao`, `nivel_treino`, `disciplinas`). O peso é da classe da altura; a
--    raça é da classe da pelagem; `uso_atual` é da classe de `disciplinas`.
--
-- 2. **`jsonb` agrupado** quando o bloco se lê inteiro na ficha e nenhum campo
--    isolado é chave de pesquisa. São seis blocos e cobrem 45 dos 80 campos.
--    Um `jsonb` continua a ser filtrável (`comportamento->>'apto_criancas'`),
--    por isso agrupar não fecha nenhuma porta — só evita 45 colunas que
--    ninguém consulta uma a uma.
--
-- 3. **Tabela à parte** para a ascendência. Oito colunas de avós resolvem duas
--    gerações e mais nenhuma; um caminho (`pai.mae`) resolve as que vierem sem
--    outra migração. E é uma árvore: o mesmo desenho serve o bisavô.
--
-- 4. **Não guardar** o que não serve o anúncio nem a moderação. São três, e a
--    razão é a mesma para os três: `cavalos_venda` é lida por **qualquer**
--    pessoa quando `status = 'active'` — a política `cavalos_venda_select_active`
--    não tem papel nenhum atribuído, e o RLS do Postgres é por linha, não por
--    coluna. Tudo o que aqui entrar fica publicado. O NIF e a morada do
--    vendedor são dados fiscais e ficam onde já estão, em
--    `contact_submissions`, cujas duas únicas políticas exigem `service_role`.
--    O nome do veterinário é o nome de um terceiro que nunca consentiu em ser
--    publicado num classificados.
--
-- ─── Duas escolhas de tipo que se explicam ───────────────────────────────────
--
-- **Todas as colunas de texto novas são `text` e não `varchar(n)`.** No
-- Postgres os dois têm o mesmo desempenho, e o limite não compra nada: compra
-- um `22001 value too long` no `insert` do webhook, que corre **depois de o
-- dinheiro entrar**. Um anúncio pago que não se publica porque o nome de
-- registo tinha 260 caracteres é o pior desfecho possível desta tabela.
--
-- **`peso_kg` é `numeric` sem precisão e `anos_treino` é `integer`.** Pela
-- mesma razão: um `numeric(4,1)` rebenta com 22003 em 1500 kg e um `smallint`
-- rebenta com 22003 em 99999 anos. O sítio de recusar um peso absurdo é a
-- validação do formulário e a moderação — não é uma excepção do Postgres a
-- meio de um webhook de pagamento.
--
-- ─── Índices, e porque não há nenhum aqui ────────────────────────────────────
--
-- Não se acrescenta um índice GIN por cada `jsonb` nem um btree por cada
-- coluna nova. A tabela tem hoje **zero linhas** e viverá em centenas: um
-- varrimento sequencial ganha a um índice a esta escala, e seis GIN por
-- consultas que ninguém escreveu ainda é custo de escrita a troco de uma
-- hipótese. A única excepção considerada — um `UNIQUE` em `microchip`, para
-- apanhar o mesmo cavalo anunciado duas vezes — foi rejeitada: um cavalo
-- revendido anos depois é um anúncio legítimo com o mesmo microchip, e a
-- restrição recusá-lo-ia no `insert` do webhook, outra vez depois de o
-- dinheiro entrar. Duplicados são trabalho de moderação, não de restrição.
--
-- Idempotente de propósito: corre inteira as vezes que forem precisas.

-- ─── Colunas próprias ────────────────────────────────────────────────────────

ALTER TABLE public.cavalos_venda
  -- Identificação. `raca` não é só um campo que faltava: `app/api/cavalos`
  -- **já a pede** no `.select(...)` e a base não a tem, o que devolve 42703 e
  -- deixa a listagem vazia. Os tipos gerados em `lib/database.types.ts` ainda
  -- a declaram, e é por isso que o teste `colunas-supabase` não deu por nada.
  ADD COLUMN IF NOT EXISTS raca text,
  ADD COLUMN IF NOT EXISTS nome_registo text,
  ADD COLUMN IF NOT EXISTS microchip text,
  ADD COLUMN IF NOT EXISTS passaporte_equino text,
  ADD COLUMN IF NOT EXISTS pais_nascimento text,
  ADD COLUMN IF NOT EXISTS peso_kg numeric,
  ADD COLUMN IF NOT EXISTS nivel_apsl text,
  ADD COLUMN IF NOT EXISTS prova_aptidao_apsl boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS temperamento text,
  ADD COLUMN IF NOT EXISTS coudelaria_origem text,
  -- Treino. `anos_treino` e `nivel_cavaleiro` são da classe de `nivel_treino`,
  -- que já é coluna; `uso_atual` é da classe de `disciplinas`, que já é `text[]`.
  ADD COLUMN IF NOT EXISTS anos_treino integer,
  ADD COLUMN IF NOT EXISTS nivel_cavaleiro text,
  ADD COLUMN IF NOT EXISTS uso_atual text[],
  -- Vendedor. `vendedor_tipo` distingue particular de profissional e de
  -- coudelaria, que é a primeira coisa que um comprador quer saber e a
  -- primeira que a moderação verifica.
  ADD COLUMN IF NOT EXISTS vendedor_tipo text,
  ADD COLUMN IF NOT EXISTS vendedor_pais text,
  ADD COLUMN IF NOT EXISTS vendedor_website text,
  -- O formulário pede dois vídeos. `video_url` já existe e já é contrato com a
  -- área do vendedor (`SELLER_EDITABLE_FIELDS`) e com `lib/marketplace-listings`;
  -- transformá-la em `text[]` era migrar um contrato vivo por causa de um
  -- segundo valor. O formulário pede dois, não pede N.
  ADD COLUMN IF NOT EXISTS video_url_2 text;

-- ─── Blocos `jsonb` ──────────────────────────────────────────────────────────
--
-- Sem `DEFAULT '{}'`: um objecto vazio afirma «o vendedor não respondeu a
-- nada» e um `NULL` afirma «não há bloco». São coisas diferentes, e a ficha
-- lê-as de maneira diferente — a regra de `lib/coudelaria-ficha.ts` de não
-- afirmar o que os dados não provam vale aqui do mesmo modo.

ALTER TABLE public.cavalos_venda
  ADD COLUMN IF NOT EXISTS morfologia jsonb,
  ADD COLUMN IF NOT EXISTS treino jsonb,
  ADD COLUMN IF NOT EXISTS comportamento jsonb,
  ADD COLUMN IF NOT EXISTS maneio jsonb,
  ADD COLUMN IF NOT EXISTS saude jsonb,
  ADD COLUMN IF NOT EXISTS condicoes_venda jsonb;

COMMENT ON COLUMN public.cavalos_venda.morfologia IS
  'cor_olhos, cor_crina, cor_casco, marcas_distintivas. Lê-se inteiro na ficha.';
COMMENT ON COLUMN public.cavalos_venda.treino IS
  'treinador_atual, ginete_habitual, competicoes. O nível e os anos são colunas.';
COMMENT ON COLUMN public.cavalos_venda.comportamento IS
  'Os oito booleanos de maneabilidade: habituado_transporte, habituado_ferrador, habituado_veterinario, trabalha_em_grupo, trabalha_solto, trabalha_a_mao, habituado_campo, apto_criancas.';
COMMENT ON COLUMN public.cavalos_venda.maneio IS
  'regime_estabulacao, tipo_alimentacao, horas_trabalho_semana, teste_dna_realizado, seguro_equino.';
COMMENT ON COLUMN public.cavalos_venda.saude IS
  'Doze campos de saúde. Inclui vacinacao_atualizada e desparasitacao_atualizada, que até aqui eram reduzidas a um E lógico em documentos_em_dia e perdidas.';
COMMENT ON COLUMN public.cavalos_venda.condicoes_venda IS
  'Treze condições de negócio: trial, financiamento, exportação, cobrição, visita, equipamento, motivo. O preço, o negociável, a troca e o transporte continuam colunas próprias por serem filtro.';

COMMENT ON COLUMN public.cavalos_venda.peso_kg IS
  'Quilos, como o vendedor os escreveu. Sem precisão declarada de propósito — ver o cabeçalho da migração.';

-- ─── A ascendência ───────────────────────────────────────────────────────────
--
-- `caminho` é a posição na árvore vista do exemplar: 'pai', 'mae', 'pai.pai',
-- 'pai.mae', 'mae.pai', 'mae.mae'. Uma terceira geração acrescenta linhas, não
-- colunas.
--
-- `cavalos_venda.pai` e `.mae` continuam a existir e a ser escritas. É
-- duplicação, e é deliberada: são elas que o cartão e o `<Pedigree>` já lêem, e
-- trocar esse caminho de leitura não é trabalho desta migração. A tabela é a
-- árvore inteira — incluindo os números de registo do pai e da mãe, que não
-- tinham sítio nenhum.

CREATE TABLE IF NOT EXISTS public.cavalos_venda_ascendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cavalo_id uuid NOT NULL REFERENCES public.cavalos_venda(id) ON DELETE CASCADE,
  caminho text NOT NULL,
  geracao smallint NOT NULL,
  nome text,
  registo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cavalos_venda_ascendentes_caminho_unico UNIQUE (cavalo_id, caminho),
  -- Uma linha sem nome e sem registo não é um antepassado, é uma linha vazia.
  CONSTRAINT cavalos_venda_ascendentes_nao_vazio
    CHECK (nome IS NOT NULL OR registo IS NOT NULL)
);

COMMENT ON TABLE public.cavalos_venda_ascendentes IS
  'Ascendência do cavalo anunciado. Uma linha por antepassado, identificado pelo caminho a partir do exemplar.';

-- O `UNIQUE (cavalo_id, caminho)` já dá o índice pelo qual a ficha procura;
-- não se acrescenta outro.

ALTER TABLE public.cavalos_venda_ascendentes ENABLE ROW LEVEL SECURITY;

-- As políticas espelham as de `cavalos_venda`: a árvore é tão pública quanto o
-- anúncio a que pertence, e nunca mais do que isso.
DROP POLICY IF EXISTS cavalos_venda_ascendentes_select_active ON public.cavalos_venda_ascendentes;
CREATE POLICY cavalos_venda_ascendentes_select_active
  ON public.cavalos_venda_ascendentes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cavalos_venda c
      WHERE c.id = cavalos_venda_ascendentes.cavalo_id
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS cavalos_venda_ascendentes_select_own ON public.cavalos_venda_ascendentes;
CREATE POLICY cavalos_venda_ascendentes_select_own
  ON public.cavalos_venda_ascendentes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cavalos_venda c
      WHERE c.id = cavalos_venda_ascendentes.cavalo_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cavalos_venda_ascendentes_service_role ON public.cavalos_venda_ascendentes;
CREATE POLICY cavalos_venda_ascendentes_service_role
  ON public.cavalos_venda_ascendentes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────────────
-- 20260904000001_rls_fechar_tabelas_abertas.sql
-- ─────────────────────────────────────────────────────────────────────
-- =============================================================================
-- Fechar as tabelas que estão abertas à chave anónima
-- Data: 2026-09-04
--
-- ATENÇÃO: esta migração NÃO foi aplicada a nenhuma base. Foi escrita e
-- validada contra um PostgreSQL 16 local — ver `supabase/validacao/`, que
-- reproduz o esquema e as políticas de produção, mede as 24 operações que a
-- chave anónima conseguia fazer e mede também o que tem de continuar a
-- funcionar. Aplicada duas vezes seguidas sem erro.
--
-- -----------------------------------------------------------------------------
-- O que ela corrige
-- -----------------------------------------------------------------------------
-- A chave `NEXT_PUBLIC_SUPABASE_ANON_KEY` está, por definição, no JavaScript
-- que o site entrega a toda a gente. Quem a copia fala com o PostgREST como o
-- papel `anon`, e o que o trava a partir daí é só o RLS. Foram encontradas três
-- famílias de buracos:
--
--   1. Sete tabelas com o RLS **desligado** e `GRANT ALL` a `anon` e a
--      `authenticated`: qualquer pessoa lê, escreve e apaga tudo o que lá está.
--      Entre elas, `favoritos` (email de cada utilizador e o que ele guardou) e
--      `admin_chat_messages` (a conversa interna da administração).
--
--   2. Políticas com o nome trocado pela intenção. `CREATE POLICY … FOR ALL
--      USING (true)` **sem** `TO service_role` aplica-se a `public`, que em
--      PostgreSQL quer dizer *todos os papéis*, `anon` incluído. Uma política
--      chamada "Enable all for service role" que na verdade abre a tabela ao
--      mundo é pior do que nenhuma, porque quem lê a lista de políticas fica
--      convencido de que está fechada. Apanha `payments`, `leads`,
--      `contact_submissions`, `admin_tasks`, `admin_automations` e
--      `admin_automation_logs`.
--
--      (A migração 20260302000001 já tentou apagar a de `contact_submissions`,
--      mas procurou-a por "Allow all for service role" e o nome que lá está é
--      "Enable all for service role". Um `DROP POLICY IF EXISTS` com o nome
--      errado não dá erro nenhum — não faz nada, em silêncio. Por isso aqui
--      apagam-se os dois nomes.)
--
--   3. Escritas públicas onde só devia haver leitura pública: `coudelarias`
--      aceita INSERT e UPDATE de qualquer pessoa (as 35 fichas que lá estão
--      podem ser reescritas por quem quiser), e `seller_ratings` aceita
--      INSERT de qualquer pessoa com qualquer `cavalo_id` e qualquer
--      `buyer_email`.
--
-- -----------------------------------------------------------------------------
-- Porque é que fechar não parte o site
-- -----------------------------------------------------------------------------
-- O papel `service_role` **ignora** o RLS, e é por ele que quase tudo lê. As
-- leituras feitas mesmo com a chave anónima foram contadas ficheiro a ficheiro,
-- e são quatro tabelas:
--
--   coudelarias    app/mapa/page.tsx, app/directorio/**, /api/coudelarias
--   cavalos_venda  app/comprar/**, app/page.tsx, /api/cavalos, /api/search
--   eventos        /api/eventos, /api/eventos/[slug]
--   reviews        /api/reviews (supabasePublic)
--
-- As quatro mantêm a leitura pública. Tudo o resto fecha sem que uma linha de
-- código mude.
--
-- O que não se pode contar com um grep: o padrão dominante no projecto é
-- `import { supabaseAdmin as supabase }`, e procurar por "supabase.from" sem
-- olhar ao alias no topo do ficheiro acusa de anónimo código que é service role
-- — as rotas de administração todas, por exemplo. O que conta é a que cliente o
-- identificador está ligado, não como se chama.
--
-- Duas escritas que eram anónimas passaram para o service role antes desta
-- migração, e sem isso ela partia-as: os contadores de visitas de
-- `app/api/eventos/[slug]/route.ts` e de `app/directorio/[slug]/page.tsx`. Um
-- UPDATE não se restringe a uma coluna por RLS, portanto deixar `anon` somar
-- uma visita é deixá-lo reescrever a linha inteira.
--
-- As políticas `TO service_role` que se criam abaixo são, em rigor,
-- redundantes — o service role passa à frente do RLS de qualquer maneira. Ficam
-- porque documentam quem é o dono da tabela, e é o estilo que as migrações
-- anteriores já usam.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ajudante
-- -----------------------------------------------------------------------------
-- Tudo o que se segue tem de ser inofensivo numa base onde a tabela não exista
-- — é o que torna a migração aplicável a um ambiente de desenvolvimento parcial
-- e o que a torna repetível. Note-se que `ALTER TABLE IF EXISTS` **não** chega:
-- um `DROP POLICY IF EXISTS ... ON tabela_que_nao_existe` rebenta na mesma, com
-- "relation does not exist". Quem decide é o `to_regclass`.
CREATE OR REPLACE FUNCTION public.__rls_fechar(
  tabela            text,
  politicas_a_tirar text[] DEFAULT '{}',
  privilegios_anon  text   DEFAULT NULL,   -- ex.: 'SELECT'; NULL = nenhum
  politica_service  boolean DEFAULT true,
  qual_leitura      text   DEFAULT NULL    -- USING de uma política de leitura pública
) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE
  p text;
BEGIN
  IF to_regclass('public.' || quote_ident(tabela)) IS NULL THEN
    RAISE NOTICE 'tabela public.% nao existe, saltada', tabela;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela);

  FOREACH p IN ARRAY politicas_a_tirar LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, tabela);
  END LOOP;

  IF politica_service THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tabela || '_service_role', tabela);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tabela || '_service_role', tabela
    );
  END IF;

  IF qual_leitura IS NOT NULL THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tabela || '_select_public', tabela);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (%s)',
      tabela || '_select_public', tabela, qual_leitura
    );
  END IF;

  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tabela);
  IF privilegios_anon IS NOT NULL THEN
    EXECUTE format('GRANT %s ON public.%I TO anon, authenticated', privilegios_anon, tabela);
  END IF;
END $fn$;

-- =============================================================================
-- 1. Tabelas com o RLS desligado e sem nenhuma leitura pública legítima
-- =============================================================================
-- Ligar o RLS sem criar política nenhuma para `anon` já fecha a tabela: sem
-- política que autorize, o PostgreSQL nega. O `REVOKE` é o segundo trinco —
-- sem ele, uma política mal escrita no futuro volta a abrir tudo de uma vez.
--
-- Nenhuma destas cinco é lida por código nenhum com a chave anónima;
-- `linhagens`, `profissionais_analytics_daily` e as duas de `admin_chat` não
-- são lidas por código nenhum, ponto final.
SELECT public.__rls_fechar('admin_chat_messages');
SELECT public.__rls_fechar('admin_chat_read_receipts');
SELECT public.__rls_fechar('favoritos');
SELECT public.__rls_fechar('linhagens');
SELECT public.__rls_fechar('profissionais_analytics_daily');

-- =============================================================================
-- 1b. `eventos` e `reviews`: leitura pública fica, escrita pública sai
-- =============================================================================
-- Estas duas também tinham o RLS desligado, mas são lidas com a chave anónima
-- (ver o cabeçalho), portanto não podem ser fechadas como as cinco de cima.
--
-- `reviews` fica mais apertada do que estava: a rota pública já filtra por
-- `status = 'approved'`, portanto avaliações pendentes e rejeitadas deixam de
-- ser legíveis de fora, o que hoje não é o caso.
--
-- `eventos` fica com `USING (true)` porque a rota `[slug]` procura por slug sem
-- filtrar o estado. Apertar para `status = 'active'` é a continuação natural
-- disto, mas mexe no comportamento da rota e por isso não vai aqui.
SELECT public.__rls_fechar('eventos', '{}', 'SELECT', true, 'true');
SELECT public.__rls_fechar('reviews', '{}', 'SELECT', true, 'status = ''approved''');

-- =============================================================================
-- 2. Políticas que dizem "service role" e valem para toda a gente
-- =============================================================================

-- payments — email, montante e identificadores Stripe de cada compra.
-- Além da leitura, `anon` podia INSERIR: a guarda de duplicados do webhook
-- procura `stripe_session_id` nesta tabela, portanto uma linha forjada com a
-- sessão de outra pessoa faz o webhook saltar o anúncio que ela pagou.
SELECT public.__rls_fechar(
  'payments',
  ARRAY['Enable all for service role', 'Allow all for service role']
);

-- leads — email e proveniência de campanha de cada contacto.
SELECT public.__rls_fechar(
  'leads',
  ARRAY['Enable all for service role', 'Allow all for service role']
);

-- contact_submissions — o formulário de venda inteiro em `form_data`, mais IP
-- e user agent. É também o sítio de onde o webhook do Stripe lê os dados do
-- anúncio: com UPDATE aberto, dava para reescrever o conteúdo de um anúncio já
-- pago entre o checkout e a entrega do webhook.
-- (Já tem `contact_submissions_service_role`; não se cria uma segunda.)
SELECT public.__rls_fechar(
  'contact_submissions',
  ARRAY['Enable all for service role', 'Allow all for service role'],
  NULL,
  false
);

-- admin_tasks, admin_automations, admin_automation_logs — o painel de
-- administração. As três tinham `FOR ALL USING (true)` sem papel.
SELECT public.__rls_fechar('admin_tasks', ARRAY['Admin can do everything on tasks']);
SELECT public.__rls_fechar('admin_automations', ARRAY['Admin can do everything on automations']);
SELECT public.__rls_fechar(
  'admin_automation_logs',
  ARRAY['Admin can do everything on automation logs']
);

-- =============================================================================
-- 3. Carrinhos abandonados e emails de recuperação
-- =============================================================================
-- `admin_all_abandoned_carts` estava `TO authenticated`: bastava registar uma
-- conta no site para ler os carrinhos e os emails de toda a gente. E
-- `public_update_own_cart` dizia "own" mas tinha `USING (true)` — qualquer
-- pessoa reescrevia o carrinho de qualquer outra.
SELECT public.__rls_fechar(
  'abandoned_carts',
  ARRAY['admin_all_abandoned_carts', 'public_update_own_cart', 'public_insert_abandoned_carts']
);
SELECT public.__rls_fechar('cart_recovery_emails', ARRAY['admin_all_recovery_emails'], NULL, false);
SELECT public.__rls_fechar('cart_recovery_stats', ARRAY['admin_all_recovery_stats']);

-- =============================================================================
-- 4. coudelarias — leitura pública fica, escrita pública sai
-- =============================================================================
-- As duas políticas chamavam-se "Service role pode inserir" e "Service role
-- pode atualizar" e não tinham papel nenhum atribuído: eram INSERT e UPDATE
-- para toda a gente, com `USING (true)`. As 35 fichas do directório podiam ser
-- reescritas por qualquer visitante — e o nome e a descrição de uma coudelaria
-- vão parar ao JSON-LD da ficha, o que fazia disto também um vector de XSS.
--
-- As duas políticas de leitura NÃO se tocam: são elas que servem o mapa e o
-- directório.
SELECT public.__rls_fechar(
  'coudelarias',
  ARRAY['Service role pode inserir', 'Service role pode atualizar'],
  'SELECT'
);

-- =============================================================================
-- 5. seller_ratings — uma avaliação tem de vir de alguém
-- =============================================================================
-- `seller_ratings_insert_authenticated` chamava-se "authenticated" mas estava
-- em `public` com `WITH CHECK (true)`: qualquer pessoa inseria avaliações em
-- nome de qualquer comprador, sobre qualquer anúncio, quantas quisesse. Num
-- classificados, a reputação do vendedor é o produto.
--
-- Fica só leitura pública (as avaliações mostram-se na ficha) e a escrita passa
-- a ser do servidor, que é quem sabe se houve mesmo uma transacção.
SELECT public.__rls_fechar(
  'seller_ratings',
  ARRAY['seller_ratings_insert_authenticated'],
  'SELECT',
  false
);

-- =============================================================================
-- 6. Um pagamento, um anúncio
-- =============================================================================
-- A guarda de duplicados do webhook lê `payments` e depois escreve — entre as
-- duas coisas não há nada que impeça duas entregas simultâneas do mesmo evento
-- (o Stripe repete) de passarem as duas pela guarda e inserirem dois cavalos
-- pelo mesmo pagamento. Quem resolve isto é o índice, não o código: com ele, a
-- segunda escrita rebenta, o webhook devolve 500 e o evento fica na fila.
--
-- Se algum dia esta tabela tiver duplicados, o índice não é criado e a migração
-- pára aqui com erro — de propósito. Limpar os duplicados é uma decisão de
-- negócio (qual das linhas fica), não uma coisa para uma migração adivinhar.
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_id_key
  ON public.payments (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- O ajudante sai. Uma função com dois underscores à frente é um andaime, e um
-- andaime esquecido no sítio é uma função `SECURITY INVOKER` que faz `REVOKE` e
-- `GRANT` por `EXECUTE format` à espera de quem lhe pegue.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.__rls_fechar(text, text[], text, boolean, text);


-- ─────────────────────────────────────────────────────────────────────
-- 20260904000002_documentos_cavalo.sql
-- ─────────────────────────────────────────────────────────────────────
-- Os documentos de um cavalo: onde ficam, quem os vê, e o que quer dizer
-- «verificado».
--
-- O formulário de venda pedia o Livro Azul como obrigatório e mostrava um
-- visto verde ao anexá-lo. O ficheiro nunca saía do browser: o `handleSubmit`
-- enviava as fotografias e o formulário, e o documento ficava para trás. Esta
-- migração cria o sítio onde ele passa a assentar.
--
-- Duas decisões estão gravadas aqui e não no código, de propósito — para que
-- continuem verdadeiras mesmo que alguém escreva uma rota nova e se esqueça
-- delas:
--
--   1. O balde é privado e não tem política de leitura nenhuma. Um passaporte
--      equino traz o nome e a morada do proprietário; publicá-lo num URL
--      adivinhável seria uma fuga de dados pessoais, não um descuido de
--      arrumação.
--   2. A tabela tem RLS ligada **sem uma única política**. Sem políticas,
--      ninguém que passe pelo PostgREST lê ou escreve uma linha — nem
--      anónimo, nem autenticado. Só a chave de serviço, que salta a RLS por
--      definição, e essa só existe no servidor.
--
-- Idempotente: pode correr duas vezes.

-- ---------------------------------------------------------------------------
-- O balde privado
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-cavalos',
  'documentos-cavalos',
  false,
  10485760, -- 10 MB, igual ao MAX_BYTES_DOCUMENTO de lib/documentos/contrato.ts
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Se alguma política de leitura sobre este balde existir de uma tentativa
-- anterior, sai. O balde privado é a primeira das duas regras acima.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like '%documentos-cavalos%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- A tabela
-- ---------------------------------------------------------------------------

create table if not exists public.documentos_cavalo (
  id uuid primary key default gen_random_uuid(),

  -- Fica nulo enquanto o anúncio não existe: o documento sobe antes do
  -- pagamento, e o anúncio só nasce quando o Stripe confirma. É a
  -- `referencia` que os liga nesse intervalo.
  cavalo_id uuid references public.cavalos_venda(id) on delete cascade,

  -- O identificador da submissão, gerado no browser. Não é segredo nem serve
  -- de autorização: serve para arrumar, e para apagar tudo o que pertence a
  -- uma submissão abandonada com um prefixo só.
  referencia text not null,

  tipo text not null check (tipo in ('livro_azul', 'passaporte', 'exame_vet')),

  caminho text not null unique,
  nome_original text not null,

  -- O MIME lido nos bytes do ficheiro, nunca o que o cliente declarou.
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  bytes bigint not null check (bytes > 0),

  -- SHA-256 do conteúdo, em hexadecimal. É o que denuncia o mesmo documento
  -- anexado a dois cavalos diferentes.
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),

  estado text not null default 'por_verificar'
    check (estado in ('por_verificar', 'em_revisao', 'verificado', 'recusado')),
  motivo_recusa text,
  verificado_por text,
  verificado_em timestamptz,

  -- O que se conseguiu ler de dentro do documento, e as contradições com o
  -- que o vendedor escreveu. Nenhuma das duas decide nada sozinha.
  leitura jsonb,
  conflitos jsonb,

  criado_em timestamptz not null default now(),

  -- Um estado terminal tem de dizer quem o pôs e quando. Sem isto, um
  -- «verificado» sem autor é indistinguível de um «verificado» posto por
  -- engano por um script.
  constraint documento_verificado_tem_autor check (
    estado <> 'verificado' or (verificado_por is not null and verificado_em is not null)
  ),
  constraint documento_recusado_tem_motivo check (
    estado <> 'recusado' or motivo_recusa is not null
  )
);

-- A fila de quem revê, por ordem de chegada.
create index if not exists documentos_cavalo_estado_idx
  on public.documentos_cavalo (estado, criado_em);

-- Os documentos de um anúncio, e os de uma submissão ainda sem anúncio.
create index if not exists documentos_cavalo_cavalo_idx
  on public.documentos_cavalo (cavalo_id);
create index if not exists documentos_cavalo_referencia_idx
  on public.documentos_cavalo (referencia);

-- O mesmo ficheiro em dois sítios. Não é único — o mesmo Livro Azul pode ser
-- reenviado para o mesmo cavalo, e isso é legítimo —, mas é procurável.
create index if not exists documentos_cavalo_sha256_idx
  on public.documentos_cavalo (sha256);

-- ---------------------------------------------------------------------------
-- RLS: ligada, e sem políticas nenhumas
-- ---------------------------------------------------------------------------
--
-- Não é um passo por acabar. Uma tabela com RLS ligada e zero políticas nega
-- tudo a toda a gente que passe pelo PostgREST, que é exactamente o que se
-- quer: estes documentos leem-se do servidor com a chave de serviço, e de mais
-- lado nenhum. No dia em que houver contas de vendedor com sessão própria,
-- acrescenta-se aqui uma política de leitura das linhas do próprio dono — e
-- essa terá de ser escrita a pensar, não herdada por distracção.

alter table public.documentos_cavalo enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'documentos_cavalo'
  loop
    execute format('drop policy if exists %I on public.documentos_cavalo', p.policyname);
  end loop;
end $$;

comment on table public.documentos_cavalo is
  'Documentos de identificação dos cavalos anunciados. Balde privado, RLS sem políticas: só a chave de serviço. Ver lib/documentos/contrato.ts.';


-- ─────────────────────────────────────────────────────────────────────
-- 20260904000003_storage_fechar_escrita_anonima.sql
-- ─────────────────────────────────────────────────────────────────────
-- O balde das fotografias aceitava escrita anónima, e nenhum código a usava.
--
-- Havia esta política em `storage.objects`:
--
--   "Anon upload to cavalos-imagens pending"
--   INSERT, para {anon, authenticated}
--   with check: bucket_id = 'cavalos-imagens' and foldername[1] = 'pending'
--
-- Quer dizer que qualquer pessoa com a chave anónima — que é pública, vai no
-- JavaScript da página, e é suposto ir — podia escrever ficheiros no balde
-- directamente, sem passar pelo site. Sem verificação de origem, sem limite de
-- ritmo, sem contador. Armazenamento gratuito para quem desse pela coisa.
--
-- E não servia para nada. **Todos** os caminhos de escrita deste repositório
-- vão por `supabaseAdmin`, que usa a chave de serviço e salta a RLS por
-- definição: `app/api/upload/route.ts` e `app/api/vender-cavalo/upload/route.ts`
-- são os dois únicos, e nenhum precisa desta política para funcionar. É um
-- resto de um desenho anterior, em que o browser subia as fotografias
-- directamente.
--
-- Verificado antes de a apagar: um único objecto em `pending/`, de 18 de
-- Fevereiro. Não houve abuso — o que se fecha é a porta, não um incêndio.
--
-- Aproveita-se para pôr no balde os limites que as rotas já aplicam. A rota
-- validar não chega: se um dia alguém escrever uma terceira rota e se esquecer
-- de validar, é o balde que a trava. Uma verificação que vive num sítio só é
-- uma verificação que se perde na primeira distracção.
--
-- Idempotente: pode correr duas vezes.

-- ---------------------------------------------------------------------------
-- A escrita anónima
-- ---------------------------------------------------------------------------

drop policy if exists "Anon upload to cavalos-imagens pending" on storage.objects;

-- ---------------------------------------------------------------------------
-- Os limites, no balde e não só na rota
-- ---------------------------------------------------------------------------

-- As fotografias dos anúncios. A rota já recusa acima de 5 MB e fora destes
-- quatro tipos; o balde passa a recusar o mesmo.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
where id = 'cavalos-imagens';

-- O balde geral, onde escreve a administração (`app/api/upload/route.ts`, que
-- exige sessão). Não tinha limite de tamanho nenhum nem restrição de tipo: um
-- engano numa rota de administração podia lá pôr um ficheiro de qualquer
-- formato e de qualquer tamanho, e o balde é público de leitura.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'images';


-- ─────────────────────────────────────────────────────────────────────
-- 20260904000004_documentos_em_dia_default_false.sql
-- ─────────────────────────────────────────────────────────────────────
-- `documentos_em_dia` afirmava por omissão aquilo que só o vendedor pode
-- declarar.
--
-- A coluna tinha `DEFAULT true`: um anúncio que nunca respondesse à pergunta
-- lia-se como «documentos em dia». O nome tem forma de facto verificado, o
-- dado é uma resposta de sim ou não que o vendedor dá sobre si próprio, e o
-- default acrescentava-lhe uma terceira camada — dizer que sim por ninguém ter
-- dito nada.
--
-- Até `6bc51db` (1 de Setembro de 2026) o webhook escrevia
-- `formData.documentosEmDia || true`, o que dava `true` sempre. Nas linhas
-- escritas antes dessa data não haveria como distinguir «respondeu que sim» de
-- «nunca respondeu»: a informação era destruída na escrita. Verificado antes de
-- aplicar: a tabela tem **zero linhas**, por isso não há passado a corrigir e
-- não se corre nenhum backfill — que seria sempre assimétrico, a apagar «sim»
-- verdadeiros para apanhar os falsos.
--
-- O lado da escrita já estava corrigido; isto fecha o lado do esquema.
--
-- Idempotente.

alter table public.cavalos_venda
  alter column documentos_em_dia set default false;


-- ─────────────────────────────────────────────────────────────────────
-- 20260904000005_stud_book_e_impressoes.sql
-- ─────────────────────────────────────────────────────────────────────
-- Duas tabelas de verificação: a consulta ao stud-book e as impressões das
-- fotografias.
--
-- As duas com RLS ligada e **sem uma única política**, pela mesma razão da
-- `documentos_cavalo`: não é um passo por acabar, é a garantia. Sem políticas,
-- ninguém que passe pelo PostgREST lê ou escreve uma linha — só a chave de
-- serviço, que salta a RLS e só existe no servidor.
--
-- Idempotente.

-- ---------------------------------------------------------------------------
-- O que a APSL respondeu
-- ---------------------------------------------------------------------------
--
-- `estado` distingue três coisas que se confundem com facilidade e que mandam
-- fazer coisas opostas: `confirmado` (o cavalo consta), `desconhecido` (a APSL
-- respondeu e não o tem) e `indisponivel` (**não conseguimos saber**). O
-- terceiro é o que impede que uma mudança de folha de estilo no sítio da APSL
-- faça o portal começar a dizer que nenhum cavalo consta do livro.
--
-- Guarda-se só o que serve para confrontar com o anúncio. O criador, o
-- proprietário e a descendência são lidos e deitados fora: são dados de
-- pessoas, e não temos que ver com eles.

create table if not exists public.consultas_stud_book (
  cavalo_id uuid primary key references public.cavalos_venda(id) on delete cascade,
  estado text not null check (estado in
    ('confirmado','desconhecido','indisponivel','desligado','sem_identificador')),
  motivo text check (motivo in
    ('sem_resposta','resposta_recusada','formato_desconhecido','tecto_diario','sem_vez_a_tempo')),
  identificador text check (identificador in ('numero_registo','ueln','microchip')),
  chave text,
  registo jsonb,
  tentativas integer not null default 0,
  consultado_em timestamptz,
  criado_em timestamptz not null default now(),
  actualizado_em timestamptz not null default now()
);

alter table public.consultas_stud_book enable row level security;

create index if not exists consultas_stud_book_estado_idx
  on public.consultas_stud_book (estado);

comment on table public.consultas_stud_book is
  'Resultado da consulta ao stud-book da APSL. RLS sem politicas: so a chave de servico.';

-- ---------------------------------------------------------------------------
-- As impressões perceptuais das fotografias
-- ---------------------------------------------------------------------------
--
-- O SHA-256 não chega: quem rouba uma fotografia raramente a copia byte a
-- byte — volta a guardá-la, corta uma margem, muda o tamanho —, e o SHA-256
-- muda por completo enquanto a imagem continua a ser a mesma.
--
-- Guardam-se **dois enquadramentos** (quadro inteiro e centro a 90%) porque um
-- só não chegava: contra um recorte de 5% a distância ia aos 20, e duas
-- imagens sem relação começavam nos 10 — não havia limiar que separasse os
-- dois. Com os dois enquadramentos há: o recorte cai para 2 e a cauda das
-- diferentes começa nos 6.
--
-- O `blocos` é a impressão partida em pedaços indexáveis, e é o que faz a
-- procura ser um index scan em vez de uma varredura da tabela.

create table if not exists public.fotos_impressoes (
  id            uuid primary key default gen_random_uuid(),
  cavalo_id     uuid references public.cavalos_venda(id) on delete cascade,
  -- O caminho no Storage, e não o URL: a fotografia sobe para `pending/`
  -- **antes de o anúncio existir**, e nessa altura não há `cavalo_id` nenhum a
  -- que a prender. O `url` preenche-se quando o anúncio nasce.
  caminho       text not null,
  url           text,
  phash         char(16) not null,
  phash_centro  char(16) not null,
  dhash         char(16) not null,
  dhash_centro  char(16) not null,
  largura       integer not null,
  altura        integer not null,
  sha256        char(64),
  criado_em     timestamptz not null default now(),
  blocos        text[] not null,
  constraint fotos_impressoes_caminho_unico unique (caminho),
  constraint fotos_impressoes_phash_hex check (phash ~ '^[0-9a-f]{16}$'),
  constraint fotos_impressoes_blocos_oito check (array_length(blocos, 1) between 4 and 8)
);

create index if not exists fotos_impressoes_blocos_idx on public.fotos_impressoes using gin (blocos);
create index if not exists fotos_impressoes_cavalo_idx on public.fotos_impressoes (cavalo_id);
create index if not exists fotos_impressoes_sha256_idx on public.fotos_impressoes (sha256);

alter table public.fotos_impressoes enable row level security;

comment on table public.fotos_impressoes is
  'Impressoes perceptuais das fotografias. RLS sem politicas: a lista de quem se parece com quem e material de revisao, nao e publica.';

-- ---------------------------------------------------------------------------
-- Quando o vendedor foi avisado de uma recusa
-- ---------------------------------------------------------------------------
--
-- Sem esta coluna, um aviso que falhe — o serviço de email em baixo — nunca é
-- retentado e ninguém fica a saber que não saiu. Um vendedor que pagou e cujo
-- Livro Azul foi recusado ficaria à espera para sempre, que é o defeito que
-- todo este trabalho existe para acabar.
--
-- Nulo quer dizer «por avisar», e é o que permite a uma varredura apanhar o
-- que ficou para trás sem correr o risco de avisar duas vezes.

alter table public.documentos_cavalo
  add column if not exists aviso_recusa_em timestamptz;

comment on column public.documentos_cavalo.aviso_recusa_em is
  'Quando o vendedor foi avisado da recusa. Nulo = por avisar.';

-- ---------------------------------------------------------------------------
-- O registo lido por número, e não por anúncio
-- ---------------------------------------------------------------------------
--
-- A chave primária da `consultas_stud_book` é o `cavalo_id`, e por isso «um
-- `confirmado` não se volta a perguntar» valia só **dentro do mesmo anúncio**:
-- o mesmo cavalo republicado no ano seguinte custava um segundo pedido ao
-- servidor da APSL. Com este índice custa zero, e é o que faz a diferença
-- entre um registo que cresce com o uso e uma cache que se esquece.
--
-- Composto e parcial de propósito: a consulta é
-- `where chave = $1 order by consultado_em desc nulls last limit 1`, e
-- `chave = $1` implica `not null`, por isso o planeador pode usar o parcial.
-- Validado contra um PostgreSQL local com 20 000 linhas: `Index Scan`, sem
-- `Sort`, e corre duas vezes sem erro.

create index if not exists consultas_stud_book_chave_idx
  on public.consultas_stud_book (chave, consultado_em desc nulls last)
  where chave is not null;


-- ─────────────────────────────────────────────────────────────────────
-- 20260906000001_consulta_assistida.sql
-- ─────────────────────────────────────────────────────────────────────
-- A consulta assistida: quem respondeu, e o motivo que faltava.
--
-- Enquanto o `STUD_BOOK_APSL_ACTIVO` estiver em baixo — e está, porque a
-- consulta pública da APSL tem um reCAPTCHA e um CAPTCHA é o operador a dizer
-- que aquele formulário é para pessoas — quem vai ver é um administrador, com
-- o browser dele, e escreve aqui o que viu.
--
-- A tabela passa a ter de dizer **qual das duas** escreveu cada linha. Sem
-- isso, um `confirmado` posto à mão e um `confirmado` vindo de um pedido nosso
-- ficavam indistinguíveis — e o dia em que alguém ligar
-- `temRegistoConfirmadoNoStudBook` a uma página pública seria o dia em que o
-- site começa a afirmar, sem saber, coisas que uma pessoa escreveu à pressa.
--
-- Idempotente.

-- ---------------------------------------------------------------------------
-- Quem respondeu
-- ---------------------------------------------------------------------------
--
-- `automatica` por omissão porque é o que todas as linhas anteriores a esta
-- migração são: escritas pelo caminho do `registo.ts`, no fim do webhook do
-- Stripe. Ler a ausência como «assistida» fazia de cada linha antiga uma
-- observação sem autor.

alter table public.consultas_stud_book
  add column if not exists origem text not null default 'automatica';

alter table public.consultas_stud_book
  drop constraint if exists consultas_stud_book_origem_check;
alter table public.consultas_stud_book
  add constraint consultas_stud_book_origem_check
  check (origem in ('automatica','assistida'));

alter table public.consultas_stud_book
  add column if not exists por text;

comment on column public.consultas_stud_book.origem is
  'Quem respondeu: automatica (um pedido nosso) ou assistida (uma pessoa foi ver).';
comment on column public.consultas_stud_book.por is
  'E-mail de quem foi ver. So com origem assistida, e obrigatorio nesse caso.';

-- ---------------------------------------------------------------------------
-- Uma observação sem autor não é uma observação
-- ---------------------------------------------------------------------------
--
-- A mesma conta que o `documento_verificado_tem_autor` paga do lado do
-- documento. Uma linha assistida sem `por` é indistinguível de uma que um
-- programa escreveu — que é exactamente a confusão que a coluna `origem` foi
-- acrescentada para acabar. A regra vive na base, e não só na rota, porque a
-- rota de amanhã pode ser outra.
--
-- E o inverso também: uma linha automática **não** pode ter autor. Um e-mail
-- colado a uma linha que ninguém viu diz que uma pessoa viu o que só um pedido
-- nosso viu, o que é a mesma mentira ao contrário.

alter table public.consultas_stud_book
  drop constraint if exists consulta_assistida_tem_autor;
alter table public.consultas_stud_book
  add constraint consulta_assistida_tem_autor
  check (
    (origem = 'assistida' and por is not null and length(btrim(por)) > 0)
    or (origem <> 'assistida' and por is null)
  );

-- ---------------------------------------------------------------------------
-- O sexto motivo de `indisponivel`
-- ---------------------------------------------------------------------------
--
-- «Não consegui ver» é a terceira resposta que quem revê pode dar, e é a que
-- sustenta as outras duas. Sem ela, uma pessoa que não conseguiu abrir a
-- página tinha de escolher entre não responder e escrever «não consta» — que é
-- uma afirmação sobre um cavalo que nunca chegou a ver, com o nome dela ao
-- lado.
--
-- Continua a ser `indisponivel`, e continua a não dizer nada sobre o cavalo: é
-- do mesmo tipo dos outros cinco, que dizem todos o que correu mal do nosso
-- lado.
--
-- A restrição original nasceu sem nome (`motivo text check (...)`), logo o
-- Postgres chamou-lhe `consultas_stud_book_motivo_check`. Deixa-se cair pelos
-- dois nomes para que esta migração corra tanto sobre uma base que já a tenha
-- como sobre uma que já tenha passado por aqui.

alter table public.consultas_stud_book
  drop constraint if exists consultas_stud_book_motivo_check;
alter table public.consultas_stud_book
  drop constraint if exists consultas_stud_book_motivo_conhecido;
alter table public.consultas_stud_book
  add constraint consultas_stud_book_motivo_conhecido
  check (motivo in (
    'sem_resposta','resposta_recusada','formato_desconhecido',
    'tecto_diario','sem_vez_a_tempo','nao_se_conseguiu_ver'
  ));


-- ─────────────────────────────────────────────────────────────────────
-- 20260907000001_avisos_de_recusa_retentados.sql
-- ─────────────────────────────────────────────────────────────────────
-- A varredura dos avisos de recusa que não saíram.
--
-- A coluna `aviso_recusa_em` foi acrescentada para que uma varredura pudesse
-- apanhar o que ficou por avisar sem avisar duas vezes. **Essa varredura nunca
-- existiu**, e a coluna nunca chegou a ser escrita por ninguém: quem recusa um
-- documento chama o aviso, e se o envio falhar fica um `logger.warn` e mais
-- nada. Um vendedor que pagou, cujo Livro Azul foi recusado e cujo aviso não
-- saiu, fica à espera para sempre — que é exactamente o defeito que todo este
-- trabalho existe para acabar.
--
-- Falta uma segunda coluna para a varredura poder desistir. Sem contagem, uma
-- linha que nunca consegue ser avisada — um documento que subiu antes do
-- pagamento e cujo anúncio nunca nasceu, um anúncio sem endereço — é retentada
-- todos os dias para sempre, e ao fim de umas centenas dessas o orçamento de
-- cada passagem esgota-se nelas e as recusas novas ficam por avisar. É a mesma
-- ideia do `tentativas` da `consultas_stud_book`, e de propósito: já há uma
-- forma de dizer «tentámos e não deu» nesta base, e não se inventa uma segunda.
--
-- Idempotente.

alter table public.documentos_cavalo
  add column if not exists aviso_recusa_tentativas integer not null default 0;

comment on column public.documentos_cavalo.aviso_recusa_tentativas is
  'Quantas vezes o aviso de recusa foi tentado sem sair. Zero = nunca falhou.';

alter table public.documentos_cavalo
  drop constraint if exists aviso_recusa_tentativas_nao_negativa;
alter table public.documentos_cavalo
  add constraint aviso_recusa_tentativas_nao_negativa
  check (aviso_recusa_tentativas >= 0);

-- ---------------------------------------------------------------------------
-- O índice que a varredura usa
-- ---------------------------------------------------------------------------
--
-- A consulta é «documentos recusados, por avisar, que ainda não esgotaram as
-- tentativas, os mais antigos primeiro». Parcial nas duas condições que quase
-- toda a tabela falha — a esmagadora maioria dos documentos não está recusada,
-- e dos recusados quase todos já foram avisados —, por isso o índice fica
-- pequeno e não cresce com o sucesso.
--
-- A ordem é por `aviso_recusa_tentativas` e depois por `criado_em`: quem nunca
-- falhou vai à frente de quem já falhou três vezes. Sem isto, uma mão-cheia de
-- linhas impossíveis de avisar ficava sempre à cabeça da fila — são as mais
-- antigas — e comia o tecto de cada passagem antes de chegar a uma recusa nova.

create index if not exists documentos_aviso_recusa_por_enviar_idx
  on public.documentos_cavalo (aviso_recusa_tentativas, criado_em)
  where estado = 'recusado' and aviso_recusa_em is null;

-- ---------------------------------------------------------------------------
-- O incremento, feito no servidor
-- ---------------------------------------------------------------------------
--
-- A rota que recusa e a varredura podem tocar na mesma linha ao mesmo tempo, e
-- ler-o-valor-e-escrever-o-valor-mais-um a partir da aplicação perde uma das
-- contagens quando isso acontece. Aqui é uma expressão só, dentro da base.
--
-- `security definer` com `search_path` fixo: a função é chamada pela chave de
-- serviço, que já salta a RLS, e o `search_path` vazio impede que um esquema
-- posto à frente no caminho lhe troque a tabela por baixo dos pés.

create or replace function public.incrementar_aviso_recusa_tentativas(documento uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.documentos_cavalo
     set aviso_recusa_tentativas = aviso_recusa_tentativas + 1
   where id = documento;
$$;

-- O `anon` e o `authenticated` são papéis do Supabase e não existem num
-- PostgreSQL simples — e esta migração tem de correr nos dois, porque é contra
-- um local que é validada antes de ir para o repositório. Revoga-se a cada um
-- só se ele existir; o `public` existe sempre.
revoke all on function public.incrementar_aviso_recusa_tentativas(uuid) from public;

do $$
declare papel text;
begin
  foreach papel in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = papel) then
      execute format(
        'revoke all on function public.incrementar_aviso_recusa_tentativas(uuid) from %I',
        papel
      );
    end if;
  end loop;
end $$;

comment on function public.incrementar_aviso_recusa_tentativas(uuid) is
  'Soma 1 as tentativas falhadas do aviso de recusa. So a chave de servico.';


-- ─────────────────────────────────────────────────────────────────────
-- 20260909000001_chat_tempo_real.sql
-- ─────────────────────────────────────────────────────────────────────
-- Migração: o chat do marketplace em tempo real, com estado de entrega
-- Data: 2026-09-09
--
-- ── O que estava partido ────────────────────────────────────────────────────
--
-- Uma mensagem enviada por uma pessoa só aparecia do outro lado se essa outra
-- pessoa recarregasse a página. O distintivo de não lidas era sondado de
-- minuto a minuto, o que quer dizer que a mediana da espera era **trinta
-- segundos** — e continuava a correr com o separador escondido. Isto não é um
-- chat, é um formulário com histórico.
--
-- ── O que esta migração acrescenta, e porquê cada coisa ─────────────────────
--
-- 1. `destinatario_id` — quem é a outra parte, escrito na própria mensagem.
--    Não é desnormalização por gosto: é o que torna possíveis as duas coisas
--    seguintes.
--
--    a) O Realtime da Supabase só sabe filtrar uma subscrição por **uma**
--       igualdade (`coluna=eq.valor`). Sem esta coluna, um cliente que queira
--       saber das suas mensagens teria de subscrever a tabela inteira e
--       deixar a RLS deitar fora as dos outros — ou seja, o servidor avalia a
--       política de toda a gente ligada contra todas as mensagens do site.
--       Com ela, cada cliente subscreve `destinatario_id=eq.<eu>`.
--
--    b) A contagem de não lidas passa de **duas** perguntas para **uma**.
--       Antes: listar todas as conversas em que participo e depois contar as
--       mensagens dessas conversas com `IN (...)` — uma lista que cresce com o
--       número de conversas e que vai por dentro do URL do PostgREST. Agora é
--       um `count` com igualdade sobre um índice.
--
--    Quem a escreve é um gatilho e nunca a API: a política de INSERT deixa
--    qualquer participante escrever na conversa, e sem o gatilho um cliente
--    podia declarar-se destinatário de si próprio e nunca ser contado. O valor
--    é derivado da conversa, que é a única fonte de verdade sobre quem são as
--    duas partes.
--
-- 2. `entregue_at` — o estado do meio. Ver a nota longa mais abaixo.
--
-- 3. A publicação que o Realtime lê. Sem a tabela lá dentro, o WAL não sai do
--    Postgres e a subscrição fica calada sem um único erro do lado do cliente.
--
-- Quem decide quem recebe o quê continua a ser a RLS que já cá estava: o
-- Realtime avalia a política de SELECT de cada subscritor contra cada linha
-- antes de lha entregar. O filtro por `destinatario_id` é economia, não
-- segurança — subscrever `destinatario_id=eq.<outra pessoa>` continua a
-- devolver zero linhas, e isso está provado contra um PostgreSQL local.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.marketplace_mensagens') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.marketplace_mensagens nao existe. Aplique primeiro a migracao 20260829000002_marketplace_chat.sql.';
  END IF;
END $$;

-- =============================================================================
-- 1. Colunas novas
-- =============================================================================

-- Quem tem de receber esta mensagem. Derivada da conversa por gatilho.
ALTER TABLE marketplace_mensagens
  ADD COLUMN IF NOT EXISTS destinatario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- O momento em que a aplicação do destinatário foi avisada desta mensagem.
--
-- ── Porque é que isto é honesto e «entregue ao telemóvel» não seria ─────────
--
-- A base não sabe nada sobre telemóveis, browsers ou notificações. O que ela
-- pode saber com certeza é uma coisa só: **o servidor disse ao destinatário
-- que esta mensagem existe**. É isso que esta coluna guarda, e é escrita nos
-- dois sítios em que isso acontece — a contagem de não lidas e a abertura da
-- caixa de entrada.
--
-- O que não se inventa: não há «entregue» a partir do email de aviso (um email
-- enviado não é um email lido), nem a partir do envio (aí a mensagem só está
-- escrita), nem a partir de um relógio. Um estado que a base não sabe provar
-- não sai desta tabela.
ALTER TABLE marketplace_mensagens
  ADD COLUMN IF NOT EXISTS entregue_at TIMESTAMPTZ;

-- O princípio da última mensagem, para a caixa de entrada não ter de ler a
-- tabela das mensagens.
--
-- ── Porque é que isto vale uma coluna desnormalizada ────────────────────────
--
-- A caixa de entrada precisa de duas coisas por conversa: quantas estão por
-- ler e o princípio da última. A primeira já sai de um índice. A segunda —
-- «a última linha de cada grupo» — não tem resposta no PostgREST sem um
-- `DISTINCT ON`, e a rota resolvia-a **trazendo todas as mensagens de todas as
-- conversas** e ficando com a última de cada uma em JavaScript. Medido no
-- banco de ensaio (2 000 conversas, 60 652 mensagens), para uma caixa de
-- entrada de 40 conversas em que uma é antiga: **1 970 linhas lidas para
-- escrever 40 pré-visualizações**. Com a coluna, zero — e as não lidas passam
-- a sair do índice parcial. Em A/B intercalado, 30 pares: **1,027ms →
-- 0,137ms**.
--
-- Duzentos caracteres porque a pré-visualização corta aos 120 e um `…` não
-- precisa de mais do que isso; guardar o corpo inteiro seria guardar duas
-- vezes a mesma conversa.
ALTER TABLE marketplace_conversas
  ADD COLUMN IF NOT EXISTS ultima_mensagem_previa TEXT;

-- =============================================================================
-- 2. Gatilho que preenche o destinatário
-- =============================================================================
CREATE OR REPLACE FUNCTION marketplace_mensagens_destinatario()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY DEFINER para que a leitura da conversa não dependa da RLS de quem
-- escreve: o remetente vê sempre a sua própria conversa, mas uma política
-- futura mais apertada não pode ter como efeito deixar o destinatário a nulo.
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT CASE WHEN c.comprador_id = NEW.remetente_id THEN c.vendedor_id ELSE c.comprador_id END
    INTO NEW.destinatario_id
    FROM marketplace_conversas c
   WHERE c.id = NEW.conversa_id;

  IF NEW.destinatario_id IS NULL THEN
    RAISE EXCEPTION 'Mensagem sem destinatario: a conversa % nao existe', NEW.conversa_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mensagens_destinatario ON marketplace_mensagens;
CREATE TRIGGER trg_mensagens_destinatario
  BEFORE INSERT OR UPDATE OF conversa_id, remetente_id ON marketplace_mensagens
  FOR EACH ROW EXECUTE FUNCTION marketplace_mensagens_destinatario();

-- Preenche o que já lá estava. Fora de qualquer condição: um UPDATE que não
-- encontra linhas custa nada e é o que torna esta migração repetível.
UPDATE marketplace_mensagens m
   SET destinatario_id = CASE
         WHEN c.comprador_id = m.remetente_id THEN c.vendedor_id
         ELSE c.comprador_id
       END
  FROM marketplace_conversas c
 WHERE c.id = m.conversa_id
   AND m.destinatario_id IS NULL;

-- Só depois do preenchimento. Idempotente: SET NOT NULL numa coluna que já é
-- NOT NULL é uma no-op.
ALTER TABLE marketplace_mensagens ALTER COLUMN destinatario_id SET NOT NULL;

-- =============================================================================
-- 2b. Gatilho que mantém a caixa de entrada em dia
-- =============================================================================
-- Isto estava escrito na API, em dois `UPDATE` a seguir a cada `INSERT` — um
-- na rota que abre a conversa e outro na que responde, com regras
-- ligeiramente diferentes (só uma delas desarquivava). Duas escritas por
-- mensagem, e uma janela entre elas em que a caixa de entrada mostrava a
-- ordem errada.
--
-- Passa a ser uma consequência de haver mensagem, escrita uma vez e no sítio
-- por onde toda a gente passa. Desarquivar faz parte: uma conversa que recebe
-- uma mensagem nova volta às duas caixas de entrada, senão arquivar é a
-- maneira de nunca mais saber de alguém.
CREATE OR REPLACE FUNCTION marketplace_conversas_ultima_mensagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE marketplace_conversas
     SET ultima_mensagem_at = NEW.created_at,
         ultima_mensagem_previa = left(NEW.corpo, 200),
         arquivada_comprador = false,
         arquivada_vendedor = false
   WHERE id = NEW.conversa_id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_conversas_ultima_mensagem ON marketplace_mensagens;
CREATE TRIGGER trg_conversas_ultima_mensagem
  AFTER INSERT ON marketplace_mensagens
  FOR EACH ROW EXECUTE FUNCTION marketplace_conversas_ultima_mensagem();

-- Preenche as pré-visualizações do que já lá está.
UPDATE marketplace_conversas c
   SET ultima_mensagem_previa = left(u.corpo, 200)
  FROM (
    SELECT DISTINCT ON (conversa_id) conversa_id, corpo
      FROM marketplace_mensagens
     ORDER BY conversa_id, created_at DESC, id DESC
  ) u
 WHERE u.conversa_id = c.id
   AND c.ultima_mensagem_previa IS NULL;

-- =============================================================================
-- 3. Índices
-- =============================================================================

-- O distintivo da navegação: uma igualdade sobre um índice parcial. As linhas
-- lidas não entram no índice, e são a esmagadora maioria de uma conversa
-- velha.
--
-- O `conversa_id` vem a seguir porque a caixa de entrada faz a mesma pergunta
-- repartida por conversa: com ele, a contagem por conversa lê-se do índice sem
-- ir à tabela.
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario_por_ler
  ON marketplace_mensagens (destinatario_id, conversa_id)
  WHERE lida_at IS NULL;

-- As que ainda não foram anunciadas ao destinatário. Mesmo raciocínio.
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario_por_entregar
  ON marketplace_mensagens (destinatario_id)
  WHERE entregue_at IS NULL;

-- Paginação do fio, do mais recente para trás. O `id` entra no índice porque
-- entra no cursor: duas mensagens podem partilhar o `created_at` ao
-- microssegundo, e sem um desempate a página seguinte podia repetir ou saltar
-- uma linha.
CREATE INDEX IF NOT EXISTS idx_mensagens_fio_recente
  ON marketplace_mensagens (conversa_id, created_at DESC, id DESC);

-- =============================================================================
-- 4. A publicação que o Realtime lê
-- =============================================================================
-- Sem isto a subscrição liga-se, diz «SUBSCRIBED» e nunca recebe nada — é a
-- falha mais silenciosa desta funcionalidade inteira, e por isso fica na
-- migração e não num painel de administração que ninguém sabe que existe.
--
-- A REPLICA IDENTITY fica em DEFAULT **de propósito**, e foi ensaiada antes de
-- se decidir. FULL põe a linha **antiga** inteira no WAL a cada UPDATE; o que
-- o Realtime precisa de ver para avaliar a nossa política de SELECT
-- (`conversa_id`) vem no registo **novo**, que é completo tanto no INSERT como
-- no UPDATE. FULL só serviria para ler o registo antigo, que nenhum ecrã desta
-- funcionalidade mostra.
--
-- Medido num PostgreSQL 16 local com `wal_level = logical` — sem isso a
-- pergunta nem sequer se faz, e a primeira medição, feita em `replica`, dava
-- uns enganadores +1,3% —, em A/B intercalado de 8 pares, marcando 985
-- mensagens como lidas de cada vez: **746 028 → 944 256 bytes de WAL, +26,6%**.
-- Um quarto mais de WAL por cada marcação de leitura, para uma informação que
-- ninguém lê. Não entra.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'marketplace_mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_mensagens;
  END IF;
END $$;

-- =============================================================================
-- 5. Nota sobre a RLS
-- =============================================================================
-- Não se acrescenta política nenhuma. As que a migração 20260829000002 criou
-- são exactamente as que o Realtime aplica a cada subscritor, e a prova está
-- em `__tests__/lib/chat-rls.sql.test.ts` (corre contra o PostgreSQL local
-- quando existe um, e diz porque saltou quando não existe).
--
-- O que **não** se pode fazer daqui para a frente: dar ao papel `anon` um
-- SELECT nestas tabelas, ou acrescentar uma política com `USING (true)`. Ou
-- uma ou outra abre o canal a toda a gente sem uma única linha de código de
-- cliente mudar.


-- ─────────────────────────────────────────────────────────────────────
-- 20260910000001_perfil_com_fotografia.sql
-- ─────────────────────────────────────────────────────────────────────
-- Migração: a fotografia de perfil, e o que a RLS de `user_profiles` deixava passar
-- Data: 2026-09-10
--
-- ── O ponto de partida ──────────────────────────────────────────────────────
--
-- A `004_user_auth_tools.sql` criou `public.user_profiles` com `full_name` e
-- `avatar_url`, e **nenhum ficheiro deste repositório lê ou escreve qualquer um
-- dos dois**. Verificado com um `grep` por `avatar_url` e por `user_profiles`
-- em todo o `app/`, `lib/` e `components/`: zero ocorrências. A coluna existe
-- desde então e está morta.
--
-- ── O buraco que se encontrou ao ir ligá-la ─────────────────────────────────
--
-- A RLS está ligada e as três políticas dizem `auth.uid() = id`, o que parece
-- responder à pergunta «uma pessoa só lê e escreve o seu próprio perfil». Mas
-- **a RLS é por linha e não por coluna**, e nesta linha, ao lado do nome e da
-- fotografia, estão:
--
--   stripe_customer_id
--   tools_subscription_status   -- 'free' | 'active' | 'cancelled'
--   tools_subscription_id
--
-- Ou seja, com a chave anónima — que é pública, vai no JavaScript da página, e
-- é suposto ir — e a sua própria sessão, qualquer pessoa podia fazer
--
--   PATCH /rest/v1/user_profiles?id=eq.<ela própria>
--   {"tools_subscription_status": "active"}
--
-- e passar a ter a assinatura paga. A política aprova: a linha **é** dela. Pela
-- mesma porta, o `INSERT` deixava criar a própria linha já com o estado que
-- lhe apetecesse, se o gatilho de registo alguma vez falhasse ou fosse
-- contornado.
--
-- Isto não é um risco de gabinete: é a diferença entre pagar e não pagar, e
-- está a uma linha de `curl` de distância de quem tenha conta no site.
--
-- A correcção é o `GRANT` e não a política, porque é o `GRANT` que sabe falar
-- de colunas. A `authenticated` fica com `UPDATE (full_name)` e mais nada; a
-- fotografia e tudo o resto escrevem-se pela chave de serviço, a partir de
-- `app/api/perfil`, que é onde há uma sessão verificada, um limite de ritmo e
-- validação. É a mesma repartição que a `20260904000003` já escreveu para o
-- balde das fotografias: **todos os caminhos de escrita deste repositório vão
-- por `supabaseAdmin`**.
--
-- ── E porque é que o prefixo da fotografia não é o UUID da pessoa ───────────
--
-- O caminho óbvio para um balde de avatares é `<user_id>/foto.webp`, e é o que
-- quase toda a gente escreve — a política sai de graça
-- (`foldername[1] = auth.uid()::text`). Aqui não serve, e a razão é a mesma
-- pela qual o `lib/chat/vista-publica` já não devolve o `id` de ninguém: o
-- endereço da fotografia **vai numa resposta de API para a outra pessoa da
-- conversa**. Um endereço que contenha o UUID publica o UUID escrito por
-- outras letras, e o UUID é o que permite ligar alguém a tudo o resto que faça
-- no site.
--
-- O inverso também importa: com o UUID no caminho, saber o UUID de alguém
-- passa a ser saber onde está a fotografia dele. Um balde de leitura pública
-- com endereços deriváveis da identidade é uma lista de pessoas com uma
-- consulta.
--
-- Por isso cada perfil ganha um `avatar_prefixo` opaco e aleatório, sem
-- relação nenhuma com o `id`, e é ele o primeiro segmento do caminho. A
-- política de escrita continua a ser exprimível — «o primeiro segmento é o teu
-- prefixo» —, só que agora pergunta à tabela em vez de olhar para o `auth.uid()`.
--
-- ── Idempotente ─────────────────────────────────────────────────────────────
--
-- Aplica-se duas vezes sem diferença, e isso é verificado por
-- `__tests__/lib/perfil-rls.sql.test.ts` contra um PostgreSQL a sério.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.user_profiles nao existe. Aplique primeiro a migracao 004_user_auth_tools.sql.';
  END IF;
END $$;

-- =============================================================================
-- 1. As colunas da fotografia
-- =============================================================================

-- O prefixo opaco. Ver a nota longa acima sobre porque é que não é o `id`.
--
-- `gen_random_uuid()` sem os hífenes dá 128 bits em 32 caracteres: não se
-- adivinha, e não tem relação nenhuma com o `id` da pessoa. É UNIQUE porque a
-- política de escrita do balde o usa como chave — dois perfis com o mesmo
-- prefixo escreviam um por cima do outro.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_prefixo TEXT;

-- Quando é que a fotografia mudou. Serve para se poder invalidar uma cache sem
-- ter de comparar endereços, e para se saber a idade de um ficheiro órfão.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_atualizado_at TIMESTAMPTZ;

-- Preenche quem ainda não tem. Repetível: só toca em quem está a nulo.
UPDATE public.user_profiles
SET avatar_prefixo = replace(gen_random_uuid()::text, '-', '')
WHERE avatar_prefixo IS NULL;

-- Daqui para a frente nasce preenchido, e é a base que o gera — não a
-- aplicação. Um prefixo escrito pelo cliente é um prefixo escolhido pelo
-- cliente, e a política de escrita do balde assenta nele.
ALTER TABLE public.user_profiles
  ALTER COLUMN avatar_prefixo SET DEFAULT replace(gen_random_uuid()::text, '-', '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_avatar_prefixo_key'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_avatar_prefixo_key UNIQUE (avatar_prefixo);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE avatar_prefixo IS NULL) THEN
    RAISE EXCEPTION 'Ha perfis sem avatar_prefixo; o preenchimento acima falhou.';
  END IF;
  -- Só se aperta o NOT NULL depois de o preenchimento estar provado, senão uma
  -- base com linhas antigas rebentava a migração em vez de as corrigir.
  ALTER TABLE public.user_profiles ALTER COLUMN avatar_prefixo SET NOT NULL;
END $$;

-- É por aqui que se resolve um prefixo vindo de um caminho de ficheiro, tanto
-- na política do balde como na limpeza de órfãos.
CREATE INDEX IF NOT EXISTS idx_user_profiles_avatar_prefixo
  ON public.user_profiles(avatar_prefixo);

-- =============================================================================
-- 2. Fechar a coluna que dava a assinatura de graça
-- =============================================================================
--
-- A ordem importa: revoga-se tudo primeiro e devolve-se só o que se quer. Um
-- `GRANT` de coluna não anula um `GRANT` de tabela que já lá esteja — os dois
-- somam-se, e o de tabela ganha por ser mais largo.

REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM authenticated;

-- A `anon` fica sem nada, incluindo a leitura. A RLS já lhe negava tudo — não
-- há política para `anon` —, mas uma tabela de pessoas não precisa de estar ao
-- alcance de uma chave que anda publicada no JavaScript da página. Duas redes
-- em sítios diferentes, e a de fora é a mais barata de verificar.
REVOKE ALL ON public.user_profiles FROM anon;

-- O que uma pessoa pode mesmo escrever no seu perfil pelo PostgREST: o nome, e
-- mais nada. A fotografia não está aqui de propósito — o `avatar_url` só pode
-- apontar para um ficheiro que passou pelo cano de `lib/perfil/fotografia`, e
-- deixar o cliente escrevê-lo à mão era deixá-lo apontar o avatar para
-- qualquer endereço da internet, servido a partir da caixa de entrada de outra
-- pessoa como se fosse nosso.
GRANT UPDATE (full_name) ON public.user_profiles TO authenticated;

-- A leitura continua a ser a linha inteira, e continua a ser só a própria
-- (política "Users can view own profile"). Não se abre leitura a terceiros:
-- quem precisa do nome e da fotografia da outra parte de uma conversa é o
-- servidor, que lê pela chave de serviço depois de confirmar que as duas
-- pessoas estão mesmo na mesma conversa. Uma política que deixasse um
-- autenticado ler o perfil de outro transformava a tabela num directório de
-- toda a gente que tem conta.
GRANT SELECT ON public.user_profiles TO authenticated;

-- =============================================================================
-- 3. O gatilho de registo, com as duas coisas que lhe faltavam
-- =============================================================================
--
-- 1. `SET search_path`. Uma função `SECURITY DEFINER` sem `search_path` fixo
--    resolve `public.user_profiles` pelo caminho de quem a chama; quem
--    conseguir pôr um esquema à frente do `public` faz a função escrever na
--    tabela dele com os privilégios do dono. É o aviso que o próprio linter da
--    Supabase dá, e custa uma linha.
-- 2. `ON CONFLICT DO NOTHING`. Sem isso, um `INSERT` em `auth.users` para um
--    `id` que já tenha perfil rebenta — e leva o registo atrás.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Quem já tinha conta antes de o gatilho existir — ou antes de ele deixar de
-- rebentar — fica sem perfil e sem prefixo, e portanto sem sítio onde pôr uma
-- fotografia. Repetível: o `ON CONFLICT` é quem torna isto idempotente.
INSERT INTO public.user_profiles (id)
SELECT u.id FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. O balde das fotografias de perfil
-- =============================================================================
--
-- **Balde próprio, e não o `images`.** O `images` é o das fotografias de
-- anúncio, onde escreve a administração; misturar os dois faz de qualquer
-- limite, política ou limpeza que se queira aplicar a um deles uma decisão
-- sobre o outro. E são regimes diferentes: no `images` escreve quem administra
-- o site, aqui escreve qualquer pessoa com conta.
--
-- O bloco corre só onde existe `storage.objects`. Numa base local sem a
-- extensão de armazenamento da Supabase — que é o caso do PostgreSQL contra o
-- qual esta migração é validada — o resto da migração continua a valer e a
-- verificar-se, e este bloco diz que saltou em vez de rebentar.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'Sem schema storage: o balde dos avatares nao foi criado (base local).';
    RETURN;
  END IF;

  -- Público de leitura porque a fotografia aparece num `<img>` na caixa de
  -- entrada da outra pessoa, e um endereço assinado que expira transformava
  -- cada linha da lista num pedido ao servidor. O que protege quem não quer
  -- ser encontrado não é o balde ser privado — é o endereço não se derivar da
  -- identidade, que é o que o `avatar_prefixo` faz.
  --
  -- Os limites são os mesmos que a rota aplica, escritos também aqui pela razão
  -- que a `20260904000003` deixou escrita: uma verificação que vive num sítio
  -- só é uma verificação que se perde na primeira distracção.
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('avatares', 'avatares', true, 8388608,
          ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS "Leitura publica dos avatares" ON storage.objects;
  CREATE POLICY "Leitura publica dos avatares"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'avatares');

  -- Cada pessoa escreve debaixo do seu prefixo, e de mais nenhum.
  --
  -- Na prática nenhuma escrita passa por aqui — quem escreve é a rota, com a
  -- chave de serviço, que salta a RLS por definição. Esta política é a segunda
  -- rede: se um dia alguém escrever uma rota nova e se esquecer de validar o
  -- caminho, ou se a chave anónima for usada directamente contra o balde, é
  -- isto que trava.
  DROP POLICY IF EXISTS "Escrita do proprio avatar" ON storage.objects;
  CREATE POLICY "Escrita do proprio avatar"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'avatares'
      AND (storage.foldername(name))[1] = (
        SELECT p.avatar_prefixo FROM public.user_profiles p WHERE p.id = auth.uid()
      )
    );

  DROP POLICY IF EXISTS "Substituicao do proprio avatar" ON storage.objects;
  CREATE POLICY "Substituicao do proprio avatar"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'avatares'
      AND (storage.foldername(name))[1] = (
        SELECT p.avatar_prefixo FROM public.user_profiles p WHERE p.id = auth.uid()
      )
    );

  DROP POLICY IF EXISTS "Remocao do proprio avatar" ON storage.objects;
  CREATE POLICY "Remocao do proprio avatar"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'avatares'
      AND (storage.foldername(name))[1] = (
        SELECT p.avatar_prefixo FROM public.user_profiles p WHERE p.id = auth.uid()
      )
    );
END $$;


-- ─────────────────────────────────────────────────────────────────────
-- 20260911000001_chat_escrita_do_cliente.sql
-- ─────────────────────────────────────────────────────────────────────
-- Migração: fechar a escrita do cliente nas tabelas do chat
-- Data: 2026-09-11
--
-- ── O buraco, e porque é que ele sobreviveu a uma revisão ───────────────────
--
-- A `20260829000002_marketplace_chat.sql` criou esta política:
--
--   CREATE POLICY "conversas_update_participante"
--     ON marketplace_conversas FOR UPDATE
--     USING      (auth.uid() = comprador_id OR auth.uid() = vendedor_id)
--     WITH CHECK (auth.uid() = comprador_id OR auth.uid() = vendedor_id);
--
-- Lida em voz alta, responde à pergunta certa: «só um participante escreve na
-- conversa». E é **exactamente a mesma forma de erro** que a
-- `20260910000001_perfil_com_fotografia.sql` já descreve a propósito da
-- `user_profiles`: **a RLS decide que linhas, não que colunas.** O `GRANT` é
-- sobre a tabela inteira (é o que a Supabase dá por omissão a `authenticated`,
-- e é o que o `__tests__/sql/05-privilegios.sql` reproduz), e nesta linha vivem
-- as três colunas que dizem **de quem é a conversa**:
--
--   cavalo_id      -- o anúncio
--   comprador_id   -- uma das duas pessoas
--   vendedor_id    -- a outra
--
-- O `WITH CHECK` só exige que quem escreve continue a ser **uma** das duas. A
-- outra é livre. Com a chave anónima — que anda no JavaScript da página, e é
-- suposto andar — e a sua própria sessão, qualquer participante de qualquer
-- conversa podia fazer:
--
--   PATCH /rest/v1/marketplace_conversas?id=eq.<uma conversa minha>
--   {"comprador_id": "<a vítima>", "vendedor_id": "<eu>"}
--
-- e com isso três coisas de uma vez:
--
--   1. **Entregar a uma terceira pessoa o fio de outra.** As mensagens que o
--      comprador original escreveu continuam lá, e a
--      `mensagens_select_participante` resolve a visibilidade **pela conversa**:
--      quem entra na conversa lê o histórico todo. Reproduzido: a vítima passa
--      de zero mensagens visíveis a ler o corpo que o comprador original tinha
--      escrito.
--   2. **Falar com qualquer pessoa de quem se saiba o UUID**, sem anúncio, sem
--      o `cavalo.status` ter de estar activo, e **sem passar pelo
--      `MAX_CONVERSAS_NOVAS_POR_MINUTO`** — o limite de ritmo do
--      `app/api/conversas` só corre no ramo que **cria** o fio, e aqui o fio já
--      existe. O gatilho do destinatário deriva-o da conversa, portanto a
--      mensagem seguinte é dirigida à vítima, que recebe o empurrão do Realtime
--      e um email do nosso servidor.
--   3. **Ler o nome e a fotografia de perfil de qualquer UUID.** A
--      `GET /api/conversas` carrega o perfil da outra parte com a chave de
--      serviço, a partir do `vendedor_id`/`comprador_id` da linha. A decisão
--      escrita na `20260910000001` — «não se abre leitura de `user_profiles` a
--      terceiros, senão a tabela é um directório de toda a gente» — desfaz-se
--      por aqui sem lhe tocar.
--
-- E o comprador original **perde** o fio: deixa de ver a conversa onde escreveu.
--
-- Nada disto precisa de um defeito novo: precisa de um `PATCH` e de um UUID.
--
-- ── Porque é que a política não era necessária para nada ────────────────────
--
-- Contado ficheiro a ficheiro: **nenhum** caminho deste repositório escreve em
-- `marketplace_conversas` ou em `marketplace_mensagens` com a chave anónima.
-- As únicas escritas são `app/api/conversas/**`, todas por `supabaseAdmin`, e os
-- dois gatilhos da `20260909000001`. O `arquivada_*` — a única coluna que uma
-- política de UPDATE para um participante poderia querer servir — não tem rota
-- nenhuma que a escreva: quem a põe a `false` é o gatilho, e quem a lê é o
-- `lib/chat/vista-publica`. A política autorizava uma operação que o produto
-- não faz.
--
-- É a mesma repartição que a `20260910000001` deixou escrita: **todos os
-- caminhos de escrita deste repositório vão por `supabaseAdmin`**, que é onde há
-- sessão verificada, limite de ritmo e validação.
--
-- ── Dois trincos, e cada um vale por si ────────────────────────────────────
--
-- 1. O `REVOKE`. É quem sabe falar de colunas, e é por isso que foi o `GRANT` —
--    e não a política — que corrigiu a `user_profiles`. Aqui não há coluna
--    nenhuma a salvar, por isso revoga-se a escrita inteira.
--
-- 2. A identidade da conversa passa a ser **imutável**, por gatilho. Sem isto,
--    um `GRANT ALL` escrito num dia apressado — ou um `ALTER DEFAULT
--    PRIVILEGES` da Supabase a passar outra vez — reabre o buraco sem que
--    ninguém toque numa política. Uma conversa **é** (anúncio, comprador,
--    vendedor); se esses três mudam, não é a mesma conversa, e mudá-los é
--    reescrever o histórico de quem lá escreveu.
--
-- O `GRANT SELECT` **não** se mexe, e não é por descuido: a
-- `mensagens_select_participante` faz um `EXISTS` sobre
-- `marketplace_conversas`, e a expressão de uma política corre com os
-- privilégios de quem invoca. Sem `SELECT` na conversa, cada entrega do
-- Realtime falhava com «permission denied» em vez de devolver as linhas certas.
--
-- ── Quando houver rota de arquivo ───────────────────────────────────────────
--
-- Escrever-se-á com as duas metades que faltavam aqui: `GRANT UPDATE
-- (arquivada_comprador)` / `(arquivada_vendedor)` — de **coluna**, nunca de
-- tabela — e uma política que só deixe cada lado tocar na sua. Ou, mais simples,
-- uma rota por `supabaseAdmin`, como todas as outras.
--
-- ── Idempotente ─────────────────────────────────────────────────────────────
--
-- Aplica-se duas vezes sem diferença, e isso é verificado por
-- `__tests__/lib/chat-rls.sql.test.ts` contra um PostgreSQL a sério, com um
-- braço «antes» que reproduz o sequestro e rebenta se deixar de o reproduzir.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.marketplace_conversas') IS NULL
     OR to_regclass('public.marketplace_mensagens') IS NULL THEN
    RAISE EXCEPTION
      'As tabelas do chat nao existem. Aplique primeiro a migracao 20260829000002_marketplace_chat.sql.';
  END IF;
END $$;

-- =============================================================================
-- 1. Primeiro trinco: o privilégio
-- =============================================================================
-- Um `REVOKE` de um privilégio que não está lá é uma no-op, e é o que torna
-- isto repetível.

REVOKE INSERT, UPDATE, DELETE ON public.marketplace_conversas FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.marketplace_conversas FROM anon;

-- Nas mensagens, o `UPDATE` e o `DELETE` já eram negados pela RLS — não há
-- política nenhuma para nenhum dos dois. O `REVOKE` é o segundo trinco do
-- mesmo sítio: sem ele, uma política mal escrita no futuro volta a abrir a
-- reescrita do histórico de alguém.
--
-- O `INSERT` fica como está, de propósito: a `mensagens_insert_participante`
-- exige `auth.uid() = remetente_id` **e** participação na conversa, e é uma
-- decisão tomada e escrita na `20260909000001`. O que ela deixa passar — uma
-- mensagem escrita por fora do `app/api/conversas`, e por isso por fora do
-- `validarMensagem` e do `MAX_MENSAGENS_POR_MINUTO` — está descrito no relatório
-- desta revisão como proposta, e não se decide aqui.
REVOKE UPDATE, DELETE ON public.marketplace_mensagens FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.marketplace_mensagens FROM anon;

-- A política que autorizava um UPDATE sem colunas. Sai porque não serve nada
-- (ver a nota acima) e porque deixá-la é deixar uma arma carregada à espera de
-- um `GRANT`.
DROP POLICY IF EXISTS "conversas_update_participante" ON public.marketplace_conversas;

-- =============================================================================
-- 2. Segundo trinco: a identidade da conversa é imutável
-- =============================================================================
-- Vale para **todos** os papéis, a chave de serviço incluída, e é de propósito:
-- o que se está a afirmar não é um privilégio, é o modelo de dados. Nenhuma rota
-- deste repositório escreve nestas três colunas depois do `INSERT`.
--
-- Uma reparação manual legítima existe e tem um nome: desligar o gatilho dentro
-- de uma transacção, consciente do que se está a fazer. É precisamente o que
-- não se consegue fazer com um `PATCH` de PostgREST.
--
-- `IS DISTINCT FROM` e não `<>` para que um UPDATE que reescreva o mesmo valor
-- passe — é o que o `trg_conversas_ultima_mensagem` faz a cada mensagem.
CREATE OR REPLACE FUNCTION public.marketplace_conversas_identidade_imutavel()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.cavalo_id IS DISTINCT FROM OLD.cavalo_id
     OR NEW.comprador_id IS DISTINCT FROM OLD.comprador_id
     OR NEW.vendedor_id IS DISTINCT FROM OLD.vendedor_id THEN
    RAISE EXCEPTION
      'A identidade de uma conversa (cavalo_id, comprador_id, vendedor_id) nao se altera.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_conversas_identidade_imutavel ON public.marketplace_conversas;
CREATE TRIGGER trg_conversas_identidade_imutavel
  BEFORE UPDATE OF cavalo_id, comprador_id, vendedor_id ON public.marketplace_conversas
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_conversas_identidade_imutavel();


COMMIT;

-- =============================================================================
--  Confirmacao: estas tres linhas devem dar, por esta ordem: 3, 2, 0
-- =============================================================================
SELECT count(*) AS tabelas_do_chat        FROM information_schema.tables
  WHERE table_name LIKE 'marketplace%';
SELECT count(*) AS colunas_do_tempo_real  FROM information_schema.columns
  WHERE table_name = 'marketplace_mensagens'
    AND column_name IN ('destinatario_id','entregue_at');
SELECT count(*) AS politica_do_sequestro  FROM pg_policies
  WHERE tablename = 'marketplace_conversas'
    AND policyname = 'conversas_update_participante';
