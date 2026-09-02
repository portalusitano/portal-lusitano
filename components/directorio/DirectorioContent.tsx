"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Map, MapPin, Search, X } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import Image from "next/image";
import dynamic from "next/dynamic";
import Pagination from "@/components/ui/Pagination";
import Revelar from "@/components/Revelar";
import Seleccao from "@/components/ui/Seleccao";
import { useLanguage } from "@/context/LanguageContext";
import { capaDoCartao, iniciaisDe } from "@/lib/directorio-capas";
import { lerListaDeTexto } from "@/lib/coudelaria-ficha";
import {
  ORDENACOES,
  POR_PAGINA,
  actividadesDisponiveis,
  aplicarFiltros,
  contarFiltrosActivos,
  escreverFiltros,
  estatisticas,
  lerFiltros,
  ordenar,
  paginar,
  regioesDisponiveis,
  temFiltrosActivos,
  FILTROS_VAZIOS,
  type FiltrosDirectorio,
  type Ordenacao,
} from "@/lib/directorio-filtros";
import { ACTIVIDADES, type Actividade } from "@/lib/especialidades";
import NumeroQueAssenta from "@/components/ui/NumeroQueAssenta";

const GloboMapa = dynamic(() => import("@/components/GloboMapa"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Map className="text-[var(--foreground-muted)]" size={28} aria-hidden="true" />
    </div>
  ),
});

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Coudelaria {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  localizacao?: string | null;
  regiao?: string | null;
  foto_capa?: string | null;
  num_cavalos?: number | null;
  ano_fundacao?: number | null;
  /* `unknown` porque as duas colunas são `jsonb` e há linhas nesta base que
     guardam uma **string** com JSON lá dentro em vez de um array. Foi assim
     que a `cavalos_destaque` matou uma construção em produção. Quem lê estes
     campos passa-os por `lerListaDeTexto`. */
  especialidades?: unknown;
  linhagens?: unknown;
  is_pro?: boolean | null;
  destaque?: boolean | null;
  views_count?: number | null;
  coordenadas_lat?: number | null;
  coordenadas_lng?: number | null;
}

type Dicionario = ReturnType<typeof useLanguage>["t"];

/** `{n}` é o único marcador usado nestas frases. */
function comN(modelo: string, n: number): string {
  return modelo.replace("{n}", String(n));
}

/**
 * A mesma frase, mas com o número a assentar em vez de saltar.
 *
 * Parte-se o modelo no `{n}` e põe-se lá dentro a fita de algarismos que o
 * painel do topo já usa — é o mesmo mecanismo, não um segundo. A frase
 * continua a vir do dicionário inteira; o que muda é quem escreve o número.
 */
function FraseComNumero({ modelo, n }: { modelo: string; n: number }) {
  const [antes, depois = ""] = modelo.split("{n}");
  return (
    <>
      {antes}
      <NumeroQueAssenta valor={String(n)} className="numero-assenta-rapido font-mono" />
      {depois}
    </>
  );
}

// ─── O que fica no HTML estático ─────────────────────────────────────────────

/**
 * A lista, sem filtros, tal como sai do servidor.
 *
 * O interior da página lê o URL com `useSearchParams`, e numa rota
 * prerenderizada isso obriga o Next a escrever no HTML **o fallback do
 * `Suspense`**, não a lista. Enquanto esse fallback era um esqueleto a pulsar,
 * quem chegasse sem JavaScript — ou o rastreador que não o executa — recebia
 * um directório sem uma única coudelaria lá dentro.
 *
 * Por isso o fallback passa a ser a própria lista: os mesmos cartões, a mesma
 * primeira página, sem os controlos que precisam de estado. Ao hidratar, a
 * versão interactiva toma o lugar desta com o mesmo conteúdo por baixo.
 */
