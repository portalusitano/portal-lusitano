"use client";

import { useState, useCallback, useRef, Suspense, type CSSProperties } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useLanguage } from "@/context/LanguageContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Loader2,
  Check,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import EntrarComConta from "@/components/auth/EntrarComConta";
import LerParametrosDoUrl from "@/components/auth/LerParametrosDoUrl";
import { destinoSeguro } from "@/lib/destino-seguro";

// ─── Ajudas ───────────────────────────────────────────────────────────────────
/* Ver a nota igual no login: o campo é o do sistema, o `pl-10` abre espaço ao
   ícone e o `bg-transparent` tira-lhe o preenchimento, os dois ganhando ao
   `.campo` por estarem numa camada posterior. O erro é o `.campo-erro`. */
function classeCampo(comErro: boolean) {
  return ["campo bg-transparent pl-10", comErro ? "campo-erro" : ""].join(" ");
}

function ErroDoCampo({ id, mensagem }: { id: string; mensagem: string }) {
  return (
    <p id={id} role="alert" className="erro-campo">
      <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
      {mensagem}
    </p>
  );
}

/* Os requisitos da palavra-passe, e mais nada.
 *
 * Havia três coisas a dizer o mesmo ao mesmo tempo: uma barra de três
 * segmentos, a palavra «Força: Fraca» por baixo dela, e esta lista. As três
 * saíam dos mesmos booleanos, e a barra ainda contradizia o formulário —
 * contava um quarto teste (um símbolo) que o botão de submeter não exigia,
 * por isso dizia «Média» sobre uma palavra-passe que era aceite. De um
 * indicador só quero saber o que me falta escrever; é o que esta lista diz, e
 * é a única das três que o diz.
 *
 * Não há barra colorida a crescer: sobre preto, três estados de cor são um
 * semáforo a pedir atenção num sítio onde a atenção é para o formulário. */
