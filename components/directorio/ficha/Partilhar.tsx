"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Share2, X as Fechar } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Partilhar a ficha.
 *
 * O painel é o mesmo painel da ficha do anúncio — botão de contorno, lista a
 * abrir por baixo com `.anim-crescer`, WhatsApp primeiro porque em Portugal é
 * por lá que um anúncio é reencaminhado — mas o texto vem do dicionário.
 *
 * O `components/ShareButtons` que a ficha do anúncio usa tinha as etiquetas
 * escritas em português dentro do próprio componente («Partilhar»,
 * «Copiado», «Partilhar no WhatsApp»), e numa página em inglês lia-se «Save |
 * Partilhar» lado a lado. Isso já está arrumado: esse componente passou a usar
 * o `createTranslator` com o `useLanguage`, como este. Os dois continuam
 * separados de propósito — este desenha o painel da ficha e vai buscar o texto
 * ao dicionário (`t.directorio.ficha`), aquele serve páginas de outras áreas e
 * traduz em linha.
 *
 * ── Os ícones têm a cor de quem representam ──────────────────────────────
 * Estavam os quatro em cinzento, e uma fila de quatro quadrados iguais
 * obriga a ler as palavras para achar o WhatsApp. A cor de uma marca não é
 * decoração: é o que se reconhece antes de ler. Vive em tokens
 * (`--marca-*`), como tudo o resto — a razão está escrita ao lado deles no
 * `globals.css` — e ocupa exactamente dezasseis pixéis, uma vez cada, num
 * painel que só abre a pedido. Não faz concorrência ao acento porque nunca
 * está no ecrã ao mesmo tempo que ele sem alguém o ter pedido.
 *
 * ── E o Instagram não partilha links ─────────────────────────────────────
 * Isto não é uma limitação nossa. O Instagram **não tem endpoint de partilha
 * na web**: não existe um `instagram.com/share?url=` como existe o
 * `facebook.com/sharer`, e os esquemas `instagram://` que existem abrem a
 * aplicação — na câmara, no perfil, nas mensagens — sem aceitarem um endereço
 * para publicar. Um botão que abrisse `instagram://` levava a pessoa para
 * fora do site e não levava o link com ela; num computador não fazia
 * absolutamente nada.
 *
 * Por isso o botão faz a coisa mais próxima que é **verdadeira**, e diz o que
 * fez:
 *
 *  - onde há partilha nativa (praticamente todos os telemóveis), abre a folha
 *    do sistema — e é aí que o Instagram aparece a sério, com o link atrás;
 *  - onde não há, copia o endereço e escreve porquê, que é exactamente o
 *    caminho que o Instagram obriga a fazer: colar no story ou na bio.
 *
 * A alternativa era um quarto quadrado bonito que não fazia nada. Um botão
 * morto é pior do que um botão a menos.
 */
