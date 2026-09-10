"use client";

import { useCallback, useEffect, useState } from "react";
import { MessagesSquare, Loader2, Check, X, LogIn } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { MAX_MENSAGEM } from "@/lib/marketplace-chat";
import {
  apagarRascunhoDoAnuncio,
  caminhoDoLogin,
  guardarRascunhoDoAnuncio,
  lerRascunhoDoAnuncio,
} from "./rascunho-do-anuncio";

interface Props {
  cavaloId: string;
  cavaloNome: string;
}

/**
 * O primeiro contacto, a partir do anúncio.
 *
 * Só é desenhado quando o anúncio está ligado a uma conta de vendedor — quem
 * decide isso é a página, e sem conta continuam a aparecer o telefone e o
 * email publicados.
 *
 * **Estava escrito em português dentro do JSX**, numa página que tem selector
 * de língua: a frase de abertura da conversa — a que a pessoa vai mesmo enviar
 * — saía em português a quem estava a ler em inglês ou em espanhol. Era a pior
 * das nove, porque é a única que sai do site e chega a outra pessoa.
 *
 * ── A parede diz-se antes, não depois ─────────────────────────────────────
 *
 * Enviar mensagem exige conta, e isso está garantido na própria base
 * (`comprador_id NOT NULL REFERENCES auth.users(id)`). O que estava mal era
 * **onde** se encontrava a parede. Medido nas duas vistas, com o site
 * construído e servido: quem não tinha sessão abria a caixa, escrevia
 * **181 caracteres**, carregava em enviar, e só aí era atirado para o login —
 * com **zero bytes guardados** em qualquer sítio do browser. Ao voltar, a
 * caixa tinha os 66 caracteres do modelo e mais nada. E nenhuma frase do
 * cartão dizia que era preciso conta: também isso foi medido, e não havia.
 *
 * Duas coisas mudam, e são independentes uma da outra:
 *
 * 1. **Dizer antes.** Sem sessão, o cartão não abre uma caixa que promete um
 *    envio que não vai acontecer: mostra a linha que o diz e a ligação para
 *    entrar, já com o caminho de volta. Isto é a mesma regra que o formulário
 *    de anúncio aplica ao Enter no passo que cobra — **não se deixa alguém
 *    começar um gesto que a página sabe que vai recusar**.
 *
 * 2. **Não perder o que se escreveu.** Se a sessão expirar entre abrir a caixa
 *    e carregar em enviar — que é o caso que a primeira metade não cobre,
 *    porque aí a página *pensava* que havia sessão —, o texto é guardado antes
 *    de a página mudar e reencontrado à chegada. O mecanismo e as razões estão
 *    no `rascunho-do-anuncio.ts`.
 *
 * E o endereço do login passa a levar `returnUrl`, que é o nome que a página
 * de login lê e que o `middleware` já escreve. Levava `redirect`, que ninguém
 * lê: quem entrasse aterrava na página inicial.
 */
