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
