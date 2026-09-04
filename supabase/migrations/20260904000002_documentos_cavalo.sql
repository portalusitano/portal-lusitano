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
