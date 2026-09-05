"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import EntrarComConta from "@/components/auth/EntrarComConta";
import { useLanguage } from "@/context/LanguageContext";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import LerParametrosDoUrl from "@/components/auth/LerParametrosDoUrl";
import { destinoSeguro } from "@/lib/destino-seguro";

/* O campo é o do sistema (`.campo`); aqui abre-se espaço à esquerda para o
   ícone e tira-se-lhe o preenchimento.
 *
 * O `pl-10` ganha ao `padding` do `.campo` porque as utilidades do Tailwind
 * estão numa camada posterior ao `@layer components` — é de propósito, e está
 * escrito no CLAUDE.md.
 *
 * O `bg-transparent` é a mesma manobra e tem a mesma razão. O `.campo` pinta
 * `--background-elevated`, que sobre a página preta é uma elevação subtil;
 * dentro do `.cartao-seco` — que já está a `--background-card` — o que se via
 * eram cinco rectângulos cinzentos cheios, e a página de entrada é o sítio
 * onde o site menos se pode parecer com um formulário qualquer. Sem
 * preenchimento fica o que o resto do site é: uma hairline fria sobre preto,
 * que é vidro, e não uma caixa desenhada. O sistema já tem este precedente
 * escrito — a `.busca-campo` é `background: transparent` pela mesma razão.
 *
 * O estado de erro é o `.campo-erro` do sistema (borda `--erro` mais halo),
 * que existia e não estava a ser usado aqui. */
function classeCampo(comErro: boolean) {
  return ["campo bg-transparent pl-10", comErro ? "campo-erro" : ""].join(" ");
}

