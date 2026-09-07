/**
 * O cromado da `/mapa` — tudo o que não é o globo.
 *
 * Três defeitos medidos no browser deram origem a este ficheiro, e é para
 * eles não voltarem que ele existe:
 *
 * 1. **A vista de lista não filtrava por região.** O painel «Explorar
 *    Regiões» só existia na vista do mapa. Quem escolhesse a lista — e é o
 *    que escolhe quem não vê um canvas — ficava só com a caixa de pesquisa,
 *    que serve a quem já sabe o nome. Pior: `?regiao=Alentejo` continuava a
 *    valer, o que dava um filtro em vigor sem nenhum comando na página que o
 *    pusesse ou o tirasse.
 *
 * 2. **O gatilho das regiões desmentia o mapa.** Com o Alentejo escolhido
 *    dizia «Explorar Regiões · 29» enquanto o globo tinha sete acesos.
 *
 * 3. **Com a base em baixo continuavam lá os comandos.** Uma caixa de
 *    pesquisa que não tem o que pesquisar e um interruptor entre duas vistas
 *    que estão as duas vazias.
 *
 * O que **não** se prova aqui é o desenho: quanto mede a pílula, quanto do
 * ecrã come o rodapé, se alguma peça flutuante tapa um nome do globo. Isso
 * mede-se no browser, com o globo a desenhar de verdade, e não em jsdom.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import MapaClient, { type Coudelaria } from "@/components/MapaClient";
import pt from "@/locales/pt.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/mapa",
}));

vi.mock("@/context/LanguageContext", async () => {
  const dicionario = (await import("@/locales/pt.json")).default;
  return { useLanguage: () => ({ language: "pt", t: dicionario }) };
});

/* O globo pede WebGL e três megabytes de cena. Aqui só interessa que exista
   alguma coisa no lugar dele: o que se está a medir é o cromado à volta. */
vi.mock("next/dynamic", () => ({
  default: () => {
    const Substituto = () => <div data-testid="globo" />;
    Substituto.displayName = "GloboTerraSubstituto";
    return Substituto;
  },
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [k: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...(props as Record<string, string>)} />
  ),
}));

vi.mock("@/components/LocalizedLink", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  localizeHref: (href: string) => href,
}));

const fazer = (nome: string, regiao: string): Coudelaria => ({
  id: nome,
  nome,
  slug: nome.toLowerCase().replace(/\s+/g, "-"),
  descricao: "",
  localizacao: "Golegã",
  regiao,
  is_pro: false,
  destaque: false,
});

/* Quatro no Ribatejo, duas no Alentejo, uma no Minho: chega para as contagens
   por região serem diferentes umas das outras e a ordem ser previsível. */
const COUDELARIAS: Coudelaria[] = [
  fazer("Alfa", "Ribatejo"),
  fazer("Beta", "Ribatejo"),
  fazer("Gama", "Ribatejo"),
  fazer("Delta", "Ribatejo"),
  fazer("Epsilon", "Alentejo"),
  fazer("Zeta", "Alentejo"),
  fazer("Eta", "Minho"),
];

/**
 * Montar a página como ela é montada de verdade.
 *
 * O `MapaClient` adopta o endereço à chegada — está escrito no componente:
 * quem volta de uma ficha traz o `?regiao=` do browser e não o `inicial` do
 * servidor, que vem da cache limpa. Passar só o `inicial` num teste é montar
 * um caso que não existe: o `useLayoutEffect` lê `window.location` a seguir e
 * põe tudo em branco. Aqui escreve-se o endereço **e** o `inicial`, que é o
 * par que a página recebe.
 */
function montar({
  vista = "globo",
  regiao = null,
  coudelarias = COUDELARIAS,
  falhou = false,
}: {
  vista?: "globo" | "list";
  regiao?: string | null;
  coudelarias?: Coudelaria[];
  falhou?: boolean;
} = {}) {
  const consulta = new URLSearchParams();
  if (regiao) consulta.set("regiao", regiao);
  if (vista === "list") consulta.set("vista", "lista");
  const texto = consulta.toString();
  window.history.replaceState(null, "", texto ? `/mapa?${texto}` : "/mapa");
  return render(
    <MapaClient
      coudelarias={coudelarias}
      inicial={{ procura: "", regiao, vista }}
      falhou={falhou}
    />
  );
}