function RequisitosDaPalavraPasse({ password }: { password: string }) {
  const { t } = useLanguage();
  if (!password) return null;

  const testes = [
    { ok: password.length >= 8, texto: t.auth.req_min_chars },
    { ok: /[A-Z]/.test(password), texto: t.auth.req_uppercase },
    { ok: /[0-9]/.test(password), texto: t.auth.req_number },
  ];

  return (
    <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5" aria-label={t.auth.password_reqs_label}>
      {testes.map(({ ok, texto }) => (
        <li
          key={texto}
          className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
            ok ? "text-[var(--ok)]" : "text-[var(--foreground-muted)]"
          }`}
        >
          <Check
            size={12}
            strokeWidth={2.5}
            aria-hidden="true"
            className={ok ? "opacity-100" : "opacity-25"}
          />
          {texto}
        </li>
      ))}
    </ul>
  );
}

// ─── Conteúdo ─────────────────────────────────────────────────────────────────
function RegistarContent() {
  /* O que vem do URL. Chega por um componente à parte, e a razão está escrita
     nele: o `useSearchParams` suspende numa página estática, e quem o chamasse
     arrastava o formulário inteiro consigo — o HTML que o servidor mandava não
     tinha um único `<form>`.

     O `redirect` é **validado à entrada**. Acaba a alimentar o `next` do
     `/auth/callback` e o `returnUrl` do `/login`, e os dois já o validam — mas
     validá-lo também aqui fecha a cadeia nas três pontas, e custa uma linha. */
  const [{ redirect, toolParam }, setParametros] = useState({ redirect: "", toolParam: "" });

  const lerParametros = useCallback(
    (p: URLSearchParams) => ({
      redirect: p.get("redirect") ? destinoSeguro(p.get("redirect"), "") : "",
      toolParam: p.get("tool") || "",
    }),
    []
  );
  const guardarParametros = useCallback(
    (v: { redirect: string; toolParam: string }) => setParametros(v),
    []
  );

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
  /** `null` enquanto o formulário está aberto. Ver o comentário no `signUp`. */
  const [success, setSuccess] = useState<"confirmar" | "dentro" | null>(null);
  const [shaking, setShaking] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const { t } = useLanguage();

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = Object.values(passwordChecks).every(Boolean);

  const abanar = useCallback(() => {
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

    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = t.auth.name_required;
    if (!email) errors.email = t.auth.email_required;
    if (!password) errors.password = t.auth.password_required;
    else if (!passwordValid) errors.password = t.auth.password_reqs_not_met;
    if (!confirmPassword) errors.confirmPassword = t.auth.confirm_required;
    else if (password !== confirmPassword) errors.confirmPassword = t.auth.passwords_no_match;
    if (!termsAccepted) errors.terms = t.auth.terms_required;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      abanar();
      /* O foco vai para o primeiro campo que falta, pela ordem em que eles
         estão no ecrã — senão, num formulário de cinco campos, a mensagem
         aparece onde quem navega por teclado não está a olhar. */
      const primeiro = errors.name
        ? nameRef
        : errors.email
          ? emailRef
          : errors.password
            ? passwordRef
            : errors.confirmPassword
              ? confirmRef
              : termsRef;
      primeiro.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback${redirect ? `?next=${encodeURIComponent(redirect)}` : ""}`;
      const { data, error: authError } = await supabase.auth.signUp({
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
        abanar();
        return;
      }

      /* ██ O que o `signUp` garante, e o que não garante ██
       *
       * O ecrã dizia «Enviámos um email de confirmação para X» sempre que esta
       * chamada não devolvia erro. **Não devolver erro não quer dizer que
       * tenha saído um email.** Quando o endereço já tem conta, o Supabase
       * responde com sucesso e não envia nada — de propósito, para que um
       * formulário de registo não sirva para descobrir quem tem conta no site.
       *
       * Foi assim que apareceu: o dono do site registou-se com o endereço
       * dele, que já tinha conta desde Março e já estava confirmada. A página
       * afirmou que o email tinha saído. Nunca saiu, e ele ficou à espera.
       *
       * Uma página que afirma o que não sabe é a mesma falsidade que este
       * portal existe para acabar, e não fica melhor por ser sobre um email em
       * vez de um cavalo. Por isso o texto passa a cobrir os dois casos sem
       * mentir em nenhum — e sem dizer qual deles é, que é a parte que o
       * Supabase esconde por uma boa razão. É a mesma voz do ecrã de
       * recuperação de senha, que já dizia «Se existir uma conta associada a».
       *
       * Há um caso em que se sabe: com a confirmação de email desligada no
       * projecto, a resposta traz sessão. Aí não há email nenhum por confirmar
       * e dizê-lo seria mandar a pessoa esperar por uma coisa que não existe. */
      setSuccess(data.session ? "dentro" : "confirmar");
    } catch {
      setGlobalError(t.errors.error_generic);
      abanar();
    } finally {
      setLoading(false);
    }
  };

  // ── Feito ───────────────────────────────────────────────────────────────────
  //
  // Dois desfechos, e a diferença entre eles não é de tom: um manda esperar por
  // um email e o outro diz que já está dentro. Escrevê-los com o mesmo texto
  // era mandar metade das pessoas esperar por uma coisa que não vem.
  if (success) {
    const loginUrl = redirect ? `/login?returnUrl=${encodeURIComponent(redirect)}` : "/login";
    const dentro = success === "dentro";

    return (
      <div className="py-2 text-center">
        {/* O sinal desenha-se à frente de quem chega — a argola fecha-se, o
            visto risca-se por dentro. Um ícone que já lá está quando a página
            aparece não assinala nada: é decoração. Este diz «acabou agora», e
            é a única coisa nesta página que se move sozinha.

            Saíram daqui, antes disto, sete confetes e uma argola a pulsar. Os
            confetes traziam três cores escritas à mão na página, uma delas o
            dourado da marca usado como enfeite — que é exactamente o que o
            gasta. E uma festa por cima de «vá ao seu email» esconde a
            instrução, que é a única coisa que aqui interessa. */}
        <div className="selo-feito mb-6" aria-hidden="true">
          <svg viewBox="0 0 48 48" className="selo-feito__argola">
            <circle cx="24" cy="24" r="21" />
          </svg>
          <svg viewBox="0 0 48 48" width="48" height="48" className="selo-feito__visto">
            <path d="M16 24.5 21.5 30 32 18.5" />
          </svg>
        </div>

        <h2 className="titulo-pagina nascer-linha mb-3" style={{ "--ordem": 1 } as CSSProperties}>
          {dentro ? t.auth.account_ready : t.auth.confirm_email_title}
        </h2>

        {dentro ? (
          <p
            className="nascer-linha mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]"
            style={{ "--ordem": 2 } as CSSProperties}
          >
            {t.auth.account_ready_desc}
          </p>
        ) : (
          /* O endereço é o que a pessoa veio confirmar, e por isso é ele que
             leva o peso: mono, a branco, no meio da frase. À volta, uma frase
             só — a caixa com o rótulo em maiúsculas que aqui estava gritava um
             título («VERIFIQUE A SUA CAIXA DE CORREIO») por cima da mesma
             instrução que dava a seguir, em ponto mais pequeno. Era dizer duas
             vezes a mesma coisa e sublinhar a menos importante. */
          <p
            className="nascer-linha mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]"
            style={{ "--ordem": 2 } as CSSProperties}
          >
            {t.auth.confirm_email_body_pre}{" "}
            <span className="font-mono break-all text-[var(--foreground-strong)]">{email}</span>{" "}
            {t.auth.confirm_email_body_post}
          </p>
        )}

        {toolParam && redirect && (
          <p
            className="meta nascer-linha mx-auto mb-6 max-w-sm leading-relaxed"
            style={{ "--ordem": 3 } as CSSProperties}
          >
            {t.auth.tool_after_confirm}
          </p>
        )}

        <div className="nascer-linha" style={{ "--ordem": 4 } as CSSProperties}>
          <LocalizedLink
            href={dentro ? redirect || "/" : loginUrl}
            className="btn btn-primario w-full py-3"
          >
            {dentro ? t.common.continue : t.auth.login_account}
            <ArrowRight size={16} aria-hidden="true" />
          </LocalizedLink>

          {/* ██ A saída de quem já tinha conta e não sabe a palavra-passe ██
              Sem isto, a frase acima — «Se já tinha, entre com a sua
              palavra-passe» — mandava alguém para uma porta e não lhe dava a
              chave. Aconteceu, e está nos registos do Supabase: três
              `user_repeated_signup` do mesmo endereço numa noite, duas
              entradas falhadas, e **zero** pedidos de recuperação. A pessoa
              tentou criar conta outra vez, três vezes, porque era a única
              coisa que o ecrã lhe oferecia.

              Fica aqui para toda a gente, e não só para quem já tem conta: o
              ecrã é o mesmo nos dois casos de propósito — qual deles é, é o
              que o Supabase esconde para que o registo não sirva para
              descobrir quem tem conta no site. */}
          {!dentro && (
            <LocalizedLink
              href="/recuperar-senha"
              className="meta mt-4 inline-block underline decoration-[var(--border)] underline-offset-4 hover:text-[var(--foreground)]"
            >
              {t.auth.forgot_password}
            </LocalizedLink>
          )}
        </div>
      </div>
    );
  }

  // ── Formulário ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Fora do fluxo e sem desenho. A fronteira é só dele: é ele que
          suspende, e o formulário à volta não vai atrás.

          Basta estar aqui, e não também no ramo de «conta criada»: os
          parâmetros lêem-se ao montar, e para se chegar a esse ramo é preciso
          ter submetido este formulário — altura em que o valor já está no
          estado, que sobrevive ao componente sair do ecrã. */}
      <Suspense fallback={null}>
        <LerParametrosDoUrl ler={lerParametros} aoLer={guardarParametros} />
      </Suspense>
      <h1 className="titulo-pagina mb-1.5">{t.auth.create_account}</h1>
      <p className="mb-6 text-sm leading-relaxed text-[var(--foreground-secondary)]">
        {t.auth.register_desc}
      </p>

      <EntrarComConta regressarA={redirect || "/"} />

      {toolParam && redirect && (
        <div className="cartao mb-5 p-3.5">
          <p className="rotulo-forte mb-1">{t.auth.tool_access_title}</p>
          <p className="meta leading-relaxed">{t.auth.tool_access_desc}</p>
        </div>
      )}

      {globalError && (
        <div role="alert" className="resumo-erros mb-5 flex items-start gap-2.5 text-sm">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-[var(--erro)]"
            aria-hidden="true"
          />
          <span className="text-[var(--erro)]">{globalError}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`space-y-4 ${shaking ? "animate-auth-shake" : ""}`}
        aria-label={t.auth.register_form_label}
      >
        {/* Nome. Cada etiqueta tinha um ícone à esquerda e o campo por baixo
            repetia o mesmo ícone lá dentro: o mesmo desenho duas vezes, a
            quinze pixéis de distância. Fica o do campo. */}
        <div>
          <label htmlFor="reg-name" className="rotulo mb-2 block">
            {t.auth.full_name}
          </label>
          <div className="relative">
            <User
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="reg-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              required
              autoComplete="name"
              placeholder={t.auth.name_placeholder}
              aria-describedby={fieldErrors.name ? "reg-name-error" : undefined}
              aria-invalid={!!fieldErrors.name}
              className={classeCampo(!!fieldErrors.name)}
            />
          </div>
          {fieldErrors.name && <ErroDoCampo id="reg-name-error" mensagem={fieldErrors.name} />}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="rotulo mb-2 block">
            {t.auth.email}
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="reg-email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              required
              autoComplete="email"
              placeholder={t.auth.email_placeholder}
              aria-describedby={fieldErrors.email ? "reg-email-error" : undefined}
              aria-invalid={!!fieldErrors.email}
              className={classeCampo(!!fieldErrors.email)}
            />
          </div>
          {fieldErrors.email && <ErroDoCampo id="reg-email-error" mensagem={fieldErrors.email} />}
        </div>

        {/* Palavra-passe */}
        <div>
          <label htmlFor="reg-password" className="rotulo mb-2 block">
            {t.auth.password}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="reg-password"
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
              required
              autoComplete="new-password"
              placeholder={t.auth.new_password_placeholder}
              aria-describedby={
                fieldErrors.password
                  ? "reg-password-error"
                  : password
                    ? "reg-password-reqs"
                    : undefined
              }
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
          {fieldErrors.password ? (
            <ErroDoCampo id="reg-password-error" mensagem={fieldErrors.password} />
          ) : (
            <div id="reg-password-reqs">
              <RequisitosDaPalavraPasse password={password} />
            </div>
          )}
        </div>

        {/* Confirmação */}
        <div>
          <label htmlFor="reg-confirm" className="rotulo mb-2 block">
            {t.auth.confirm_password}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              aria-hidden="true"
            />
            <input
              id="reg-confirm"
              ref={confirmRef}
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError("confirmPassword");
              }}
              required
              autoComplete="new-password"
              placeholder={t.auth.confirm_password_placeholder}
              aria-describedby={fieldErrors.confirmPassword ? "reg-confirm-error" : undefined}
              aria-invalid={!!fieldErrors.confirmPassword}
              className={`${classeCampo(
                !!fieldErrors.confirmPassword || (!!confirmPassword && confirmPassword !== password)
              )} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? t.auth.hide_confirm : t.auth.show_confirm}
              aria-pressed={showConfirm}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-strong)]"
            >
              {showConfirm ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <ErroDoCampo id="reg-confirm-error" mensagem={fieldErrors.confirmPassword} />
          )}
          {!fieldErrors.confirmPassword && confirmPassword && confirmPassword === password && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--ok)]">
              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
              {t.auth.passwords_match}
            </p>
          )}
        </div>

        {/* Termos. A caixa marcada é branca, não dourada — é a regra do
            sistema para estado escolhido. */}
        <div className="pt-1">
          <label className="group flex cursor-pointer items-start gap-3">
            <span className="relative mt-px shrink-0">
              <input
                id="reg-terms"
                ref={termsRef}
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  clearFieldError("terms");
                }}
                aria-describedby={fieldErrors.terms ? "reg-terms-error" : undefined}
                aria-invalid={!!fieldErrors.terms}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 ${
                  termsAccepted
                    ? "border-[var(--foreground-strong)] bg-[var(--foreground-strong)]"
                    : fieldErrors.terms
                      ? "border-[var(--erro)]"
                      : "border-[var(--border)] group-hover:border-[var(--border-hover)]"
                }`}
              >
                {termsAccepted && (
                  <Check size={12} strokeWidth={3} className="text-[var(--background)]" />
                )}
              </span>
            </span>
            <span className="text-xs leading-relaxed text-[var(--foreground-muted)]">
              {t.auth.terms_accept_pre}{" "}
              <LocalizedLink
                href="/termos"
                className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.auth.terms_of_service}
              </LocalizedLink>{" "}
              {t.auth.terms_and}{" "}
              <LocalizedLink
                href="/privacidade"
                className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.auth.privacy_policy}
              </LocalizedLink>
            </span>
          </label>
          {fieldErrors.terms && <ErroDoCampo id="reg-terms-error" mensagem={fieldErrors.terms} />}
        </div>

        {/* Submeter.
         *
         * Havia aqui um brilho a varrer o botão sem parar. Saiu, e são duas
         * razões, cada uma suficiente: ninguém o via (dependia de um
         * `group-hover/btn` sem `group/btn` nenhum nesta página, logo esteve a
         * `opacity: 0` desde sempre), e animava `background-position`, que o
         * compositor não sabe animar — cada quadro repintava o botão.
         * Infinito, invisível, e a pintar. O `.animate-auth-shimmer` do
         * `auth.css` já tinha o ciclo desligado por escrito; o estilo em linha
         * passava-lhe à frente, porque um estilo em linha ganha sempre a uma
         * classe.
         *
         * O botão também deixou de estar desactivado enquanto a palavra-passe
         * não cumpre os requisitos. Um botão apagado não diz o que falta:
         * quem lá chegasse com uma palavra-passe curta ficava a olhar para um
         * botão morto sem mensagem nenhuma. Agora carrega-se sempre, e é a
         * validação que responde — com o foco a ir para o campo em falta. */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primario w-full py-3 disabled:cursor-not-allowed"
          aria-busy={loading}
        >
          {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {loading ? t.auth.creating_account : t.auth.create_account}
        </button>
      </form>

      {/* Sem um segundo «ou»: o de cima já separa as duas maneiras de entrar,
          e dois seguidos deixam de separar seja o que for. */}
      <div className="my-5 h-px bg-[var(--border-soft)]" />

      <p className="text-center text-sm text-[var(--foreground-muted)]">
        {t.auth.already_have_account}{" "}
        <LocalizedLink
          href={redirect ? `/login?returnUrl=${encodeURIComponent(redirect)}` : "/login"}
          className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
        >
          {t.auth.login_account}
        </LocalizedLink>
      </p>
    </div>
  );
}

/* Sem fronteira à volta da página: a que aqui estava não tinha `fallback`, e
 * numa rota estática o que o servidor emite é o fallback. Quem suspende agora
 * é o leitor dos parâmetros, lá dentro, e o formulário fica de fora. */
export default function RegistarPage() {
  return <RegistarContent />;
}
