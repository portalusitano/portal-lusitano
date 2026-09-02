"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as PointerEventoReact,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Revelar from "@/components/Revelar";
import { duracaoDoToken } from "@/lib/curvas-css";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Galeria da coudelaria. Só existe quando há fotografias **da coudelaria** —
 * nunca há aqui fotografia de stock.
 *
 * ## Uma ideia só: a fotografia é uma folha numa pilha
 *
 * Passar de uma fotografia para a seguinte não é um corte nem um
 * esbatimento: é levantar a folha de cima. Quem desenha isso é o
 * `globals.css` (`folha-pousar`, `folha-ceder`, `folha-fio`), e o que este
 * ficheiro faz é decidir **quando** e **em que sentido**. Daí sai tudo o
 * resto — as setas, o arrasto do dedo, a fita e o visor de ecrã inteiro são
 * quatro maneiras de dizer a mesma coisa.
 *
 * Corre uma vez e pára. Não há ciclo infinito e não há passagem automática:
 * quem está a ver fotografias de cavalos quer parar numa.
 *
 * ## Uma fotografia que não chega não é um acidente
 *
 * Cerca de metade das ligações de fotografia das coudelarias respondem 404.
 * Uma galeria que trate isso como acaso mostra um rectângulo preto e um
 * contador que promete onze fotografias quando há cinco. Aqui a fotografia
 * que falha **sai do conjunto**: deixa de ser navegável, sai da fita, e a
 * conta passa a ser a das que existem.
 *
 * Quem descobre isso são as miniaturas. Custam ~2,7 KB cada — são a coisa
 * mais barata que se pode mandar tentar buscar uma fotografia — e por isso
 * são ao mesmo tempo navegação e sonda. Enquanto ainda há fotografias por
 * responder, **o contador não aparece**: um número a corrigir-se é pior do
 * que um número que ainda não se atreveu a dizer nada.
 *
 * ## Acessibilidade
 *
 * As miniaturas eram `role="tab"` sem `tabpanel` nenhum, o que faz o leitor
 * de ecrã anunciar separadores que não existem. São botões, e o escolhido
 * diz-se com `aria-current`.
 *
 * O `alt` deixou de repetir o nome da coudelaria onze vezes: quem diz de
 * quem são as fotografias é o rótulo do grupo, uma vez. O `alt` de cada uma
 * diz a posição, que é a única coisa que se sabe sobre ela sem uma legenda
 * escrita por quem a carregou.
 */

/**
 * A folha demora o mesmo que entrar num submenu — `--d-drill` —, e o recuo do
 * arrasto o mesmo que um hover — `--d-fast`. Os números aqui são só o que
 * vale enquanto o CSS não responde: quem manda é o token, lido à montagem
 * pelo `duracaoDoToken`. Um número escrito à mão dentro de um componente é
 * uma duração que ninguém encontra e que ninguém muda quando as outras mudam.
 */
const D_FOLHA = 320;
const D_RECUO = 200;
/** Folga entre o fim da animação e a retirada da camada de baixo. */
const FOLGA_ASSENTAR = 40;
/** Abaixo disto o ponteiro não está a arrastar, está a carregar. */
const LIMIAR_PONTEIRO = 3;
/** Fracção da largura que é preciso arrastar para a folha virar. */
const FRACCAO_VIRAR = 0.15;
/** Tecto do arrasto: a folha encosta a um batente em vez de sair do quadro. */
const FRACCAO_BATENTE = 0.1;
/** Amortecimento: o dedo anda mais do que a folha, e por isso sente-se peso. */
const AMORTECER = 0.55;
/**
 * Rede de segurança do contador. Se uma miniatura nunca responder — nem
 * carrega nem falha —, ao fim disto o contador diz o que se sabe em vez de
 * nunca aparecer.
 */
const ESPERA_CONTADOR = 4000;