export default function ContactarVendedor({ cavaloId, cavaloNome }: Props) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { user, isLoading: aVerSessao } = useAuth();

  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState(() =>
    t.chat.contactar_modelo.replace("{nome}", cavaloNome)
  );
  const [aEnviar, setAEnviar] = useState(false);
  const [enviada, setEnviada] = useState(false);

  /**
   * O que ficou por enviar da última vez que se passou por aqui.
   *
   * Corre no cliente e depois da montagem de propósito: o `sessionStorage` não
   * existe no servidor, e semear o `useState` com ele daria um HTML diferente
   * do que o servidor escreveu. Se houver rascunho, a caixa **abre-se
   * sozinha** — quem volta do login com um recado por acabar não devia ter de
   * se lembrar de carregar outra vez no botão para o reencontrar.
   */
  useEffect(() => {
    const guardado = lerRascunhoDoAnuncio(cavaloId);
    if (!guardado) return;
    setMensagem(guardado);
    setAberto(true);
  }, [cavaloId]);

  const escrever = useCallback(
    (v: string) => {
      setMensagem(v);
      guardarRascunhoDoAnuncio(cavaloId, v);
    },
    [cavaloId]
  );

  const enviar = async () => {
    const corpo = mensagem.trim();
    if (!corpo) {
      showToast("error", t.chat.contactar_vazia);
      return;
    }

    setAEnviar(true);
    try {
      const res = await fetch("/api/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cavaloId, mensagem: corpo }),
      });

      if (res.status === 401) {
        /* A sessão caiu entre abrir a caixa e carregar em enviar. Guardar
           **antes** de mudar de página: uma navegação de página inteira não
           dá segunda oportunidade, e é este o instante em que os 181
           caracteres se perdiam. */
        guardarRascunhoDoAnuncio(cavaloId, corpo);
        window.location.href = caminhoDoLogin(window.location.pathname);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.chat.erro_enviar);

      // Enviada é enviada: o rascunho deixa de fazer sentido e sai.
      apagarRascunhoDoAnuncio(cavaloId);
      setEnviada(true);
      showToast("success", t.chat.contactar_sucesso);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : t.chat.erro_enviar);
    } finally {
      setAEnviar(false);
    }
  };

  if (enviada) {
    return (
      <div className="cartao px-4 py-4 text-center">
        <Check
          size={18}
          className="mx-auto mb-2"
          style={{ color: "var(--ok)" }}
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--foreground-strong)]">{t.chat.contactar_enviada}</p>
        <LocalizedLink
          href="/minha-conta/mensagens"
          className="mt-3 inline-block text-xs text-[var(--foreground-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--foreground-strong)]"
        >
          {t.chat.contactar_ver} →
        </LocalizedLink>
      </div>
    );
  }

  /* ── Sem sessão: a parede diz-se aqui ──────────────────────────────────────
     Enquanto o `AuthProvider` ainda está a ler a sessão não se afirma nada:
     escrever «precisa de conta» a alguém que tem sessão, durante o meio
     segundo que a leitura demora, seria uma frase falsa a piscar no ecrã. Fica
     o botão de sempre, e quem carregar nele antes de a leitura acabar vê a
     caixa — que é o comportamento antigo, e o pior caso é o que já existia. */
  if (!aVerSessao && !user) {
    return (
      <div className="cartao space-y-3 p-4 text-center">
        <MessagesSquare
          size={18}
          className="mx-auto text-[var(--foreground-secondary)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--foreground-strong)]">{t.chat.contactar_precisa_conta}</p>
        <p className="text-[11px] leading-relaxed text-[var(--foreground-secondary)]">
          {t.chat.contactar_precisa_conta_nota}
        </p>
        {/* Uma âncora a sério, com o caminho de volta já lá dentro: quem entra
            regressa a este anúncio, e não à página inicial. */}
        <LocalizedLink
          href={`/login?returnUrl=${encodeURIComponent(`/comprar/${cavaloId}`)}`}
          className="btn btn-primario w-full gap-2 rounded-full py-3"
        >
          <LogIn size={14} aria-hidden="true" />
          {t.chat.contactar_entrar}
        </LocalizedLink>
        <p className="text-center text-[11px] leading-relaxed text-[var(--foreground-secondary)]">
          {t.chat.contactar_nota}
        </p>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="btn btn-primario w-full gap-3 rounded-full py-4"
      >
        <MessagesSquare size={16} aria-hidden="true" />
        {t.chat.contactar_abrir}
      </button>
    );
  }

  return (
    <div className="cartao space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="rotulo">{t.chat.contactar_titulo}</span>
        <button
          onClick={() => setAberto(false)}
          aria-label={t.chat.contactar_fechar}
          className="text-[var(--foreground-secondary)] transition-colors hover:text-[var(--foreground-strong)]"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <label htmlFor="contactar-vendedor" className="sr-only">
        {t.chat.escrever_rotulo}
      </label>
      <textarea
        id="contactar-vendedor"
        rows={4}
        value={mensagem}
        maxLength={MAX_MENSAGEM}
        onChange={(e) => escrever(e.target.value)}
        /* A mesma caixa do fio: quem escreve aqui a primeira mensagem escreve
           as seguintes lá dentro, e duas caixas diferentes para o mesmo gesto
           leem-se como dois sítios. */
        className="chat-redaccao__caixa block w-full"
      />

      <button
        onClick={enviar}
        disabled={aEnviar}
        className="btn btn-primario w-full gap-2 rounded-full py-3"
      >
        {aEnviar ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <MessagesSquare size={14} aria-hidden="true" />
        )}
        {t.chat.enviar}
      </button>

      {/* A promessa da página inicial, dita onde ela se cumpre. É texto e não
          legenda — com a tinta da `.meta` media 3,66:1. */}
      <p className="text-center text-[11px] leading-relaxed text-[var(--foreground-secondary)]">
        {t.chat.contactar_nota}
      </p>
    </div>
  );
}
