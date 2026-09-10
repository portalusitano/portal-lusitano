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
