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
