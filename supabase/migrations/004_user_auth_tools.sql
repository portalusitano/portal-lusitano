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
