"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
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
  useFocusTrap(painelRef, aberto, fechar);

  useEffect(() => {
    const reabrir = () => {
      setDetalhes(true);
      setAberto(true);
    };
    window.addEventListener(EVENTO_ABRIR_CONSENTIMENTO, reabrir);
    return () => window.removeEventListener(EVENTO_ABRIR_CONSENTIMENTO, reabrir);
  }, []);

  // Com o diálogo aberto a página por baixo não rola.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

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
      aria-modal="true"
      aria-label={c.aria_label}
      className="fixed inset-0 z-[9997] flex items-end justify-center bg-black/[0.64] p-3 backdrop-blur-[24px] sm:items-center sm:p-6"
    >
      <div
        ref={painelRef}
        className="anim-crescer w-full max-w-xl rounded-[28px] border border-[var(--border-soft)] bg-[var(--background-elevated)] p-5 shadow-[0_12px_60px_rgba(0,0,0,0.8)] sm:p-6"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <h2 className="titulo-seccao">{c.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-secondary)]">
          {c.description}{" "}
          <LocalizedLink
            href="/privacidade"
            className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--border-hover)]"
          >
            {c.policy}
          </LocalizedLink>
          .
        </p>

        {/* As escolhas por categoria. Aparecem a pedido, mas a recusa não
            depende delas — está na linha de baixo, a um clique. */}
        {detalhes && (
          <div className="mt-4 flex flex-col gap-2">
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

        {/* Recusar e aceitar são gémeos: mesma classe, mesma largura, mesma
            linha. É o que faz de recusar uma resposta tão fácil como
            aceitar, e não uma saída escondida. */}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
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

        <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
          {detalhes ? (
            <button
              type="button"
              onClick={() => registar({ ...preferencias, essential: true }, "custom")}
              className="btn btn-secundario flex-1 rounded-full"
            >
              {c.accept_selected}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setDetalhes((v) => !v)}
            aria-expanded={detalhes}
            className="btn btn-subtil flex-1 rounded-full"
          >
            {detalhes ? c.hide_details : c.customize}
          </button>
        </div>

        <p className="meta mt-4 text-center">{c.reopen_hint}</p>
      </div>
    </div>,
    document.body
  );
}
