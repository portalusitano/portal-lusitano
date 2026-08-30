"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle } from "lucide-react";

// ─── Shared input class builder ───────────────────────────────────────────────
function inputClass(hasError: boolean) {
  return [
    "w-full bg-[var(--background-card)] border rounded-lg pl-10 pr-4 py-3",
    "text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]",
    "outline-none transition-colors",
    "focus:border-[var(--gold)]/50 focus:ring-1 focus:ring-[var(--gold)]/30",
    hasError
      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
      : "border-[var(--border)]",
  ].join("");
}

// ─── Inline field error ────────────────────────────────────────────────────────
function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
      <AlertCircle size={12} aria-hidden="true" />
      {message}
    </p>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";
  const { t, language } = useLanguage();
  const tr = createTranslator(language);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    // Basic client-side validation
    const errors: { email?: string; password?: string } = {};
    if (!email)
      errors.email = tr("O email é obrigatório.", "Email is required.", "El email es obligatorio.");
    if (!password)
      errors.password = tr(
        "A palavra-passe é obrigatória.",
        "Password is required.",
        "La contraseña es obligatoria."
      );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        const msg = authError.message.includes("Invalid login")
          ? t.auth.reserved_access
          : authError.message;
        setGlobalError(msg);
        triggerShake();
        return;
      }

      router.push(returnUrl);
      router.refresh();
    } catch {
      setGlobalError(t.errors.error_generic);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl text-[var(--foreground)] mb-1">{t.auth.login_account}</h1>
      <p className="text-sm text-[var(--foreground-muted)] mb-6">{t.auth.recover_desc}</p>

      {/* Global error banner */}
      {globalError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{globalError}</span>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className={`space-y-4 ${shaking ? "animate-auth-shake" : ""}`}
        aria-label="Formulário de autenticação"
      >
        {/* Email */}
        <div>
          <label
            htmlFor="login-email"
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
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              aria-label={t.auth.email}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              aria-invalid={!!fieldErrors.email}
              className={inputClass(!!fieldErrors.email)}
            />
          </div>
          {fieldErrors.email && <FieldError id="login-email-error" message={fieldErrors.email} />}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="login-password"
            className="block text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2"
          >
            {t.auth.password}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              required
              autoComplete="current-password"
              placeholder={t.auth.password}
              aria-label={t.auth.password}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              aria-invalid={!!fieldErrors.password}
              className={`${inputClass(!!fieldErrors.password)} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <FieldError id="login-password-error" message={fieldErrors.password} />
          )}
        </div>

        {/* Forgot password */}
        <div className="flex justify-end">
          <LocalizedLink
            href="/recuperar-senha"
            className="text-xs text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors"
          >
            {t.auth.forgot_password}
          </LocalizedLink>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-[#C5A059] to-[#B8956F] text-black font-semibold rounded-lg hover:from-[#D4AF6A] hover:to-[#C5A059] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={loading}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <LogIn size={18} aria-hidden="true" />
          )}
          {loading ? t.auth.logging_in : t.auth.login_account}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
        {t.auth.no_account}
        {""}
        <LocalizedLink
          href={
            returnUrl !== "/" ? `/registar?redirect=${encodeURIComponent(returnUrl)}` : "/registar"
          }
          className="text-[var(--gold)] hover:text-[var(--gold-hover)] font-medium transition-colors"
        >
          {t.auth.create_account}
        </LocalizedLink>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