export default function Partilhar({ titulo, url }: { titulo: string; url: string }) {
  const { t } = useLanguage();
  const f = t.directorio.ficha;
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState<"link" | "instagram" | null>(null);
  const painel = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const foraDoPainel = (e: MouseEvent) => {
      if (
        painel.current &&
        !painel.current.contains(e.target as Node) &&
        !botao.current?.contains(e.target as Node)
      ) {
        setAberto(false);
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("mousedown", foraDoPainel);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", foraDoPainel);
      document.removeEventListener("keydown", escape);
    };
  }, [aberto]);

  const comUtm = (conteudo: string) => {
    const separador = url.includes("?") ? "&" : "?";
    return `${url}${separador}utm_source=portal-lusitano&utm_medium=partilha-coudelaria&utm_campaign=coudelaria&utm_content=${encodeURIComponent(conteudo)}`;
  };

  const abrirJanela = (endereco: string) =>
    window.open(endereco, "_blank", "width=600,height=520,noopener,noreferrer");

  /** Devolve se conseguiu mesmo copiar — quem chama precisa de o saber. */
  const paraAAreaDeTransferencia = async (conteudo: string) => {
    try {
      await navigator.clipboard.writeText(comUtm(conteudo));
      return true;
    } catch {
      // Contextos sem `clipboard` (http, browsers antigos): o campo de texto
      // seleccionável por baixo continua a servir para copiar à mão.
      return false;
    }
  };

  const avisar = (qual: "link" | "instagram") => {
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 3000);
  };

  const copiar = async () => {
    if (await paraAAreaDeTransferencia("copiar-link")) avisar("link");
  };

  const partilhaNativa = async (conteudo: string) => {
    try {
      await navigator.share({ title: titulo, url: comUtm(conteudo) });
      setAberto(false);
      return true;
    } catch {
      // Cancelado por quem partilha; não é erro.
      return true;
    }
  };

  /** Há folha de partilha do sistema? Pergunta-se no clique, e não em estado.
      Guardar isto num `useState` obrigava a escrevê-lo dentro de um efeito —
      que é o que o `react-hooks/set-state-in-effect` proíbe, e com razão: um
      estado que nunca muda depois de montar não é estado, é uma pergunta. */
  const haPartilhaNativa = () =>
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  /* O Instagram, pela ordem do que é verdadeiro em cada sítio. Ver a nota no
     cabeçalho: não há endereço de partilha para onde mandar isto. */
  const paraOInstagram = async () => {
    if (haPartilhaNativa()) {
      await partilhaNativa("instagram");
      return;
    }
    if (await paraAAreaDeTransferencia("instagram")) avisar("instagram");
  };

  const redes: {
    chave: string;
    etiqueta: string;
    icone: React.ReactNode;
    /** Uma das duas: abre um endereço, ou faz outra coisa. */
    endereco?: string;
    accao?: () => void;
  }[] = [
    {
      chave: "whatsapp",
      etiqueta: "WhatsApp",
      icone: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="var(--marca-whatsapp)"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      endereco: `https://wa.me/?text=${encodeURIComponent(`${titulo}\n${comUtm("whatsapp")}`)}`,
    },
    {
      chave: "facebook",
      etiqueta: "Facebook",
      /* O `f` do Facebook, e não o ícone do lucide: aquele é um contorno
         genérico, e a marca é o `f` branco recortado no azul. */
      icone: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="var(--marca-facebook)"
          aria-hidden="true"
        >
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 3.926 23.094 9.101 24v-8.437H6.627v-3.49h2.474V9.9c0-3.475 1.998-5.393 5.107-5.393 1.49 0 3.049.267 3.049.267v3.352h-1.72c-1.694 0-2.223 1.056-2.223 2.14v2.57h3.784l-.605 3.49h-3.18V24C20.075 23.094 24 18.1 24 12.073z" />
        </svg>
      ),
      endereco: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(comUtm("facebook"))}`,
    },
    {
      chave: "instagram",
      etiqueta: "Instagram",
      /* O gradiente do Instagram não cabe numa variável de cor, por isso os
         três extremos vêm dos tokens e o `linearGradient` mora aqui. O `id`
         é único no documento: este painel só existe uma vez de cada vez. */
      icone: (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <defs>
            <linearGradient id="grad-instagram" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--marca-instagram-1)" />
              <stop offset="50%" stopColor="var(--marca-instagram-2)" />
              <stop offset="100%" stopColor="var(--marca-instagram-3)" />
            </linearGradient>
          </defs>
          <path
            fill="url(#grad-instagram)"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
          />
        </svg>
      ),
      accao: paraOInstagram,
    },
    {
      chave: "x",
      etiqueta: "X",
      icone: (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="var(--marca-x)" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      endereco: `https://x.com/intent/tweet?url=${encodeURIComponent(comUtm("x"))}&text=${encodeURIComponent(titulo)}`,
    },
  ];

  const quadrado =
    "flex w-full flex-col items-center gap-1.5 rounded-[var(--raio)] border border-[var(--border-soft)] px-1 py-2.5 text-[var(--foreground-secondary)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]";

  return (
    <div className="relative">
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="btn btn-secundario"
      >
        <Share2 size={15} aria-hidden="true" />
        {f.partilhar}
      </button>

      {aberto && (
        <div
          ref={painel}
          role="dialog"
          aria-label={f.partilhar}
          className="anim-crescer vidro absolute left-0 top-full z-50 mt-2 w-[24rem] origin-top rounded-[var(--raio-lg)] p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="rotulo-forte">{f.partilhar}</p>
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                botao.current?.focus();
              }}
              aria-label={f.fechar}
              className="rounded p-1 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
            >
              <Fechar size={14} aria-hidden="true" />
            </button>
          </div>

          {/* Grelha de cinco colunas iguais, e não `flex-1`. Com `flex` as
              caixas ficavam do tamanho do que tinham dentro — medido: 72, 72,
              73, 33 e 46 pixéis — e a fila lia-se torta; pior, a soma passava
              a largura do painel e o «Copiar» saía **12px para fora**. Uma
              grelha dá cinco quadrados iguais, que é o que faz uma fila de
              marcas parecer deliberada, e nunca transborda. */}
          <ul className="m-0 grid list-none grid-cols-5 gap-2 p-0">
            {redes.map((rede) => (
              <li key={rede.chave} className="min-w-0">
                <button
                  type="button"
                  onClick={() => (rede.accao ? rede.accao() : abrirJanela(rede.endereco!))}
                  aria-label={`${f.partilhar} — ${rede.etiqueta}`}
                  className={quadrado}
                >
                  {rede.icone}
                  <span className="meta">{rede.etiqueta}</span>
                </button>
              </li>
            ))}
            <li className="min-w-0">
              <button
                type="button"
                onClick={copiar}
                aria-label={copiado === "link" ? f.link_copiado : f.copiar_link}
                className={quadrado}
              >
                {copiado === "link" ? (
                  <Check size={16} className="text-[var(--ok)]" aria-hidden="true" />
                ) : (
                  <Link2 size={16} aria-hidden="true" />
                )}
                <span className="meta">{copiado === "link" ? f.link_copiado : f.copiar_link}</span>
              </button>
            </li>
          </ul>

          {/* Porque é que carregar no Instagram copiou um link em vez de abrir
              o Instagram. Só aparece depois de acontecer — uma explicação
              permanente de uma coisa que ainda não se fez é ruído. */}
          {copiado === "instagram" && (
            <p role="status" className="meta mt-3 text-[var(--foreground-secondary)]">
              <Check
                size={13}
                className="mr-1 inline-block align-[-2px] text-[var(--ok)]"
                aria-hidden="true"
              />
              {f.instagram_como}
            </p>
          )}

          {/* O endereço à vista: sem `clipboard` — em http, ou num browser
              antigo — ainda se copia à mão, e vê-se para onde vai o link. */}
          <p className="meta mt-3 select-all truncate rounded-[var(--raio-sm)] border border-[var(--border-soft)] px-2.5 py-2">
            {url}
          </p>

          {/* Só onde existe. Lido na renderização e não em estado: no servidor
              não há `navigator`, e o React repõe isto na hidratação. */}
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={() => partilhaNativa("partilha-nativa")}
              className="btn btn-subtil mt-2 w-full sm:hidden"
            >
              <Share2 size={14} aria-hidden="true" />
              {f.mais_opcoes}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
