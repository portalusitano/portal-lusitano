"use client";

import { useState, useCallback, useRef, type CSSProperties } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useLanguage } from "@/context/LanguageContext";
import { Mail, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

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
  //
  // O mesmo momento do ecrã de registo, e por isso o mesmo desenho. São as duas
  // vezes em que este site diz «fomos ver do seu lado»; escritas com dois
  // vocabulários, liam-se como dois sítios diferentes.
  if (sent) {
    return (
      <div className="py-2 text-center">
        {/* O sinal desenha-se: a argola fecha-se, o visto risca-se por dentro
            quando ela vai a meio. Era um `CheckCircle` estático dentro de uma
            argola — um ícone que já lá está quando a página aparece não
            assinala nada, é decoração. */}
        <div className="selo-feito mb-6" aria-hidden="true">
          <svg viewBox="0 0 48 48" className="selo-feito__argola">
            <circle cx="24" cy="24" r="21" />
          </svg>
          <svg viewBox="0 0 48 48" width="48" height="48" className="selo-feito__visto">
            <path d="M16 24.5 21.5 30 32 18.5" />
          </svg>
        </div>

        {/* ██ O título dizia «Email enviado!» ██
            E logo por baixo, «Se existir uma conta associada a…». O título
            afirmava o que a frase seguinte tinha o cuidado de não afirmar — e
            entre uma exclamação em corpo 40 e uma condicional em corpo 14, quem
            lê fica com a primeira. É a mesma contradição que estava no ecrã de
            registo, e resolve-se do mesmo modo: o título passa a ser uma
            instrução, que é o que aqui há para dar, e a condição vive na frase
            onde sempre esteve, sozinha.

            Repare-se em que não se pode dizer mais: quem não tem conta neste
            site também vê este ecrã, e tem de o ver, senão o formulário de
            recuperação servia para descobrir quem tem conta. */}
        <h2 className="titulo-pagina nascer-linha mb-3" style={{ "--ordem": 1 } as CSSProperties}>
          {t.auth.email_sent}
        </h2>

        {/* O endereço é o que a pessoa veio confirmar, e leva o peso: mono, a
            branco, no meio da frase. */}
        <p
          className="nascer-linha mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]"
          style={{ "--ordem": 2 } as CSSProperties}
        >
          {t.auth.recovery_sent_corpo_pre}{" "}
          <span className="font-mono break-all text-[var(--foreground-strong)]">{email}</span>,{" "}
          {t.auth.recovery_sent_corpo_pos}
        </p>

        {/* Era um `btn-subtil btn-sm` — a acção que resta numa página onde não
            há mais nada a fazer não é uma nota de rodapé. */}
        <div className="nascer-linha" style={{ "--ordem": 3 } as CSSProperties}>
          <LocalizedLink href="/login" className="btn btn-primario w-full py-3">
            <ArrowLeft size={16} aria-hidden="true" />
            {t.auth.back_to_login}
          </LocalizedLink>
        </div>
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
