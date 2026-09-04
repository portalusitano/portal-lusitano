-- As mesmas operações, agora com a migração aplicada. Cada bloco tem de falhar.
-- O `EXCEPTION WHEN insufficient_privilege` apanha o "permission denied" do
-- GRANT; a violação de RLS chega como `insufficient_privilege` também.

\set ON_ERROR_STOP off
\echo ''
\echo '========== O QUE `anon` CONSEGUE FAZER, DEPOIS =========='
\echo ''

CREATE OR REPLACE FUNCTION tentar(rotulo text, sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
  RAISE WARNING 'AINDA PASSA  <<<<<< %', rotulo;
EXCEPTION
  WHEN insufficient_privilege THEN RAISE NOTICE 'bloqueado    %', rotulo;
  WHEN OTHERS THEN RAISE NOTICE 'bloqueado    % (%)', rotulo, SQLERRM;
END $$ LANGUAGE plpgsql;

-- Dados de partida, postos pelo dono da tabela (o service role faria o mesmo).
INSERT INTO favoritos (user_email, item_id, item_type) VALUES ('vitima@exemplo.pt', gen_random_uuid(), 'cavalo');
INSERT INTO admin_chat_messages (sender_email, message) VALUES ('admin@portal-lusitano.pt', 'segredo');
INSERT INTO payments (stripe_session_id, email, amount, currency, status) VALUES ('cs_real', 'cliente@exemplo.pt', 4900, 'eur', 'succeeded');
INSERT INTO admin_tasks (titulo) VALUES ('tarefa a serio');

SET ROLE anon;

SELECT tentar('favoritos SELECT',            'SELECT * FROM favoritos');
SELECT tentar('favoritos DELETE',            'DELETE FROM favoritos');
SELECT tentar('admin_chat_messages SELECT',  'SELECT * FROM admin_chat_messages');
SELECT tentar('admin_chat_messages INSERT',  'INSERT INTO admin_chat_messages (sender_email, message) VALUES (''x'', ''y'')');
SELECT tentar('payments SELECT',             'SELECT * FROM payments');
SELECT tentar('payments INSERT forjado',     'INSERT INTO payments (stripe_session_id, email, amount, currency, status) VALUES (''cs_forjado'', ''a@b.pt'', 1, ''eur'', ''succeeded'')');
SELECT tentar('leads SELECT',                'SELECT * FROM leads');
SELECT tentar('contact_submissions SELECT',  'SELECT * FROM contact_submissions');
SELECT tentar('contact_submissions UPDATE',  'UPDATE contact_submissions SET form_data = ''{}''');
SELECT tentar('admin_tasks SELECT',          'SELECT * FROM admin_tasks');
SELECT tentar('admin_tasks INSERT',          'INSERT INTO admin_tasks (titulo) VALUES (''injectada'')');
SELECT tentar('admin_automations SELECT',    'SELECT * FROM admin_automations');
SELECT tentar('abandoned_carts SELECT',      'SELECT * FROM abandoned_carts');
SELECT tentar('cart_recovery_emails SELECT', 'SELECT * FROM cart_recovery_emails');
SELECT tentar('reviews SELECT',              'SELECT * FROM reviews');
SELECT tentar('linhagens SELECT',            'SELECT * FROM linhagens');
SELECT tentar('eventos SELECT',              'SELECT * FROM eventos');
SELECT tentar('coudelarias UPDATE',          'UPDATE coudelarias SET nome = ''pirata''');
SELECT tentar('coudelarias INSERT',          'INSERT INTO coudelarias (slug, nome, status) VALUES (''p'', ''p'', ''active'')');
SELECT tentar('coudelarias DELETE',          'DELETE FROM coudelarias');
SELECT tentar('seller_ratings INSERT',       'INSERT INTO seller_ratings (cavalo_id, buyer_email, rating) VALUES (gen_random_uuid(), ''x@y.pt'', 5)');

\echo ''
\echo '--- O QUE TEM DE CONTINUAR A FUNCIONAR ---'
\echo ''
\echo 'app/mapa/page.tsx le coudelarias activas com a chave anonima:'
SELECT count(*) AS coudelarias_activas_visiveis FROM coudelarias WHERE status = 'active';
\echo 'a ficha mostra as avaliacoes do vendedor:'
SELECT count(*) AS avaliacoes_visiveis FROM seller_ratings;

RESET ROLE;

\echo ''
\echo '--- O SERVICE ROLE CONTINUA A PASSAR (e por ele que o site todo le) ---'
\echo ''
SET ROLE service_role;
SELECT count(*) AS payments_pelo_service_role FROM payments;
SELECT count(*) AS favoritos_pelo_service_role FROM favoritos;
SELECT count(*) AS admin_tasks_pelo_service_role FROM admin_tasks;
RESET ROLE;

\echo ''
\echo '--- UM PAGAMENTO, UM ANUNCIO: a segunda entrega do mesmo evento rebenta ---'
\echo ''
SELECT tentar('payments duplicado', 'INSERT INTO payments (stripe_session_id, email, amount, currency, status) VALUES (''cs_real'', ''cliente@exemplo.pt'', 4900, ''eur'', ''succeeded'')');
SELECT count(*) AS linhas_para_cs_real FROM payments WHERE stripe_session_id = 'cs_real';
