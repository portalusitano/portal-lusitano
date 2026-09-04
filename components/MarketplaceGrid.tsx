"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BellRing, ChevronDown, Search, X } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import HorseCard from "@/components/HorseCard";
import GrelhaHolofote from "@/components/ui/GrelhaHolofote";
import NumeroQueAssenta from "@/components/ui/NumeroQueAssenta";
import Pagination from "@/components/ui/Pagination";
import Seleccao from "@/components/ui/Seleccao";
import {
  ORDENACOES,
  aplicarFiltros,
  contarFiltrosAtivos,
  disciplinasDe,
  escreverFiltros,
  lerFiltros,
  ordenar,
  paginar,
  temFiltrosAtivos,
  type FiltrosMarketplace,
  type Ordenacao,
} from "@/lib/marketplace-filtros";

/** Shape of a horse row from the cavalos_venda table. */
export interface MarketplaceHorse {
  id: string;
  nome_cavalo: string;
  preco: number;
  image_url?: string;
  slug?: string;
  localizacao?: string;
  idade?: number;
  raca?: string;
  sexo?: string;
  disciplinas?: string[] | string | null;
  nivel?: string;
  destaque?: boolean;
  created_at?: string;
}

interface MarketplaceGridProps {
  horses: MarketplaceHorse[];
}

/** Price bands offered as one-click shortcuts, expressed as the min/max the URL carries. */
const FAIXAS_PRECO: { label: string; min: number | null; max: number | null }[] = [
  { label: "Até 10 000 €", min: null, max: 10000 },
  { label: "10 000 – 25 000 €", min: 10000, max: 25000 },
  { label: "25 000 – 50 000 €", min: 25000, max: 50000 },
  { label: "Mais de 50 000 €", min: 50000, max: null },
];

const FAIXAS_IDADE: { label: string; min: number | null; max: number | null }[] = [
  { label: "Poldros (até 3)", min: null, max: 3 },
  { label: "Jovens (4–7)", min: 4, max: 7 },
  { label: "Adultos (8–14)", min: 8, max: 14 },
  { label: "Seniores (15+)", min: 15, max: null },
];

const SEXOS = [
  { id: "macho", label: "Macho" },
  { id: "femea", label: "Fêmea" },
  { id: "castrado", label: "Castrado" },
];

/** Quantas localizações cabem na gaveta antes de a lista deixar de se ler. */
const MAX_LOCALIZACOES = 12;

/** Uma pastilha de filtro com a contagem que a sustenta. */
interface Pastilha {
  /** Identifica a pastilha e serve de chave. */
  chave: string;
  nome: string;
  /** Quantos anúncios devolve, contada contra os **outros** filtros. */
  n: number;
  activa: boolean;
  /** O que vai para o URL ao carregar nela; a limpeza do eixo é feita a par. */
  escolher: Partial<FiltrosMarketplace>;
  limpar: Partial<FiltrosMarketplace>;
}

