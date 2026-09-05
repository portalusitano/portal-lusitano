// Ensure this module is only imported server-side (service role key must never reach the browser)
if (typeof window !== "undefined") {
  throw new Error(
    "[Security] lib/supabase-admin.ts contains the Supabase service role key and must only be used server-side. " +
      "Use NEXT_PUBLIC_SUPABASE_ANON_KEY directly in client components instead."
  );
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Falha alto quando falta configuração — mas em execução, não durante o build.
//
// `next build` corre com `NODE_ENV=production`, por isso a condição anterior
// disparava ao recolher os dados das páginas e o build morria em qualquer
// máquina sem credenciais de produção: era o que punha o CI vermelho neste
// repositório. O comentário que aqui estava dizia «fail loudly at runtime», que
// é a intenção certa; só a condição é que não a exprimia.
//
// Compilar não é executar. Um build que precise de credenciais reais é um
// build que ninguém consegue verificar num pull request.
const durantEoBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  if (!durantEoBuild && process.env.NODE_ENV === "production") {
    throw new Error("Missing required Supabase environment variables");
  }
}

// Sem configuração, constrói-se um cliente para um endereço que não existe.
//
// O `createClient` do Supabase recusa um URL vazio e rebenta ao ser
// construído — e como isto corre à cabeça do módulo, rebentava o build
// inteiro. Um endereço de brincar deixa o módulo carregar; quem tentar usá-lo
// a sério apanha um erro de rede, e em produção o aviso acima já disparou
// muito antes disso.
const URL_INEXISTENTE = "http://supabase.invalid";
const CHAVE_VAZIA = "sem-configuracao";

// Cliente admin (service role) — para webhooks e rotas admin que precisam de acesso elevado
// Database types available at @/lib/database.types for typed queries
export const supabaseAdmin = createClient(
  supabaseUrl || URL_INEXISTENTE,
  supabaseServiceKey || CHAVE_VAZIA
);

// Cliente padrão (anon key) — respeita RLS policies
export const supabasePublic = createClient(
  supabaseUrl || URL_INEXISTENTE,
  supabaseAnonKey || CHAVE_VAZIA
);

// Alias para compatibilidade — usa anon key (respeita RLS)
export const supabase = supabasePublic;