function ListaEstatica({
  coudelarias,
  capas,
}: {
  coudelarias: Coudelaria[];
  capas: Record<string, string>;
}) {
  const { t } = useLanguage();
  const numeros = estatisticas(coudelarias);
  const primeiros = coudelarias.slice(0, POR_PAGINA);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <section
        className="relative overflow-hidden pt-20 pb-10 sm:pt-32 sm:pb-14"
        aria-label={t.directorio.hero_aria}
      >
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <span className="rotulo mb-5 block">{t.directorio.badge}</span>
          <h1 className="titulo-gradiente mb-5 text-[2rem] leading-[120%] font-normal tracking-tighter md:text-[3.5rem]">
            {t.directorio.title}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[var(--foreground-secondary)] sm:text-lg">
            {t.directorio.subtitle}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <h2 className="titulo-seccao mb-6 border-t border-[var(--border-soft)] pt-4">
          {numeros.coudelarias === 1
            ? t.directorio.results_count_one
            : comN(t.directorio.results_count_many, numeros.coudelarias)}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {primeiros.map((c) => (
            <Cartao
              key={c.id}
              coudelaria={c}
              capa={capaDoCartao(c.foto_capa, c.slug, capas)}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function DirectorioInterior({
  coudelarias,
  capas,
}: {
  coudelarias: Coudelaria[];
  capas: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  // O URL é a fonte de verdade: a pesquisa fica partilhável, entra nos
  // favoritos e o botão «anterior» desfaz um filtro de cada vez. Antes disto,
  // a região e o texto viviam em `useState` e só a página ia para o URL — o
  // que dava o pior dos dois mundos: um link que não reproduzia o que se via
  // e, ao estreitar o filtro na página 3, um ecrã vazio.
  const filtros = useMemo(() => lerFiltros(searchParams), [searchParams]);

  // A caixa de texto é o único controlo que não pode ler directamente do URL:
  // escrever uma entrada de histórico por tecla estragava o botão «anterior».
  const [rascunho, setRascunho] = useState(filtros.search);
  const [pesquisaNoUrl, setPesquisaNoUrl] = useState(filtros.search);
  if (filtros.search !== pesquisaNoUrl) {
    setPesquisaNoUrl(filtros.search);
    setRascunho(filtros.search);
  }

  const navegar = useCallback(
    (novos: Partial<FiltrosDirectorio>) => {
      // Mexer no que se procura volta à página 1: ficar na página 3 de um
      // conjunto que já só tem uma mostra um ecrã vazio sem explicar porquê.
      const mudouPesquisa = Object.keys(novos).some((k) => k !== "pagina");
      const query = escreverFiltros({
        ...filtros,
        ...novos,
        pagina: novos.pagina ?? (mudouPesquisa ? 1 : filtros.pagina),
      });
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filtros, pathname, router]
  );

  useEffect(() => {
    if (rascunho === filtros.search) return;
    const relogio = setTimeout(() => navegar({ search: rascunho }), 300);
    return () => clearTimeout(relogio);
  }, [rascunho, filtros.search, navegar]);

  // As facetas saem dos dados, não de uma lista escrita à mão: assim não há
  // pastilhas que não dão resultado nenhum nem regiões fora do alcance do filtro.
  //
  // Cada uma conta-se contra os **outros** filtros, e não contra as vinte e
  // nove: com o Alentejo escolhido, «Dressage 22» prometia vinte e duas e dava
  // nove. O número numa pastilha só vale se for o que se recebe ao carregar
  // nela. Excluir-se a si própria é o que faz a pastilha acesa continuar lá —
  // e as que ficariam a zero desaparecem sozinhas, que é a mesma regra que
  // deixou sete actividades onde havia cinquenta e oito.
  const regioes = useMemo(
    () => regioesDisponiveis(aplicarFiltros(coudelarias, { ...filtros, regiao: "" })),
    [coudelarias, filtros]
  );
  const actividades = useMemo(
    () => actividadesDisponiveis(aplicarFiltros(coudelarias, { ...filtros, actividade: "" })),
    [coudelarias, filtros]
  );
  // As regiões que o ecrã vazio oferece contam-se sobre as vinte e nove, e não
  // sobre o que sobrou: quem chega ali chegou porque não sobrou nada, e uma
  // saída calculada a partir do beco é uma lista vazia.
  const regioesTodas = useMemo(() => regioesDisponiveis(coudelarias), [coudelarias]);
  const numeros = useMemo(() => estatisticas(coudelarias), [coudelarias]);

  const resultados = useMemo(
    () => ordenar(aplicarFiltros(coudelarias, filtros), filtros.ordenar),
    [coudelarias, filtros]
  );
  const pagina = useMemo(
    () => paginar(resultados, filtros.pagina, POR_PAGINA),
    [resultados, filtros.pagina]
  );

  const nActivos = contarFiltrosActivos(filtros);
  const temFiltros = temFiltrosActivos(filtros);
  const limpar = useCallback(() => router.push(pathname, { scroll: false }), [router, pathname]);

  // ── A gaveta de filtros ──────────────────────────────────────────────────
  //
  // As pastilhas deixaram de estar todas acesas no ecrã de partida. Quem as
  // abre é este botão, que traz o número dos que estão a estreitar a lista;
  // quais são, diz a barra de resultados logo abaixo, com um × em cada.
  const idGaveta = useId();
  const idBusca = useId();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  /* Quem tem o foco dentro da concha. Serve para o anel do teclado tomar a
     forma dela em vez de desenhar um rectângulo lá dentro — e é um atributo
     e não um `:has()` porque o compilador de CSS deita `:has()` fora nos
     alvos deste projecto. A razão comprida está no `globals.css`. */
  const [buscaFocada, setBuscaFocada] = useState(false);
  const botaoGaveta = useRef<HTMLButtonElement>(null);
  const conteudoGaveta = useRef<HTMLDivElement>(null);
  const [alturaGaveta, setAlturaGaveta] = useState(0);

  // A altura mede-se antes da pintura e volta a medir-se sozinha: o conteúdo
  // do nível muda de altura quando as facetas mudam de número ou quando a
  // janela estreita e as pastilhas passam a ocupar mais uma linha. Sem isto,
  // abrir a gaveta depois de filtrar deixava-a com a altura de outra lista.
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

  // Só as duas facetas contam para o número no botão: a pesquisa está escrita
  // na caixa ao lado e não se esconde atrás de nada.
  const nFacetas = (filtros.regiao ? 1 : 0) + (filtros.actividade ? 1 : 0);

  /* A assinatura do que está a ser mostrado. É ela a `key` da grelha, e é a
     `key` que faz a animação de troca de vista voltar a correr: sem ela o
     React reaproveita o nó e a animação, que já correu, não repete. */
  const assinatura = `${filtros.search}|${filtros.regiao}|${filtros.actividade}|${filtros.ordenar}|${filtros.pagina}`;

  const [mapaAberto, setMapaAberto] = useState(false);
  const noMapa = useMemo(
    () =>
      resultados
        .filter((c) => c.coordenadas_lat != null && c.coordenadas_lng != null)
        .map((c) => ({
          id: c.id,
          nome: c.nome,
          slug: c.slug,
          descricao: c.descricao ?? "",
          localizacao: c.localizacao ?? "",
          regiao: c.regiao ?? "",
          foto_capa: c.foto_capa ?? undefined,
          is_pro: Boolean(c.is_pro),
          destaque: Boolean(c.destaque),
          coordenadas_lat: c.coordenadas_lat as number,
          coordenadas_lng: c.coordenadas_lng as number,
        })),
    [resultados]
  );

  const rotuloOrdenacao: Record<Ordenacao, string> = {
    recomendadas: t.directorio.sort_recomendadas,
    nome: t.directorio.sort_nome,
    antiguidade: t.directorio.sort_antiguidade,
    cavalos: t.directorio.sort_cavalos,
  };

  // As sete actividades são chaves internas — vão para o URL e não se traduzem.
  // Quem se traduz é o nome que se lê na pastilha.
  const rotuloActividade: Record<Actividade, string> = {
    criacao: t.directorio.activity_criacao,
    dressage: t.directorio.activity_dressage,
    trabalho: t.directorio.activity_trabalho,
    toureio: t.directorio.activity_toureio,
    turismo: t.directorio.activity_turismo,
    ensino: t.directorio.activity_ensino,
    venda: t.directorio.activity_venda,
  };
  const nomeDaActividade = (v: string) =>
    ACTIVIDADES.includes(v as Actividade) ? rotuloActividade[v as Actividade] : v;

  // Os filtros acesos, para se poderem desfazer um a um. Substituem o «2
  // filtros activos» que estava na barra de resultados: um número diz quantos
  // são, estes dizem **quais** são — e desfazem-se onde se leem.
  const acesos: { chave: string; nome: string; apagar: Partial<FiltrosDirectorio> }[] = [
    ...(filtros.regiao ? [{ chave: "regiao", nome: filtros.regiao, apagar: { regiao: "" } }] : []),
    ...(filtros.actividade
      ? [
          {
            chave: "actividade",
            nome: nomeDaActividade(filtros.actividade),
            apagar: { actividade: "" },
          },
        ]
      : []),
  ];

  // O painel do topo só mostra o que se conta. O terceiro número era «1000+»,
  // escrito à mão; agora é o ano de fundação mais antigo, e desaparece quando
  // nenhuma linha o tem em vez de se inventar um valor para encher a grelha.
  const painel = [
    { valor: String(numeros.coudelarias), rotulo: t.directorio.stat_coudelarias },
    { valor: String(numeros.regioes), rotulo: t.directorio.stat_regioes },
    ...(numeros.maisAntiga !== null
      ? [{ valor: String(numeros.maisAntiga), rotulo: t.directorio.stat_mais_antiga }]
      : []),
  ];

  return (
    // O `<main>` já é o do `layout.tsx`; um segundo aqui dentro dava dois
    // marcos de conteúdo principal no mesmo documento, e um leitor de ecrã
    // que salta para o conteúdo passa a ter duas hipóteses para o mesmo sítio.
    <div className="min-h-screen bg-[var(--background)]">
      {/* ── Cabeçalho ── */}
      <section
        className="relative overflow-hidden pt-20 pb-10 sm:pt-32 sm:pb-14"
        aria-label={t.directorio.hero_aria}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 50% 0%, var(--elevate-1), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <Revelar className="text-center">
            <span className="rotulo mb-5 block">{t.directorio.badge}</span>
            <h1 className="titulo-gradiente mb-5 text-[2rem] leading-[120%] font-normal tracking-tighter md:text-[3.5rem]">
              {t.directorio.title}
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-[var(--foreground-secondary)] sm:text-lg">
              {t.directorio.subtitle}
            </p>
          </Revelar>

          <Revelar atraso={100}>
            <div
              className={`mx-auto mt-10 grid max-w-lg gap-3 ${
                painel.length === 3 ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              {painel.map(({ valor, rotulo }) => (
                <div key={rotulo} className="cartao px-3 py-4 text-center">
                  <NumeroQueAssenta
                    valor={valor}
                    className="block font-mono text-2xl tabular-nums text-[var(--foreground-strong)] sm:text-3xl"
                  />
                  <div className="meta mt-1">{rotulo}</div>
                </div>
              ))}
            </div>
          </Revelar>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {/* ── A barra ──
            Uma linha só: pesquisar, abrir os filtros, ordenar. Em computador
            os três vivem dentro da mesma concha, separados por hairlines; em
            telemóvel a concha parte-se em duas, porque não cabem lado a lado
            sem esmagar a caixa de texto, que é o controlo principal. */}
        <Revelar atraso={150}>
          <div className="mb-6" role="search" aria-label={t.directorio.search_label}>
            <div className="barra-dir" data-busca={buscaFocada || undefined}>
              <div
                className="barra-dir__seccao barra-dir__seccao--busca"
                data-busca={buscaFocada || undefined}
              >
                <Search className="barra-dir__lupa" size={15} aria-hidden="true" />
                {/* Um rótulo a sério e não só um `aria-label`: assim carregar
                    nele põe o cursor no campo, que é o que um rótulo faz. */}
                <label htmlFor={idBusca} className="sr-only">
                  {t.directorio.search_label}
                </label>
                <input
                  id={idBusca}
                  type="search"
                  placeholder={t.directorio.search_placeholder}
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  onFocus={() => setBuscaFocada(true)}
                  onBlur={() => setBuscaFocada(false)}
                  className="barra-dir__busca"
                />
                {rascunho && (
                  <button
                    type="button"
                    onClick={() => setRascunho("")}
                    aria-label={t.directorio.search_clear}
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
                  {t.directorio.filters_label}
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
                    aria-label={t.directorio.sort_label}
                    className="barra-dir__accao w-full"
                  >
                    {ORDENACOES.map((o) => (
                      <option key={o} value={o}>
                        {rotuloOrdenacao[o]}
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
                <FaixaDeChips
                  rotulo={t.directorio.filter_region}
                  valor={filtros.regiao}
                  facetas={regioes}
                  aoEscolher={(v) => navegar({ regiao: v })}
                />

                <FaixaDeChips
                  rotulo={t.directorio.filter_activity}
                  valor={filtros.actividade}
                  facetas={actividades}
                  nomeDe={nomeDaActividade}
                  aoEscolher={(v) => navegar({ actividade: v })}
                  deslocamento={regioes.length}
                />
              </div>
            </div>
          </div>
        </Revelar>

        {/* ── Barra de resultados ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="titulo-seccao">
              {pagina.total === 1 ? (
                t.directorio.results_count_one
              ) : (
                <FraseComNumero modelo={t.directorio.results_count_many} n={pagina.total} />
              )}
            </h2>

            {/* Quem lê com um leitor de ecrã não vê a contagem mudar. O
                `role="status"` diz-lha depois de o filtro assentar — e não a
                cada tecla, porque o que vai para o URL já passa por um
                temporizador de 300ms. */}
            <p className="sr-only" role="status">
              {pagina.total === 1
                ? t.directorio.results_count_one
                : comN(t.directorio.results_count_many, pagina.total)}
              {nActivos > 0 && " · "}
              {nActivos > 0 &&
                (nActivos === 1
                  ? t.directorio.filters_active_one
                  : comN(t.directorio.filters_active_many, nActivos))}
            </p>

            {/* Os filtros acesos, um a um e com o × onde se leem. Estava aqui
                um «2 filtros activos»: dizia quantos eram e não dizia quais,
                e para desfazer um só era preciso voltar às pastilhas. */}
            {acesos.map((a) => (
              <button
                key={a.chave}
                type="button"
                onClick={() => navegar(a.apagar)}
                aria-label={`${t.directorio.filters_remove}: ${a.nome}`}
                className="chip chip-activo"
              >
                {a.nome}
                <X size={12} aria-hidden="true" />
              </button>
            ))}

            {temFiltros && (
              <button type="button" onClick={limpar} className="btn btn-subtil btn-sm">
                {t.directorio.clear_filters}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMapaAberto((v) => !v)}
              aria-expanded={mapaAberto}
              disabled={noMapa.length === 0}
              className="btn btn-secundario btn-sm gap-2 rounded-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Map size={14} aria-hidden="true" />
              {mapaAberto ? t.directorio.map_hide : t.directorio.map_show}
              <span className="font-mono tabular-nums text-[var(--foreground-muted)]">
                {noMapa.length}
              </span>
            </button>
            <LocalizedLink href="/mapa" className="btn btn-subtil btn-sm">
              {t.directorio.map_full}
            </LocalizedLink>
          </div>
        </div>

        {mapaAberto && noMapa.length > 0 && (
          <div
            className="relative z-0 mb-8 overflow-hidden rounded-[var(--raio-lg)] border border-[var(--border-soft)]"
            style={{ height: 420 }}
            aria-label={t.directorio.map_label}
          >
            <GloboMapa
              coudelarias={noMapa}
              onMarkerClick={(c) => router.push(`/directorio/${c.slug}`)}
            />
          </div>
        )}

        {/* ── Grelha ── */}
        {pagina.itens.length > 0 ? (
          <section aria-label={t.directorio.results_aria}>
            {/* A grelha recompõe-se com o mesmo movimento que o `/mapa` usa
                para trocar de vista: filtrar é a mesma lista vista de outra
                maneira, e o site já tem um idioma para isso. Substituiu o
                `<Revelar>` por cartão, que dispara ao **entrar no ecrã** — o
                gatilho errado para conteúdo que já lá está e que quem mexeu
                no filtro está à espera de ver mudar. Uma ideia de entrada de
                cada vez. A `key` é a assinatura do que se mostra: sem ela o
                React reaproveita o nó e a animação não repete. */}
            <div
              key={assinatura}
              className="vista-troca grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              {pagina.itens.map((c, i) => (
                <div
                  key={c.id}
                  className="cartao-cascata h-full"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <Cartao coudelaria={c} capa={capaDoCartao(c.foto_capa, c.slug, capas)} t={t} />
                </div>
              ))}
            </div>
            <Pagination
              currentPage={pagina.pagina}
              totalPages={pagina.totalPaginas}
              onPageChange={(p) => {
                navegar({ pagina: p });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-10"
            />
          </section>
        ) : (
          <Vazio
            t={t}
            regioes={regioesTodas.slice(0, 4).map((r) => r.valor)}
            aoEscolherRegiao={(r) =>
              router.push(`${pathname}?${escreverFiltros({ ...FILTROS_VAZIOS, regiao: r })}`, {
                scroll: false,
              })
            }
            aoLimpar={limpar}
            temFiltros={temFiltros}
          />
        )}

        {/* ── Registo ──
            A faixa estava por cima dos filtros, a empurrar a lista para baixo
            numa página cujo trabalho é mostrar coudelarias. Quem procura uma
            coudelaria não a quer ali; quem *tem* uma chega ao fim da lista. */}
        <Revelar>
          <div className="cartao mt-12 p-5 sm:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="titulo-seccao mb-1">{t.directorio.has_stud}</h2>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {t.directorio.register_cta}
                </p>
              </div>
              <LocalizedLink
                href="/directorio/registar"
                className="btn btn-primario btn-sm shrink-0 rounded-full px-5"
              >
                {t.directorio.register_btn}
              </LocalizedLink>
            </div>
          </div>
        </Revelar>
      </div>
    </div>
  );
}

// ─── Faixa de pastilhas ──────────────────────────────────────────────────────

/**
 * Uma linha de filtros, dentro da gaveta. As pastilhas trazem a contagem que
 * as sustenta, o que de caminho diz quanto vale carregar nelas — e o
 * escolhido é branco (`.chip-activo`), não dourado.
 *
 * **O rótulo está aqui e não no ecrã de partida.** Vivia numa coluna de 6rem
 * ao lado das pastilhas, e em telemóvel numa linha inteira só para ele. Fora
 * da gaveta não ganhava o espaço que custava: ninguém confunde «Alentejo»
 * com «Dressage». Cá dentro ganha — é aqui que se escolhe, e é a divisão
 * entre os dois eixos que diz que são dois filtros e não catorze hipóteses
 * da mesma coisa.
 *
 * **Não há pastilha «Todas».** Era a única acesa por omissão, o que fazia o
 * estado de partida parecer uma escolha; e era a terceira maneira de fazer a
 * mesma coisa, ao lado de voltar a carregar na pastilha acesa e do «limpar
 * filtros» na barra de resultados. Em vez dela, a pastilha activa troca a
 * contagem por um × — a contagem dela já está escrita na barra de
 * resultados, e o × diz o que carregar ali faz.
 *
 * Uma faceta só não é um filtro: com menos de duas escolhas a linha não se
 * desenha, em vez de oferecer um botão que devolve o que já está no ecrã.
 *
 * **A escolhida entra sempre**, mesmo que as contagens já não a tragam. Com
 * `?search=zzzzz&regiao=Alentejo` as contagens correm sobre zero linhas e não
 * devolvem região nenhuma: sem esta linha, o filtro que está a esvaziar o ecrã
 * desaparecia dele e não havia por onde o desfazer.
 */
function FaixaDeChips({
  rotulo,
  valor,
  facetas,
  nomeDe,
  aoEscolher,
  deslocamento = 0,
}: {
  rotulo: string;
  valor: string;
  facetas: { valor: string; n: number }[];
  nomeDe?: (v: string) => string;
  aoEscolher: (v: string) => void;
  /** Onde começa a cascata desta faixa, para as duas correrem seguidas. */
  deslocamento?: number;
}) {
  const lista =
    valor && !facetas.some((f) => f.valor === valor) ? [{ valor, n: 0 }, ...facetas] : facetas;

  if (lista.length < 2 && !valor) return null;

  return (
    <div>
      <span className="rotulo mb-2 block">{rotulo}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={rotulo}>
        {lista.map((f, i) => {
          const activo = valor === f.valor;
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => aoEscolher(activo ? "" : f.valor)}
              aria-pressed={activo}
              style={{ "--i": i + deslocamento } as React.CSSProperties}
              className={`chip chip-cascata ${activo ? "chip-activo" : ""}`}
            >
              {nomeDe ? nomeDe(f.valor) : f.valor}
              <span className="chip__conta font-mono">
                {activo ? (
                  <X size={12} aria-hidden="true" />
                ) : (
                  /* A mesma fita de algarismos do painel do topo, só que mais
                     depressa: uma contagem que muda por causa de um filtro
                     não é a entrada de uma página. */
                  <NumeroQueAssenta valor={String(f.n)} className="numero-assenta-rapido" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cartão ──────────────────────────────────────────────────────────────────

/**
 * O cartão de uma coudelaria.
 *
 * Mostra o que ajuda a escolher uma para visitar — onde é, desde quando, que
 * efectivo declara, em que trabalha e de que linhagens cria — em vez de uma
 * fotografia de 400px de altura com o nome por cima. A descrição saiu: nesta
 * base de dados é a mesma frase em todas as vinte e nove, e uma frase igual
 * em todos os cartões ocupa espaço sem separar nenhum deles.
 *
 * Quando não há fotografia **não se empresta uma**: desenha-se uma chapa com
 * as iniciais, do mesmo tamanho, para a grelha não ficar aos degraus.
 *
 * Não há linha «Ver coudelaria →» no fim. O cartão inteiro é a ligação, tem o
 * nome da coudelaria e a localidade no `aria-label` e levanta-se ao passar o
 * rato; a linha repetia a mesma frase vinte e quatro vezes por página e
 * gastava nisso a altura de duas linhas de dados. O `HorseCard`, que é a
 * grelha mais densa do site, também não a tem.
 */
function Cartao({
  coudelaria: c,
  capa,
  t,
}: {
  coudelaria: Coudelaria;
  capa: string | null;
  t: Dicionario;
}) {
  /* `lerListaDeTexto` e não `?? []`: uma string com JSON dentro não tem
     `.filter` e rebentava a prerenderização da página inteira. A guarda pelo
     `.length` não chegaria — uma string também tem `length`, portanto passa a
     verificação e é o método a seguir que morre. Quem decide a forma do dado
     é a função que o lê, e não o tipo que se escreveu à espera dela. */
  const especialidades = lerListaDeTexto(c.especialidades);
  const linhagens = lerListaDeTexto(c.linhagens);
  const sitio = [c.localizacao, c.regiao].filter(Boolean).join(", ");

  return (
    <LocalizedLink
      href={`/directorio/${c.slug}`}
      className="cartao cartao-interactivo group flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-strong)]"
      aria-label={sitio ? `${c.nome} — ${sitio}` : c.nome}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--background-elevated)]">
        {capa ? (
          <Image
            src={capa}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: "var(--elevate-1)" }}
          >
            <span
              className="font-mono text-3xl tracking-widest text-[var(--foreground-muted)]"
              aria-hidden="true"
            >
              {iniciaisDe(c.nome)}
            </span>
            <span className="sr-only">{t.directorio.no_photo}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm leading-snug text-[var(--foreground-strong)]">
          {c.nome}
        </h3>

        {sitio && (
          <p className="meta flex items-start gap-1.5">
            <MapPin size={12} className="mt-px shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{sitio}</span>
          </p>
        )}

        {(c.ano_fundacao || c.num_cavalos) && (
          <p className="meta font-mono tabular-nums">
            {[
              c.ano_fundacao ? `${t.directorio.since} ${c.ano_fundacao}` : null,
              c.num_cavalos
                ? c.num_cavalos === 1
                  ? t.directorio.horses_one
                  : comN(t.directorio.horses_many, c.num_cavalos)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        {/* As especialidades em bruto ficam — deixaram de mandar no filtro mas
            continuam a informar, e são elas que distinguem uma coudelaria da
            do lado. O que saiu foram as pastilhas: numa grelha onde tudo o
            que é clicável é pastilha, uma pastilha que não filtra promete o
            que não cumpre. E como só cabiam duas, o cartão gastava uma linha
            inteira num «+2» — o dado que distinguia ficava escondido
            precisamente atrás desse algarismo. Duas linhas de texto corrido
            dizem quatro ou cinco no mesmo espaço. */}
        {especialidades.length > 0 && (
          <p className="meta line-clamp-2 text-[var(--foreground-secondary)]">
            {especialidades.join(", ")}
          </p>
        )}

        {/* O rótulo em cima e os valores por baixo: em linha, numa coluna de
            173px de telemóvel, sobrava «LINHAGENS Veiga,…» — o rótulo comia o
            dado que era suposto apresentar. */}
        {linhagens.length > 0 && (
          <p className="mt-auto pt-0.5">
            <span className="rotulo block">{t.directorio.lineages_short}</span>
            <span className="meta line-clamp-1">{linhagens.slice(0, 3).join(", ")}</span>
          </p>
        )}
      </div>
    </LocalizedLink>
  );
}

// ─── Estado vazio ────────────────────────────────────────────────────────────

/**
 * O ecrã que aparece quando a pesquisa não dá nada.
 *
 * Antes era um ícone e uma frase no meio de vinte e quatro rem de vazio, sem
 * saída nenhuma. Quem chega aqui precisa de duas coisas: desfazer o que
 * estreitou a lista e, se não souber por onde recomeçar, uma região onde há
 * mesmo coudelarias.
 */
function Vazio({
  t,
  regioes,
  aoEscolherRegiao,
  aoLimpar,
  temFiltros,
}: {
  t: Dicionario;
  regioes: string[];
  aoEscolherRegiao: (r: string) => void;
  aoLimpar: () => void;
  temFiltros: boolean;
}) {
  return (
    <div className="cartao mx-auto max-w-xl px-6 py-12 text-center">
      <Search
        className="mx-auto mb-4 text-[var(--foreground-muted)]"
        size={22}
        aria-hidden="true"
      />
      <h3 className="titulo-seccao mb-2">{t.directorio.no_results}</h3>
      <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--foreground-secondary)]">
        {t.directorio.no_results_hint}
      </p>

      {temFiltros && (
        <button type="button" onClick={aoLimpar} className="btn btn-primario btn-sm gap-2">
          <X size={13} aria-hidden="true" />
          {t.directorio.clear_filters}
        </button>
      )}

      {regioes.length > 0 && (
        <div className="mt-8 border-t border-[var(--border-soft)] pt-6">
          <p className="rotulo mb-3">{t.directorio.empty_try_region}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {regioes.map((r) => (
              <button key={r} type="button" onClick={() => aoEscolherRegiao(r)} className="chip">
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 border-t border-[var(--border-soft)] pt-6">
        <LocalizedLink
          href="/directorio/registar"
          className="text-sm text-[var(--foreground-strong)] underline underline-offset-4"
        >
          {t.directorio.empty_register}
        </LocalizedLink>
      </p>
    </div>
  );
}

// ─── Saída (Suspense por causa do useSearchParams) ───────────────────────────

export default function DirectorioContent({
  coudelarias,
  capas = {},
}: {
  coudelarias: Coudelaria[];
  capas?: Record<string, string>;
}) {
  return (
    <Suspense fallback={<ListaEstatica coudelarias={coudelarias} capas={capas} />}>
      <DirectorioInterior coudelarias={coudelarias} capas={capas} />
    </Suspense>
  );
}
