-- Reproduz, no essencial, o estado que a base de produção tem hoje: os papéis
-- do Supabase, as tabelas envolvidas, os GRANTs por omissão do Supabase
-- (ALL a anon e authenticated) e as políticas exactamente como `pg_policies`
-- as mostra — incluindo os nomes trocados.

-- Os papéis são do agrupamento e não da base: recriar a base não os apaga,
-- por isso criam-se só se faltarem. Sem isto, correr a validação uma segunda
-- vez rebenta logo na primeira linha.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- ── Tabelas com o RLS desligado ──────────────────────────────────────────────
CREATE TABLE admin_chat_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_email text, message text);
CREATE TABLE admin_chat_read_receipts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reader_email text);
CREATE TABLE favoritos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_email text, item_id uuid, item_type text);
CREATE TABLE linhagens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text);
CREATE TABLE profissionais_analytics_daily (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dia date);
CREATE TABLE reviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text);
CREATE TABLE eventos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, destaque boolean, views_count int, data_inicio timestamptz);

-- ── Tabelas com políticas cujo nome mente ────────────────────────────────────
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text,
  stripe_payment_intent_id text,
  email text,
  amount bigint,
  currency text,
  status text
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service role" ON payments FOR ALL USING (true);

CREATE TABLE leads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, nome text);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service role" ON leads FOR ALL USING (true);

CREATE TABLE contact_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, form_data jsonb, ip_address text);
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service role" ON contact_submissions FOR ALL USING (true);
CREATE POLICY "contact_submissions_service_role" ON contact_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE admin_tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titulo text);
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can do everything on tasks" ON admin_tasks FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE admin_automations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text);
ALTER TABLE admin_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can do everything on automations" ON admin_automations FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE admin_automation_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), detalhe text);
ALTER TABLE admin_automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can do everything on automation logs" ON admin_automation_logs FOR ALL USING (true) WITH CHECK (true);

-- ── Carrinhos ────────────────────────────────────────────────────────────────
CREATE TABLE abandoned_carts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_abandoned_carts" ON abandoned_carts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_insert_abandoned_carts" ON abandoned_carts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public_update_own_cart" ON abandoned_carts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TABLE cart_recovery_emails (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
ALTER TABLE cart_recovery_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_recovery_emails" ON cart_recovery_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cart_recovery_emails_service_role" ON cart_recovery_emails FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE cart_recovery_stats (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), total int);
ALTER TABLE cart_recovery_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_recovery_stats" ON cart_recovery_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── coudelarias ──────────────────────────────────────────────────────────────
CREATE TABLE coudelarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text, nome text, descricao text, status text, deleted_at timestamptz,
  views_count int DEFAULT 0
);
ALTER TABLE coudelarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coudelarias ativas são públicas" ON coudelarias FOR SELECT USING (status = 'active');
CREATE POLICY "Coudelarias aprovadas visíveis para todos" ON coudelarias FOR SELECT USING (status = 'aprovado' AND deleted_at IS NULL);
CREATE POLICY "Service role pode inserir" ON coudelarias FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role pode atualizar" ON coudelarias FOR UPDATE USING (true);

-- ── seller_ratings ───────────────────────────────────────────────────────────
CREATE TABLE seller_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cavalo_id uuid, buyer_email text, rating int, comment text
);
ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller_ratings_select_public" ON seller_ratings FOR SELECT USING (true);
CREATE POLICY "seller_ratings_insert_authenticated" ON seller_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "seller_ratings_service_role" ON seller_ratings FOR ALL USING (current_setting('request.jwt.claim.role', true) = 'service_role');

-- ── GRANTs por omissão do Supabase ───────────────────────────────────────────
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
