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
