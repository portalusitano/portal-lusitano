"use client";

import { useState, useCallback, useRef } from "react";
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
  const emailRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const abanar = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError(t.auth.email_required);
      abanar();
      emailRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      /* Passa pelo `/auth/callback`, e não directamente por `/perfil`.
         O Supabase só honra um `redirectTo` que esteja na lista de Redirect
         URLs do projecto; `/perfil` não está lá, e nesse caso ele não falha —
         cai calado no «Site URL» do projecto. Como esse estava em
         `http://localhost:3000`, o email de recuperação mandava as pessoas
         para o computador delas. O link não funcionava para ninguém.

         O `/auth/callback` está na lista, é ele que troca o código pela
         sessão, e leva o destino no `next` (validado pelo `destinoSeguro`).
         Assim a recuperação deixa de depender de uma definição no painel. */
      const destino = new URL("/auth/callback", window.location.origin);
      destino.searchParams.set("next", "/perfil");
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: destino.toString(),
      });
      // Mostra-se sempre sucesso, para não revelar quem tem conta.
      setSent(true);
    } catch {
      // Idem — o erro não muda a resposta.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Enviado ───────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="py-2 text-center">
        {/* Uma argola fina com o visto lá dentro. Era um disco cheio de 64px
            com preenchimento elevado; o resto da página é hairline sobre
            preto e este era o único sítio com uma bola. */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)]">
          <CheckCircle
            className="text-[var(--ok)]"
            size={26}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <h2 className="titulo-pagina mb-2">{t.auth.email_sent}</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">{t.auth.recovery_sent_intro}</p>
        {/* O email que a pessoa escreveu é um dado, não uma frase: vai na
            mono, que é o que o sistema reserva para identificadores. */}
        <p className="mb-5 font-mono text-sm break-all text-[var(--foreground-strong)]">{email}</p>
        <p className="meta mx-auto mb-6 max-w-xs">{t.auth.recovery_sent_hint}</p>
        <LocalizedLink href="/login" className="btn btn-subtil btn-sm">
          <ArrowLeft size={14} aria-hidden="true" />
          {t.auth.back_to_login}
        </LocalizedLink>
      </div>
    );
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Era `text-2xl` escrito à mão, ao lado de um `.titulo-pagina` na
          página de entrada: o mesmo papel com dois tamanhos. */}
      <h1 className="titulo-pagina mb-1.5">{t.auth.recover_password}</h1>
      <p className="mb-6 text-sm leading-relaxed text-[var(--foreground-secondary)]">
        {t.auth.recover_desc}
      </p>

      {error && (
        <div role="alert" className="resumo-erros mb-5 flex items-start gap-2.5 text-sm">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-[var(--erro)]"
            aria-hidden="true"
          />
          <span className="text-[var(--erro)]">{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`space-y-4 ${shaking ? "animate-auth-shake" : ""}`}
        aria-label={t.auth.recovery_form_label}
      >
        <div>
          {/* Era `text-xs uppercase tracking-wider` escrito à mão — que é o
              `.rotulo` do sistema, com outras medidas. */}
          <label htmlFor="recovery-email" className="rotulo mb-2 block">
            {t.auth.email}
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="recovery-email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              required
              autoComplete="email"
              placeholder={t.auth.email_placeholder}
              aria-describedby={error ? "recovery-email-error" : undefined}
              aria-invalid={!!error}
              className={`campo bg-transparent pl-10 ${error ? "campo-erro" : ""}`}
            />
          </div>
          {error && (
            <p id="recovery-email-error" role="alert" className="erro-campo">
              <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>

        {/* Levava `w-full` duas vezes e um `py-3` antes das classes do `.btn`. */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primario w-full py-3 disabled:cursor-not-allowed"
          aria-busy={loading}
        >
          {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {loading ? t.auth.sending : t.auth.send_link}
        </button>
      </form>

      <p className="mt-6 text-center">
        <LocalizedLink
          href="/login"
          className="inline-flex items-center justify-center gap-2 text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-strong)]"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t.auth.back_to_login}
        </LocalizedLink>
      </p>
    </div>
  );
}
