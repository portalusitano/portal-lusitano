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
  CloudOff,
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

/* O que a página usa mesmo. `telefone`, `email`, `website` e
   `especialidades` estavam aqui e não eram lidos por ninguém desde que a
   janela de detalhe saiu — iam do servidor para o browser em cada uma das
   vinte e nove linhas para nada. A `especialidades` ainda por cima estava
   declarada `string[]` quando a coluna é `jsonb` e guarda uma cadeia com JSON
   lá dentro; quem lhe pegasse a contar com um vector encontrava uma cadeia. */
export interface Coudelaria {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  localizacao: string;
  regiao: string;
  foto_capa?: string;
  is_pro: boolean;
  destaque: boolean;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  num_cavalos?: number;
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

/* ── A base não respondeu ─────────────────────────────────────────────────
   Uma lista vazia porque a pesquisa não deu nada e uma lista vazia porque a
   base não respondeu leem-se igual no ecrã, e não são a mesma coisa: da
   primeira a pessoa sai a escrever outra palavra, da segunda sai convencida
   de que o mapa está vazio. Isto diz a segunda, e diz onde o mapa estaria —
   com a saída que continua a funcionar, o directório, e a maneira de tentar
   outra vez. */
const NaoCarregou = memo(function NaoCarregou({
  titulo,
  dica,
  tentarLabel,
  directorioLabel,
}: {
  titulo: string;
  dica: string;
  tentarLabel: string;
  directorioLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-12 text-center">
      <CloudOff size={22} className="text-[var(--foreground-muted)]" aria-hidden="true" />
      <p className="titulo-seccao">{titulo}</p>
      <p className="meta max-w-[42ch]">{dica}</p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {/* Recarregar a página é o que resolve isto, e é por isso que o botão
            existe em vez de um `reset()` de fronteira de erro: a falha está no
            servidor, não numa árvore de React que se possa voltar a montar. */}
        <a href="/mapa" className="btn btn-secundario btn-sm">
          {tentarLabel}
        </a>
        <LocalizedLink href="/directorio" className="btn btn-subtil btn-sm">
          {directorioLabel}
        </LocalizedLink>
      </div>
    </div>
  );
});

interface MapaClientProps {
  coudelarias: Coudelaria[];
  /** slug → caminho da capa que existe em disco, escolhido no servidor. */
  capas?: Record<string, string>;
  /** Filtros vindos da query, já lidos e validados no servidor. */
  inicial?: EstadoDoMapa;
  /** A base não respondeu. Lista vazia, mas por outra razão. */
  falhou?: boolean;
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
 *
 * ── O foco vai com quem entra ────────────────────────────────────────────
 * Medido antes: escolher uma região pelo teclado deixava o foco no `<body>`
 * — o botão em que se acabara de carregar passava a `inert` no mesmo quadro,
 * e o browser não tem para onde o levar. A tabulação seguinte recomeçava em
 * «Saltar para o conteúdo principal», ou seja, quem pediu o Alentejo tinha de
 * atravessar outra vez o cabeçalho inteiro e as dezassete paragens do globo
 * para chegar à lista que pediu. Acontecia nos dois sentidos.
 *
 * Agora o nível que entra diz onde é que o foco assenta (`data-foco`), e a
 * pilha leva-o lá. Só depois da primeira pintura: quem chega por um link com
 * `?regiao=Alentejo` não pode ver a página saltar sozinha para o painel.
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
  const montada = useRef(false);

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