/**
 * O `sizes` do quadro sai do esqueleto da ficha e não de um palpite: o corpo
 * é `max-w-6xl` (1152px) com `sm:px-6`, a coluna do lado tem `21rem` e o
 * intervalo entre colunas é `gap-12` — logo `100vw - 432px` a partir de
 * `lg`, com tecto em 720px.
 *
 * O que lá estava — `(max-width: 1024px) 100vw, 640px` — não batia certo em
 * largura nenhuma. Medido: numa janela de 1400px pedia uma fotografia de 640
 * para uma caixa de 718 (fica mole, e a 2× fica pior); numa de 1024 pedia
 * uma de 1080 para uma caixa de 590, o que são 119 840 bytes onde bastavam
 * 59 241 — o dobro, em todas as fotografias, em todas as fichas.
 */
const MEDIDAS_QUADRO =
  "(min-width: 1152px) 720px, (min-width: 1024px) calc(100vw - 432px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)";
/** Em ecrã inteiro a fotografia cabe na janela toda. */
const MEDIDAS_VISOR = "100vw";
/** A miniatura tem 80px de largura, e é fixa. */
const MEDIDAS_MINIATURA = "80px";

type Sentido = 1 | -1;

interface EstadoPilha {
  fotos: string[];
  activa: number;
  leito: number | null;
  adiante: number | null;
  sentido: Sentido;
  partida: number;
  arrasto: number;
  aArrastar: boolean;
  solta: boolean;
  legenda: (indice: number) => string;
  aoCarregar: (indice: number) => void;
  aoFalhar: (indice: number) => void;
}

/**
 * As camadas da pilha: a folha que fica, a folha que chega, e — fora de
 * vista — a seguinte, para a chegada dela ser instantânea.
 *
 * A `key` é o que faz a animação repetir-se. Sem ela o React reaproveitava o
 * nó e a animação, que já correu uma vez, não voltava a correr.
 */
function Pilha({ estado, medidas }: { estado: EstadoPilha; medidas: string }) {
  const { fotos, activa, leito, adiante, sentido, partida, arrasto, aArrastar, solta } = estado;

  return (
    <>
      {/* A folha de baixo **nunca se apaga**. É ela que garante que, enquanto
          a de cima não chegou da rede, o que se vê é uma fotografia e não um
          buraco preto. Quem decide quando ela sai é o `leitoAMostra` de quem
          nos chama: só depois de a de cima ter assentado e respondido. */}
      {leito !== null && leito !== activa ? (
        <div
          key={`leito-${leito}`}
          className="galeria-folha galeria-folha--leito"
          style={{ "--sentido": sentido, "--partida": `${partida}px` } as CSSProperties}
          aria-hidden="true"
        >
          <Image src={fotos[leito]} alt="" fill sizes={medidas} className="galeria-folha__foto" />
        </div>
      ) : null}

      <div
        key={`topo-${activa}`}
        data-sentido={sentido}
        data-solta={solta ? "sim" : "nao"}
        className={`galeria-folha galeria-folha--topo${aArrastar ? " galeria-folha--arrasta" : ""}`}
        style={{ "--sentido": sentido, "--arrasto": `${arrasto}px` } as CSSProperties}
      >
        <Image
          src={fotos[activa]}
          alt={estado.legenda(activa)}
          fill
          sizes={medidas}
          className="galeria-folha__foto"
          onLoad={() => estado.aoCarregar(activa)}
          onError={() => estado.aoFalhar(activa)}
        />
        <span className="galeria-folha__fio" aria-hidden="true" />
      </div>

      {/* A seguinte, e só a seguinte — e só depois de a actual ter chegado,
          para não disputar largura de banda com o que se está a ver. */}
      {adiante !== null ? (
        <div key={`adiante-${adiante}`} className="galeria-folha opacity-0" aria-hidden="true">
          <Image
            src={fotos[adiante]}
            alt=""
            fill
            sizes={medidas}
            className="galeria-folha__foto"
            onLoad={() => estado.aoCarregar(adiante)}
            onError={() => estado.aoFalhar(adiante)}
          />
        </div>
      ) : null}
    </>
  );
}

