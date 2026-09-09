"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMensagensPorLer } from "@/context/MensagensContext";
import { resumirMensagem, type ChatConversa, type ChatMensagem } from "@/lib/marketplace-chat";
import CaixaEntrada from "@/components/chat/CaixaEntrada";
import Fio, { type ConversaAberta } from "@/components/chat/Fio";
import { fundirMensagens } from "@/components/chat/fundir";
import { apagarRascunho, guardarRascunho, lerRascunho } from "@/components/chat/rascunhos";
import { PREFIXO_LOCAL, type MensagemNoEcra } from "@/components/chat/tipos";
import { useEcraLargo } from "@/components/chat/ecra-largo";
import { useEstorvoDeBaixo } from "@/components/chat/estorvos";

/** Uma conversa como a caixa a mostra: a da API mais o retrato da outra
 *  parte, que a camada de dados ainda não serve. Ver `components/perfil`. */
type ConversaNaCaixa = ChatConversa & { outraParteAvatar?: string | null };

/**
 * A página das mensagens: a caixa de entrada e o fio.
 *
 * ## O que aqui se decidiu, e porquê
 *
 * **Duas vistas, uma casa.** Ao largo os dois painéis convivem; ao estreito é
 * um de cada vez, e o movimento entre eles é o da `.pilha` do painel de
 * regiões do `/mapa` — `--d-drill`, `--ease-in-out-cubic`, e o nível que sai a
 * levar `inert`. Abrir uma conversa é entrar num sítio e há caminho de volta,
 * que é exactamente o que esse idioma já diz; inventar aqui um segundo seria
 * duas ideias de profundidade na mesma casa.
 *
 * **O envio é optimista.** A mensagem aparece antes de o servidor responder —
 * medido antes, o tempo entre carregar em enviar e a ver no fio era de 832ms
 * no telemóvel e 737ms no computador, com o ecrã parado pelo meio. E recua com
 * franqueza: se falhar, fica lá, marcada, com um botão para repetir. Antes
 * desaparecia sem deixar rasto e o texto ficava na caixa — o que se via era
 * uma mensagem que se escreveu, se enviou, e não existe.
 *
 * **O rascunho é da conversa.** Era uma variável só para todas: medido, o
 * rascunho escrito no fio de um cavalo aparecia na caixa do fio seguinte,
 * pronto a ser enviado à pessoa errada.
 *
 * ## A costura para o que vem a seguir
 *
 * Toda a entrada de mensagens passa pelo `fundirMensagens`, que junta o que o
 * servidor diz ao que está no ecrã sem duplicar o eco da minha própria
 * mensagem. É por aí que o tempo real entra quando existir: uma linha que
 * chegue por um canal é uma chamada a mais a essa função, e não um segundo
 * caminho de dados.
 */
