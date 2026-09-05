"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Facebook, Link2, Share2, X as Fechar } from "lucide-react";
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
 */
export default function Partilhar({ titulo, url }: { titulo: string; url: string }) {
  const { t } = useLanguage();
  const f = t.directorio.ficha;
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
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

  const copiar = async () => {
    const endereco = comUtm("copiar-link");
    try {
      await navigator.clipboard.writeText(endereco);
    } catch {
      // Contextos sem `clipboard` (http, browsers antigos): o campo de texto
      // seleccionável por baixo continua a servir para copiar à mão.
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const partilhaNativa = async () => {
    try {
      await navigator.share({ title: titulo, url: comUtm("partilha-nativa") });
      setAberto(false);
    } catch {
      // Cancelado por quem partilha; não é erro.
    }
  };

  const redes: { chave: string; etiqueta: string; icone: React.ReactNode; endereco: string }[] = [
    {
      chave: "whatsapp",
      etiqueta: "WhatsApp",
      icone: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      endereco: `https://wa.me/?text=${encodeURIComponent(`${titulo}\n${comUtm("whatsapp")}`)}`,
    },
    {
      chave: "facebook",
      etiqueta: "Facebook",
      icone: <Facebook size={16} aria-hidden="true" />,
      endereco: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(comUtm("facebook"))}`,
    },
    {
      chave: "x",
      etiqueta: "X",
      icone: (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      endereco: `https://x.com/intent/tweet?url=${encodeURIComponent(comUtm("x"))}&text=${encodeURIComponent(titulo)}`,
    },
  ];

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
          className="anim-crescer absolute left-0 top-full z-50 mt-2 w-[19rem] origin-top rounded-[var(--raio-lg)] border border-[var(--border)] bg-[var(--background-elevated)] p-4"
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

          <ul className="m-0 flex list-none gap-2 p-0">
            {redes.map((rede) => (
              <li key={rede.chave} className="flex-1">
                <button
                  type="button"
                  onClick={() => abrirJanela(rede.endereco)}
                  aria-label={`${f.partilhar} — ${rede.etiqueta}`}
                  className="flex w-full flex-col items-center gap-1.5 rounded-[var(--raio)] border border-[var(--border-soft)] px-2 py-2.5 text-[var(--foreground-secondary)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                >
                  {rede.icone}
                  <span className="meta">{rede.etiqueta}</span>
                </button>
              </li>
            ))}
            <li className="flex-1">
              <button
                type="button"
                onClick={copiar}
                aria-label={copiado ? f.link_copiado : f.copiar_link}
                className="flex w-full flex-col items-center gap-1.5 rounded-[var(--raio)] border border-[var(--border-soft)] px-2 py-2.5 text-[var(--foreground-secondary)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              >
                {copiado ? (
                  <Check size={16} className="text-[var(--ok)]" aria-hidden="true" />
                ) : (
                  <Link2 size={16} aria-hidden="true" />
                )}
                <span className="meta">{copiado ? f.link_copiado : f.copiar_link}</span>
              </button>
            </li>
          </ul>

          {/* O endereço à vista: sem `clipboard` — em http, ou num browser
              antigo — ainda se copia à mão, e vê-se para onde vai o link. */}
          <p className="meta mt-3 select-all truncate rounded-[var(--raio-sm)] border border-[var(--border-soft)] px-2.5 py-2">
            {url}
          </p>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={partilhaNativa}
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
