"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import { useHorseFavorites } from "@/context/HorseFavoritesContext";
import AuthGuard from "@/components/auth/AuthGuard";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import LocalizedLink from "@/components/LocalizedLink";
import { Mail, LogOut, Loader2, Check, Pencil, Star, BarChart2 } from "lucide-react";

/**
 * Rótulos históricos de ferramentas que o portal já teve.
 *
 * Mantidos só para dar nome a registos antigos que ainda referem estas
 * chaves; nenhuma delas corresponde hoje a uma funcionalidade do site.
 */
const TOOL_LABELS: Record<string, string> = {
  calculadora: "Calculadora de Valor (descontinuada)",
  comparador: "Comparador de Cavalos (descontinuado)",
  compatibilidade: "Verificador de Compatibilidade (descontinuado)",
  perfil: "Análise de Perfil (descontinuada)",
};

function PerfilContent() {
  const { user, signOut } = useAuth();
  const { t, language } = useLanguage();
  const tr = createTranslator(language);
  const router = useRouter();
  const { favoritesCount } = useHorseFavorites();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState<string>((user?.user_metadata?.full_name as string) || "");
  const [saving, setSaving] = useState(false);
  const [toolUsage, setToolUsage] = useState<{ tool_name: string; count: number }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchProfileData() {
      try {
        const supabase = createSupabaseBrowserClient();

        // Histórico de uso por ferramenta
        const { data: usage } = await supabase
          .from("tool_usage")
          .select("tool_name")
          .eq("user_id", user!.id);

        if (usage && usage.length > 0) {
          const counts: Record<string, number> = {};
          for (const row of usage) {
            counts[row.tool_name] = (counts[row.tool_name] || 0) + 1;
          }
          const sorted = Object.entries(counts)
            .map(([tool_name, count]) => ({ tool_name, count }))
            .sort((a, b) => b.count - a.count);
          setToolUsage(sorted);
        }
      } catch {
        // silenced
      } finally {
        setLoadingData(false);
      }
    }

    fetchProfileData();
  }, [user]);

  const handleSaveName = async () => {
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.updateUser({
        data: { full_name: name },
      });
      setEditingName(false);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-3xl">{t.profile.my_profile}</h1>

        {/* User Info */}
        <div className="bg-[var(--background-secondary)] cartao p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--foreground-strong)] flex items-center justify-center text-black text-xl font-bold">
              {(name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[var(--background-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm flex-1 focus:border-[var(--border-hover)] outline-none"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="p-1.5 bg-[var(--foreground-strong)] rounded-lg text-black"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">{name || t.profile.no_name}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)] transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] mt-1">
                <Mail size={14} />
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Favoritos */}
        <div className="bg-[var(--background-secondary)] cartao p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="text-[var(--foreground-muted)]" size={20} />
              <h2 className="text-lg font-medium">{tr("Favoritos", "Favourites", "Favoritos")}</h2>
            </div>
            <span className="text-2xl text-[var(--foreground-muted)]">{favoritesCount}</span>
          </div>
          {favoritesCount > 0 && (
            <LocalizedLink
              href="/comprar"
              className="mt-3 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)] transition-colors inline-block"
            >
              {tr("Ver cavalos guardados →", "View saved horses →", "Ver caballos guardados →")}
            </LocalizedLink>
          )}
        </div>

        {/* Histórico de Uso */}
        <div className="bg-[var(--background-secondary)] cartao p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart2 className="text-[var(--foreground-secondary)]" size={20} />
            <h2 className="text-lg font-medium">{t.profile.usage_history}</h2>
          </div>

          {loadingData ? (
            <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
              <Loader2 size={14} className="animate-spin" />
              <span>{tr("A carregar...", "Loading...", "Cargando...")}</span>
            </div>
          ) : toolUsage.length > 0 ? (
            <div className="space-y-2">
              {toolUsage.map(({ tool_name, count }) => (
                <div
                  key={tool_name}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <span className="text-sm text-[var(--foreground-secondary)]">
                    {TOOL_LABELS[tool_name] || tool_name}
                  </span>
                  <span className="text-sm font-medium text-[var(--foreground-muted)]">
                    {count}× {count === 1 ? tr("uso", "use", "uso") : tr("usos", "uses", "usos")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">{t.profile.usage_history_desc}</p>
          )}
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl text-[var(--foreground-secondary)] text-sm font-medium hover:text-[var(--erro)] hover:border-[var(--erro)] transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          {t.profile.sign_out}
        </button>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <AuthGuard>
      <PerfilContent />
    </AuthGuard>
  );
}
