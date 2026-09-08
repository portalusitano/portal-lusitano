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
  ChevronUp,
  X,
  List,
  Search,
  Layers,
  SearchX,
  CloudOff,
} from "lucide-react";
import LocalizedLink, { localizeHref } from "@/components/LocalizedLink";
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

/**
 * Um distintivo que está em quase todos não distingue nada — e por isso não
 * se escreve.
 *
 * Isto já tinha sido meio corrigido: o «Destaque» era `.selo-destaque`, o
 * dourado, e passou a `.selo-forte`, branco, porque vinte das vinte e nove
 * coudelarias o traziam e sessenta e nove por cento de uma grelha vestida com
 * o acento é o acento a deixar de assinalar seja o que for.
 *
 * **Mudar a cor não chegou, e não podia chegar.** O problema nunca foi o
 * dourado: era um rótulo que quase toda a gente tem. Um branco em vinte e nove
 * cartões de vinte e nove continua a ocupar o canto superior esquerdo de cada
 * fotografia — o sítio de mais valor do cartão — para dizer uma coisa que não
 * separa nenhum deles dos outros. O dono do produto viu-o em produção e disse
 * exactamente isso: «está tudo em destaque e não pode estar».
 *
 * A regra passa a ser sobre o **conjunto que está no ecrã**, e não sobre a
 * linha: o distintivo escreve-se enquanto for de uma minoria — **até um quarto
 * do que se vê** — e cala-se acima disso. Um quarto e não metade porque o que
 * está em metade de uma grelha não é um destaque, é um estado por omissão com
 * outro nome.
 *
 * É deliberadamente uma decisão de apresentação e não de dados: a coluna
 * `destaque` continua a valer o que vale, a ordenação continua a usá-la, e no
 * dia em que ela voltar a marcar poucos o distintivo reaparece sozinho. Também
 * se recalcula com o filtro — filtrar por uma região onde só uma é destaque faz
 * o distintivo voltar, e está certo que volte: ali ele distingue.
 */
function destaqueDistingue(coudelarias: readonly { destaque: boolean }[]): boolean {
  const comDestaque = coudelarias.reduce((n, c) => n + (c.destaque ? 1 : 0), 0);
  return comDestaque > 0 && comDestaque * 4 <= coudelarias.length;
}