export default function MensagensContent() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { recarregar: recarregarPorLer } = useMensagensPorLer();
  const ecraLargo = useEcraLargo();

  /* Quanto é que há para deixar em baixo por causa de quem está fixo no ecrã.
     Na primeira visita o aviso de cookies tapava 252 dos 644 pixéis da coluna,
     e a caixa de escrever ia lá dentro. */
  const palco = useRef<HTMLDivElement>(null);
  const estorvo = useEstorvoDeBaixo(palco);

  /* O retrato da outra parte é opcional porque a rota que o serve está a ser
     feita do outro lado. Enquanto não vier, o `Avatar` desenha iniciais — que
     é o que desenharia de qualquer maneira a quem não tem fotografia. Quando
     vier, entra por aqui e não há uma linha de interface para mudar. */
  const [conversas, setConversas] = useState<ConversaNaCaixa[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [aberta, setAberta] = useState<ConversaAberta | null>(null);
  const [mensagens, setMensagens] = useState<MensagemNoEcra[]>([]);
  const [aCarregarFio, setACarregarFio] = useState(false);
  const [rascunho, setRascunho] = useState("");

  // Para devolver o foco à linha de onde se saiu, que é de onde ele veio.
  const linhas = useRef(new Map<string, HTMLButtonElement>());
  const registarLinha = useCallback((id: string, n: HTMLButtonElement | null) => {
    if (n) linhas.current.set(id, n);
    else linhas.current.delete(id);
  }, []);

  const carregarConversas = useCallback(async () => {
    setACarregar(true);
    setErro(null);
    try {
      const res = await fetch("/api/conversas");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error || t.chat.erro_carregar);
      setConversas(dados.conversas || []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.chat.erro_carregar);
    } finally {
      setACarregar(false);
    }
  }, [t.chat.erro_carregar]);

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  const abrir = useCallback(
    async (c: ConversaNaCaixa) => {
      setAberta({
        id: c.id,
        cavaloId: c.cavaloId,
        papel: c.papel,
        outraParte: c.outraParte,
        cavaloNome: c.cavaloNome,
        cavaloFoto: c.cavaloFoto,
        cavaloPreco: c.cavaloPreco,
        cavaloStatus: null,
        outraParteAvatar: c.outraParteAvatar ?? null,
      });
      setMensagens([]);
      setRascunho(lerRascunho(c.id));
      setACarregarFio(true);
      try {
        const res = await fetch(`/api/conversas/${c.id}`);
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.error || t.chat.erro_abrir);
        setAberta(dados.conversa);
        setMensagens(fundirMensagens([], dados.mensagens || []));
        setConversas((prev) => prev.map((x) => (x.id === c.id ? { ...x, porLer: 0 } : x)));
        // E o distintivo da navegação, que de outra forma só acertaria no
        // próximo minuto e daria a ideia de haver mensagens que já foram lidas.
        recarregarPorLer();
      } catch (e) {
        showToast("error", e instanceof Error ? e.message : t.chat.erro_abrir);
      } finally {
        setACarregarFio(false);
      }
    },
    [recarregarPorLer, showToast, t.chat.erro_abrir]
  );

  const fechar = useCallback(() => {
    const id = aberta?.id;
    setAberta(null);
    setMensagens([]);
    setRascunho("");
    // O foco volta à linha de onde saiu. Sem isto ficava no `<body>` — medido,
    // a tabulação seguinte recomeçava em «Skip to main content», ou seja quem
    // fechou um fio pelo teclado tinha de atravessar a página inteira outra vez.
    if (id) requestAnimationFrame(() => linhas.current.get(id)?.focus());
  }, [aberta?.id]);

  /* O rascunho segue a conversa e não a caixa. */
  const escrever = useCallback(
    (v: string) => {
      setRascunho(v);
      if (aberta) guardarRascunho(aberta.id, v);
    },
    [aberta]
  );

  /**
   * Enviar: a mensagem entra no fio já, e o servidor confirma-a depois.
   *
   * O corpo é guardado antes de a caixa ser limpa; se o pedido falhar, a
   * mensagem fica no fio marcada como falhada, e o `repetir` volta a partir
   * dela. Limpar a caixa e perder o texto era o que acontecia antes.
   */
  const enviarCorpo = useCallback(
    async (corpo: string, idLocal: string) => {
      if (!aberta) return;
      try {
        const res = await fetch(`/api/conversas/${aberta.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagem: corpo }),
        });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.error || t.chat.erro_enviar);

        const confirmada = dados.mensagem as ChatMensagem;
        setMensagens((prev) => fundirMensagens(prev, [confirmada]));
        setConversas((prev) =>
          prev.map((c) =>
            c.id === aberta.id
              ? {
                  ...c,
                  ultimaMensagem: resumirMensagem(corpo),
                  ultimaMensagemAt: confirmada.createdAt,
                }
              : c
          )
        );
      } catch {
        setMensagens((prev) =>
          prev.map((m) => (m.id === idLocal ? { ...m, aEnviar: false, falhou: true } : m))
        );
      }
    },
    [aberta, t.chat.erro_enviar]
  );

  const enviar = useCallback(() => {
    const corpo = rascunho.trim();
    if (!corpo || !aberta) return;

    const idLocal = `${PREFIXO_LOCAL}${Date.now()}`;
    setMensagens((prev) => [
      ...prev,
      {
        id: idLocal,
        corpo,
        createdAt: new Date().toISOString(),
        minha: true,
        lida: false,
        /* O piso honesto enquanto o servidor não responde. Quem manda no que
           se vê é o `aEnviar`, que tem precedência no `estadoDaMensagem`;
           este campo só passa a valer quando o eco do servidor o substituir
           pelo verdadeiro. */
        estado: "enviada" as const,
        aEnviar: true,
      },
    ]);
    setRascunho("");
    apagarRascunho(aberta.id);
    void enviarCorpo(corpo, idLocal);
  }, [aberta, enviarCorpo, rascunho]);

  const repetir = useCallback(
    (id: string) => {
      const falhada = mensagens.find((m) => m.id === id);
      if (!falhada) return;
      setMensagens((prev) =>
        prev.map((m) => (m.id === id ? { ...m, falhou: false, aEnviar: true } : m))
      );
      void enviarCorpo(falhada.corpo, id);
    },
    [enviarCorpo, mensagens]
  );

  /* Fechar com Escape é o que esta tecla faz em todo o lado — e só ao estreito,
     onde fechar quer dizer alguma coisa. Ao largo o fio não tapa nada. */
  useEffect(() => {
    if (ecraLargo || !aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [ecraLargo, aberta, fechar]);

  // Ao estreito, o nível de fora leva `inert`; ao largo os dois estão no ecrã
  // e nenhum leva. Um atributo não se desfaz em CSS, e é por isso que a medida
  // do ecrã também é lida em JavaScript.
  const nivelDeFora = ecraLargo ? -1 : aberta ? 0 : 1;

  return (
    <div className="chat-palco bg-[var(--background)]">
      <div
        ref={palco}
        className="chat"
        style={estorvo ? ({ "--chat-estorvo": `${estorvo}px` } as React.CSSProperties) : undefined}
      >
        <div className="pilha chat__pilha">
          {/* ── Nível 0: a caixa de entrada ───────────────────────────── */}
          <div
            className="pilha__nivel"
            data-fora={nivelDeFora === 0 ? "sim" : "nao"}
            data-lado="atras"
            aria-hidden={nivelDeFora === 0 ? true : undefined}
            inert={nivelDeFora === 0 ? true : undefined}
          >
            <div className="chat-coluna">
              <div className="chat-cabeca">
                <LocalizedLink
                  href="/minha-conta"
                  aria-label={t.chat.voltar_conta}
                  className="chat-atalho -ml-2"
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                </LocalizedLink>
                <div className="min-w-0 flex-1">
                  <h1 className="titulo-seccao truncate">{t.chat.titulo}</h1>
                  <p className="text-[11px] leading-tight text-[var(--foreground-secondary)]">
                    {t.chat.subtitulo}
                  </p>
                </div>
              </div>

              <div className="chat-coluna__rolo">
                <CaixaEntrada
                  conversas={conversas}
                  abertaId={aberta?.id ?? null}
                  aCarregar={aCarregar}
                  erro={erro}
                  onAbrir={abrir}
                  onTentarDeNovo={carregarConversas}
                  registarLinha={registarLinha}
                />
              </div>
            </div>
          </div>

          {/* ── Nível 1: o fio ─────────────────────────────────────────── */}
          <div
            className="pilha__nivel"
            data-fora={nivelDeFora === 1 ? "sim" : "nao"}
            data-lado="frente"
            aria-hidden={nivelDeFora === 1 ? true : undefined}
            inert={nivelDeFora === 1 ? true : undefined}
          >
            {aberta ? (
              /* A `key` é o que faz mudar de conversa ser um componente novo em
                 vez de o mesmo com o conteúdo trocado. Sem ela era preciso
                 limpar, num efeito, tudo o que o fio guarda — a última mensagem
                 conhecida, o aviso de novas, o rolo —, e limpar estado dentro de
                 um efeito é a cascata de renders que a casa já recusou no
                 `Farol` do formulário de anúncio. */
              <Fio
                key={aberta.id}
                conversa={aberta}
                mensagens={mensagens}
                aCarregar={aCarregarFio}
                rascunho={rascunho}
                onRascunho={escrever}
                onEnviar={enviar}
                onRepetir={repetir}
                onVoltar={fechar}
                ecraLargo={ecraLargo}
              />
            ) : (
              /* Ao largo há sempre uma coluna à direita, e um rectângulo vazio
                 lê-se como um erro de carregamento. Diz-se o que fazer. */
              <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                <MessagesSquare
                  size={24}
                  className="text-[var(--foreground-secondary)]"
                  aria-hidden="true"
                />
                <p className="max-w-xs text-sm text-[var(--foreground-secondary)]">
                  {conversas.length > 0 ? t.chat.escolher_fio : t.chat.vazio_nota}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
