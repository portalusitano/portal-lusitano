-- O braço «antes» do A/B: a mesma escalada de privilégio, contra uma base com
-- a `004_user_auth_tools.sql` aplicada e **sem** a migração do perfil.
--
-- Isto existe porque uma correcção sem o defeito reproduzido é uma afirmação
-- sobre o passado que ninguém verificou. As provas do `40-perfil.sql` mostram
-- que hoje a base recusa; este ficheiro mostra que ontem aceitava, e as duas
-- correm na mesma máquina e na mesma corrida de testes.
BEGIN;

INSERT INTO auth.users(id, email)
VALUES ('aaaa1111-1111-1111-1111-111111111111', 'ana@exemplo.pt')
ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- A política aprova: a linha **é** dela. E o GRANT é sobre a tabela inteira,
-- por isso a coluna que decide se alguém pagou está do lado de dentro.
UPDATE public.user_profiles
SET tools_subscription_status = 'active', stripe_customer_id = 'cus_forjado'
WHERE id = 'aaaa1111-1111-1111-1111-111111111111';
RESET ROLE;

DO $$
DECLARE estado text; cliente text;
BEGIN
  SELECT tools_subscription_status, stripe_customer_id INTO estado, cliente
    FROM public.user_profiles WHERE id = 'aaaa1111-1111-1111-1111-111111111111';

  -- Se isto disparar, o braço «antes» deixou de reproduzir o defeito e a prova
  -- do braço «depois» passa a não querer dizer nada.
  IF estado IS DISTINCT FROM 'active' OR cliente IS DISTINCT FROM 'cus_forjado' THEN
    RAISE EXCEPTION
      'antes: a escalada NAO passou (%, %) — o A/B perdeu o braco de controlo', estado, cliente;
  END IF;
END $$;

/* Pelo stdout, pela mesma razão do `40-perfil.sql`: um NOTICE vai para o
   stderr e quem corre isto lê o stdout. */
SELECT 'antes: a escalada passou (' || tools_subscription_status || ', ' ||
       stripe_customer_id || ')' AS resumo
  FROM public.user_profiles WHERE id = 'aaaa1111-1111-1111-1111-111111111111';

COMMIT;
