"use client";

import { useState, useCallback, Suspense } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  UserPlus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Shield,
  ArrowRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function inputClass(hasError: boolean, isFocused?: boolean) {
  return [
    "w-full bg-[var(--background-card)] border rounded-xl pl-10 pr-4 py-3.5",
    "text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/60",
    "outline-none transition-all duration-200",
    "focus:border-[var(--border-hover)] focus:ring-2 focus:ring-[var(--border-hover)] focus:bg-[var(--background-card)]/90",
    isFocused ? "border-[var(--border-soft)]" : "",
    hasError
      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
      : "border-[var(--border)] hover:border-[var(--border-hover)]",
  ].join("");
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400 animate-auth-fadeInUp"
    >
      <AlertCircle size={12} aria-hidden="true" />
      {message}
    </p>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────
type StrengthLevel = "none" | "weak" | "medium" | "strong";

function getPasswordStrength(pw: string): StrengthLevel {
  if (!pw) return "none";
  const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const score = checks.filter(Boolean).length;
  if (score <= 1) return "weak";
  if (score <= 2) return "medium";
  return "strong";
}

const strengthConfig: Record<StrengthLevel, { label: string; color: string; width: string }> = {
  none: { label: "", color: "bg-[var(--border)]", width: "w-0" },
  weak: { label: "Fraca", color: "bg-red-500", width: "w-1/3" },
  medium: { label: "Média", color: "bg-amber-400", width: "w-2/3" },
  strong: { label: "Forte", color: "bg-emerald-500", width: "w-full" },
};

function PasswordStrengthBar({ password }: { password: string }) {
  const { language } = useLanguage();
  const tr = createTranslator(language);
  const level = getPasswordStrength(password);
  const { color } = strengthConfig[level];
  const strengthLabel: Record<StrengthLevel, string> = {
    none: "",
    weak: "Fraca",
    medium: tr("Média", "Medium", "Media"),
    strong: "Forte",
  };
  const label = strengthLabel[level];

  if (!password) return null;

  return (
    <div className="mt-2.5" aria-live="polite" aria-atomic="true">
      {/* 3-segment strength bar */}
      <div className="flex gap-1.5">
        {(["weak", "medium", "strong"] as const).map((seg) => {
          const active =
            (seg === "weak" && level !== "none") ||
            (seg === "medium" && (level === "medium" || level === "strong")) ||
            (seg === "strong" && level === "strong");
          return (
            <div
              key={seg}
              className="h-1.5 flex-1 rounded-full bg-[var(--border)]/50 overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${active ? color : "w-0"}`}
                style={{ width: active ? "100%" : "0%" }}
              />
            </div>
          );
        })}
      </div>
      {label && (
        <p
          className={`mt-1.5 text-xs ${level === "strong" ? "text-emerald-400" : level === "medium" ? "text-amber-400" : "text-red-400"}`}
        >
          Força: <span className="font-medium">{label}</span>
        </p>
      )}
    </div>
  );
}

// ─── Password requirements checklist ─────────────────────────────────────────
function PasswordChecks({ password }: { password: string }) {
  const { language } = useLanguage();
  const tr = createTranslator(language);
  if (!password) return null;
  const checks = [
    {
      ok: password.length >= 8,
      label: tr("Mínimo 8 caracteres", "Minimum 8 characters", "Mínimo 8 caracteres"),
    },
    {
      ok: /[A-Z]/.test(password),
      label: tr("Uma letra maiúscula", "One uppercase letter", "Una letra mayúscula"),
    },
    { ok: /[0-9]/.test(password), label: tr("Um número", "One number", "Un número") },
  ];
  return (
    <ul
      className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5"
      aria-label="Requisitos da palavra-passe"
    >
      {checks.map(({ ok, label }) => (
        <li
          key={label}
          className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${ok ? "text-emerald-400" : "text-[var(--foreground-muted)]/60"}`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${ok ? "bg-emerald-500/20" : "bg-[var(--border)]/30"}`}
          >
            <CheckCircle
              size={10}
              aria-hidden="true"
              className={`transition-all duration-300 ${ok ? "text-emerald-400 scale-100" : "text-[var(--border)] scale-75"}`}
            />
          </div>
          {label}
        </li>
      ))}
    </ul>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function RegistarContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "";
  const toolParam = searchParams.get("tool") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shaking, setShaking] = useState(false);

  const { t, language } = useLanguage();
  const tr = createTranslator(language);

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = Object.values(passwordChecks).every(Boolean);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const clearFieldError = useCallback(
    (field: keyof typeof fieldErrors) =>
      setFieldErrors((prev) => ({ ...prev, [field]: undefined })),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");

    // Client-side validation
    const errors: typeof fieldErrors = {};
    if (!name.trim())
      errors.name = tr("O nome é obrigatório.", "Name is required.", "El nombre es obligatorio.");
    if (!email)
      errors.email = tr("O email é obrigatório.", "Email is required.", "El email es obligatorio.");
    if (!password)
      errors.password = tr(
        "A palavra-passe é obrigatória.",
        "Password is required.",
        "La contraseña es obligatoria."
      );
    else if (!passwordValid)
      errors.password = tr(
        "A palavra-passe não cumpre os requisitos.",
        "Password does not meet requirements.",
        "La contraseña no cumple los requisitos."
      );
    if (!confirmPassword) errors.confirmPassword = "Por favor confirme a palavra-passe.";
    else if (password !== confirmPassword)
      errors.confirmPassword = tr(
        "As palavras-passe não coincidem.",
        "Passwords do not match.",
        "Las contraseñas no coinciden."
      );
    if (!termsAccepted) errors.terms = "Deve aceitar os termos para continuar.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback${redirect ? `?next=${encodeURIComponent(redirect)}` : ""}`;
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: redirectTo,
        },
      });

      if (authError) {
        const msg = authError.message.includes("already registered")
          ? t.errors.error_generic
          : authError.message;
        setGlobalError(msg);
        triggerShake();
        return;
      }

      setSuccess(true);
    } catch {
      setGlobalError(t.errors.error_generic);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ───────────────────────────────────────────────────────────
  if (success) {
    // Build post-verification login URL — preserve redirect so user lands back on tool page
    const loginUrl = redirect ? `/login?returnUrl=${encodeURIComponent(redirect)}` : "/login";

    return (
      <div className="text-center py-4 relative overflow-hidden">
        {/* Confetti dots */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {[
            { color: "#C5A059", left: "15%", delay: "0s" },
            { color: "#10B981", left: "30%", delay: "0.2s" },
            { color: "#C5A059", left: "50%", delay: "0.1s" },
            { color: "#F59E0B", left: "70%", delay: "0.3s" },
            { color: "#10B981", left: "85%", delay: "0.15s" },
            { color: "#C5A059", left: "25%", delay: "0.25s" },
            { color: "#F59E0B", left: "60%", delay: "0.35s" },
          ].map((dot, i) => (
            <div
              key={i}
              className="absolute top-0 w-2 h-2 rounded-full"
              style={{
                background: dot.color,
                left: dot.left,
                animation: `auth-confetti-fall 1.5s ease-out ${dot.delay} both`,
              }}
            />
          ))}
        </div>

        {/* Animated success ring */}
        <div
          className="relative w-20 h-20 mx-auto mb-6"
          style={{ animation: "auth-success-ring 0.5s ease-out both" }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"
            style={{ animationDuration: "1.4s", animationIterationCount: 1 }}
          />
          {/* Main circle */}
          <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500/40 rounded-full flex items-center justify-center">
            <CheckCircle
              className="text-emerald-400"
              size={36}
              aria-hidden="true"
              strokeWidth={1.5}
            />
          </div>
        </div>

        <h2 className="text-xl text-[var(--foreground)] mb-2 animate-auth-fadeInUp auth-stagger-2">
          Conta Criada com Sucesso!
        </h2>
        <p className="text-sm text-[var(--foreground-secondary)] mb-1 animate-auth-fadeInUp auth-stagger-3">
          Enviámos um email de confirmação para
        </p>
        <p className="text-sm font-medium text-[var(--foreground-muted)] mb-4 animate-auth-fadeInUp auth-stagger-3">
          {email}
        </p>

        {/* Info card */}
        <div className="bg-[var(--background-card)]/60 border border-[var(--border)]/50 rounded-xl p-4 mb-5 text-left animate-auth-fadeInUp auth-stagger-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--elevate-1)] flex items-center justify-center shrink-0 mt-0.5">
              <Mail size={14} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--foreground)] mb-1">
                Verifique a sua caixa de correio
              </p>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                Clique no link de confirmação enviado para o seu email. Verifique também a pasta de
                spam.
              </p>
            </div>
          </div>
        </div>

        {toolParam && redirect && (
          <div className="bg-[var(--elevate-1)] border border-[var(--border-soft)] rounded-xl p-3 mb-5 animate-auth-fadeInUp auth-stagger-5">
            <p className="text-xs text-[var(--foreground-muted)]">
              Após confirmar o email e iniciar sessão, será redirecionado de volta à ferramenta com
              {""}
              <strong className="text-[var(--foreground-muted)]">1 uso gratuito</strong> disponível.
            </p>
          </div>
        )}

        <LocalizedLink
          href={loginUrl}
          className="inline-flex items-center gap-2 px-8 py-3.5 btn btn-primario w-full rounded-full animate-auth-fadeInUp auth-stagger-5"
        >
          Iniciar Sessão
          <ArrowRight size={16} aria-hidden="true" />
        </LocalizedLink>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header with staggered animation */}
      <div className="animate-auth-fadeInUp">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl text-[var(--foreground)]">{t.auth.create_account}</h1>
          <Sparkles
            size={18}
            className="text-[var(--foreground-muted)] animate-auth-float"
            style={{ animationDuration: "3s" }}
            aria-hidden="true"
          />
        </div>
        <p className="text-sm text-[var(--foreground-muted)] mb-6">
          Junta-te à maior comunidade equestre de Portugal
        </p>
      </div>

      {/* Tool redirect banner */}
      {toolParam && redirect && (
        <div className="mb-5 flex items-start gap-3 p-3.5 bg-[var(--elevate-1)] border border-[var(--border-soft)] rounded-xl animate-auth-fadeInUp auth-stagger-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--elevate-1)] flex items-center justify-center shrink-0 mt-0.5">
            <Shield size={14} className="text-[var(--foreground-muted)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--foreground)] mb-0.5">
              Acesso à Ferramenta
            </p>
            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              Crie a sua conta para aceder à ferramenta com{""}
              <strong className="text-[var(--foreground-muted)]">1 uso gratuito</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 animate-auth-fadeInUp"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{globalError}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`space-y-5 ${shaking ? "animate-auth-shake" : ""}`}
        aria-label="Formulário de registo"
      >
        {/* Name */}
        <div className="animate-auth-fadeInUp auth-stagger-1">
          <label
            htmlFor="reg-name"
            className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2 font-medium"
          >
            <User size={12} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            {t.auth.full_name}
          </label>
          <div className="relative group">
            <User
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none transition-colors group-focus-within:text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              required
              autoComplete="name"
              placeholder="O seu nome completo"
              aria-label={t.auth.full_name}
              aria-describedby={fieldErrors.name ? "reg-name-error" : undefined}
              aria-invalid={!!fieldErrors.name}
              className={inputClass(!!fieldErrors.name)}
            />
          </div>
          {fieldErrors.name && <FieldError id="reg-name-error" message={fieldErrors.name} />}
        </div>

        {/* Email */}
        <div className="animate-auth-fadeInUp auth-stagger-2">
          <label
            htmlFor="reg-email"
            className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2 font-medium"
          >
            <Mail size={12} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            {t.auth.email}
          </label>
          <div className="relative group">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none transition-colors group-focus-within:text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              aria-label={t.auth.email}
              aria-describedby={fieldErrors.email ? "reg-email-error" : undefined}
              aria-invalid={!!fieldErrors.email}
              className={inputClass(!!fieldErrors.email)}
            />
          </div>
          {fieldErrors.email && <FieldError id="reg-email-error" message={fieldErrors.email} />}
        </div>

        {/* Password */}
        <div className="animate-auth-fadeInUp auth-stagger-3">
          <label
            htmlFor="reg-password"
            className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2 font-medium"
          >
            <Lock size={12} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            {t.auth.password}
          </label>
          <div className="relative group">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none transition-colors group-focus-within:text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
              required
              autoComplete="new-password"
              placeholder="Crie uma palavra-passe forte"
              aria-label={t.auth.password}
              aria-describedby={
                fieldErrors.password
                  ? "reg-password-error"
                  : password
                    ? "reg-password-strength"
                    : undefined
              }
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
          {fieldErrors.password ? (
            <FieldError id="reg-password-error" message={fieldErrors.password} />
          ) : (
            <div id="reg-password-strength">
              <PasswordStrengthBar password={password} />
              <PasswordChecks password={password} />
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="animate-auth-fadeInUp auth-stagger-4">
          <label
            htmlFor="reg-confirm"
            className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2 font-medium"
          >
            <Lock size={12} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            {t.auth.confirm_password}
          </label>
          <div className="relative group">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none transition-colors group-focus-within:text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="reg-confirm"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError("confirmPassword");
              }}
              required
              autoComplete="new-password"
              placeholder="Repita a palavra-passe"
              aria-label={t.auth.confirm_password}
              aria-describedby={fieldErrors.confirmPassword ? "reg-confirm-error" : undefined}
              aria-invalid={!!fieldErrors.confirmPassword}
              className={`${inputClass(
                !!fieldErrors.confirmPassword || (!!confirmPassword && confirmPassword !== password)
              )} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              {showConfirm ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <FieldError id="reg-confirm-error" message={fieldErrors.confirmPassword} />
          )}
          {!fieldErrors.confirmPassword && confirmPassword && confirmPassword === password && (
            <span className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 animate-auth-fadeInUp">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center inline-flex">
                <CheckCircle size={10} aria-hidden="true" />
              </span>
              Palavras-passe coincidem
            </span>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-[var(--border)]/30 animate-auth-fadeInUp auth-stagger-5" />

        {/* Terms */}
        <div className="animate-auth-fadeInUp auth-stagger-5">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                id="reg-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  clearFieldError("terms");
                }}
                aria-describedby={fieldErrors.terms ? "reg-terms-error" : undefined}
                aria-invalid={!!fieldErrors.terms}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                  termsAccepted
                    ? "bg-[var(--foreground-strong)] border-[var(--foreground-strong)] scale-100"
                    : fieldErrors.terms
                      ? "border-red-500/60 bg-[var(--background-card)]"
                      : "border-[var(--border)] bg-[var(--background-card)] group-hover:border-[var(--border-hover)]"
                }`}
                aria-hidden="true"
              >
                {termsAccepted && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                    <path
                      d="M1 5l3.5 3.5L11 1"
                      stroke="black"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              Aceito os{""}
              <LocalizedLink
                href="/termos"
                className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                Termos de Serviço
              </LocalizedLink>
              {""}e a{""}
              <LocalizedLink
                href="/privacidade"
                className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                Política de Privacidade
              </LocalizedLink>
            </span>
          </label>
          {fieldErrors.terms && <FieldError id="reg-terms-error" message={fieldErrors.terms} />}
        </div>

        {/* Submeter */}
        <div className="animate-auth-fadeInUp auth-stagger-6 pt-1">
          <button
            type="submit"
            disabled={loading || !passwordValid}
            className="relative w-full py-3.5 btn btn-primario w-full gap-2 rounded-full disabled:cursor-not-allowed"
            aria-busy={loading}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "auth-shimmer 1.5s ease-in-out infinite",
              }}
              aria-hidden="true"
            />
            <span className="relative flex items-center gap-2">
              {loading ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus size={18} aria-hidden="true" />
              )}
              {loading ? t.auth.creating_account : t.auth.create_account}
            </span>
          </button>
        </div>
      </form>

      {/* Login link */}
      <div className="animate-auth-fadeInUp auth-stagger-7">
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[var(--border)]/30" />
          <span className="text-xs text-[var(--foreground-muted)]/50 uppercase tracking-wider">
            ou
          </span>
          <div className="flex-1 h-px bg-[var(--border)]/30" />
        </div>

        <p className="text-center text-sm text-[var(--foreground-muted)]">
          {t.auth.already_have_account}
          {""}
          <LocalizedLink
            href={redirect ? `/login?returnUrl=${encodeURIComponent(redirect)}` : "/login"}
            className="text-[var(--foreground-strong)] font-medium underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
          >
            {t.auth.login_account}
          </LocalizedLink>
        </p>
      </div>
    </div>
  );
}

export default function RegistarPage() {
  return (
    <Suspense>
      <RegistarContent />
    </Suspense>
  );
}
