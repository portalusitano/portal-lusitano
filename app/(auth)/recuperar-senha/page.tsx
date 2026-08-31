"use client";

import { useState, useCallback } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useLanguage } from "@/context/LanguageContext";
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const { t } = useLanguage();

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("O email é obrigatório.");
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/perfil`,
      });
      // Always show success to prevent email enumeration
      setSent(true);
    } catch {
      // Still show success — prevents enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-[var(--elevate-1)] border border-[var(--border-soft)] rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle style={{ color: "var(--ok)" }} size={32} aria-hidden="true" />
        </div>
        <h2 className="text-xl text-[var(--foreground)] mb-2">{t.auth.email_sent}</h2>
        <p className="text-sm text-[var(--foreground-secondary)] mb-1">
          Se existir uma conta associada a
        </p>
        <p className="text-sm font-medium text-[var(--foreground)] mb-6">{email}</p>
        <p className="text-xs text-[var(--foreground-muted)] mb-6 max-w-xs mx-auto">
          Receberá um link de recuperação. Verifique também a pasta de spam.
        </p>
        <LocalizedLink href="/login" className="btn btn-subtil gap-2 text-sm">
          <ArrowLeft size={16} aria-hidden="true" />
          {t.auth.back_to_login}
        </LocalizedLink>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-2xl text-[var(--foreground)] mb-1">{t.auth.recover_password}</h1>
      <p className="text-sm text-[var(--foreground-muted)] mb-6">{t.auth.recover_desc}</p>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border p-3.5 text-sm text-[var(--erro)]"
          style={{
            background: "rgb(var(--erro-rgb) / 0.1)",
            borderColor: "rgb(var(--erro-rgb) / 0.3)",
          }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`space-y-4 ${shaking ? "animate-auth-shake" : ""}`}
        aria-label="Formulário de recuperação de palavra-passe"
      >
        <div>
          <label
            htmlFor="recovery-email"
            className="block text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2"
          >
            {t.auth.email}
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              aria-label={t.auth.email}
              aria-describedby={error ? "recovery-email-error" : undefined}
              aria-invalid={!!error}
              className={`campo pl-10 ${error ? "border-[var(--erro)]" : ""}`}
            />
          </div>
          {error && (
            <p
              id="recovery-email-error"
              role="alert"
              className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--erro)]"
            >
              <AlertCircle size={12} aria-hidden="true" />
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 btn btn-primario w-full gap-2 rounded-full disabled:cursor-not-allowed"
          aria-busy={loading}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Mail size={18} aria-hidden="true" />
          )}
          {loading ? t.auth.sending : t.auth.send_link}
        </button>
      </form>

      <p className="mt-6 text-center">
        <LocalizedLink
          href="/login"
          className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)] transition-colors inline-flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t.auth.back_to_login}
        </LocalizedLink>
      </p>
    </div>
  );
}