/** O gatilho do painel das regiões, sem o confundir com a pastilha do filtro. */
const gatilhoDasRegioes = () =>
  screen
    .getAllByRole("button")
    .find((b) => b.getAttribute("aria-controls") === "mapa-regioes-painel")!;

describe("a vista de lista filtra por região", () => {
  it("escreve uma pastilha por região, com a contagem, mais «Todas»", () => {
    montar({ vista: "list" });
    const filtros = screen.getByRole("group", { name: pt.mapa.filter_region });
    for (const [nome, quantas] of [
      [pt.mapa.region_all, "7"],
      ["Ribatejo", "4"],
      ["Alentejo", "2"],
      ["Minho", "1"],
    ]) {
      const botao = within(filtros).getByRole("button", { name: new RegExp(`^${nome}`) });
      expect(botao).toHaveTextContent(quantas);
    }
  });

  it("escolher uma região deixa na grelha só as dessa região", () => {
    montar({ vista: "list" });
    expect(screen.getByRole("link", { name: /Alfa/ })).toBeInTheDocument();

    const filtros = screen.getByRole("group", { name: pt.mapa.filter_region });
    fireEvent.click(within(filtros).getByRole("button", { name: /^Alentejo/ }));

    expect(screen.queryByRole("link", { name: /Alfa/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Epsilon/ })).toBeInTheDocument();
    expect(within(filtros).getByRole("button", { name: /^Alentejo/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  /* O filtro que vem do endereço tem de aparecer escolhido na fila: sem isto,
     `?vista=lista&regiao=Alentejo` mostrava duas coudelarias e nenhum comando
     dizia porquê. */
  it("mostra escolhida a região que vem do endereço", () => {
    montar({ vista: "list", regiao: "Alentejo" });
    const filtros = screen.getByRole("group", { name: pt.mapa.filter_region });
    expect(within(filtros).getByRole("button", { name: /^Alentejo/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(filtros).getByRole("button", { name: /^Ribatejo/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  /* A região já está numa pastilha branca na fila dos filtros, com o «Todas»
     ao lado que a tira. Repeti-la na fila do estado punha duas pastilhas
     iguais a doze pixéis uma da outra. */
  it("não repete a região na fila do estado", () => {
    montar({ vista: "list", regiao: "Alentejo" });
    expect(screen.getAllByRole("button", { name: /^Alentejo/ })).toHaveLength(1);
  });

  /* O atalho do teclado aponta para `#mapa-regioes`. Na lista esse âncora tem
     de existir na mesma, senão o endereço não resolve. */
  it("o alvo do atalho existe nas duas vistas", () => {
    const { container, unmount } = montar({ vista: "list" });
    expect(container.querySelector("#mapa-regioes")).not.toBeNull();
    unmount();
    const noMapa = montar();
    expect(noMapa.container.querySelector("#mapa-regioes")).not.toBeNull();
  });
});

describe("o gatilho das regiões não desmente o mapa", () => {
  it("sem região, diz o nome do painel e conta todas", () => {
    montar();
    const gatilho = gatilhoDasRegioes();
    expect(gatilho).toHaveTextContent(pt.mapa.explore_regions);
    expect(gatilho).toHaveTextContent("7");
    expect(gatilho).not.toHaveAttribute("data-escolhido");
  });

  it("com região, diz qual e conta as que se vêem", () => {
    montar({ regiao: "Alentejo" });
    const gatilho = gatilhoDasRegioes();
    expect(gatilho).toHaveTextContent("2");
    expect(gatilho).toHaveTextContent("Alentejo");
    expect(gatilho).toHaveAttribute("data-escolhido");
    expect(gatilho).not.toHaveTextContent(pt.mapa.explore_regions);
  });
});

describe("com a base em baixo não se oferecem comandos que não funcionam", () => {
  it("não há caixa de pesquisa nem interruptor de vista", () => {
    montar({ coudelarias: [], falhou: true });
    expect(screen.queryByLabelText(pt.mapa.search_label)).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: pt.mapa.view_switch })).not.toBeInTheDocument();
  });

  it("na lista também não", () => {
    montar({ vista: "list", coudelarias: [], falhou: true });
    expect(screen.queryByLabelText(pt.mapa.search_label)).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: pt.mapa.view_switch })).not.toBeInTheDocument();
  });

  /* A saída que se sabe que funciona é o directório, e é o que a própria
     frase promete. É esse que leva o botão por omissão — branco. */
  it("a saída principal é o directório", () => {
    montar({ coudelarias: [], falhou: true });
    const directorio = screen.getByRole("link", { name: pt.mapa.all_studs });
    expect(directorio.className).toContain("btn-primario");
    expect(screen.getByRole("link", { name: pt.mapa.offline_retry }).className).toContain(
      "btn-secundario"
    );
  });
});

describe("a contagem viva", () => {
  /* Uma região viva que só nasce no instante da mudança é uma região viva que
     os leitores de ecrã podem não chegar a anunciar: sem filtros ela fica
     escondida, mas fica no documento. */
  it("existe no documento mesmo sem filtros", () => {
    montar();
    expect(screen.getByRole("status")).toHaveTextContent("7");
  });
});

/* ── A rota do teclado até uma região tem de ter saída ──────────────────────
 * O painel abre **para cima** do gatilho, e por isso está antes dele no
 * documento. Medido no browser a 1400×950 antes desta correcção: do atalho
 * «Saltar o globo e ir às regiões» chega-se ao gatilho, carrega-se, o painel
 * abre — e a tabulação seguinte sai do conteúdo e aterra no rodapé do site,
 * em «Encontrar cavalo». Sessenta tabulações para a frente não encontravam
 * uma única região. O único caminho para dentro era `Shift+Tab` duas vezes,
 * que entra pelo fim da lista: o gesto de recuar a servir de gesto de entrar.
 *
 * Aqui não se prova a ordem de tabulação — isso mede-se num browser a sério —,
 * prova-se a única coisa que a desfaz: **abrir o painel põe o foco lá
 * dentro**. Com o foco na primeira região, a tabulação seguinte é a segunda,
 * e a rota deixa de ter de existir ao contrário.
 */
describe("abrir o painel leva o foco lá para dentro", () => {
  it("sem região, o foco assenta na primeira da lista", () => {
    montar();
    fireEvent.click(gatilhoDasRegioes());
    const painel = document.getElementById("mapa-regioes-painel")!;
    expect(painel).toContainElement(document.activeElement as HTMLElement);
    // A lista vem da maior para a menor: o Ribatejo tem quatro.
    expect(document.activeElement).toHaveTextContent("Ribatejo");
  });

  it("com região, o foco assenta no caminho de volta", () => {
    montar({ regiao: "Alentejo" });
    fireEvent.click(gatilhoDasRegioes());
    const painel = document.getElementById("mapa-regioes-painel")!;
    expect(painel).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).toHaveAccessibleName(`${pt.mapa.region_clear}: Alentejo`);
  });

  it("fechar devolve o foco ao gatilho, que é de onde saiu", () => {
    montar();
    const gatilho = gatilhoDasRegioes();
    fireEvent.click(gatilho);
    // Primeiro tem de estar lá dentro, senão o regresso não prova nada.
    expect(document.getElementById("mapa-regioes-painel")!).toContainElement(
      document.activeElement as HTMLElement
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(gatilho);
  });

  /* Uma região que a pesquisa esvaziou está `disabled`: o foco não pode
     assentar nela, senão abrir o painel dava um foco que não faz nada. */
  it("não assenta numa região que a pesquisa esvaziou", () => {
    montar();
    fireEvent.change(screen.getByLabelText(pt.mapa.search_label), {
      target: { value: "alfa" },
    });
    fireEvent.click(gatilhoDasRegioes());
    const posto = document.activeElement as HTMLElement;
    expect(document.getElementById("mapa-regioes-painel")!).toContainElement(posto);
    expect(posto).not.toHaveAttribute("disabled");
    // Só o Ribatejo tem uma «Alfa»; as outras duas regiões ficam a zero.
    expect(posto).toHaveTextContent("Ribatejo");
  });
});