/* ── Cartão da grelha ────────────────────────────────────────────────────
   Duas mudanças, e as duas por regras que já existiam.

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
  mostrarDestaque,
}: {
  coudelaria: Coudelaria;
  capa: string | null;
  featuredLabel: string;
  horsesLabel: string;
  /** Ver `destaqueDistingue`: quem decide é o conjunto, não a linha. */
  mostrarDestaque: boolean;
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
          {mostrarDestaque && coudelaria.destaque && (
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
            {mostrarDestaque && coudelaria.destaque && (
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
    <div className="cartao-seco mapa-falha">
      <span aria-hidden="true" className="cartao-seco__costura" />
      <div className="relative flex flex-col items-center gap-3">
        <span className="mapa-falha__marca">
          <SearchX size={20} aria-hidden="true" />
        </span>
        <p className="titulo-seccao">{titulo}</p>
        <p className="meta max-w-[38ch]">
          {termo && (
            <>
              <span className="font-mono text-[var(--foreground-secondary)]">“{termo}”</span> —{" "}
            </>
          )}
          {dica}
        </p>
        {/* Sair daqui é uma coisa só, e por isso é o botão por omissão — que
            no sistema é branco. Era de contorno, do mesmo peso do link ao
            lado: dois caminhos iguais num ecrã que só tem um. */}
        <button type="button" onClick={aoLimpar} className="btn btn-primario btn-sm mt-1">
          {limparLabel}
        </button>
      </div>
      {/* Sem o `.cartao-seco__esbatido`: esse dissolve os 40% de baixo do
          cartão no preto, e aqui o que está em baixo é a saída. O esbatido é
          para quando o que desaparece é adorno. */}
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
    <div className="cartao-seco mapa-falha">
      <span aria-hidden="true" className="cartao-seco__costura" />
      <div className="relative flex flex-col items-center gap-3">
        <span className="mapa-falha__marca">
          <CloudOff size={20} aria-hidden="true" />
        </span>
        <p className="titulo-seccao">{titulo}</p>
        <p className="meta max-w-[42ch]">{dica}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {/* O botão por omissão — branco — é o directório, e não é por
              acaso: é o que a frase acima promete que continua a funcionar, e
              é o único dos dois que se sabe que responde. Tentar outra vez
              fica ao lado, de contorno. Estavam os dois em segundo plano, um
              de contorno e outro subtil, num ecrã que só tem estas duas
              saídas. */}
          <LocalizedLink href="/directorio" className="btn btn-primario btn-sm">
            {directorioLabel}
          </LocalizedLink>
          {/* Recarregar a página é o que resolve isto, e é por isso que o botão
              existe em vez de um `reset()` de fronteira de erro: a falha está no
              servidor, não numa árvore de React que se possa voltar a montar. */}
          <a href="/mapa" className="btn btn-secundario btn-sm">
            {tentarLabel}
          </a>
        </div>
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

  /* ── O painel das regiões nasce fechado ────────────────────────────────
     Aberto por omissão, ele é — medido — trezentos pixéis de estorvo no
     fundo da lona que ninguém pediu, e é exactamente a banda onde o globo
     escreve os nomes do sul. Fechado é um botão de quarenta e quatro: o
     mapa fica com o ecrã e quem quer filtrar continua a ter o instrumento à
     mão, com o nome escrito por extenso. */
  const [regioesAbertas, setRegioesAbertas] = useState(false);
  const gatilhoRegioes = useRef<HTMLButtonElement>(null);
  const campoProcura = useRef<HTMLInputElement>(null);
  const lona = useRef<HTMLDivElement>(null);

  /* ── A dica sai quando deixa de ser dica ────────────────────────────────
     «Arraste para rodar · toque num nome…» são duas linhas de texto em
     telemóvel, e essas duas linhas são quase metade do estorvo de baixo —
     medido, o rodapé fechado tem 85,6px e a frase leva ~40 deles. É a faixa
     onde o globo escreve os nomes do sul.

     Enquanto ninguém mexeu no globo ela fica: é para quem ainda não sabe.
     Ao primeiro toque, arrasto ou tecla dentro da lona sai — e não volta.
     Quem a esbate e a tira da caixa é o CSS, com `display` a transitar em
     `allow-discrete`; aqui só se vira um interruptor. */
  const [dicaIda, setDicaIda] = useState(false);

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
  /* Recalcula-se com o filtro de propósito — ver `destaqueDistingue`. */
  const destaqueVale = useMemo(() => destaqueDistingue(visiveis), [visiveis]);
  const regioes = useMemo(() => contarPorRegiao(coudelarias, porTexto), [coudelarias, porTexto]);
  /* A régua das barras de quota. `contarPorRegiao` devolve da maior para a
     menor, por isso a maior é a primeira — e é ela que vale 100%. */
  const maiorRegiao = regioes[0]?.total ?? 0;

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

  /* ── Abrir o painel tem de levar o foco lá para dentro ─────────────────
     O painel abre **para cima** do gatilho, e por isso está antes dele no
     documento. Sem isto, a rota de teclado que a página desenhou não tem
     saída: medido a 1400×950, do atalho «Saltar o globo e ir às regiões»
     chega-se ao gatilho, carrega-se, o painel abre — e a tabulação seguinte
     sai do conteúdo e aterra no rodapé do site, em «Encontrar cavalo».
     Sessenta tabulações para a frente não encontram uma única região: a
     ordem dá a volta à página e volta aos nomes do globo. O único caminho
     para dentro era `Shift+Tab` duas vezes, que entra pelo fim da lista e é
     o gesto de recuar a servir de gesto de entrar.

     Quem abriu o painel abriu-o para escolher, por isso o foco vai com ele —
     é a mesma regra que a `Pilha` já aplica quando se muda de nível, e a
     mesma que faz sentido do comentário do Escape aqui abaixo, que já falava
     do foco «que está lá dentro». Com rato não se vê nada: o anel é
     `:focus-visible`. Fechar devolve-o ao gatilho, que é de onde saiu.

     `preventScroll`: o painel é fixo e já está no ecrã; deixar o browser
     rolar até ele arranca a página de onde a pessoa a deixou. */
  const painelRegioes = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!regioesAbertas) return;
    const nivel = painelRegioes.current?.querySelector<HTMLElement>(
      '.pilha__nivel[data-fora="nao"]'
    );
    // O `data-foco` é a região de onde se veio, quando se está a voltar a
    // ela; senão serve a primeira coisa que se possa focar — no nível de
    // dentro é o botão de voltar, que é onde o foco deve assentar.
    const destino =
      nivel?.querySelector<HTMLElement>("[data-foco]") ??
      nivel?.querySelector<HTMLElement>("button:not([disabled]), a[href]");
    destino?.focus({ preventScroll: true });
  }, [regioesAbertas]);

  /* ── Fechar o painel é o que a tecla de escape faz em todo o lado ───────
     O painel abre por cima do mapa. Sem esta tecla, quem o abriu tem de o ir
     fechar ao mesmo botão — e o foco, que está lá dentro, volta ao princípio
     da página. O foco volta ao gatilho, que é de onde saiu. */
  useEffect(() => {
    if (!regioesAbertas) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setRegioesAbertas(false);
      gatilhoRegioes.current?.focus();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [regioesAbertas]);

  useEffect(() => {
    if (dicaIda) return;
    const el = lona.current;
    if (!el) return;
    const mexeu = () => setDicaIda(true);
    /* Passivos, os dois: um ouvinte não passivo em cima da lona é
       exactamente o que o CLAUDE.md conta a propósito do Lenis — proíbe o
       browser de deslocar a página no compositor. E a roda fica de fora de
       propósito: com o palco a ocupar a janela, rodá-la desloca a página,
       não mexe no globo. */
    el.addEventListener("pointerdown", mexeu, { once: true, passive: true });
    el.addEventListener("keydown", mexeu, { once: true, passive: true });
    return () => {
      el.removeEventListener("pointerdown", mexeu);
      el.removeEventListener("keydown", mexeu);
    };
  }, [dicaIda, viewMode]);

  /* ── A barra é o comando principal, e ganha a tecla que o diz ───────────
     Numa página de vinte e nove coudelarias, escrever o nome é o caminho
     mais curto para qualquer uma delas — e era o único comando sem nada que
     o assinalasse. A barra `/` é o atalho que toda a gente já conhece de
     outras listas; não se rouba a tecla a quem está a escrever noutro sítio. */
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)))
        return;
      e.preventDefault();
      campoProcura.current?.focus();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  /* ── Fora do ecrã não há nada para comandar ─────────────────────────────
     Os comandos são `fixed` porque têm de ser: é assim que o globo os vê
     (ver o comentário do `.mapa-palco` no `globals.css`). Mas o documento
     não acaba na lona — por baixo dela está o rodapé do site, e quem lá
     chega por tabulação ou pela barra de deslocamento levava os comandos do
     mapa a flutuar por cima dele. Quem avisa é o `IntersectionObserver`, que
     dispara quando o palco sai do ecrã em vez de perguntar a cada
     deslocamento se já saiu.

     ── Só que «sair do ecrã» nunca acontecia ────────────────────────────
     Era um observador só, com `threshold: 0`, sobre um palco que tem
     exactamente a altura da janela. Um alvo dessa altura só deixa de
     intersectar a janela quando a página desce mais do que uma janela
     inteira — e o que há por baixo do mapa é o rodapé do site, que é mais
     baixo do que isso. Resultado, medido com a página descida até ao fim:
     a 1280×900 o gatilho «Explorar Regiões» ficava pousado em cima do
     «© 2026 Portal Lusitano»; a 390×844 ficavam **as duas** peças em cima
     do rodapé — a pílula de comandos sobre a coluna «Navegação» e o
     gatilho sobre o «TikTok». `data-fora` por pôr, em ambos os casos.

     Cada peça passa a ter o seu sinal, e o sinal é o mesmo para as duas:
     **sai quem deixa de ter o mapa por baixo.** É um `rootMargin` que
     encolhe a janela do observador até à linha onde essa peça assenta, e a
     medida vem da própria peça — não é um número escolhido. O
     `ResizeObserver` volta a armá-lo quando a peça muda de altura (o painel
     abre, a dica sai); nada disto lê geometria a cada deslocamento.

     Medido depois: a 1280×900 a pílula fica (o mapa ainda está por baixo
     dela) e o rodapé sai; a 390×844 saem as duas. */
  const palco = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  const rodape = useRef<HTMLDivElement>(null);
  const [barraFora, setBarraFora] = useState(false);
  const [rodapeFora, setRodapeFora] = useState(false);
  useEffect(() => {
    setBarraFora(false);
    setRodapeFora(false);
    const alvo = palco.current;
    if (!alvo) return;
    const pecas: { no: HTMLDivElement | null; diz: (fora: boolean) => void }[] = [
      { no: barra.current, diz: setBarraFora },
      { no: rodape.current, diz: setRodapeFora },
    ];
    const observadores: IntersectionObserver[] = [];
    const armar = () => {
      for (const o of observadores.splice(0)) o.disconnect();
      for (const { no, diz } of pecas) {
        if (!no) {
          diz(false);
          continue;
        }
        /* A linha onde esta peça assenta, contada do topo da janela — e a
           peça é `fixed`, por isso essa linha não muda com o deslocamento.
           Encolher por aí o topo da janela do observador é dizer-lhe:
           «avisa-me quando o palco deixar de chegar aqui abaixo». */
        const topo = Math.max(0, Math.round(no.getBoundingClientRect().top));
        const observador = new IntersectionObserver(([e]) => diz(!e.isIntersecting), {
          rootMargin: `-${topo}px 0px 0px 0px`,
          threshold: 0,
        });
        observador.observe(alvo);
        observadores.push(observador);
      }
    };
    armar();
    /* As peças mudam de altura sozinhas — o painel abre, a dica sai, os
       chips de filtro nascem —, e a janela muda com a rotação do telefone. */
    const medidor = new ResizeObserver(armar);
    for (const { no } of pecas) if (no) medidor.observe(no);
    window.addEventListener("resize", armar, { passive: true });
    return () => {
      for (const o of observadores) o.disconnect();
      medidor.disconnect();
      window.removeEventListener("resize", armar);
    };
  }, [viewMode, falhou]);

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

  const noMapa = viewMode === "globo";

  /* ── Os comandos são os mesmos nas duas vistas ──────────────────────────
     O que muda é a moldura: no mapa flutuam numa pílula fixa por cima da
     lona, na lista assentam no topo da página. Escrevê-los duas vezes era
     abrir a porta a duas caixas de pesquisa com regras diferentes. */
  const comandos = (
    <>
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

      {/* Na pílula, uma hairline entre o modo de vista e a pesquisa: são duas
          coisas de natureza diferente — uma escolhe como se vê, a outra
          escolhe o quê — e encostadas sem nada entre elas leem-se como uma
          fila de três botões iguais. Na lista os dois blocos já estão
          separados pelo espaço da página. */}
      {noMapa && <div aria-hidden="true" className="mapa-pilula__risco" />}

      <div
        className={
          /* Na pílula a caixa tem largura própria (`.mapa-procura`): `.campo`
             é `width: 100%` e sem uma medida encolhia até o marcador
             «Pesquisar…» se perder — e uma largura fixa é também o que
             impede a pílula de mudar de tamanho com o que se escreve. Na
             lista cresce com a página; as utilidades do Tailwind estão numa
             camada posterior e ganham à classe. */
          noMapa ? "mapa-procura" : "mapa-procura relative min-w-0 flex-1 sm:max-w-sm"
        }
      >
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
          ref={campoProcura}
          type="search"
          placeholder={t.mapa.search_placeholder}
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
          aria-keyshortcuts="/"
          className="campo h-10 pl-10 pr-9 text-sm"
        />
        {procura ? (
          <button
            type="button"
            onClick={() => setProcura("")}
            aria-label={t.mapa.clear_search}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-strong)]"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          /* A tecla que salta o foco para aqui, escrita onde ela serve. É
             decorativa para quem ouve — o `aria-keyshortcuts` do campo é que
             o anuncia — e some-se em ecrãs de toque, onde teclado não há. */
          <kbd aria-hidden="true" className="mapa-tecla">
            /
          </kbd>
        )}
      </div>
    </>
  );

  /* ── O estado do funil ──────────────────────────────────────────────────
     O único sítio onde se lê por extenso quantas se vêem, de quantas, e com
     que filtros — cada um removível onde está.

     O `role="status"` está só na frase que conta. Estava na barra inteira,
     botões incluídos, e o que o leitor de ecrã tinha para anunciar a cada
     tecla escrita era «12 results of 29AlentejoClearClear».

     E a barra só aparece quando tem alguma coisa a dizer. Sem filtros, «29
     resultados» é o mesmo 29 que o botão das regiões já escreve — o mesmo
     número duas vezes no mesmo ecrã. Isso passou a valer também na lista, que
     ganhou a sua fila de regiões com «Todas · 29» à cabeça: sem filtros, a
     linha «29 resultados» era o terceiro sítio a dizer 29. Mesmo escondida
     continua no documento, porque uma região viva que só nasce no instante da
     mudança é uma região viva que os leitores de ecrã podem não chegar a
     anunciar. */
  const barraEstado = (
    <div
      className={
        falhou
          ? "hidden"
          : !temFiltro
            ? "sr-only"
            : /* No mapa é uma fila que flutua por si, por baixo da pílula; na
                 lista assenta no documento. Estava dentro da pílula, e era
                 isso que fazia a pílula mudar de largura com cada tecla. */
              noMapa
              ? "mapa-estado"
              : "flex flex-wrap items-center gap-x-3 gap-y-2 px-1"
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
      {/* Na lista a região já está numa pastilha branca uma linha acima, na
          fila dos filtros, e ao lado dela está o «Todas» que a tira: repeti-la
          aqui punha duas pastilhas iguais a dizer «Alentejo» a doze pixéis uma
          da outra. No mapa não há fila nenhuma, e é aqui que ela se remove. */}
      {regiao && noMapa && (
        <button type="button" onClick={() => setRegiao(null)} className="chip chip-activo gap-1.5">
          {regiao}
          <X size={12} aria-hidden="true" />
          <span className="sr-only">{t.mapa.clear_filters}</span>
        </button>
      )}
      {procura.trim() && (
        <button type="button" onClick={() => setProcura("")} className="chip chip-activo gap-1.5">
          <span className="font-mono">{procura.trim()}</span>
          <X size={12} aria-hidden="true" />
          <span className="sr-only">{t.mapa.clear_search}</span>
        </button>
      )}
      {temFiltro && (
        <button type="button" onClick={limpar} className="btn btn-subtil btn-sm rounded-full">
          {t.mapa.clear_filters}
        </button>
      )}
    </div>
  );

  /* ── A pilha das regiões ────────────────────────────────────────────────
     O nível de cima perdeu o cabeçalho: quem diz «Explorar Regiões» e conta
     quantas são é o gatilho que abre o painel, e dois cabeçalhos empilhados
     a dizer o mesmo custavam quarenta e oito pixéis de estorvo por cima da
     lona sem darem uma linha de conteúdo. */
  const pilhaDasRegioes = (
    <Pilha nivel={regiao === null ? 0 : 1}>
      {[
        /* Nível 0 — as regiões */
        <div
          key="regioes"
          className="mapa-regioes__lista mapa-regioes__lista--regioes divide-y divide-[var(--border-soft)]"
        >
          {regioes.map(({ regiao: nome, total }, i) => {
            /* Uma região que a pesquisa esvaziou fica visível mas inerte:
               escondê-la esconderia que existe; deixá-la clicável prometeria
               o que não há. */
            const vazia = total === 0;
            return (
              <button
                key={nome}
                type="button"
                disabled={vazia}
                onClick={() => entrarNaRegiao(nome)}
                data-foco={nome === regiaoAnterior.current && !vazia ? "" : undefined}
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
                {/* Quanto pesa esta região no que está à vista. Cinco nomes e
                    cinco números não se comparam sem se lerem os cinco: para
                    saber que o Ribatejo é quase metade do país e o Minho tem
                    uma, era preciso fazer a conta de cabeça. A barra fá-la
                    pelo olho, e o dado é o mesmo que o algarismo ao lado. */}
                <span aria-hidden="true" className="mapa-quota">
                  <span
                    className="mapa-quota__cheio"
                    style={{ width: `${maiorRegiao > 0 ? (total / maiorRegiao) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-5 text-right font-mono text-xs tabular-nums text-[var(--foreground-muted)]">
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
        </div>,

        /* Nível 1 — dentro de uma região */
        <div key="dentro">
          {regiaoDoPainel && (
            <>
              {/* O `<h2>` embrulha o botão em vez de estar lá dentro: um
                  título dentro de um controlo é uma paragem da navegação por
                  títulos que afinal é um botão. */}
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
                  {/* Sem o algarismo: o gatilho logo abaixo já diz «Alentejo
                      · 7» e a fila de estado lá em cima diz «7 de 29». Três
                      cópias do mesmo número num painel de vinte e duas rem
                      não são três confirmações, são ruído. Aqui o que importa
                      é a seta: isto é o caminho de volta. */}
                  <span className="min-w-0 flex-1 truncate">{regiaoDoPainel}</span>
                </button>
              </h2>
              {/* A lista rola, e a barra do site tem 8px e está desenhada nos
                  tokens: mostrá-la diz que há mais e diz quanto. */}
              <div className="mapa-regioes__lista divide-y divide-[var(--border-soft)]">
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
  );

  if (noMapa) {
    return (
      /* Uma `div`, e não um `<main>`: o `app/layout.tsx` já embrulha tudo num
         `<main id="main-content">`, e um dentro do outro dava dois marcos
         «principal» ao leitor de ecrã. */
      <div key="globo" ref={palco} className="mapa-palco">
        {/* O título da página continua a existir para quem não vê o mapa. Não
            se escreve por cima dele: um herói com um `<h1>` e um subtítulo
            eram, medidas, vinte e duas rem de cromado à frente do único
            conteúdo que esta página tem. O mapa é o título. */}
        <h1 className="sr-only">
          {titulo.antes}
          {titulo.meio}
          {titulo.depois}
        </h1>
        <p className="sr-only">{t.mapa.subtitle}</p>

        {/* ── O atalho para o painel ─────────────────────────────────────
            Medido com o teclado: entre a caixa de pesquisa e as regiões estão
            os dois botões de aproximação do globo e as dezassete paragens dos
            nomes e das manchas — que são conteúdo, e não se tiram. Quem quer
            filtrar por região não pode ter de os atravessar todos. Com a base
            em baixo o painel não existe, e um atalho para um sítio vazio é
            uma promessa falha: sai do caminho também. */}
        <a
          href="#mapa-regioes"
          hidden={falhou}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10001] focus:bg-[var(--foreground-strong)] focus:px-6 focus:py-3 focus:text-sm focus:font-bold focus:uppercase focus:tracking-wider focus:text-black"
        >
          {t.mapa.skip_to_regions}
        </a>

        {/* Com a base em baixo não há nada para comandar: uma caixa de
            pesquisa que não tem o que pesquisar e um interruptor entre duas
            vistas que estão as duas vazias são dois comandos a fingir que
            funcionam. A fila sai; o que fica no ecrã é a falha e as saídas
            dela. */}
        {!falhou && (
          <div ref={barra} className="mapa-barra" data-fora={barraFora ? "" : undefined}>
            <div className="mapa-pilula">{comandos}</div>
            {barraEstado}
          </div>
        )}

        <div ref={lona} className="mapa-lona vista-troca">
          {visiveis.length > 0 ? (
            /* Antes recebia `searchQuery ? filtradas : todas`, o que deixava a
               região escolhida sem efeito nenhum sobre o globo. Agora recebe o
               que o funil deu. */
            <GloboTerra coudelarias={visiveis} aoEscolher={(c) => irParaFicha(c.slug)} />
          ) : (
            <div className="mapa-vazio">{vazio}</div>
          )}
        </div>

        <div ref={rodape} className="mapa-rodape" data-fora={rodapeFora ? "" : undefined}>
          {!falhou && visiveis.length > 0 && (
            /* `tabIndex={-1}`: sem isto o salto muda o endereço e deixa o foco
               onde estava, e a tabulação seguinte voltava ao globo. */
            <div
              id="mapa-regioes"
              tabIndex={-1}
              className="mapa-regioes"
              data-aberto={regioesAbertas ? "" : undefined}
            >
              <div
                id="mapa-regioes-painel"
                ref={painelRegioes}
                hidden={!regioesAbertas}
                className="mapa-regioes__painel"
              >
                {pilhaDasRegioes}
              </div>
              {/* ── O gatilho não pode desmentir o mapa ──────────────────
                  Fechado, é a única coisa que se vê do painel — e com o
                  Alentejo escolhido dizia «Explorar Regiões · 29» enquanto o
                  globo tinha sete acesos e a pílula dizia «7 de 29». O
                  cromado a contradizer o conteúdo, no mesmo ecrã. Passa a
                  dizer onde se está e quantas se vêem; o ponto branco é o
                  sinal de escolha feita, que no sistema é branco e não
                  dourado. */}
              <button
                type="button"
                ref={gatilhoRegioes}
                onClick={() => setRegioesAbertas((a) => !a)}
                aria-expanded={regioesAbertas}
                aria-controls="mapa-regioes-painel"
                data-escolhido={regiao ? "" : undefined}
                className="mapa-regioes__gatilho"
              >
                {regiao ? (
                  <span aria-hidden="true" className="mapa-regioes__marca" />
                ) : (
                  <Layers size={15} aria-hidden="true" className="shrink-0" />
                )}
                <span className="titulo-seccao min-w-0 flex-1 truncate">
                  {regiao ?? t.mapa.explore_regions}
                </span>
                <span className="meta font-mono tabular-nums">
                  {regiao ? visiveis.length : porTexto.length}
                </span>
                <ChevronUp size={15} aria-hidden="true" className="mapa-regioes__seta" />
              </button>
            </div>
          )}
          {visiveis.length > 0 && (
            <p className="meta mapa-dica" data-ido={dicaIda ? "" : undefined}>
              {t.mapa.globe_hint}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
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

      <div className="relative mx-auto max-w-[1400px] px-4 pb-16 pt-20 sm:pt-28 md:px-6">
        {/* Na lista a página volta a ser um documento, e um documento tem um
            título visível. É a única diferença de cromado entre as duas
            vistas, e é a que o conteúdo pede: no mapa não há por onde rolar,
            aqui há. */}
        <h1 className="titulo-pagina mb-4">
          {titulo.antes}
          {titulo.meio && <span className="text-[var(--foreground-strong)]">{titulo.meio}</span>}
          {titulo.depois}
        </h1>

        {!falhou && (
          <>
            <div className="mb-3 flex flex-nowrap items-center gap-2 sm:gap-3">{comandos}</div>
            {/* ── A lista também filtra por região ──────────────────────────
                O painel das regiões só existia na vista do mapa: quem
                escolhesse a lista — e é o que escolhe quem não vê um canvas —
                perdia a única maneira de percorrer as vinte e nove sem saber o
                que procura. Ficava com a caixa de pesquisa, que só serve a
                quem já sabe o nome. E o endereço `?regiao=Alentejo` continuava
                a valer, o que dava o pior dos casos: um filtro em vigor sem
                nenhum comando na página que o pusesse ou o tirasse.

                Aqui é uma fila de pastilhas e não a pilha do mapa, e a
                diferença é de conteúdo: no mapa entrar numa região é entrar
                num sítio, porque o que está fora sai do ecrã; numa lista que
                se rola vê-se tudo, e escolher é marcar um filtro. `.chip` /
                `.chip-activo`, que é o idioma que o resto do site já usa. */}
            <div
              id="mapa-regioes"
              tabIndex={-1}
              role="group"
              aria-label={t.mapa.filter_region}
              className="mb-3 flex flex-wrap items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => setRegiao(null)}
                aria-pressed={regiao === null}
                className={`chip ${regiao === null ? "chip-activo" : ""}`}
              >
                {t.mapa.region_all}
                <span className="font-mono tabular-nums">{porTexto.length}</span>
              </button>
              {regioes.map(({ regiao: nome, total }) => (
                /* Uma região que a pesquisa esvaziou fica visível mas inerte —
                   a mesma regra do painel do mapa: escondê-la esconderia que
                   existe, deixá-la clicável prometeria o que não há. */
                <button
                  key={nome}
                  type="button"
                  disabled={total === 0}
                  onClick={() => setRegiao(nome)}
                  aria-pressed={regiao === nome}
                  className={`chip ${regiao === nome ? "chip-activo" : ""} disabled:pointer-events-none disabled:opacity-40`}
                >
                  {nome}
                  <span className="font-mono tabular-nums">{total}</span>
                </button>
              ))}
            </div>
            <div className="mb-4">{barraEstado}</div>
          </>
        )}

        {/* A `key` é o que faz a animação voltar a correr: sem ela o React
            reaproveita o nó e a animação, que já correu, não se repete. */}
        <div key="lista" className="vista-troca">
          {visiveis.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4">
              {/* Não é `<Revelar>`: esse dispara ao entrar no ecrã e, ao trocar
                  de vista, os cartões já lá estão — nunca disparava. A cascata
                  é do CSS e corre com a vista. */}
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
                    mostrarDestaque={destaqueVale}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* O `.cartao` que embrulhava isto era uma segunda moldura à volta
               de uma superfície que já é um cartão: o `vazio` traz o cartão
               assinatura, o mesmo que o mapa mostra. Uma só, e a mesma nas
               duas vistas. */
            <div className="py-8">{vazio}</div>
          )}
        </div>
      </div>
    </div>
  );
}
