"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";
import {
  CHAVE_CONSENTIMENTO,
  CHAVE_PREFERENCIAS,
  EVENTO_ABRIR_CONSENTIMENTO,
} from "@/lib/consentimento";

interface Preferencias {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const SO_ESSENCIAIS: Preferencias = { essential: true, analytics: false, marketing: false };
const TUDO: Preferencias = { essential: true, analytics: true, marketing: true };

function Interruptor({
  ligado,
  aoMudar,
  bloqueado,
  rotulo,
}: {
  ligado: boolean;
  aoMudar?: () => void;
  bloqueado?: boolean;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={aoMudar}
      disabled={bloqueado}
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      // Estado escolhido é branco, não dourado: quem assinala uma escolha
      // sobre preto é o contraste.
      className={`relative h-[22px] w-10 flex-shrink-0 rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--foreground-strong)] ${
        bloqueado ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      } ${
        ligado
          ? "border-transparent bg-[var(--foreground-strong)]"
          : "border-[var(--border)] bg-[var(--background-elevated)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-[3px] h-[14px] w-[14px] rounded-full transition-all duration-200 ${
          ligado ? "left-[20px] bg-black" : "left-[3px] bg-[var(--foreground-muted)]"
        }`}
      />
    </button>
  );
}

/**
 * Pedido de consentimento.
 *
 * É um diálogo modal, e não uma barra pousada em baixo. Duas razões, e a
 * segunda é a que decide:
 *
 * 1. Recusar tem de ser tão fácil como aceitar. A barra anterior punha
 *    «Aceitar Todos» em destaque e escondia a recusa dentro de
 *    «Personalizar» — dois cliques contra um. Aqui as duas respostas são
 *    botões gémeos, do mesmo tamanho e do mesmo peso, na primeira camada.
 *
 * 2. Uma barra fixa em baixo é mobiliário permanente: fica lá enquanto não
 *    for respondida e come uma faixa do ecrã que **todas** as páginas
 *    passam a ter de conhecer. Media-se: no `/mapa`, tapava 9 das 29
 *    etiquetas de coudelaria em 1400×950 e 6 em 390×780. Reservar o espaço
 *    com uma variável CSS obrigava cada página a saber que existe um aviso
 *    de cookies — e o motor de etiquetas do globo não tem nada que aprender
 *    isso. Um modal responde-se uma vez e desaparece: não há faixa que
 *    reservar, não há contrato de layout, e a classe inteira de defeitos
 *    deixa de existir.
 *
 * Depois de respondido não volta sozinho. Quem quiser mudar de ideias entra
 * pelo rodapé, que dispara `EVENTO_ABRIR_CONSENTIMENTO` — retirar o
 * consentimento é tão fácil como tê-lo dado, que é o que a lei pede.
 */
function lerGuardado(): { respondido: boolean; preferencias: Preferencias } {
  try {
    const respondido = Boolean(localStorage.getItem(CHAVE_CONSENTIMENTO));
    const anteriores = localStorage.getItem(CHAVE_PREFERENCIAS);
    return {
      respondido,
      preferencias: anteriores
        ? { ...SO_ESSENCIAIS, ...JSON.parse(anteriores), essential: true }
        : SO_ESSENCIAIS,
    };
  } catch {
    // Sem localStorage (janela privada, armazenamento bloqueado) o pedido
    // aparece à mesma: mais vale perguntar duas vezes do que assumir.
    return { respondido: false, preferencias: SO_ESSENCIAIS };
  }
}

export default function CookieConsent() {
  // Lido no arranque, não num efeito: o componente é carregado com
  // `ssr: false`, por isso o primeiro render já é no browser e já tem
  // `localStorage`. Num efeito, quem nunca respondeu via um render vazio
  // antes do pedido — e quem já respondeu via o pedido antes de ele
  // desaparecer.
  const [estado] = useState(lerGuardado);
  const [aberto, setAberto] = useState(!estado.respondido);
  const [detalhes, setDetalhes] = useState(false);
  const [preferencias, setPreferencias] = useState<Preferencias>(estado.preferencias);
  const painelRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const c = t.cookies;

  const fechar = useCallback(() => setAberto(false), []);

  /**
   * O Escape fecha, e mais nada prende o teclado.
   *
   * A armadilha de foco saiu com o véu: prender o Tab dentro de uma barra que
   * não tapa o site é dizer ao leitor de ecrã que o resto da página está
   * inerte quando não está. O Escape fica — é a metade que servia — e fechar
   * sem responder não regista consentimento nenhum: a barra volta na visita
   * seguinte, que é o que tem de acontecer a quem não respondeu.
   */
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, fechar]);

  useEffect(() => {
    const reabrir = () => {
      setDetalhes(true);
      setAberto(true);
    };
    window.addEventListener(EVENTO_ABRIR_CONSENTIMENTO, reabrir);
    return () => window.removeEventListener(EVENTO_ABRIR_CONSENTIMENTO, reabrir);
  }, []);

  const registar = useCallback((prefs: Preferencias, decisao: string) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        ad_storage: prefs.marketing ? "granted" : "denied",
        ad_user_data: prefs.marketing ? "granted" : "denied",
        ad_personalization: prefs.marketing ? "granted" : "denied",
        analytics_storage: prefs.analytics ? "granted" : "denied",
        functionality_storage: "granted",
        personalization_storage: "granted",
      });
    }
    try {
      localStorage.setItem(CHAVE_CONSENTIMENTO, decisao);
      localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs));
    } catch {
      // Sem armazenamento a escolha vale só para esta visita. É o mais que
      // se pode fazer sem guardar nada — e guardar era justamente o que se
      // estava a pedir autorização para fazer.
    }
    setPreferencias(prefs);
    setAberto(false);
  }, []);

  if (!aberto || typeof document === "undefined") return null;

  const categorias = [
    {
      chave: "essential" as const,
      titulo: c.essential,
      texto: c.essential_desc,
      bloqueado: true,
      valor: true,
    },
    {
      chave: "analytics" as const,
      titulo: c.analytics,
      texto: c.analytics_desc,
      bloqueado: false,
      valor: preferencias.analytics,
    },
    {
      chave: "marketing" as const,
      titulo: c.marketing,
      texto: c.marketing_desc,
      bloqueado: false,
      valor: preferencias.marketing,
    },
  ];

  // Num portal para o `body`: o pedido não pertence a nenhuma secção da
  // página e não pode ficar preso a um antecessor com `transform`.
  return createPortal(
    <div
      id="aviso-cookies"
      role="dialog"
      aria-label={c.aria_label}
      // Barra em baixo, e não um cartão ao meio do ecrã com o site apagado por
      // trás. Um pedido de cookies não é uma pergunta que valha parar o site
      // para fazer: chegou a ser uma barra, passou a modal sem que ninguém o
      // pedisse — no meio de um trabalho sobre outra coisa — e volta ao que
      // era. Com ela em baixo, quem chega vê o site primeiro, que é a ordem
      // certa das duas coisas.
      className="fixed inset-x-3 bottom-3 z-[9998] mx-auto max-w-5xl opacity-0 animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_forwards] lg:inset-x-6 lg:bottom-6"
      style={{ willChange: "transform, opacity", marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        ref={painelRef}
        /* Opaca, e não a 80% ou a 94%.
            Medido em duas capturas: com o fundo translúcido, o preço da página
            de venda e a citação do Mestre Nuno Oliveira liam-se **através** do
            texto dos cookies. Sobre preto, seis por cento de texto branco ainda
            se lê — o pouco que passa não é uma transparência elegante, é uma
            frase por cima de outra. O vidro é a borda e a sombra; o fundo é
            fundo. */
        className="vidro rounded-[28px] p-4 sm:p-6"
      >
        {/* ── Uma barra tem de ter altura de barra ────────────────────────
            Empilhada — título, parágrafo, dois botões, «Escolher», nota — dava
            255 pixéis. Medido na página de entrada a 1280×900: tapava o botão
            «Entrar na Conta». Uma barra que tapa a acção principal da página
            onde assenta não é melhor do que a modal que aqui esteve.

            A partir de `lg` o texto vai para a esquerda e as respostas para a
            direita, que é o desenho que esta barra teve antes de virar cartão.
            Abaixo disso empilha — num telemóvel não há duas colunas que valham
            a pena. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <div className="min-w-0 flex-1">
            <h2 className="titulo-seccao">{c.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground-secondary)]">
              {c.description}{" "}
              <LocalizedLink
                href="/privacidade"
                className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--border-hover)]"
              >
                {c.policy}
              </LocalizedLink>
              .
            </p>
          </div>

          {/* Recusar e aceitar são gémeos: mesma classe, mesma largura, mesma
              linha. É o que faz de recusar uma resposta tão fácil como
              aceitar, e não uma saída escondida. O «Escolher» fica por baixo
              deles, mais leve — é a terceira hipótese, não a primeira. */}
          <div className="flex shrink-0 flex-col gap-2 lg:w-[22rem]">
            {/* Lado a lado desde o telemóvel. Empilhados, a barra ia a 329px
                num ecrã de 844 — 39% do ecrã para uma pergunta de sim ou não —
                e tapava o botão de entrar da página de entrada. São duas
                palavras cada uma; cabem. */}
            <div className="flex flex-row gap-2">
              <button
                type="button"
                onClick={() => registar(SO_ESSENCIAIS, "declined")}
                className="btn btn-primario flex-1 rounded-full"
              >
                {c.reject_all}
              </button>
              <button
                type="button"
                onClick={() => registar(TUDO, "accepted")}
                className="btn btn-primario flex-1 rounded-full"
              >
                {c.accept_all}
              </button>
            </div>
            <div className="flex flex-row gap-2">
              {detalhes && (
                <button
                  type="button"
                  onClick={() => registar({ ...preferencias, essential: true }, "custom")}
                  className="btn btn-secundario flex-1 rounded-full"
                >
                  {c.accept_selected}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetalhes((v) => !v)}
                aria-expanded={detalhes}
                className="btn btn-subtil flex-1 rounded-full"
              >
                {detalhes ? c.hide_details : c.customize}
              </button>
            </div>
          </div>
        </div>

        {/* As escolhas por categoria. Aparecem a pedido, mas a recusa não
            depende delas — está na coluna da direita, a um clique. Em barra
            larga vão a três colunas: empilhadas, empurravam as respostas para
            fora do ecrã em portáteis baixos. */}
        {detalhes && (
          <div className="anim-crescer mt-4 grid gap-2 lg:grid-cols-3">
            {categorias.map((cat) => (
              <div
                key={cat.chave}
                className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border-soft)] p-3"
              >
                <div className="min-w-0">
                  <span className="block text-sm text-[var(--foreground)]">{cat.titulo}</span>
                  <span className="meta mt-0.5 block leading-snug">{cat.texto}</span>
                </div>
                <Interruptor
                  ligado={cat.valor}
                  bloqueado={cat.bloqueado}
                  rotulo={cat.bloqueado ? `${cat.titulo} — ${c.always_on}` : cat.titulo}
                  aoMudar={
                    cat.bloqueado
                      ? undefined
                      : () => setPreferencias((p) => ({ ...p, [cat.chave]: !p[cat.chave] }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* A nota de que se pode voltar atrás. Fica ao pé do texto e não
            centrada por baixo de tudo: numa barra larga, uma linha centrada no
            meio de dois metros de nada não pertence a coisa nenhuma. */}
        <p className="meta mt-3 hidden sm:block">{c.reopen_hint}</p>
      </div>
    </div>,
    document.body
  );
}
