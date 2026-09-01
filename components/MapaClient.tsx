"use client";

import { useState, useMemo, memo, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import dynamic from "next/dynamic";
import {
  MapPin,
  Globe,
  ChevronRight,
  ChevronLeft,
  X,
  List,
  Search,
  Layers,
  SearchX,
} from "lucide-react";
import LocalizedLink, { localizeHref } from "@/components/LocalizedLink";
import Revelar from "@/components/Revelar";
import Image from "next/image";
import {
  filtrar,
  filtrarPorTexto,
  contarPorRegiao,
  formatarNumero,
  partirTitulo,
  caminhoDaCoudelaria,
  consultaDoMapa,
  lerEstadoDoMapa,
  ESTADO_LIMPO,
  type EstadoDoMapa,
} from "@/lib/mapa-coudelarias";
import { capaDoCartao, iniciaisDe } from "@/lib/directorio-capas";

// O globo desenha-se em canvas e mede o elemento onde está: só no cliente.
// A cena 3D só se carrega nesta página, e só quando é precisa.
const GloboTerra = dynamic(() => import("@/components/GloboTerra"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export interface Coudelaria {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  localizacao: string;
  regiao: string;
  telefone?: string;
  email?: string;
  website?: string;
  foto_capa?: string;
  is_pro: boolean;
  destaque: boolean;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  num_cavalos?: number;
  especialidades?: string[];
}

/* ── A capa ──────────────────────────────────────────────────────────────
   Estavam aqui três fotografias do Unsplash, servidas à vez a todos os
   cartões: nenhuma das vinte e nove tem `foto_capa` na base, por isso era o
   que toda a gente via — um cavalo qualquer apresentado como sendo daquela
   coudelaria. É a mesma classe de afirmação falsa que o «20 Cavalos» do topo,
   e em imagem é pior, porque uma fotografia não se lê como uma aproximação.

   Entretanto havia fotografias verdadeiras que ninguém usava, em
   `public/images/coudelarias/<slug>/`. Quem as escolhe é o `directorio-capas`,
   no servidor, a partir do que está mesmo em disco — o mesmo módulo que o
   `/directorio` usa, para não haver duas regras para a mesma coisa. Vinte e
   oito das vinte e nove passam a ter fotografia sua; a que sobra mostra uma
   chapa tipográfica, que não promete nada. */
const Capa = memo(function Capa({
  coudelaria,
  capa,
  className = "",
  sizes,
}: {
  coudelaria: Coudelaria;
  capa: string | null;
  className?: string;
  sizes: string;
}) {
  if (capa) {
    return (
      <Image
        src={capa}
        alt={coudelaria.nome}
        fill
        sizes={sizes}
        className={`object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-[var(--background-elevated)]"
    >
      <span className="font-mono text-xs tracking-wide text-[var(--foreground-muted)]">
        {iniciaisDe(coudelaria.nome)}
      </span>
    </div>
  );
});

/* ── Linha de coudelaria ─────────────────────────────────────────────────
   Era um botão que abria uma janela, e da janela é que se ia à ficha: dois
   toques para chegar ao sítio a que a pessoa vinha. É um link directo — e
   agora o globo faz o mesmo, por isso já não há na página dois significados
   para o mesmo gesto. */
const LinhaCoudelaria = memo(function LinhaCoudelaria({
  coudelaria,
  capa,
  horsesLabel,
}: {
  coudelaria: Coudelaria;
  capa: string | null;
  horsesLabel: string;
}) {
  return (
    <LocalizedLink
      href={caminhoDaCoudelaria(coudelaria.slug)}
      className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--elevate-1)]"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
        <Capa coudelaria={coudelaria} capa={capa} sizes="40px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-[var(--foreground)] group-hover:text-[var(--foreground-strong)]">
          {coudelaria.nome}
        </div>
        <div className="meta truncate">{coudelaria.localizacao}</div>
      </div>
      {typeof coudelaria.num_cavalos === "number" && (
        <span className="meta hidden shrink-0 font-mono tabular-nums sm:block">
          {coudelaria.num_cavalos} <span className="sr-only">{horsesLabel}</span>
        </span>
      )}
      <ChevronRight
        size={14}
        aria-hidden="true"
        className="shrink-0 text-[var(--foreground-muted)] transition-colors group-hover:text-[var(--foreground-strong)]"
      />
    </LocalizedLink>
  );
});

/* ── Cartão da grelha ────────────────────────────────────────────────────
   Duas mudanças, e as duas por regras que já existiam.

   O distintivo era `.selo-destaque`, o dourado. Vinte das vinte e nove
   coudelarias são «destaque»: sessenta e nove por cento da grelha vestida com
   o acento é o acento a deixar de assinalar seja o que for. Passa a
   `.selo-forte`, branco, como manda o sistema.

   E a faixa da fotografia só existe quando há fotografia mesmo — a de disco
   ou a da base, nunca uma emprestada. A coudelaria que não tem nenhuma não
   ganha 144 pixéis de banda cinzenta a segurar duas letras: fica um cartão de
   texto, mais denso, e a chapa das iniciais guarda-se para o quadrado de 40px
   da lista, onde se lê como marca e não como fotografia falhada. */
const CartaoGrelha = memo(function CartaoGrelha({
  coudelaria,
  capa,
  featuredLabel,
  horsesLabel,
}: {
  coudelaria: Coudelaria;
  capa: string | null;
  featuredLabel: string;
  horsesLabel: string;
}) {
  return (
    <LocalizedLink
      href={caminhoDaCoudelaria(coudelaria.slug)}
      className="group block cartao transition-colors hover:border-[var(--border-hover)]"
    >
      {capa && (
        <div className="relative h-36 overflow-hidden bg-[var(--background-card)]">
          <Capa
            coudelaria={coudelaria}
            capa={capa}
            className="transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          {coudelaria.destaque && (
            <div className="selo selo-forte absolute left-2 top-2 rounded-full">
              {featuredLabel}
            </div>
          )}
          <div className="selo selo-neutro absolute bottom-2 left-2 rounded-full">
            <MapPin size={10} aria-hidden="true" />
            {coudelaria.regiao}
          </div>
        </div>
      )}
      <div className="p-3">
        {!capa && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="selo rounded-full border border-[var(--border-soft)] text-[var(--foreground-secondary)]">
              <MapPin size={10} aria-hidden="true" />
              {coudelaria.regiao}
            </span>
            {coudelaria.destaque && (
              <span className="selo selo-forte rounded-full">{featuredLabel}</span>
            )}
          </div>
        )}
        <h3 className="truncate text-sm text-[var(--foreground)] transition-colors group-hover:text-[var(--foreground-strong)]">
          {coudelaria.nome}
        </h3>
        <p className="meta mb-1 truncate">{coudelaria.localizacao}</p>
        <p className="line-clamp-2 text-xs text-[var(--foreground-secondary)]">
          {coudelaria.descricao}
        </p>
        {typeof coudelaria.num_cavalos === "number" && (
          <p className="meta mt-2 font-mono tabular-nums">
            {coudelaria.num_cavalos} {horsesLabel}
          </p>
        )}
      </div>
    </LocalizedLink>
  );
});

/* ── Nada encontrado ─────────────────────────────────────────────────────
   Escrever «xpto» apagava as vinte e nove luzes do globo e não dizia nada:
   ficava um planeta vazio e um painel de regiões a prometer treze no
   Alentejo. Um ecrã que não encontrou tem de o dizer, dizer o que procurou,
   e dar a saída. */
const SemResultados = memo(function SemResultados({
  titulo,
  dica,
  termo,
  aoLimpar,
  limparLabel,
}: {
  titulo: string;
  dica: string;
  termo: string;
  aoLimpar: () => void;
  limparLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-12 text-center">
      <SearchX size={22} className="text-[var(--foreground-muted)]" aria-hidden="true" />
      <p className="titulo-seccao">{titulo}</p>
      <p className="meta max-w-[38ch]">
        {termo && (
          <>
            <span className="font-mono text-[var(--foreground-secondary)]">“{termo}”</span> —{" "}
          </>
        )}
        {dica}
      </p>
      <button type="button" onClick={aoLimpar} className="btn btn-secundario btn-sm mt-1">
        {limparLabel}
      </button>
    </div>
  );
});

interface MapaClientProps {
  coudelarias: Coudelaria[];
  /** slug → caminho da capa que existe em disco, escolhido no servidor. */
  capas?: Record<string, string>;
  /** Filtros vindos da query, já lidos e validados no servidor. */
  inicial?: EstadoDoMapa;
}

/* ── A pilha de níveis ────────────────────────────────────────────────────
 * Escolher uma região deixa de ser marcar uma caixa e passa a ser entrar num
 * sítio: a lista de regiões sai, a lista da região entra, e as duas ocupam o
 * mesmo lugar. É o idioma dos submenus do menu de ecrã inteiro — está no
 * CLAUDE.md — reaproveitado aqui em vez de se inventar um segundo.
 *
 * A altura é medida e escrita numa variável, para a caixa crescer de cinco
 * regiões para treze coudelarias em vez de saltar. Mede-se no
 * `useLayoutEffect`, antes da pintura, senão vê-se um quadro com a altura
 * antiga; e observa-se com um `ResizeObserver` porque o conteúdo do nível
 * também muda de altura sozinho (a pesquisa esvazia linhas).
 */
function Pilha({
  nivel,
  children,
}: {
  nivel: number;
  children: [React.ReactNode, React.ReactNode];
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const niveis = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const activo = niveis.current[nivel];
    const alvo = caixa.current;
    if (!activo || !alvo) return;
    const medir = () => {
      alvo.style.setProperty("--altura-pilha", `${activo.offsetHeight}px`);
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(activo);
    return () => observador.disconnect();
  }, [nivel, children]);

  return (
    <div ref={caixa} className="pilha">
      {children.map((conteudo, i) => (
        <div
          key={i}
          ref={(n) => {
            niveis.current[i] = n;
          }}
          className="pilha__nivel"
          data-fora={i === nivel ? "nao" : "sim"}
          data-lado={i < nivel ? "atras" : "frente"}
          aria-hidden={i === nivel ? undefined : true}
          inert={i === nivel ? undefined : true}
        >
          {conteudo}
        </div>
      ))}
    </div>
  );
}

export default function MapaClient({ coudelarias, capas = {}, inicial }: MapaClientProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const partida = inicial ?? ESTADO_LIMPO;
  const [regiao, setRegiao] = useState<string | null>(partida.regiao);
  const [procura, setProcura] = useState(partida.procura);
  const [viewMode, setViewMode] = useState<"globo" | "list">(partida.vista);

  /* ── Um funil só ───────────────────────────────────────────────────────
     A pesquisa filtrava o globo e a lista; o painel de regiões contava por
     sua conta e nunca ouvia a pesquisa. Com «xpto» escrito, o globo tinha
     zero pontos e o painel continuava a dizer «Alentejo 13». Agora as duas
     coisas saem do mesmo sítio: `porTexto` alimenta as contagens do painel
     (para uma região poder aparecer a zero em vez de mentir) e `visiveis`
     alimenta o globo, a lista e o contador. */
  const porTexto = useMemo(() => filtrarPorTexto(coudelarias, procura), [coudelarias, procura]);
  const visiveis = useMemo(
    () => filtrar(coudelarias, { procura, regiao }),
    [coudelarias, procura, regiao]
  );
  const regioes = useMemo(() => contarPorRegiao(coudelarias, porTexto), [coudelarias, porTexto]);

  const temFiltro = procura.trim() !== "" || regiao !== null;
  const limpar = useCallback(() => {
    setProcura("");
    setRegiao(null);
  }, []);

  /* ── O endereço é a memória da página ──────────────────────────────────
     Quem encontrava as treze do Alentejo e mandava o link mandava a página em
     branco. O estado inicial vem do servidor (`/mapa` já é servida a pedido,
     por isso ler a query não custa render nenhum) e a partir daí é escrito na
     barra de endereço com `replaceState`: sem navegação, sem
     `useSearchParams` — que obrigaria a um limite de Suspense — e sem voltar
     a montar o globo a cada tecla. */
  useEffect(() => {
    const busca = consultaDoMapa({ procura, regiao, vista: viewMode });
    window.history.replaceState(
      null,
      "",
      busca ? `${window.location.pathname}?${busca}` : window.location.pathname
    );
  }, [procura, regiao, viewMode]);

  /* ── …e é ela que paga a saída para a ficha ────────────────────────────
     Sair do mapa só é aceitável se voltar trouxer o mesmo mapa. Não trazia:
     medido, carregar em «voltar» a partir de uma ficha aterrava em `/mapa`
     com as vinte e nove acesas, tendo-se saído das treze do Alentejo.

     A causa é o encaminhador ter duas memórias. O browser repõe o endereço
     `?regiao=Alentejo`, mas o payload de `/mapa` vem da cache do cliente — o
     da primeira visita, sem consulta nenhuma — e por isso o `inicial` que
     chega do servidor vem limpo. Pior: o efeito acima corre a seguir e
     reescreve o endereço a partir desse estado limpo, apagando a única prova
     que restava de onde a pessoa estava.

     Por isso quem manda à chegada é o endereço, não o `inicial`: lê-se ao
     montar e adopta-se se disser outra coisa. Num `useLayoutEffect` de
     propósito, para correr antes do efeito que escreve — ao contrário, a
     escrita limpava o endereço antes de alguém o ter lido. E quem o lê é o
     mesmo `lerEstadoDoMapa` que o servidor usa, para não haver duas leituras
     da mesma consulta. */
  useLayoutEffect(() => {
    const doEndereco = lerEstadoDoMapa(
      Object.fromEntries(new URLSearchParams(window.location.search)),
      coudelarias.map((c) => c.regiao)
    );
    if (doEndereco.regiao !== partida.regiao) setRegiao(doEndereco.regiao);
    if (doEndereco.procura !== partida.procura) setProcura(doEndereco.procura);
    if (doEndereco.vista !== partida.vista) setViewMode(doEndereco.vista);
    // Só à chegada: daí em diante quem manda é o estado, e o endereço segue-o.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Escolher no globo é ir lá ─────────────────────────────────────────
     Carregar num alfinete ou num nome abria uma janela, e da janela é que se
     ia à ficha. Dois toques para o destino, e — pior — dois significados para
     o mesmo gesto na mesma página: a linha do painel ao lado já era um link
     directo. Passa a ser o mesmo destino pelos três caminhos.

     O que a janela dizia defender era espreitar sem perder o mapa. Medido: o
     véu era `bg-black/90` sobre o ecrã inteiro e, a 390×700, a janela de
     358×455 tapava a lona de 356×458 por completo — não se espreitava coisa
     nenhuma, escondia-se o mapa atrás de um pano e voltava-se. E o que ela
     mostrava era um subconjunto da ficha: fotografia, nome, terra, região,
     descrição cortada, contagem de cavalos e três contactos, tudo isso a um
     toque de distância e por inteiro. Um resumo que mostra menos do que o
     destino e esconde o mapa para o mostrar não vale um toque.

     Fica por pagar o enquadramento do globo, que se refaz ao voltar. Os
     filtros esses voltam, porque estão no endereço. */
  const irParaFicha = useCallback(
    (slug: string) => {
      const destino = localizeHref(caminhoDaCoudelaria(slug), language);
      if (typeof destino === "string") router.push(destino);
    },
    [router, language]
  );

  const contagem = `${formatarNumero(visiveis.length, language)} ${
    visiveis.length === 1 ? t.mapa.result_one : t.mapa.results
  }`;

  const titulo = useMemo(
    () => partirTitulo(t.mapa.title, t.mapa.title_highlight),
    [t.mapa.title, t.mapa.title_highlight]
  );

  /* Uma linha da lista. A cascata de entrada é da pilha, que sabe qual é o
     nível que está a entrar; a linha só sabe desenhar-se. */
  const linhaDaLista = (c: Coudelaria) => (
    <LinhaCoudelaria
      coudelaria={c}
      capa={capaDoCartao(c.foto_capa, c.slug, capas)}
      horsesLabel={t.mapa.horses}
    />
  );

  return (
    /* Uma `div`, e não um `<main>`: o `app/layout.tsx` já embrulha tudo num
       `<main id="main-content">`, e um dentro do outro dava dois marcos
       «principal» ao leitor de ecrã — quem salta para o conteúdo não deve ter
       de escolher qual. Custava também 64 pixéis: a regra
       `@media (max-width:1024px) { main { padding-bottom: … } }` acertava nos
       dois e o telemóvel levava a margem do rodapé a dobrar. */
    <div className="min-h-screen bg-[var(--background)]">
      <div className="pointer-events-none fixed inset-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 50% 0%, var(--elevate-1), transparent 70%)",
          }}
        />
      </div>

      {/* ── Cabeçalho ────────────────────────────────────────────────────
          Em telemóvel o que estava acima do globo comia 410 dos 700 pixéis
          do ecrã, e com a barra de cookies em cima sobravam 128 de mapa.

          O herói é só o título e uma linha: o distintivo «Mapa interactivo»
          saiu — dizia por palavras o que o globo já mostra — e a faixa de
          estatísticas também. Três números acima do mapa empurravam-no para
          baixo da dobra para dizer o que a página inteira diz a seguir; o
          contador de resultados, esse, fica ao pé da lista, que é onde
          alguém o procura. O subtítulo só aparece a partir de `sm`. */}
      <section className="relative pb-4 pt-16 sm:pb-6 sm:pt-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          {/* A palavra acesa vem do dicionário (`title_highlight`). Estava
              escrita à mão aqui dentro, num `split("Portugal")` que só
              funcionava enquanto as três traduções tivessem a palavra. */}
          <h1 className="mb-3 text-2xl text-[var(--foreground)] sm:mb-4 sm:text-4xl md:text-6xl">
            {titulo.antes}
            {titulo.meio && <span className="text-[var(--foreground-strong)]">{titulo.meio}</span>}
            {titulo.depois}
          </h1>
          <p className="mx-auto mb-6 hidden max-w-xl text-[var(--foreground-secondary)] sm:mb-8 sm:block">
            {t.mapa.subtitle}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 pb-16 md:px-6">
        {/* ── Comandos ─────────────────────────────────────────────────
            Numa linha só. Com `min-w-[12rem]` na caixa de pesquisa o cartão
            partia-se em duas linhas a 390px e custava 58 pixéis de mapa; a
            caixa passa a `min-w-0` e reparte o que sobra com os dois chips. */}
        <div className="cartao mb-3 flex flex-nowrap items-center gap-2 p-3 sm:gap-3">
          <div
            className="flex shrink-0 items-center gap-1.5"
            role="group"
            aria-label={t.mapa.view_switch}
          >
            <button
              type="button"
              onClick={() => setViewMode("globo")}
              aria-pressed={viewMode === "globo"}
              className={`chip gap-1.5 ${viewMode === "globo" ? "chip-activo" : ""}`}
            >
              <Globe size={16} aria-hidden="true" /> {t.mapa.view_map}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`chip gap-1.5 ${viewMode === "list" ? "chip-activo" : ""}`}
            >
              <List size={16} aria-hidden="true" /> {t.mapa.view_list}
            </button>
          </div>

          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <label htmlFor="mapa-procura" className="sr-only">
              {t.mapa.search_label}
            </label>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
            />
            <input
              id="mapa-procura"
              type="search"
              placeholder={t.mapa.search_placeholder}
              value={procura}
              onChange={(e) => setProcura(e.target.value)}
              className="campo h-10 pl-10 pr-9 text-sm"
            />
            {procura && (
              <button
                type="button"
                onClick={() => setProcura("")}
                aria-label={t.mapa.clear_search}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-strong)]"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* ── Barra de resultados ──────────────────────────────────────
            O único sítio onde o estado do funil se lê por extenso. Antes não
            existia: dava-se por um filtro estar activo pelo que faltava no
            ecrã, e por a pesquisa não ter dado nada por o globo estar vazio.
            Aqui está sempre escrito quantas se vêem, de quantas, e com que
            filtros — cada um removível onde está. */}
        <div
          className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 px-1"
          role="status"
          aria-live="polite"
        >
          <p className="meta">
            <span className="tabular-nums text-[var(--foreground-strong)]">{contagem}</span>
            {temFiltro && (
              <>
                {" "}
                {t.mapa.of}{" "}
                <span className="tabular-nums">{formatarNumero(coudelarias.length, language)}</span>
              </>
            )}
          </p>
          {regiao && (
            <button
              type="button"
              onClick={() => setRegiao(null)}
              className="chip chip-activo gap-1.5"
            >
              {regiao}
              <X size={12} aria-hidden="true" />
              <span className="sr-only">{t.mapa.clear_filters}</span>
            </button>
          )}
          {procura.trim() && (
            <button
              type="button"
              onClick={() => setProcura("")}
              className="chip chip-activo gap-1.5"
            >
              <span className="font-mono">{procura.trim()}</span>
              <X size={12} aria-hidden="true" />
              <span className="sr-only">{t.mapa.clear_search}</span>
            </button>
          )}
          {temFiltro && (
            <button
              type="button"
              onClick={limpar}
              className="btn btn-subtil btn-sm ml-auto rounded-full"
            >
              {t.mapa.clear_filters}
            </button>
          )}
        </div>

        {/* A `key` é o que faz a animação voltar a correr: sem ela o React
            reaproveita o nó e a animação, que já correu, não se repete — a
            troca lia-se como um corte de montagem. */}
        {viewMode === "globo" ? (
          <div key="globo" className="vista-troca grid gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="min-w-0 lg:col-span-8">
              {/* Sem nada para acender, a moldura encolhe. Manter 680px de
                  preto à volta de uma frase de duas linhas é pedir a quem não
                  encontrou nada que role meio ecrã para ler que não encontrou
                  nada. */}
              <div
                className={`relative z-0 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-black ${
                  visiveis.length > 0 ? "h-[460px] sm:h-[560px] lg:h-[680px]" : "h-[260px]"
                }`}
              >
                <div className="cartao-seco__costura z-10" />
                {visiveis.length > 0 ? (
                  <>
                    {/* Antes recebia `searchQuery ? filtradas : todas`, o que
                        deixava a região escolhida sem efeito nenhum sobre o
                        globo: carregava-se em «Alentejo 13» e as vinte e nove
                        continuavam acesas. Agora recebe o que o funil deu. */}
                    <GloboTerra coudelarias={visiveis} aoEscolher={(c) => irParaFicha(c.slug)} />
                    <p className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-6 text-center text-xs text-[var(--foreground-muted)]">
                      {t.mapa.globe_hint}
                    </p>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <SemResultados
                      titulo={t.mapa.empty_title}
                      dica={regiao ? t.mapa.empty_region : t.mapa.empty_hint}
                      termo={procura.trim()}
                      aoLimpar={limpar}
                      limparLabel={t.mapa.clear_filters}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Painel lateral ─────────────────────────────────────────
                Eram duas listas para a mesma coisa e nenhuma falava com a
                outra. Passam a ser duas partes de uma: em cima escolhe-se a
                região (e o globo obedece), em baixo estão as coudelarias que
                a escolha deixou — com link directo à ficha. */}
            <div className="min-w-0 lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <Revelar direccao="up" className="mb-3">
                  <div className="cartao overflow-hidden">
                    <Pilha nivel={regiao === null ? 0 : 1}>
                      {[
                        /* Nível 0 — as regiões */
                        <div key="regioes">
                          <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-4 py-3">
                            <Layers
                              className="shrink-0 text-[var(--foreground-muted)]"
                              size={15}
                              aria-hidden="true"
                            />
                            <h2 className="titulo-seccao min-w-0 flex-1 truncate">
                              {t.mapa.explore_regions}
                            </h2>
                            <span className="meta font-mono tabular-nums">{porTexto.length}</span>
                          </div>
                          <div className="divide-y divide-[var(--border-soft)]">
                            {regioes.map(({ regiao: nome, total }, i) => {
                              /* Uma região que a pesquisa esvaziou fica visível
                                 mas inerte: escondê-la esconderia que existe;
                                 deixá-la clicável prometeria o que não há. */
                              const vazia = total === 0;
                              return (
                                <button
                                  key={nome}
                                  type="button"
                                  disabled={vazia}
                                  onClick={() => setRegiao(nome)}
                                  style={{ "--i": i } as React.CSSProperties}
                                  className="linha-cascata group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--elevate-1)] disabled:pointer-events-none disabled:opacity-40"
                                >
                                  <MapPin
                                    className="shrink-0 text-[var(--foreground-muted)] transition-colors group-hover:text-[var(--foreground-strong)]"
                                    size={14}
                                    aria-hidden="true"
                                  />
                                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
                                    {nome}
                                  </span>
                                  <span className="font-mono text-xs tabular-nums text-[var(--foreground-muted)]">
                                    {total}
                                  </span>
                                  <ChevronRight
                                    size={14}
                                    aria-hidden="true"
                                    className="shrink-0 text-[var(--foreground-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--foreground-strong)]"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>,

                        /* Nível 1 — dentro de uma região */
                        <div key="dentro">
                          <button
                            type="button"
                            onClick={() => setRegiao(null)}
                            className="group flex w-full items-center gap-2 border-b border-[var(--border-soft)] px-4 py-3 text-left transition-colors hover:bg-[var(--elevate-1)]"
                          >
                            <ChevronLeft
                              size={15}
                              aria-hidden="true"
                              className="shrink-0 text-[var(--foreground-muted)] transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-[var(--foreground-strong)]"
                            />
                            <h2 className="titulo-seccao min-w-0 flex-1 truncate">
                              {regiao ?? t.mapa.explore_regions}
                            </h2>
                            <span className="meta font-mono tabular-nums">{visiveis.length}</span>
                          </button>
                          <div className="no-scrollbar divide-y divide-[var(--border-soft)] lg:max-h-[calc(680px-11rem)] lg:overflow-y-auto">
                            {visiveis.map((c, i) => (
                              <div
                                key={c.id}
                                className="linha-cascata"
                                style={{ "--i": i } as React.CSSProperties}
                              >
                                {linhaDaLista(c)}
                              </div>
                            ))}
                          </div>
                          {visiveis.length === 0 && (
                            <p className="meta px-4 py-6 text-center">{t.mapa.empty_region}</p>
                          )}
                        </div>,
                      ]}
                    </Pilha>
                  </div>
                </Revelar>

                <LocalizedLink
                  href="/directorio"
                  className="btn btn-subtil btn-sm w-full rounded-xl"
                >
                  {t.mapa.all_studs}
                </LocalizedLink>
              </div>
            </div>
          </div>
        ) : (
          <div key="lista" className="vista-troca">
            {visiveis.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4">
                {/* Não é `<Revelar>`: esse dispara ao entrar no ecrã e, ao
                    trocar de vista, os cartões já lá estão — nunca disparava.
                    A cascata é do CSS e corre com a vista. */}
                {visiveis.map((c, i) => (
                  <div
                    key={c.id}
                    className="cartao-cascata"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <CartaoGrelha
                      coudelaria={c}
                      capa={capaDoCartao(c.foto_capa, c.slug, capas)}
                      featuredLabel={t.mapa.featured}
                      horsesLabel={t.mapa.horses}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="cartao">
                <SemResultados
                  titulo={t.mapa.empty_title}
                  dica={regiao ? t.mapa.empty_region : t.mapa.empty_hint}
                  termo={procura.trim()}
                  aoLimpar={limpar}
                  limparLabel={t.mapa.clear_filters}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
