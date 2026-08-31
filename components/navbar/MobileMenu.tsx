"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LocalizedLink from "@/components/LocalizedLink";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, X } from "lucide-react";
import { usePathname } from "next/navigation";

interface MobileMenuProps {
  isOpen: boolean;
  language: string;
  onLanguageToggle: () => void;
  onClose: () => void;
}

function tr3(lang: string, pt: string, en: string, es: string) {
  return lang === "pt" ? pt : lang === "es" ? es : en;
}

interface Ligacao {
  href: string;
  label: string;
}

interface Grupo {
  id: string;
  label: string;
  filhos: Ligacao[];
}

type Destino = Ligacao | Grupo;

const ehGrupo = (d: Destino): d is Grupo => "filhos" in d;

/** As redes onde o portal está. Ícones, sem rótulo — a linha lê-se de relance. */
const REDES = [
  { nome: "Instagram", href: "https://www.instagram.com/portal.lusitano/" },
  { nome: "Facebook", href: "https://www.facebook.com/portallusitano" },
];

/**
 * Menu de ecrã inteiro, com dois níveis.
 *
 * Sem ícones, sem caixas e sem cor nas entradas: a hierarquia é feita só com
 * tamanho de letra. Numa lista de seis destinos, um ícone por linha não
 * acrescenta informação nenhuma e rouba a atenção que devia ir para a palavra.
 *
 * O painel não desliza a abrir — só aparece. Quem lhe dá peso é o fundo
 * escuro com desfoque, que empurra a página para trás sem a esconder. O
 * movimento fica todo guardado para o segundo nível, que é onde ele diz
 * alguma coisa: o submenu entra da direita enquanto o nível de cima se
 * apaga, e essas duas coisas ao mesmo tempo leem-se como profundidade.
 */