  useEffect(() => {
    if (!montada.current) {
      montada.current = true;
      return;
    }
    const activo = niveis.current[nivel];
    if (!activo || activo.contains(document.activeElement)) return;
    // Quem manda é o `data-foco` do nível — a linha da região de onde se veio.
    // Sem ela, a primeira coisa focável serve: no nível de dentro é o botão de
    // voltar, que é exactamente onde o foco deve assentar.
    const destino =
      activo.querySelector<HTMLElement>("[data-foco]") ??
      activo.querySelector<HTMLElement>("button:not([disabled]), a[href]");
    // `preventScroll`: o painel é `sticky` e já está no ecrã; deixar o browser
    // rolar até ele arrancava a página de onde a pessoa a tinha deixado.
    destino?.focus({ preventScroll: true });
  }, [nivel]);

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

export default function MapaClient({
  coudelarias,
  capas = {},
  inicial,
  falhou = false,
}: MapaClientProps) {
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

  /* A região de onde se veio, para o foco voltar à linha certa quando se sai
     do nível de dentro. É uma referência e não estado: só é lida no render
     seguinte ao da saída, e guardá-la em estado obrigava a um render a mais
     por cada região escolhida. */
  const regiaoAnterior = useRef<string | null>(partida.regiao);
  const entrarNaRegiao = useCallback((nome: string) => {
    regiaoAnterior.current = nome;
    setRegiao(nome);
  }, []);

  /* ── O nível de dentro não existe antes de se entrar nele ──────────────
     Medido antes: chegar ao mapa pedia 29 imagens, 24 delas capas de
     coudelaria. Nenhuma se via. O nível de dentro da pilha desenhava sempre
     as vinte e nove linhas — com as vinte e cinco fotografias — mesmo com o
     painel no nível das regiões: está `inert` e a `opacity: 0`, mas ocupa a
     caixa toda, e um `<img loading="lazy">` dentro da janela é pedido na
     mesma. Vinte e quatro transferências para pixéis que ninguém vê.

     Agora as linhas só montam quando há uma região. `regiaoAnterior` é o que
     as segura enquanto o nível sai de cena: sem isso, sair de uma região
     esvaziava o painel a meio da animação de saída, e o que se via era a
     lista a desaparecer antes de o nível deslizar. Não é um temporizador de
     320ms a copiar o `--d-drill` para dentro do JavaScript: é o conteúdo
     antigo a ficar até deixar de ser preciso. */
  const regiaoDoPainel = regiao ?? regiaoAnterior.current;
  const listaDoPainel = useMemo(
    () => (regiaoDoPainel ? filtrar(coudelarias, { procura, regiao: regiaoDoPainel }) : []),
    [coudelarias, procura, regiaoDoPainel]
  );

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

  /* O que se põe onde estariam as coudelarias quando não há nenhuma. São dois
     ecrãs, não um: a pesquisa que não encontrou nada tem saída pelo botão de
     limpar; a base que não respondeu não tem saída nenhuma dentro da página e
     precisa de dizer que a culpa não é de quem procurou. */
  const vazio = falhou ? (
    <NaoCarregou
      titulo={t.mapa.offline_title}
      dica={t.mapa.offline_hint}
      tentarLabel={t.mapa.offline_retry}
      directorioLabel={t.mapa.all_studs}
    />
  ) : (
    <SemResultados
      titulo={t.mapa.empty_title}
      dica={regiao ? t.mapa.empty_region : t.mapa.empty_hint}
      termo={procura.trim()}
      aoLimpar={limpar}
      limparLabel={t.mapa.clear_filters}
    />
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
      <section className="relative pb-4 pt-16 sm:pb-4 sm:pt-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          {/* A palavra acesa vem do dicionário (`title_highlight`). Estava
              escrita à mão aqui dentro, num `split("Portugal")` que só
              funcionava enquanto as três traduções tivessem a palavra. */}
          <h1 className="mb-3 text-2xl text-[var(--foreground)] sm:mb-4 sm:text-4xl md:text-5xl">
            {titulo.antes}
            {titulo.meio && <span className="text-[var(--foreground-strong)]">{titulo.meio}</span>}
            {titulo.depois}
          </h1>
          <p className="mx-auto mb-6 hidden max-w-xl text-[var(--foreground-secondary)] sm:mb-6 sm:block">
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
            O único sítio onde o estado do funil se lê por extenso: quantas se
            vêem, de quantas, e com que filtros — cada um removível onde está.

            O `role="status"` estava na barra inteira, botões incluídos. Medido
            com a região do Alentejo aberta, o que o leitor de ecrã tinha para
            anunciar a cada tecla escrita era «12 results of 29AlentejoClearClear»
            — a contagem, o nome do chip, e as duas etiquetas escondidas dos
            botões de limpar. A região viva passa a ser só a frase que conta; os
            botões ficam de fora, onde sempre foram controlos e não estado.

            E a barra só aparece quando tem alguma coisa a dizer. Sem filtros,
            «29 resultados» era o mesmo 29 que o painel ao lado já escreve na
            sua cabeça — o mesmo número duas vezes no mesmo ecrã, a custar uma
            linha em cima do mapa. Na vista de lista não há painel, por isso aí
            fica sempre — e mesmo escondida continua no documento, porque uma
            região viva que só nasce no instante da mudança é uma região viva
            que os leitores de ecrã podem não chegar a anunciar. */}
        {/* Com a base em baixo não há funil nenhum a relatar: «0 resultados»
            é verdade e não ajuda, e dito por um leitor de ecrã é a mesma
            confusão que o ecrã já não faz. */}
        <div
          className={
            falhou
              ? "hidden"
              : temFiltro || viewMode === "list"
                ? "mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 px-1"
                : "sr-only"
          }
        >
          <p className="meta" role="status" aria-live="polite">
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
          /* A altura da lona vive numa variável e não em três números
             repetidos: o painel ao lado precisa da mesma medida para saber até
             onde pode crescer, e tinha lá um `680px` escrito à mão que ninguém
             obrigava a acompanhar o outro. */
          <div
            key="globo"
            className="vista-troca grid gap-4 [--altura-globo:460px] sm:[--altura-globo:560px] lg:grid-cols-12 lg:gap-6 lg:[--altura-globo:max(320px,min(680px,calc(100dvh-22rem)))]"
          >
            <div className="min-w-0 lg:col-span-8">
              {/* ── O atalho para o painel ─────────────────────────────────
                  Medido com o teclado, a partir da barra de endereço: mais de
                  34 tabulações em desktop e 28 em telemóvel até chegar à
                  primeira região. Entre a caixa de pesquisa e o painel estão
                  os dois botões de aproximação do globo e as dezassete
                  paragens dos nomes e das manchas — que são conteúdo, e não se
                  tiram. Quem quer filtrar por região não pode ter de os
                  atravessar todos.

                  A resposta é a que o site já usa no topo: uma ligação
                  escondida que só aparece quando recebe o foco. Não ocupa um
                  pixel a quem tem rato, custa uma paragem a quem não tem, e
                  leva o foco directamente ao painel. */}
              <a
                href="#mapa-regioes"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10001] focus:bg-[var(--foreground-strong)] focus:px-6 focus:py-3 focus:text-sm focus:font-bold focus:uppercase focus:tracking-wider focus:text-black"
              >
                {t.mapa.skip_to_regions}
              </a>
              {/* Sem nada para acender, a moldura encolhe. Manter 680px de
                  preto à volta de uma frase de duas linhas é pedir a quem não
                  encontrou nada que role meio ecrã para ler que não encontrou
                  nada. */}
              <div
                className={`relative z-0 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-black ${
                  visiveis.length > 0 ? "h-[var(--altura-globo)]" : "h-[260px]"
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
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">{vazio}</div>
                )}
              </div>
              {/* ── A dica sai de cima do terreno ──────────────────────────
                  Estava dentro da lona, encostada ao fundo. Duas coisas
                  medidas: em desktop a 1400×950 ficava abaixo da dobra, ou
                  seja, a única frase que explica como se usa o globo só se
                  lia a quem rolasse; e em telemóvel escrevia-se por cima do
                  Algarve, a cinzento ténue sobre fotografia de terreno, que é
                  o pior sítio possível para 12 pixéis de texto. Cá fora
                  assenta no preto da página, lê-se sempre, e devolve à lona os
                  pixéis que tapava. */}
              {visiveis.length > 0 && (
                <p className="meta mt-2 px-1 text-center">{t.mapa.globe_hint}</p>
              )}
            </div>

            {/* ── Painel lateral ─────────────────────────────────────────
                Eram duas listas para a mesma coisa e nenhuma falava com a
                outra. Passam a ser duas partes de uma: em cima escolhe-se a
                região (e o globo obedece), em baixo estão as coudelarias que
                a escolha deixou — com link directo à ficha. */}
            <div className="min-w-0 lg:col-span-4">
              {/* `tabIndex={-1}`: sem isto o salto muda o endereço e deixa o
                  foco onde estava, e a tabulação seguinte voltava ao globo. */}
              <div id="mapa-regioes" tabIndex={-1} className="lg:sticky lg:top-24">
                {/* Com a base em baixo o painel era uma caixa oca: a cabeça a
                    dizer «Explorar Regiões 0» e nada por baixo dela. Um
                    instrumento que não tem nada para operar não se mostra
                    desligado, tira-se — a falha já está escrita ao lado, e o
                    que fica é a saída que continua a funcionar. */}
                <Revelar direccao="up" className={falhou ? "hidden" : "mb-3"}>
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
                                  onClick={() => entrarNaRegiao(nome)}
                                  data-foco={
                                    nome === regiaoAnterior.current && !vazia ? "" : undefined
                                  }
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
                          {regiaoDoPainel && (
                            <>
                              {/* O `<h2>` embrulha o botão em vez de estar lá
                                  dentro: um título dentro de um controlo é uma
                                  paragem da navegação por títulos que afinal é
                                  um botão. Assim o leitor de ecrã anuncia
                                  «título nível 2, Alentejo, botão», que é o que
                                  isto é. */}
                              <h2 className="titulo-seccao">
                                <button
                                  type="button"
                                  onClick={() => setRegiao(null)}
                                  aria-label={`${t.mapa.region_clear}: ${regiaoDoPainel}`}
                                  className="group flex w-full items-center gap-2 border-b border-[var(--border-soft)] px-4 py-3 text-left transition-colors hover:bg-[var(--elevate-1)]"
                                >
                                  <ChevronLeft
                                    size={15}
                                    aria-hidden="true"
                                    className="shrink-0 text-[var(--foreground-muted)] transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-[var(--foreground-strong)]"
                                  />
                                  <span className="min-w-0 flex-1 truncate">{regiaoDoPainel}</span>
                                  <span className="meta font-mono tabular-nums">
                                    {listaDoPainel.length}
                                  </span>
                                </button>
                              </h2>
                              <div className="no-scrollbar divide-y divide-[var(--border-soft)] lg:max-h-[calc(var(--altura-globo)-11rem)] lg:overflow-y-auto">
                                {listaDoPainel.map((c, i) => (
                                  <div
                                    key={c.id}
                                    className="linha-cascata"
                                    style={{ "--i": i } as React.CSSProperties}
                                  >
                                    {linhaDaLista(c)}
                                  </div>
                                ))}
                              </div>
                              {listaDoPainel.length === 0 && (
                                <p className="meta px-4 py-6 text-center">{t.mapa.empty_region}</p>
                              )}
                            </>
                          )}
                        </div>,
                      ]}
                    </Pilha>
                  </div>
                </Revelar>

                <LocalizedLink
                  href="/directorio"
                  className={falhou ? "hidden" : "btn btn-subtil btn-sm w-full rounded-xl"}
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
              <div className="cartao">{vazio}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
