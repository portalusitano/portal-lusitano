import { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { apiSuccess } from "@/lib/api-helpers";
import { createApiRoute } from "@/lib/createApiRoute";

interface DiagnosticoCheck {
  status: string;
  message?: string;
  email?: string | null;
  error?: unknown;
  total_registos?: number;
  [key: string]: unknown;
}

export const GET = createApiRoute(
  async (_req: NextRequest, ctx) => {
    const diagnostico: {
      timestamp: string;
      checks: Record<string, DiagnosticoCheck>;
      resumo?: { total: number; ok: number; falhas: number; status: string };
    } = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // 1. VERIFICAR AUTENTICAÇÃO
    diagnostico.checks.autenticacao = {
      status: "✅ OK",
      email: ctx.auth.email,
      message: "Sessão válida",
    };

    // 2. VERIFICAR CONEXÃO SUPABASE
    try {
      const { error } = await supabase.from("payments").select("id").limit(1);

      diagnostico.checks.supabase_conexao = {
        status: error ? "❌ ERRO" : "✅ OK",
        message: error ? "Erro na conexão com Supabase" : "Conexão com Supabase OK",
        error: error || null,
      };
    } catch (error) {
      diagnostico.checks.supabase_conexao = {
        status: "❌ ERRO",
        message: "Erro na conexão com Supabase",
      };
    }

    // 3. VERIFICAR TABELA payments
    try {
      const { error, count } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true });

      diagnostico.checks.tabela_payments = {
        status: error ? "❌ NÃO EXISTE ou SEM PERMISSÃO" : "✅ EXISTE",
        total_registos: count || 0,
        error: error || null,
      };
    } catch (error) {
      diagnostico.checks.tabela_payments = {
        status: "❌ ERRO",
        message: "Erro ao verificar tabela payments",
      };
    }

    // 4. VERIFICAR TABELA contact_submissions
    try {
      const { error, count } = await supabase
        .from("contact_submissions")
        .select("*", { count: "exact", head: true });

      diagnostico.checks.tabela_contact_submissions = {
        status: error ? "❌ NÃO EXISTE ou SEM PERMISSÃO" : "✅ EXISTE",
        total_registos: count || 0,
        error: error || null,
      };
    } catch (error) {
      diagnostico.checks.tabela_contact_submissions = {
        status: "❌ ERRO",
        message: "Erro ao verificar tabela contact_submissions",
      };
    }

    // 5. VERIFICAR TABELA leads
    try {
      const { error, count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      diagnostico.checks.tabela_leads = {
        status: error ? "❌ NÃO EXISTE ou SEM PERMISSÃO" : "✅ EXISTE",
        total_registos: count || 0,
        error: error || null,
      };
    } catch (error) {
      diagnostico.checks.tabela_leads = {
        status: "❌ ERRO",
        message: "Erro ao verificar tabela leads",
      };
    }

    // 6. VERIFICAR VARIÁVEIS DE AMBIENTE
    diagnostico.checks.variaveis_ambiente = {
      status: [
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        process.env.ADMIN_EMAIL,
        process.env.ADMIN_PASSWORD_HASH,
        process.env.ADMIN_SECRET,
      ].every(Boolean)
        ? "✅ OK"
        : "⚠️ INCOMPLETO",
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Definida" : "❌ Não definida",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "✅ Definida"
        : "❌ Não definida",
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ? "✅ Definida" : "❌ Não definida",
      ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH ? "✅ Definida" : "❌ Não definida",
      ADMIN_SECRET: process.env.ADMIN_SECRET ? "✅ Definida" : "❌ Não definida",
    };

    // 7. RESUMO
    const totalChecks = Object.keys(diagnostico.checks).length;
    const checksOK = Object.values(diagnostico.checks).filter(
      (check: { status?: string }) => typeof check === "object" && check.status?.includes("✅")
    ).length;

    diagnostico.resumo = {
      total: totalChecks,
      ok: checksOK,
      falhas: totalChecks - checksOK,
      status: checksOK === totalChecks ? "✅ TUDO OK" : "⚠️ ALGUNS PROBLEMAS",
    };

    return apiSuccess(diagnostico);
  },
  { auth: "admin" }
);
