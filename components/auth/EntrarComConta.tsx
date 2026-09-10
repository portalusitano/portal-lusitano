"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useLanguage } from "@/context/LanguageContext";

/*
 * Entrar com uma conta que já se tem.
 *
 * A troca do código acontece em `/auth/callback`, que já existia para a
 * confirmação de email e faz PKCE do lado do servidor — é o mesmo caminho.
 *
 * Os fornecedores têm de estar ligados no painel do Supabase
 * (Authentication → Providers). Se não estiverem, o pedido volta com erro
 * em vez de abrir seja o que for; por isso a mensagem que se mostra diz
 * isso por palavras, em vez de deixar o botão a girar para sempre.
 */

/* Só o Google.
 *
 * O botão da Apple esteve aqui e saiu. Entrar com Apple exige conta de
 * programador Apple (99 €/ano), um Services ID, o Team ID, um Key ID e uma
 * chave `.p8` — nada disso existe, e sem isso o botão devolve
 * «provider is not enabled» a quem lhe toca. Um botão que promete uma
 * maneira de entrar que não funciona é da mesma família dos números que este
 * site anunciava e não tinha: custa mais confiança do que ganha em escolha.
 *
 * Volta em três linhas no dia em que houver credenciais: acrescenta-se
 * "apple" ao tipo e a entrada respectiva ao mapa dos logótipos. */
type Fornecedor = "google";

const LOGOS: Record<Fornecedor, { nome: string; icone: React.ReactNode }> = {
  google: {
    nome: "Google",
    icone: (
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 4.75 12 4.75Z"
        />
      </svg>
    ),
  },
};

export default function EntrarComConta({ regressarA = "/" }: { regressarA?: string }) {
  const [aCarregar, setACarregar] = useState<Fornecedor | null>(null);
  const [erro, setErro] = useState("");
  const { t } = useLanguage();

  const entrar = async (fornecedor: Fornecedor) => {
    setErro("");
    setACarregar(fornecedor);

    /* Rede de segurança: se ao fim de oito segundos ainda cá estamos, a
       saída não aconteceu. Sem isto o botão ficava a girar para sempre —
       era o que acontecia com o fornecedor por ligar, porque o Supabase
       devolve a resposta sem URL e sem erro, e nada mais acontece. */
    const desistir = window.setTimeout(() => {
      setACarregar(null);
      setErro(t.auth.oauth_window_failed);
    }, 8000);

    try {
      const supabase = createSupabaseBrowserClient();
      const destino = new URL("/auth/callback", window.location.origin);
      destino.searchParams.set("next", regressarA);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: fornecedor,
        options: { redirectTo: destino.toString() },
      });
      if (error) throw error;
      // Sem URL não há para onde ir: é o fornecedor que não está ligado.
      if (!data?.url) throw new Error("provider is not enabled");
      // Com URL, o browser sai daqui — não há nada a repor.
    } catch (e) {
      clearTimeout(desistir);
      setACarregar(null);
      const porLigar = e instanceof Error && /provider is not enabled|not enabled/i.test(e.message);
      setErro(
        porLigar
          ? t.auth.oauth_provider_disabled.replace("{provider}", LOGOS[fornecedor].nome)
          : t.auth.oauth_window_failed
      );
    }
  };

  return (
    <div className="mb-6">
      {erro && (
        <p role="alert" className="mb-4 flex items-center gap-2 text-xs text-[var(--erro)]">
          <AlertCircle size={13} aria-hidden="true" />
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {(Object.keys(LOGOS) as Fornecedor[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => entrar(f)}
            disabled={aCarregar !== null}
            className="btn btn-secundario w-full gap-2.5 rounded-xl py-3 text-[var(--foreground-strong)] disabled:cursor-not-allowed"
          >
            {aCarregar === f ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              LOGOS[f].icone
            )}
            {t.auth.continue_with.replace("{provider}", LOGOS[f].nome)}
          </button>
        ))}
      </div>

      {/* A costura entre as duas maneiras de entrar. */}
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--border-soft)]" />
        <span className="rotulo">{t.auth.or}</span>
        <span className="h-px flex-1 bg-[var(--border-soft)]" />
      </div>
    </div>
  );
}