export default function Galeria({
  fotos,
  nome,
  titulo,
}: {
  fotos: string[];
  nome: string;
  /**
   * O título da secção entra por aqui em vez de ficar em `FichaCoudelaria`:
   * se todas as fotografias falharem, a secção «Fotografias» tem de
   * desaparecer inteira — título incluído —, e quem sabe que falharam é este
   * componente.
   */
  titulo: ReactNode;
}) {
  const { t } = useLanguage();
  const f = t.directorio.ficha;

  const [escolhida, setEscolhida] = useState(0);
  const [leito, setLeito] = useState<number | null>(null);
  const [sentido, setSentido] = useState<Sentido>(1);
  const [assente, setAssente] = useState(true);
  const [partida, setPartida] = useState(0);
  const [arrasto, setArrasto] = useState(0);
  const [aArrastar, setAArrastar] = useState(false);
  const [solta, setSolta] = useState(false);
  const [prontas, setProntas] = useState<number[]>([]);
  const [mortas, setMortas] = useState<number[]>([]);
  const [vista, setVista] = useState(false);
  const [contaCerta, setContaCerta] = useState(false);
  const [visor, setVisor] = useState(false);

  const raizRef = useRef<HTMLElement | null>(null);
  const fitaRef = useRef<HTMLUListElement | null>(null);
  const miniRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ampliarRef = useRef<HTMLButtonElement | null>(null);
  const fecharRef = useRef<HTMLButtonElement | null>(null);
  const visorRef = useRef<HTMLDivElement | null>(null);
  const abridor = useRef<"quadro" | "mini" | null>(null);
  const activaRef = useRef(0);

  const vivas = useMemo(
    () => fotos.map((_, i) => i).filter((i) => !mortas.includes(i)),
    [fotos, mortas]
  );
  const total = vivas.length;

  /**
   * A fotografia que está à vista **deriva** da escolhida em vez de a
   * corrigir. Corrigi-la num efeito era um render em cascata a cada 404, e o
   * estado ficava um passo atrás do que o ecrã mostrava; assim, quando a
   * escolhida morre, a que se vê é já a seguinte que existe — sem sair da
   * ordem e sem um segundo render.
   */
  const activa = vivas.includes(escolhida)
    ? escolhida
    : (vivas.find((i) => i > escolhida) ?? vivas[vivas.length - 1] ?? 0);
  const posicao = Math.max(0, vivas.indexOf(activa));

  useEffect(() => {
    activaRef.current = activa;
  }, [activa]);

  const aoCarregar = useCallback((indice: number) => {
    setProntas((p) => (p.includes(indice) ? p : [...p, indice]));
  }, []);

  const aoFalhar = useCallback((indice: number) => {
    setMortas((m) => (m.includes(indice) ? m : [...m, indice]));
    setProntas((p) => (p.includes(indice) ? p.filter((i) => i !== indice) : p));
  }, []);

  const ir = useCallback(
    (destino: number, dir: Sentido, deOnde = 0) => {
      if (destino === activa) return;
      setLeito(activa);
      setPartida(deOnde);
      setSentido(dir);
      setEscolhida(destino);
      setAssente(false);
    },
    [activa]
  );

  const seguinte = useCallback(() => {
    if (total < 2) return;
    ir(vivas[(posicao + 1) % total], 1);
  }, [ir, vivas, posicao, total]);

  const anterior = useCallback(() => {
    if (total < 2) return;
    ir(vivas[(posicao - 1 + total) % total], -1);
  }, [ir, vivas, posicao, total]);

  /* As durações vêm dos tokens do `globals.css`, lidas uma vez à montagem —
     duas consultas ao estilo do documento, não duas por quadro. Quem mudar o
     `--d-drill` muda a folha com ele; um 320 escrito aqui à mão ficaria para
     trás no dia em que os submenus mudassem de andamento. */
  const tempos = useRef({ folha: D_FOLHA, recuo: D_RECUO });
  useEffect(() => {
    tempos.current = {
      folha: duracaoDoToken("--d-drill", D_FOLHA),
      recuo: duracaoDoToken("--d-fast", D_RECUO),
    };
  }, []);

  /* Quanto tempo a folha demora a assentar. É um temporizador e não um
     `animationend`: sem CSS — ou com `prefers-reduced-motion`, que anula as
     animações — o evento podia nunca chegar e a camada de baixo ficava lá
     para sempre. */
  useEffect(() => {
    if (assente) return;
    const id = window.setTimeout(() => setAssente(true), tempos.current.folha + FOLGA_ASSENTAR);
    return () => window.clearTimeout(id);
  }, [assente, activa]);

  /* A folha largada sem chegar ao limiar recua; o `--arrasta` só sai depois
     de o recuo acabar, senão a folha saltava para o sítio em vez de voltar. */
  useEffect(() => {
    if (!solta) return;
    const id = window.setTimeout(() => {
      setSolta(false);
      setAArrastar(false);
    }, tempos.current.recuo + FOLGA_ASSENTAR);
    return () => window.clearTimeout(id);
  }, [solta]);

  /* As miniaturas só se mandam buscar quando a galeria está a chegar ao ecrã.
     Numa ficha alta, onze pedidos à entrada são onze pedidos a competir com o
     que está acima da dobra. */
  useEffect(() => {
    const el = raizRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Sem observador não há como saber; mostra-se tudo. O adiamento para o
      // fim do quadro é o que o distingue de um render em cascata.
      const id = window.setTimeout(() => setVista(true), 0);
      return () => window.clearTimeout(id);
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        setVista(true);
        obs.disconnect();
      },
      { rootMargin: "300px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!vista || contaCerta) return;
    const id = window.setTimeout(() => setContaCerta(true), ESPERA_CONTADOR);
    return () => window.clearTimeout(id);
  }, [vista, contaCerta]);

  /* --- Fita ------------------------------------------------------------- */

  /* O esbatido só aparece do lado onde há mesmo mais fotografias. Escreve-se
     no `dataset` e não no estado: isto corre a cada quadro de um deslocamento
     e um `setState` aqui era um render por quadro. */
  const medirFita = useCallback(() => {
    const fita = fitaRef.current;
    if (!fita) return;
    fita.dataset.maisEsq = fita.scrollLeft > 4 ? "sim" : "nao";
    fita.dataset.maisDir =
      fita.scrollLeft + fita.clientWidth < fita.scrollWidth - 4 ? "sim" : "nao";
  }, []);

  const pedidoFita = useRef(0);
  const aoRolarFita = useCallback(() => {
    if (pedidoFita.current) return;
    pedidoFita.current = window.requestAnimationFrame(() => {
      pedidoFita.current = 0;
      medirFita();
    });
  }, [medirFita]);

  useEffect(() => {
    const fita = fitaRef.current;
    if (!fita) return;
    medirFita();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(medirFita);
    obs.observe(fita);
    return () => obs.disconnect();
  }, [medirFita, total, vista]);

  /* A miniatura escolhida vem sozinha à vista. Quem desloca é a fita e mais
     nada: um `scrollIntoView` pediria ao browser para deslocar o documento
     também, e mudar de fotografia não é razão para a página se mexer. */
  useEffect(() => {
    const fita = fitaRef.current;
    const alvo = miniRefs.current[activa];
    if (!fita || !alvo) return;
    const cf = fita.getBoundingClientRect();
    const ca = alvo.getBoundingClientRect();
    // A margem é a do esbatido: uma miniatura por baixo dele não está à vista.
    const margem = 44;
    let delta = 0;
    if (ca.left < cf.left + margem) delta = ca.left - cf.left - margem;
    else if (ca.right > cf.right - margem) delta = ca.right - cf.right + margem;
    if (!delta) return;
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fita.scrollBy({ left: delta, behavior: parado ? "auto" : "smooth" });
  }, [activa]);

  /* --- Arrasto ---------------------------------------------------------- */

  const inicio = useRef<{ x: number; y: number; id: number } | null>(null);
  const arrastou = useRef(false);

  const aoDescer = useCallback(
    (e: PointerEventoReact<HTMLElement>) => {
      if (total < 2) return;
      inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      arrastou.current = false;
    },
    [total]
  );

  const aoMover = useCallback((e: PointerEventoReact<HTMLElement>) => {
    const p = inicio.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!arrastou.current) {
      if (Math.abs(dx) < LIMIAR_PONTEIRO) return;
      // Mais vertical do que horizontal: quem manda é a página, e o
      // `touch-action: pan-y` já lha entregou sem passar por aqui.
      if (Math.abs(dy) > Math.abs(dx)) {
        inicio.current = null;
        return;
      }
      // A captura só se pede a partir daqui. Pedida no `pointerdown`, o
      // browser entrega o `click` ao elemento capturado e carregar na
      // fotografia deixava de fazer nada num computador.
      e.currentTarget.setPointerCapture(e.pointerId);
      arrastou.current = true;
      setSolta(false);
      setAArrastar(true);
    }
    const tecto = (e.currentTarget.clientWidth || 1) * FRACCAO_BATENTE;
    const bruto = dx * AMORTECER;
    setArrasto(Math.max(-tecto, Math.min(tecto, bruto)));
  }, []);

  const aoLargar = useCallback(
    (e: PointerEventoReact<HTMLElement>) => {
      const p = inicio.current;
      inicio.current = null;
      if (!p || !arrastou.current) return;
      const dx = e.clientX - p.x;
      const largura = e.currentTarget.clientWidth || 1;
      const chegou = Math.abs(dx) > Math.min(64, largura * FRACCAO_VIRAR);
      const largadaEm = arrasto;
      setArrasto(0);
      if (!chegou) {
        setSolta(true);
        return;
      }
      setAArrastar(false);
      const dir: Sentido = dx < 0 ? 1 : -1;
      const destino =
        dir === 1 ? vivas[(posicao + 1) % total] : vivas[(posicao - 1 + total) % total];
      ir(destino, dir, largadaEm);
    },
    [arrasto, ir, posicao, total, vivas]
  );

  const aoCancelar = useCallback(() => {
    inicio.current = null;
    if (!arrastou.current) return;
    setArrasto(0);
    setSolta(true);
  }, []);

  /* --- Visor de ecrã inteiro -------------------------------------------- */

  const abrirVisor = useCallback((de: "quadro" | "mini") => {
    abridor.current = de;
    setVisor(true);
  }, []);

  const fecharVisor = useCallback(() => {
    const de = abridor.current;
    abridor.current = null;
    setVisor(false);
    // Um visor que não devolve o foco é pior do que não haver visor. Quando
    // quem o abriu foi uma miniatura, o foco volta à miniatura da fotografia
    // em que se ficou: é o mesmo comando na mesma fita, mas onde o olho está.
    window.requestAnimationFrame(() => {
      if (de === "mini") miniRefs.current[activaRef.current]?.focus();
      else ampliarRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!visor) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [visor]);

  useEffect(() => {
    if (!visor) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        fecharVisor();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        anterior();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        seguinte();
        return;
      }
      if (e.key !== "Tab") return;
      // O foco fica preso cá dentro: um diálogo modal cujo Tab escapa para a
      // página por baixo é um diálogo que só é modal para quem usa rato.
      const caixa = visorRef.current;
      if (!caixa) return;
      const focaveis = caixa.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!focaveis.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const dentro = caixa.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === primeiro || !dentro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [visor, anterior, seguinte, fecharVisor]);

  /* --- Render ------------------------------------------------------------ */

  const legenda = useCallback(
    (indice: number) => {
      const p = Math.max(0, vivas.indexOf(indice)) + 1;
      return f.foto_de.replace("{n}", String(p)).replace("{total}", String(total));
    },
    [f.foto_de, vivas, total]
  );

  /* O contador só fala quando sabe. Enquanto houver fotografias por responder
     — e hoje metade responde 404 — um «1 / 11» que daqui a um segundo é
     «1 / 5» é uma promessa que a galeria não pode cumprir. */
  const respondidas = prontas.length + mortas.length;
  const contaFiavel = contaCerta || respondidas >= fotos.length;

  /* A camada de baixo fica enquanto a de cima não assentou **ou** ainda não
     respondeu. Uma das duas condições sozinha deixa passar o buraco preto: a
     primeira sozinha tira a fotografia antiga antes de a nova chegar da rede;
     a segunda sozinha deixava-a lá parada depois de a folha ter assentado. */
  const respondeu = prontas.includes(activa) || mortas.includes(activa);
  const leitoAMostra =
    leito !== null && leito !== activa && (!assente || !respondeu) ? leito : null;

  const proximaAdiante =
    total > 1 ? vivas[(posicao + (sentido === 1 ? 1 : -1) + total) % total] : -1;
  const adiante =
    vista && total > 1 && prontas.includes(activa) && proximaAdiante !== activa
      ? proximaAdiante
      : null;

  const estado: EstadoPilha = {
    fotos,
    activa,
    leito: leitoAMostra,
    adiante,
    sentido,
    partida,
    arrasto,
    aArrastar,
    solta,
    legenda,
    aoCarregar,
    aoFalhar,
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      anterior();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seguinte();
    }
  };

  const gestos = {
    onPointerDown: aoDescer,
    onPointerMove: aoMover,
    onPointerUp: aoLargar,
    onPointerCancel: aoCancelar,
  };

  if (!fotos.length || !total) return null;

  return (
    <Revelar atraso={60}>
      <section ref={raizRef} aria-labelledby="t-fotografias">
        {titulo}

        <div
          role="group"
          aria-label={f.fotografias_de.replace("{nome}", nome)}
          onKeyDown={aoTeclar}
        >
          <div className="galeria-pilha aspect-[3/2]" {...gestos}>
            <Pilha estado={estado} medidas={MEDIDAS_QUADRO} />

            <button
              ref={ampliarRef}
              type="button"
              className="galeria-ampliar"
              aria-label={f.ampliar}
              onClick={() => {
                if (arrastou.current) {
                  arrastou.current = false;
                  return;
                }
                abrirVisor("quadro");
              }}
            >
              <span className="galeria-ampliar__marca">
                <Expand size={16} aria-hidden="true" />
              </span>
            </button>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={anterior}
                  aria-label={f.foto_anterior}
                  className="galeria-comando galeria-comando--anterior"
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={seguinte}
                  aria-label={f.foto_seguinte}
                  className="galeria-comando galeria-comando--seguinte"
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
                {contaFiavel && (
                  <p
                    className="meta galeria-conta font-mono text-[var(--foreground-secondary)]"
                    aria-hidden="true"
                  >
                    {posicao + 1} / {total}
                  </p>
                )}
              </>
            )}
          </div>

          {/* O «1 / 11» visível lê-se «um barra onze». Quem o anuncia é esta
              linha, que diz a frase inteira e só quando ela muda. */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {legenda(activa)}
          </p>

          {total > 1 && (
            <ul
              ref={fitaRef}
              onScroll={aoRolarFita}
              className="galeria-fita mt-3 m-0 list-none p-0"
            >
              {vivas.map((indice) => (
                <li key={fotos[indice]} className="flex-none">
                  <button
                    ref={(el) => {
                      miniRefs.current[indice] = el;
                    }}
                    type="button"
                    className="galeria-mini"
                    aria-label={f.ver_foto.replace("{n}", String(vivas.indexOf(indice) + 1))}
                    aria-current={activa === indice}
                    onClick={() => {
                      // Carregar na que já está escolhida é pedi-la em
                      // grande: é o gesto que toda a gente já tenta.
                      if (indice === activa) abrirVisor("mini");
                      else ir(indice, indice > activa ? 1 : -1);
                    }}
                  >
                    {vista && (
                      <Image
                        src={fotos[indice]}
                        alt=""
                        fill
                        sizes={MEDIDAS_MINIATURA}
                        className="object-cover"
                        onLoad={() => aoCarregar(indice)}
                        onError={() => aoFalhar(indice)}
                      />
                    )}
                    <span className="galeria-mini__risco" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {visor &&
          createPortal(
            <div
              ref={visorRef}
              role="dialog"
              aria-modal="true"
              aria-label={f.visor_de.replace("{nome}", nome)}
              className="galeria-visor"
            >
              <div className="galeria-visor__barra">
                {total > 1 && contaFiavel && (
                  <p className="meta font-mono tabular-nums" aria-hidden="true">
                    {posicao + 1} / {total}
                  </p>
                )}
                <button
                  ref={fecharRef}
                  type="button"
                  onClick={fecharVisor}
                  aria-label={f.fechar}
                  className="galeria-comando galeria-comando--fechar"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="galeria-visor__quadro" {...gestos}>
                <Pilha estado={estado} medidas={MEDIDAS_VISOR} />
                {total > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={anterior}
                      aria-label={f.foto_anterior}
                      className="galeria-comando galeria-comando--anterior"
                    >
                      <ChevronLeft size={20} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={seguinte}
                      aria-label={f.foto_seguinte}
                      className="galeria-comando galeria-comando--seguinte"
                    >
                      <ChevronRight size={20} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </div>,
            document.body
          )}
      </section>
    </Revelar>
  );
}
