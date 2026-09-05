"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import EntrarComConta from "@/components/auth/EntrarComConta";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle } from "lucide-react";
import { destinoSeguro } from "@/lib/destino-seguro";

/* O campo é o do sistema (`.campo`); aqui só se abre espaço à esquerda para
   o ícone. O `pl-10` ganha ao `padding` do `.campo` porque as utilidades do
   Tailwind estão numa camada posterior ao `@layer components` — é de
   propósito, e está escrito no CLAUDE.md. */
function inputClass(hasError: boolean) {
  return ["campo pl-10", hasError ? "border-[var(--erro)]" : ""].join(" ");
}

// ─── Inline field error ────────────────────────────────────────────────────────
function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--erro)]">
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
  /* Para onde se volta depois de entrar, **validado**.
   *
   * Vinha cru do URL e ia direito a um `router.push`. Um `?returnUrl=` com um
   * endereço de fora levava a pessoa para lá no instante a seguir a ter
   * entrado — que é exactamente o truque com que se põe alguém numa página de
   * login falsa logo depois de ter usado a verdadeira, já convencida de que
   * está dentro do site certo.
   *
   * O `destinoSeguro` já existia e já era usado no `app/auth/callback`; só não
   * estava aqui. Deixa passar um caminho deste site e mais nada. */
  const returnUrl = destinoSeguro(searchParams.get("returnUrl"));

  /* Quem chega de uma entrada com conta externa que correu mal vem com a
     razão no URL. Mostrada aqui, é a diferença entre «não deu» e saber
     porquê. */
  const erroDeRegresso = searchParams.get("error");
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
      {/* Dizia «insira o seu email para receber um link de recuperação» por
          baixo de «Entrar na Conta» — a legenda da página ao lado. */}
      <h1 className="titulo-pagina mb-1 text-2xl">{t.auth.login_account}</h1>
      <p className="mb-7 text-sm text-[var(--foreground-secondary)]">{t.auth.login_desc}</p>

      <EntrarComConta regressarA={returnUrl} />

      {/* Global error banner */}
      {(globalError || erroDeRegresso) && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border p-3.5 text-sm text-[var(--erro)]"
          style={{
            background: "rgb(var(--erro-rgb) / 0.1)",
            borderColor: "rgb(var(--erro-rgb) / 0.3)",
          }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{globalError || erroDeRegresso}</span>
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
          <label htmlFor="login-email" className="rotulo mb-2 block">
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
          <label htmlFor="login-password" className="rotulo mb-2 block">
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
            className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)] transition-colors"
          >
            {t.auth.forgot_password}
          </LocalizedLink>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primario w-full gap-2 rounded-full py-3 disabled:cursor-not-allowed"
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
        {t.auth.no_account}{" "}
        <LocalizedLink
          href={
            returnUrl !== "/" ? `/registar?redirect=${encodeURIComponent(returnUrl)}` : "/registar"
          }
          className="text-[var(--foreground-strong)] font-medium underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
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