// ─── Erro debaixo do campo ────────────────────────────────────────────────────
function ErroDoCampo({ id, mensagem }: { id: string; mensagem: string }) {
  return (
    <p id={id} role="alert" className="erro-campo">
      <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
      {mensagem}
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
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  /* O que vem do URL — para onde voltar depois de entrar, e a razão de uma
     entrada com conta externa que correu mal.
     
     Chega por um componente à parte, e a razão está escrita nele: o
     `useSearchParams` suspende numa página estática, e quem o chamasse
     arrastava o formulário inteiro consigo. O HTML que o servidor mandava não
     tinha um único `<form>`. Aqui é estado, e o formulário é escrito pelo
     servidor. */
  const [{ returnUrl, erro: erroDeRegresso }, setParametros] = useState({
    returnUrl: "/",
    erro: null as string | null,
  });
  const { t } = useLanguage();

  const abanar = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    // Validação do lado do cliente
    const errors: { email?: string; password?: string } = {};
    if (!email) errors.email = t.auth.email_required;
    if (!password) errors.password = t.auth.password_required;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      abanar();
      /* O foco vai para o primeiro campo que falta. Sem isto, quem navega por
         teclado ficava com o foco no botão de submeter e tinha de subir o
         formulário inteiro à mão para descobrir onde é que estava o
         problema — a mensagem aparecia num sítio que essa pessoa não estava a
         ver. */
      (errors.email ? emailRef : passwordRef).current?.focus();
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
        abanar();
        return;
      }

      router.push(returnUrl);
      router.refresh();
    } catch {
      setGlobalError(t.errors.error_generic);
      abanar();
    } finally {
      setLoading(false);
    }
  };

  /* O `returnUrl` é **validado aqui**, ao lado do valor que protege. Um
     endereço de fora levava a pessoa para lá no instante a seguir a ter
     entrado; o `destinoSeguro` deixa passar um caminho deste site e mais nada.
     As duas funções são estáveis, senão o leitor relê a cada desenho. */
  const lerParametros = useCallback(
    (p: URLSearchParams) => ({
      returnUrl: destinoSeguro(p.get("returnUrl")),
      erro: p.get("error"),
    }),
    []
  );
  const guardarParametros = useCallback(
    (v: { returnUrl: string; erro: string | null }) => setParametros(v),
    []
  );

  return (
    <div>
      {/* Fora do fluxo e sem desenho. A fronteira é só dele: é ele que
          suspende, e o formulário à volta não vai atrás. */}
      <Suspense fallback={null}>
        <LerParametrosDoUrl ler={lerParametros} aoLer={guardarParametros} />
      </Suspense>

      {/* Dizia «insira o seu email para receber um link de recuperação» por
          baixo de «Entrar na Conta» — a legenda da página ao lado. */}
      <h1 className="titulo-pagina mb-1.5">{t.auth.login_account}</h1>
      <p className="mb-6 text-sm leading-relaxed text-[var(--foreground-secondary)]">
        {t.auth.login_desc}
      </p>

      <EntrarComConta regressarA={returnUrl} />

      {/* O resumo do erro. Era um `div` com o fundo e a borda escritos em
          estilo em linha; o sistema tem `.resumo-erros` para isto. */}
      {(globalError || erroDeRegresso) && (
        <div role="alert" className="resumo-erros mb-5 flex items-start gap-2.5 text-sm">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-[var(--erro)]"
            aria-hidden="true"
          />
          <span className="text-[var(--erro)]">{globalError || erroDeRegresso}</span>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className={`space-y-4 ${shaking ? "animate-auth-shake" : ""}`}
        aria-label={t.auth.login_form_label}
      >
        {/* Email */}
        <div>
          <label htmlFor="login-email" className="rotulo mb-2 block">
            {t.auth.email}
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            {/* Sem `aria-label`: já há um `<label for>` visível, e um
                `aria-label` por cima dele substitui-o em vez de o reforçar —
                quem lê o ecrã passava a ouvir a etiqueta escrita à mão, que
                era a que estava em português numa página inglesa. */}
            <input
              id="login-email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              required
              autoComplete="email"
              placeholder={t.auth.email_placeholder}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              aria-invalid={!!fieldErrors.email}
              className={classeCampo(!!fieldErrors.email)}
            />
          </div>
          {fieldErrors.email && <ErroDoCampo id="login-email-error" mensagem={fieldErrors.email} />}
        </div>

        {/* Palavra-passe */}
        <div>
          <label htmlFor="login-password" className="rotulo mb-2 block">
            {t.auth.password}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="login-password"
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              required
              autoComplete="current-password"
              placeholder={t.auth.password_placeholder}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              aria-invalid={!!fieldErrors.password}
              className={`${classeCampo(!!fieldErrors.password)} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t.auth.hide_password : t.auth.show_password}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-strong)]"
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <ErroDoCampo id="login-password-error" mensagem={fieldErrors.password} />
          )}
        </div>

        {/* Esqueceu a palavra-passe */}
        <div className="flex justify-end">
          <LocalizedLink
            href="/recuperar-senha"
            className="text-xs text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-strong)]"
          >
            {t.auth.forgot_password}
          </LocalizedLink>
        </div>

        {/* Submeter. Branco, que é o botão principal do sistema; o dourado
            desta página é a ferradura da marca e mais nada. */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primario w-full py-3 disabled:cursor-not-allowed"
          aria-busy={loading}
        >
          {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {loading ? t.auth.logging_in : t.auth.login_account}
        </button>
      </form>

      {/* Criar conta */}
      <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
        {t.auth.no_account}{" "}
        <LocalizedLink
          href={
            returnUrl !== "/" ? `/registar?redirect=${encodeURIComponent(returnUrl)}` : "/registar"
          }
          className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
        >
          {t.auth.create_account}
        </LocalizedLink>
      </p>
    </div>
  );
}

/* Já não há aqui uma fronteira de `<Suspense>` à volta da página inteira.
 *
 * Havia, e sem `fallback`. Como a rota é estática e o `useSearchParams`
 * suspende na pré-renderização, o que o servidor emitia era o fallback — ou
 * seja, nada. Medido no HTML servido: zero `<form>`, zero campos.
 *
 * Quem suspende agora é o `<LerParametrosDeEntrada>`, lá dentro, que não
 * desenha nada. O formulário fica de fora e é escrito pelo servidor inteiro. */
export default function LoginPage() {
  return <LoginContent />;
}