export default function MarketplaceGrid({ horses }: MarketplaceGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the source of truth, so a filtered search can be shared, saved
  // and walked back through with the browser's own back button.
  const filtros = useMemo(() => lerFiltros(searchParams), [searchParams]);

  // The text box is the one control that cannot read straight from the URL:
  // writing a history entry per keystroke would wreck the back button.
  const [rascunhoPesquisa, setRascunhoPesquisa] = useState(filtros.search);

  // Realinha a caixa quando o URL muda por fora (voltar atrás, clicar num
  // atalho da homepage). Ajustar estado durante o render é o padrão que o React
  // documenta para isto; fazê-lo num efeito provoca renders em cascata.
  const [pesquisaNoUrl, setPesquisaNoUrl] = useState(filtros.search);
  if (filtros.search !== pesquisaNoUrl) {
    setPesquisaNoUrl(filtros.search);
    setRascunhoPesquisa(filtros.search);
  }

  const navegar = useCallback(
    (novos: Partial<FiltrosMarketplace>) => {
      // Any change to what is being searched resets to page 1: staying on page 4
      // of a result set that no longer has four pages shows an empty screen.
      const mudouPesquisa = Object.keys(novos).some((k) => k !== "pagina");
      const proximos: FiltrosMarketplace = {
        ...filtros,
        ...novos,
        pagina: novos.pagina ?? (mudouPesquisa ? 1 : filtros.pagina),
      };
      const query = escreverFiltros(proximos);
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filtros, pathname, router]
  );

  // Debounced so typing does not fill the history with one entry per letter.
  useEffect(() => {
    if (rascunhoPesquisa === filtros.search) return;
    const timer = setTimeout(() => navegar({ search: rascunhoPesquisa }), 350);
    return () => clearTimeout(timer);
  }, [rascunhoPesquisa, filtros.search, navegar]);

  const resultados = useMemo(
    () => ordenar(aplicarFiltros(horses, filtros), filtros.ordenar),
    [horses, filtros]
  );

  const pagina = useMemo(() => paginar(resultados, filtros.pagina), [resultados, filtros.pagina]);

  const nActivos = contarFiltrosAtivos(filtros);
  const temFiltros = temFiltrosAtivos(filtros);

  const limpar = useCallback(() => router.push(pathname, { scroll: false }), [router, pathname]);

  /** Turns the current search into a saved alert, pre-filled. */
  const hrefAlerta = `/minha-conta/alertas?${escreverFiltros({ ...filtros, pagina: 1 })}`;

  // ── As pastilhas, e as contagens que as sustentam ────────────────────────
  //
  // Cada eixo conta-se contra os **outros** filtros e nunca contra si próprio.
  // É a mesma regra do directório e pela mesma razão: com «Alentejo» escolhido,
  // «Dressage 22» prometia vinte e duas e dava nove. Um número numa pastilha só
  // vale se for o que se recebe ao carregar nela — e excluir-se a si própria é
  // o que faz a pastilha acesa continuar na lista mesmo quando é ela que está a
  // esvaziar o ecrã.
  const conta = useCallback(
    (mudanca: Partial<FiltrosMarketplace>) =>
      aplicarFiltros(horses, { ...filtros, ...mudanca }).length,
    [horses, filtros]
  );

  const pastilhasSexo = useMemo<Pastilha[]>(
    () =>
      SEXOS.map((s) => ({
        chave: s.id,
        nome: s.label,
        n: conta({ sexo: s.id }),
        activa: filtros.sexo === s.id,
        escolher: { sexo: s.id },
        limpar: { sexo: "" },
      })),
    [conta, filtros.sexo]
  );

  const pastilhasPreco = useMemo<Pastilha[]>(
    () =>
      FAIXAS_PRECO.map((f) => ({
        chave: f.label,
        nome: f.label,
        n: conta({ precoMin: f.min, precoMax: f.max }),
        activa: filtros.precoMin === f.min && filtros.precoMax === f.max,
        escolher: { precoMin: f.min, precoMax: f.max },
        limpar: { precoMin: null, precoMax: null },
      })),
    [conta, filtros.precoMin, filtros.precoMax]
  );

  const pastilhasIdade = useMemo<Pastilha[]>(
    () =>
      FAIXAS_IDADE.map((f) => ({
        chave: f.label,
        nome: f.label,
        n: conta({ idadeMin: f.min, idadeMax: f.max }),
        activa: filtros.idadeMin === f.min && filtros.idadeMax === f.max,
        escolher: { idadeMin: f.min, idadeMax: f.max },
        limpar: { idadeMin: null, idadeMax: null },
      })),
    [conta, filtros.idadeMin, filtros.idadeMax]
  );

  // As disciplinas e as localizações saem dos anúncios que sobram **sem este
  // eixo**: uma pastilha que nunca devolve nada não se desenha, e a escolhida
  // nunca desaparece de baixo dos pés de quem a escolheu.
  const pastilhasDisciplina = useMemo<Pastilha[]>(() => {
    const restantes = aplicarFiltros(horses, { ...filtros, disciplina: "" });
    const contagem = new Map<string, number>();
    for (const h of restantes) {
      for (const d of disciplinasDe(h)) contagem.set(d, (contagem.get(d) ?? 0) + 1);
    }
    if (filtros.disciplina && !contagem.has(filtros.disciplina))
      contagem.set(filtros.disciplina, 0);
    return [...contagem.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt"))
      .map(([nome, n]) => ({
        chave: nome,
        nome,
        n,
        activa: filtros.disciplina === nome,
        escolher: { disciplina: nome },
        limpar: { disciplina: "" },
      }));
  }, [horses, filtros]);

  const pastilhasRegiao = useMemo<Pastilha[]>(() => {
    const restantes = aplicarFiltros(horses, { ...filtros, regiao: "" });
    const contagem = new Map<string, number>();
    for (const h of restantes) {
      const loc = h.localizacao?.trim();
      if (loc) contagem.set(loc, (contagem.get(loc) ?? 0) + 1);
    }
    // Corta-se pelo fim da lista, que está ordenada pela contagem: o que sai é
    // o que menos anúncios devolve. Com cem anúncios espalhados por cinquenta
    // freguesias, a fila deixava de se ler.
    const cortada = [...contagem.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt"))
      .slice(0, MAX_LOCALIZACOES);

    // A escolhida entra sempre, mesmo que o corte a tenha deixado de fora ou
    // que as contagens já não a tragam: sem isto, o filtro que está a esvaziar
    // o ecrã desaparecia dele e não havia por onde o desfazer.
    if (filtros.regiao && !cortada.some(([nome]) => nome === filtros.regiao)) {
      cortada.unshift([filtros.regiao, contagem.get(filtros.regiao) ?? 0]);
    }

    return cortada.map(([nome, n]) => ({
      chave: nome,
      nome,
      n,
      activa: filtros.regiao === nome,
      escolher: { regiao: nome },
      limpar: { regiao: "" },
    }));
  }, [horses, filtros]);

  // ── A gaveta ─────────────────────────────────────────────────────────────
  //
  // As pastilhas deixaram de estar todas acesas no ecrã de partida. Eram cinco
  // filas — sexo, preço, idade, disciplina, localização — sempre abertas, e em
  // 1440×900 empurravam o primeiro cartão para os 769px: **zero anúncios
  // inteiros no primeiro ecrã** de um classificados. É o mesmo defeito que o
  // directório já corrigiu, e a resposta é a mesma peça, não uma segunda.
  const idGaveta = useId();
  const idBusca = useId();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  /* Quem tem o foco dentro da concha. O anel do teclado toma a forma dela em
     vez de desenhar um rectângulo lá dentro — e é um atributo e não um
     `:has()` porque o compilador de CSS deita `:has()` fora nos alvos deste
     projecto. A razão comprida está no `globals.css`. */
  const [buscaFocada, setBuscaFocada] = useState(false);
  const botaoGaveta = useRef<HTMLButtonElement>(null);
  const conteudoGaveta = useRef<HTMLDivElement>(null);
  const [alturaGaveta, setAlturaGaveta] = useState(0);

  // A altura mede-se antes da pintura e volta a medir-se sozinha: o conteúdo
  // muda de altura quando as facetas mudam de número ou quando a janela
  // estreita e as pastilhas passam a ocupar mais uma linha.
  useLayoutEffect(() => {
    const alvo = conteudoGaveta.current;
    if (!alvo) return;
    const medir = () => setAlturaGaveta(alvo.offsetHeight);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  const fecharGaveta = useCallback(() => {
    setGavetaAberta(false);
    botaoGaveta.current?.focus();
  }, []);

  // A pesquisa não conta para o número no botão: está escrita na caixa ao lado
  // e não se esconde atrás de nada.
  const nFacetas = nActivos - (filtros.search ? 1 : 0);

  /* A assinatura do que está a ser mostrado. É ela a `key` da grelha, e é a
     `key` que faz a animação de troca de vista voltar a correr: sem ela o
     React reaproveita o nó e a animação, que já correu, não repete. */
  const assinatura = `${filtros.search}|${filtros.sexo}|${filtros.regiao}|${filtros.disciplina}|${filtros.precoMin}|${filtros.precoMax}|${filtros.idadeMin}|${filtros.idadeMax}|${filtros.ordenar}|${filtros.pagina}`;

  // Os filtros acesos, um a um e com o × onde se leem. Um número diz quantos
  // são; estes dizem **quais** são, e desfazem-se onde se leem.
  const acesos: { chave: string; nome: string; apagar: Partial<FiltrosMarketplace> }[] = [
    ...(filtros.sexo
      ? [
          {
            chave: "sexo",
            nome: SEXOS.find((s) => s.id === filtros.sexo)?.label ?? filtros.sexo,
            apagar: { sexo: "" },
          },
        ]
      : []),
    ...(filtros.precoMin !== null || filtros.precoMax !== null
      ? [
          {
            chave: "preco",
            nome:
              FAIXAS_PRECO.find((f) => f.min === filtros.precoMin && f.max === filtros.precoMax)
                ?.label ?? "Preço",
            apagar: { precoMin: null, precoMax: null },
          },
        ]
      : []),
    ...(filtros.idadeMin !== null || filtros.idadeMax !== null
      ? [
          {
            chave: "idade",
            nome:
              FAIXAS_IDADE.find((f) => f.min === filtros.idadeMin && f.max === filtros.idadeMax)
                ?.label ?? "Idade",
            apagar: { idadeMin: null, idadeMax: null },
          },
        ]
      : []),
    ...(filtros.disciplina
      ? [{ chave: "disciplina", nome: filtros.disciplina, apagar: { disciplina: "" } }]
      : []),
    ...(filtros.regiao ? [{ chave: "regiao", nome: filtros.regiao, apagar: { regiao: "" } }] : []),
    ...(filtros.nivel ? [{ chave: "nivel", nome: filtros.nivel, apagar: { nivel: "" } }] : []),
  ];

  const frase = pagina.total === 1 ? "1 cavalo" : `${pagina.total} cavalos`;

  // ── Catálogo vazio ≠ pesquisa sem resultados ─────────────────────────────
  //
  // Com zero anúncios na base, o ecrã dizia «Nenhum cavalo corresponde à
  // pesquisa» **com os filtros todos por escolher**. Não é a pesquisa de
  // ninguém: é o catálogo que ainda não tem nada, e acusar quem procurou de uma
  // pesquisa que não fez é fechar a porta na primeira visita. Nesse estado não
  // se desenha barra, gaveta nem ordenação: uma caixa de pesquisa sobre zero
  // anúncios é mobília, e cinco filas de filtros que filtram nada são pior.
  if (horses.length === 0) {
    return <CatalogoVazio hrefAlerta={hrefAlerta} />;
  }

  return (
    <div>
      {/* ── A barra ──
          Uma linha só: pesquisar, abrir os filtros, ordenar. Em computador os
          três vivem dentro da mesma concha, separados por hairlines; em
          telemóvel a concha parte-se em duas, porque não cabem lado a lado sem
          esmagar a caixa de texto, que é o controlo principal. */}
      <div className="mb-4" role="search" aria-label="Pesquisar anúncios">
        <div className="barra-dir" data-busca={buscaFocada || undefined}>
          <div
            className="barra-dir__seccao barra-dir__seccao--busca"
            data-busca={buscaFocada || undefined}
          >
            <Search className="barra-dir__lupa" size={15} aria-hidden="true" />
            {/* Um rótulo a sério e não só um `aria-label`: assim carregar nele
                põe o cursor no campo, que é o que um rótulo faz. */}
            <label htmlFor={idBusca} className="sr-only">
              Pesquisar cavalos
            </label>
            <input
              id={idBusca}
              type="search"
              value={rascunhoPesquisa}
              onChange={(e) => setRascunhoPesquisa(e.target.value)}
              onFocus={() => setBuscaFocada(true)}
              onBlur={() => setBuscaFocada(false)}
              placeholder="Nome, linhagem, localização, disciplina…"
              className="barra-dir__busca"
            />
            {rascunhoPesquisa && (
              <button
                type="button"
                onClick={() => setRascunhoPesquisa("")}
                aria-label="Limpar pesquisa"
                className="barra-dir__limpar"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="barra-dir__seccao barra-dir__seccao--accoes">
            <button
              ref={botaoGaveta}
              type="button"
              onClick={() => setGavetaAberta((v) => !v)}
              aria-expanded={gavetaAberta}
              aria-controls={idGaveta}
              className="barra-dir__accao"
            >
              Filtros
              {nFacetas > 0 && (
                <span key={nFacetas} className="barra-dir__conta">
                  {nFacetas}
                </span>
              )}
              <ChevronDown className="barra-dir__seta" aria-hidden="true" />
            </button>

            <span className="barra-dir__risco" aria-hidden="true" />

            {/* O `<Seleccao>` põe a `className` no botão, não na sua raiz: a
                medida tem de vir de fora, senão um `w-full` no botão estica a
                raiz e esmaga a caixa de pesquisa ao lado. */}
            <div className="barra-dir__ordenar">
              <Seleccao
                value={filtros.ordenar}
                onChange={(e) => navegar({ ordenar: e.target.value as Ordenacao })}
                aria-label="Ordenar resultados"
                className="barra-dir__accao w-full"
              >
                {ORDENACOES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Seleccao>
            </div>
          </div>
        </div>

        {/* ── A gaveta ── */}
        <div
          id={idGaveta}
          className="gaveta"
          data-aberta={gavetaAberta || undefined}
          style={
            { "--altura-gaveta": `${gavetaAberta ? alturaGaveta : 0}px` } as React.CSSProperties
          }
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              fecharGaveta();
            }
          }}
        >
          <div ref={conteudoGaveta} className="gaveta__conteudo" inert={!gavetaAberta}>
            <FaixaDeChips rotulo="Sexo" pastilhas={pastilhasSexo} aoEscolher={navegar} />
            <FaixaDeChips
              rotulo="Preço"
              pastilhas={pastilhasPreco}
              aoEscolher={navegar}
              deslocamento={pastilhasSexo.length}
            />
            <FaixaDeChips
              rotulo="Idade"
              pastilhas={pastilhasIdade}
              aoEscolher={navegar}
              deslocamento={pastilhasSexo.length + pastilhasPreco.length}
            />
            <FaixaDeChips
              rotulo="Disciplina"
              pastilhas={pastilhasDisciplina}
              aoEscolher={navegar}
              deslocamento={pastilhasSexo.length + pastilhasPreco.length + pastilhasIdade.length}
            />
            <FaixaDeChips
              rotulo="Localização"
              pastilhas={pastilhasRegiao}
              aoEscolher={navegar}
              deslocamento={
                pastilhasSexo.length +
                pastilhasPreco.length +
                pastilhasIdade.length +
                pastilhasDisciplina.length
              }
            />
          </div>
        </div>
      </div>

      {/* ── Barra de resultados ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--border-soft)] pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="titulo-seccao">
            <NumeroQueAssenta
              valor={String(pagina.total)}
              className="numero-assenta-rapido font-mono"
            />{" "}
            {pagina.total === 1 ? "cavalo" : "cavalos"}
            {pagina.totalPaginas > 1 && (
              <span className="meta ml-2">
                página {pagina.pagina} de {pagina.totalPaginas}
              </span>
            )}
          </h2>

          {/* Quem lê com um leitor de ecrã não vê a contagem mudar. O
              `role="status"` di-la depois de o filtro assentar — e não a cada
              tecla, porque o que vai para o URL já passa por um temporizador de
              350ms.

              A pesquisa é dita à parte e não somada aos filtros: o número no
              botão «Filtros» conta só as facetas, porque o termo escrito está
              na caixa ao lado e não se esconde atrás de nada. Somá-lo aqui
              dizia «3 filtros activos» com um «2» escrito no botão. */}
          <p className="sr-only" role="status">
            {frase}
            {filtros.search && ` · pesquisa «${filtros.search}»`}
            {nFacetas > 0 &&
              ` · ${nFacetas === 1 ? "1 filtro activo" : `${nFacetas} filtros activos`}`}
          </p>

          {acesos.map((a) => (
            <button
              key={a.chave}
              type="button"
              onClick={() => navegar(a.apagar)}
              aria-label={`Remover filtro: ${a.nome}`}
              className="chip chip-activo"
            >
              {a.nome}
              <X size={12} aria-hidden="true" />
            </button>
          ))}

          {temFiltros && (
            <button type="button" onClick={limpar} className="btn btn-subtil btn-sm">
              Limpar filtros
            </button>
          )}
        </div>

        {/* Guardar a pesquisa vive aqui, ao lado do que ela guarda, e não num
            botão no cabeçalho da página que não sabe o que está filtrado. */}
        {temFiltros && (
          <LocalizedLink href={hrefAlerta} className="btn btn-subtil btn-sm">
            <BellRing size={12} aria-hidden="true" />
            Guardar esta pesquisa
          </LocalizedLink>
        )}
      </div>

      {/* ── Resultados ── */}
      {pagina.itens.length > 0 ? (
        <>
          {/* A grelha recompõe-se com o mesmo movimento que o directório e o
              `/mapa` usam para trocar de vista: filtrar é a mesma lista vista
              de outra maneira, e o site já tem um idioma para isso. Substituiu
              o `<Revelar>` por cartão, que dispara ao **entrar no ecrã** — o
              gatilho errado para conteúdo que já lá está e que quem mexeu no
              filtro está à espera de ver mudar. */}
          <GrelhaHolofote
            key={assinatura}
            className="grelha-holofote vista-troca grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {pagina.itens.map((horse, i) => (
              <div
                key={horse.id}
                className="cartao-cascata h-full"
                style={{ "--i": i } as React.CSSProperties}
              >
                <HorseCard horse={horse} href={`/comprar/${horse.id}`} priority={i < 5} />
              </div>
            ))}
          </GrelhaHolofote>

          {/* O `<Pagination>` partilhado desenha um `<div>`. O marco de
              navegação tem de vir de fora, senão quem salta de marco em marco
              com um leitor de ecrã não encontra as páginas — e este idioma
              (setas, números, página actual a branco) é o mesmo do directório,
              que era a razão para deixar de o ter escrito à mão aqui. */}
          <nav aria-label="Paginação de resultados">
            <Pagination
              currentPage={pagina.pagina}
              totalPages={pagina.totalPaginas}
              onPageChange={(p) => {
                navegar({ pagina: p });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-10"
            />
          </nav>
        </>
      ) : (
        <SemResultados
          total={horses.length}
          /* Aqui a pesquisa **entra** na lista do que se pode desfazer, ao
             contrário da barra de resultados. Lá está escrita na caixa a dois
             centímetros e repeti-la era ruído; aqui é a suspeita principal —
             um termo mal escrito esvazia o ecrã mais depressa do que qualquer
             faceta, e a caixa que o contém ficou lá em cima. */
          acesos={
            filtros.search
              ? [
                  { chave: "search", nome: `«${filtros.search}»`, apagar: { search: "" } },
                  ...acesos,
                ]
              : acesos
          }
          aoDesfazer={navegar}
          aoLimpar={limpar}
          hrefAlerta={hrefAlerta}
        />
      )}
    </div>
  );
}

// ─── Faixa de pastilhas ──────────────────────────────────────────────────────

/**
 * Uma linha de filtros, dentro da gaveta.
 *
 * As pastilhas trazem a contagem que as sustenta, o que de caminho diz quanto
 * vale carregar nelas — e a escolhida é branca (`.chip-activo`), não dourada.
 * A escolhida troca a contagem por um ×, porque o número dela já está escrito
 * na barra de resultados e o × diz o que carregar ali faz.
 *
 * Uma pastilha que não devolve nada não se desenha: um botão que dá um ecrã
 * vazio não é uma escolha. A escolhida entra sempre, mesmo a zero — sem isso,
 * o filtro que está a esvaziar o ecrã desaparecia dele e não havia por onde o
 * desfazer.
 *
 * Uma faceta só não é um filtro: com menos de duas escolhas a linha não se
 * desenha, em vez de oferecer um botão que devolve o que já está no ecrã.
 *
 * É a mesma peça do `DirectorioContent`, com as mesmas classes e o mesmo
 * movimento — duas ideias de filtro no mesmo site leem-se como confusão. Está
 * aqui e não num ficheiro partilhado porque o directório é território de outro
 * trabalho nesta ronda; juntam-se em `components/ui/` quando o for.
 */
function FaixaDeChips({
  rotulo,
  pastilhas,
  aoEscolher,
  deslocamento = 0,
}: {
  rotulo: string;
  pastilhas: Pastilha[];
  aoEscolher: (novos: Partial<FiltrosMarketplace>) => void;
  /** Onde começa a cascata desta faixa, para as faixas correrem seguidas. */
  deslocamento?: number;
}) {
  const lista = pastilhas.filter((p) => p.n > 0 || p.activa);
  if (lista.length < 2 && !lista.some((p) => p.activa)) return null;

  return (
    <div>
      <span className="rotulo mb-2 block">{rotulo}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={rotulo}>
        {lista.map((p, i) => (
          <button
            key={p.chave}
            type="button"
            onClick={() => aoEscolher(p.activa ? p.limpar : p.escolher)}
            aria-pressed={p.activa}
            style={{ "--i": i + deslocamento } as React.CSSProperties}
            className={`chip chip-cascata ${p.activa ? "chip-activo" : ""}`}
          >
            {p.nome}
            <span className="chip__conta font-mono">
              {p.activa ? (
                <X size={12} aria-hidden="true" />
              ) : (
                /* A mesma fita de algarismos do directório, e mais depressa:
                   uma contagem que muda por causa de um filtro não é a entrada
                   de uma página. */
                <NumeroQueAssenta valor={String(p.n)} className="numero-assenta-rapido" />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Os dois ecrãs vazios ────────────────────────────────────────────────────

/**
 * O catálogo ainda não tem nada.
 *
 * É o estado do dia em que o site abre ao público, não um caso de canto, e por
 * isso é o que tem de estar mais bem escrito da página. Diz o que se passa —
 * que não há anúncios, e não que a pesquisa falhou —, convida quem tem um
 * cavalo a ser o primeiro, oferece a quem procura um aviso para quando o
 * primeiro chegar, e deixa uma saída para a parte do site que já tem conteúdo.
 * Um classificados vazio que se explica é uma primeira impressão; um que acusa
 * quem procurou é uma porta fechada.
 */
function CatalogoVazio({ hrefAlerta }: { hrefAlerta: string }) {
  return (
    <div className="cartao mx-auto max-w-xl px-6 py-12 text-center sm:py-16">
      <p className="rotulo mb-4">Ainda a abrir</p>
      <h2 className="titulo-seccao mb-3">Ainda não há cavalos anunciados.</h2>
      <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]">
        O mercado do Lusitano está a abrir. Assim que o primeiro anúncio for publicado, aparece aqui
        — com pedigree, fotografias e contacto directo com o criador.
      </p>

      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
        <LocalizedLink href="/vender-cavalo" className="btn btn-primario rounded-full px-5">
          Publicar o primeiro anúncio
        </LocalizedLink>
        <LocalizedLink href={hrefAlerta} className="btn btn-subtil">
          <BellRing size={13} aria-hidden="true" />
          Avisem-me quando houver
        </LocalizedLink>
      </div>

      {/* Sem esta linha o ecrã é um beco: quem chegou para ver cavalos ficava
          com duas hipóteses, e as duas eram sair do site. */}
      <p className="mt-10 border-t border-[var(--border-soft)] pt-6 text-sm text-[var(--foreground-secondary)]">
        Entretanto,{" "}
        <LocalizedLink
          href="/directorio"
          className="text-[var(--foreground-strong)] underline underline-offset-4"
        >
          conheça as coudelarias portuguesas
        </LocalizedLink>
        .
      </p>
    </div>
  );
}

/**
 * Há anúncios, mas nenhum corresponde a esta pesquisa.
 *
 * A diferença para o de cima é toda: aqui houve mesmo uma pesquisa, e o que
 * falta é dizer **qual dos filtros** a está a esvaziar e deixar desfazê-lo sem
 * limpar os outros. Um «limpar filtros» sozinho obriga a recomeçar do princípio
 * quem só precisava de alargar uma faixa de preço.
 */
function SemResultados({
  total,
  acesos,
  aoDesfazer,
  aoLimpar,
  hrefAlerta,
}: {
  total: number;
  acesos: { chave: string; nome: string; apagar: Partial<FiltrosMarketplace> }[];
  aoDesfazer: (novos: Partial<FiltrosMarketplace>) => void;
  aoLimpar: () => void;
  hrefAlerta: string;
}) {
  return (
    <div className="cartao mx-auto max-w-xl px-6 py-12 text-center">
      <Search
        className="mx-auto mb-4 text-[var(--foreground-muted)]"
        size={22}
        aria-hidden="true"
      />
      <h3 className="titulo-seccao mb-2">Nenhum destes filtros deixa passar um cavalo.</h3>
      <p className="mx-auto mb-7 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]">
        Há {total === 1 ? "1 cavalo anunciado" : `${total} cavalos anunciados`}, mas nenhum
        corresponde a tudo o que pediu. Alargue um dos filtros — ou guarde a pesquisa e avisamos
        assim que aparecer um assim.
      </p>

      {acesos.length > 0 && (
        <div className="mb-7">
          <p className="rotulo mb-3">Desfazer um filtro</p>
          <div className="flex flex-wrap justify-center gap-2">
            {acesos.map((a) => (
              <button
                key={a.chave}
                type="button"
                onClick={() => aoDesfazer(a.apagar)}
                aria-label={`Remover filtro: ${a.nome}`}
                className="chip chip-activo"
              >
                {a.nome}
                <X size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={aoLimpar} className="btn btn-primario btn-sm gap-2">
          <X size={13} aria-hidden="true" />
          Limpar tudo
        </button>
        <LocalizedLink href={hrefAlerta} className="btn btn-subtil btn-sm">
          <BellRing size={12} aria-hidden="true" />
          Guardar esta pesquisa
        </LocalizedLink>
      </div>
    </div>
  );
}