export const MobileMenu = memo(function MobileMenu({
  isOpen,
  language,
  onLanguageToggle,
  onClose,
}: MobileMenuProps) {
  const pathname = usePathname();
  // O painel fica montado enquanto a animação de saída corre; quem o desmonta
  // é o fim dessa animação, não um temporizador que tem de adivinhar a
  // duração. O estado é ajustado durante o render — a forma que o React
  // aceita — em vez de num efeito, que encadearia renders.
  const [montado, setMontado] = useState(isOpen);
  const [abertoAntes, setAbertoAntes] = useState(isOpen);
  const [grupo, setGrupo] = useState<string | null>(null);

  if (isOpen !== abertoAntes) {
    setAbertoAntes(isOpen);
    if (isOpen) setMontado(true);
  }

  const aFechar = montado && !isOpen;

  // Rede de segurança para o desmonte.
  //
  // Quem desmonta o painel é o fim da animação de saída. Mas a partir de
  // 1024px o painel é `lg:hidden`, e um elemento em `display: none` não
  // corre animações — o `animationend` nunca chegava e o painel ficava
  // montado para sempre, escondido, com o seu `aria-modal` a acompanhar.
  // Acontecia mesmo: bastava abrir o menu no telemóvel e alargar a janela.
  useEffect(() => {
    if (!aFechar) return;
    const t = window.setTimeout(() => setMontado(false), 400);
    return () => window.clearTimeout(t);
  }, [aFechar]);

  // Com o menu aberto, a página por baixo não deve rolar.
  useEffect(() => {
    if (!isOpen) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [isOpen]);

  // Escape recua um nível de cada vez: primeiro sai do submenu, só depois
  // fecha o menu. Fechar tudo de uma vez perde o sítio a quem só queria
  // voltar atrás.
  useEffect(() => {
    if (!isOpen) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (grupo) setGrupo(null);
      else onClose();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [isOpen, onClose, grupo]);

  if (!montado) return null;

  // Dois destinos passam a grupo. Não são páginas novas: são as mesmas que já
  // existiam, arrumadas por baixo do nome que as cobre a todas — é o que dá
  // ao menu um segundo nível onde entrar.
  const destinos: Destino[] = [
    { href: "/", label: tr3(language, "Início", "Home", "Inicio") },
    {
      id: "comprar",
      label: tr3(language, "Comprar cavalo", "Buy a horse", "Comprar caballo"),
      filhos: [
        {
          href: "/comprar",
          label: tr3(language, "Todos os cavalos", "All horses", "Todos los caballos"),
        },
        {
          href: "/comprar?idadeMax=3",
          label: tr3(language, "Poldros até 3 anos", "Foals up to 3", "Potros hasta 3 años"),
        },
        {
          href: "/comprar?disciplina=Trabalho",
          label: tr3(language, "Equitação de trabalho", "Working equitation", "Doma de trabajo"),
        },
        {
          href: "/comprar?sexo=femea",
          label: tr3(language, "Éguas de ventre", "Broodmares", "Yeguas de vientre"),
        },
      ],
    },
    {
      id: "coudelarias",
      label: tr3(language, "Coudelarias", "Studs", "Cuadras"),
      filhos: [
        { href: "/directorio", label: tr3(language, "Directório", "Directory", "Directorio") },
        { href: "/mapa", label: tr3(language, "Mapa", "Map", "Mapa") },
      ],
    },
    { href: "/eventos", label: tr3(language, "Eventos", "Events", "Eventos") },
    {
      href: "/cavalos-favoritos",
      label: tr3(language, "Cavalos favoritos", "Saved horses", "Caballos favoritos"),
    },
    { href: "/minha-conta", label: tr3(language, "A minha conta", "My account", "Mi cuenta") },
  ];

  const naRota = (href: string) => {
    const base = href.split("?")[0];
    return base === "/" ? pathname === "/" : pathname.startsWith(base);
  };

  const linhaGrande =
    "flex w-full items-center justify-between py-3 text-left text-[2rem] font-normal leading-tight tracking-tight transition-colors";

  // Num portal para o `body`, e não onde está declarado: a barra de navegação
  // leva `transform: translateZ(0)` para compor na GPU, e um antecessor com
  // transform passa a ser o bloco de contenção de qualquer `position: fixed`
  // lá dentro. O painel resolvia o `inset-0` contra a barra — 56px de altura —
  // em vez de contra a janela.
  return createPortal(
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={tr3(language, "Menu", "Menu", "Menú")}
      data-a-fechar={aFechar ? "true" : "false"}
      onAnimationEnd={(e) => {
        if (!aFechar || e.target !== e.currentTarget) return;
        setMontado(false);
        // Volta ao primeiro nível só depois de o painel sair. Repor durante a
        // saída dava a ver o submenu a recuar enquanto o menu se apagava.
        setGrupo(null);
      }}
      className="menu-painel fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-black/[0.64] px-5 pb-10 backdrop-blur-[24px] lg:hidden"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      {/* Cabeçalho do painel: a marca fica onde estava, o botão passa a fechar. */}
      <div className="flex h-14 items-center justify-between gap-4">
        <LocalizedLink
          href="/"
          onClick={onClose}
          className="text-lg font-bold tracking-[0.01em] text-[var(--foreground-strong)]"
        >
          PORTAL LUSITANO
        </LocalizedLink>

        <button
          onClick={onClose}
          aria-label={tr3(language, "Fechar menu", "Close menu", "Cerrar menú")}
          className="btn btn-pilula touch-manipulation gap-2 active:scale-95"
        >
          <X size={18} aria-hidden="true" />
          {tr3(language, "Fechar", "Close", "Cerrar")}
        </button>
      </div>

      {/* Palco dos dois níveis: ocupam o mesmo sítio, sobrepostos. */}
      <div className="menu-palco">
        {/* --- Nível 1: os destinos ------------------------------------- */}
        <div
          className="menu-nivel flex h-full flex-col overflow-y-auto"
          data-nivel="0"
          data-atras={grupo ? "true" : "false"}
        >
          <nav className="mt-10 flex flex-col">
            {destinos.map((d) =>
              ehGrupo(d) ? (
                <button
                  key={d.id}
                  onClick={() => setGrupo(d.id)}
                  aria-expanded={grupo === d.id}
                  className={`${linhaGrande} ${
                    d.filhos.some((f) => naRota(f.href))
                      ? "text-[var(--foreground-muted)]"
                      : "text-[var(--foreground-strong)] hover:text-[var(--foreground-secondary)]"
                  }`}
                >
                  {d.label}
                  <ChevronRight size={24} aria-hidden="true" className="opacity-40" />
                </button>
              ) : (
                <LocalizedLink
                  key={d.href}
                  href={d.href}
                  onClick={onClose}
                  aria-current={naRota(d.href) ? "page" : undefined}
                  className={`${linhaGrande} ${
                    naRota(d.href)
                      ? "text-[var(--foreground-muted)]"
                      : "text-[var(--foreground-strong)] hover:text-[var(--foreground-secondary)]"
                  }`}
                >
                  {d.label}
                </LocalizedLink>
              )
            )}
          </nav>

          {/* A acção que sustenta o marketplace, em pastilha. */}
          <div className="mt-8">
            <LocalizedLink
              href="/vender-cavalo"
              onClick={onClose}
              className="btn btn-pilula gap-2.5 text-base"
            >
              {tr3(language, "Publicar anúncio", "Post a listing", "Publicar anuncio")}
              <ArrowRight size={17} aria-hidden="true" />
            </LocalizedLink>
          </div>

          <div className="flex-1" />

          {/* Rodapé do painel: idioma e redes. */}
          <div className="mt-12 border-t border-[var(--border-soft)] pt-6">
            <button onClick={onLanguageToggle} className="btn btn-subtil px-0 text-sm">
              {language === "pt" ? "Switch to English" : "Mudar para português"}
            </button>

            <div className="mt-5 flex items-center gap-5">
              {REDES.map((r) => (
                <a
                  key={r.nome}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="meta inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground-strong)]"
                >
                  {r.nome}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* --- Nível 2: um painel por grupo -----------------------------
         * Ficam todos montados, e só muda o `data-activo`. Desmontar o que
         * sai deixava-o desaparecer de repente, sem a saída para a direita.
         * -------------------------------------------------------------- */}
        {destinos.filter(ehGrupo).map((g) => (
          <div
            key={g.id}
            className="menu-nivel"
            data-nivel="1"
            data-activo={grupo === g.id ? "true" : "false"}
            aria-hidden={grupo === g.id ? undefined : "true"}
          >
            <button
              onClick={() => setGrupo(null)}
              className="btn btn-subtil mt-8 gap-2 px-0 text-sm"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {tr3(language, "Voltar", "Back", "Volver")}
            </button>

            <p className="rotulo mt-6">{g.label}</p>

            <nav className="mt-2 flex flex-col">
              {g.filhos.map((f) => (
                <LocalizedLink
                  key={f.href}
                  href={f.href}
                  onClick={onClose}
                  aria-current={naRota(f.href) ? "page" : undefined}
                  className={`${linhaGrande} ${
                    naRota(f.href)
                      ? "text-[var(--foreground-muted)]"
                      : "text-[var(--foreground-strong)] hover:text-[var(--foreground-secondary)]"
                  }`}
                >
                  {f.label}
                </LocalizedLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
});
