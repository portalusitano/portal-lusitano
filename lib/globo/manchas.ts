/**
 * As manchas: onde não coube um nome, fica a conta.
 *
 * ── Porque é que isto saiu do componente ──────────────────────────────────
 *
 * O CLAUDE.md promete, por escrito, «29 de 29 com conta no ecrã, 0
 * sobreposições contando manchas e nomes juntos». Não era verdade em todos os
 * carregamentos: medido a 1400×950, cerca de 7% acabavam com 25 de 29 — quatro
 * pontos sem nome e sem algarismo.
 *
 * A causa não era uma corrida nem um quadro a chegar tarde. Era uma linha:
 *
 *     if (!posta) continue;
 *
 * O algarismo experimentava vinte e cinco sítios — o centro do ajuntamento e
 * três anéis de oito à volta, até 68 pixéis — e, se os vinte e cinco
 * estivessem ocupados, **desistia em silêncio**. Desistir ali não é deixar um
 * algarismo por escrever: é apagar do ecrã todas as coudelarias que ele
 * contava. Num quadro cheio, onde os nomes ganharam a vizinhança inteira, é
 * exactamente o ajuntamento mais apertado — o que mais precisa de ser contado
 * — que fica sem sítio.
 *
 * Uma lista de vinte e cinco palpites não é uma procura: é um palpite com
 * vinte e cinco tentativas. Onde ela se esgota, a promessa cala-se.
 *
 * ── A saída já estava escrita no ficheiro, noutro sítio ───────────────────
 *
 * As sobras solitárias já tinham este problema resolvido: uma coudelaria
 * sozinha não faz mancha própria se houver uma perto — cola-se a ela, porque
 * «a conta de uma zona vale mais do que duas contas ao lado uma da outra».
 * É a mesma regra que fecha o buraco. Um ajuntamento que não arranja lugar
 * **não desaparece: é adoptado pelo mais próximo que arranjou.** A conta
 * anda umas dezenas de pixéis, o painel continua a dizer exactamente quem lá
 * está, e ninguém fica por contar.
 *
 * Três degraus, por esta ordem, e cada um só corre quando o anterior falha:
 *
 *   1. **Perto.** Os vinte e cinco sítios de sempre. É o caso normal e é o
 *      único que dá um algarismo pousado em cima do que conta.
 *   2. **Adopção.** Não coube: entra na mancha colocada mais próxima.
 *   3. **Longe.** Não coube e não há nenhuma colocada para o adoptar — o
 *      quadro está cheio desde o primeiro. Aí, e só aí, a procura abre em
 *      espiral até à janela toda. Um algarismo longe do sítio lê-se mal;
 *      não haver algarismo nenhum não se lê de todo.
 *
 * O que isto garante, e está fixado nos testes: **se existir uma só posição
 * livre na janela, nenhuma coudelaria fica sem conta, e nenhuma caixa
 * colocada aqui toca noutra.** As duas metades da promessa passam a sair da
 * mesma função, e a função é total — não tem ramo que deite fora um membro.
 */

/** Uma caixa em coordenadas da lona. */
export interface Caixa {
  x: number;
  y: number;
  l: number;
  a: number;
}

/** Uma sobra: o ponto no ecrã e quem ele representa. */
export interface Sobra<T> {
  ecraX: number;
  ecraY: number;
  membros: readonly T[];
}

/** A parte da lona onde se pode escrever. */
export interface Janela {
  /** Bordo esquerdo utilizável, já com a folga incluída. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface MedidaChip {
  l: number;
  a: number;
}

/** Uma mancha decidida: onde fica e quem conta. */
export interface Mancha<T> {
  x: number;
  y: number;
  membros: T[];
  /** Quantas sobras se juntaram nela. Serve os testes e o relatório. */
  sobras: number;
  /** `true` quando o lugar veio do degrau 3 — longe do que conta. */
  afastada: boolean;
  /** Quantos ajuntamentos sem lugar foram adoptados por esta. Zero é o caso
      normal; acima de zero é o buraco que esta função existe para tapar. */
  adoptou: number;
}

/** Raio de ajuntamento no ecrã, em pixéis. Ver a nota no componente. */
export const RAIO_MANCHA = 40;
/** Até onde uma sobra solitária se cola à mancha mais próxima. */
export const RAIO_ADOPCAO = 104;
/**
 * O algarismo é pequeno e não é texto: a folga com que se afasta de um nome
 * não tem de ser a folga entre dois nomes.
 */
export const FOLGA_MANCHA = 5;

/**
 * Onde a mancha tenta pousar, por ordem: em cima do ajuntamento e depois em
 * anéis cada vez mais largos à volta.
 *
 * Três anéis e não um: com um só, treze das vinte e nove ficavam sem lugar
 * num quadro cheio de nomes e voltavam a ser pontos calados — medido. Um
 * algarismo a trinta pixéis do sítio ainda se lê como sendo daquele
 * ajuntamento; não se ler de todo é que não.
 */
export const ANEL_MANCHA: readonly (readonly [number, number])[] = [
  [0, 0],
  ...[26, 46, 68].flatMap((r) =>
    [0, 45, 90, 135, 180, 225, 270, 315].map(
      (g) =>
        [
          Math.round(r * Math.cos((g * Math.PI) / 180)),
          Math.round(r * Math.sin((g * Math.PI) / 180)),
        ] as const
    )
  ),
];

const cruzaComFolga = (c: Caixa, o: Caixa, folga: number) =>
  c.x < o.x + o.l + folga &&
  c.x + c.l + folga > o.x &&
  c.y < o.y + o.a + folga &&
  c.y + c.a + folga > o.y;

const dentro = (c: Caixa, j: Janela) =>
  c.x >= j.x0 && c.y >= j.y0 && c.x + c.l <= j.x1 && c.y + c.a <= j.y1;

const dist2 = (ax: number, ay: number, bx: number, by: number) =>
  (ax - bx) ** 2 + (ay - by) ** 2;

/**
 * Agrupa as sobras por proximidade **no ecrã**, guloso pelo mais povoado.
 *
 * Em cada volta lidera quem tiver mais vizinhos ainda livres. Sai mais
 * estável do que ir por ordem de índice — a mesma nuvem de pontos dá sempre o
 * mesmo desenho, e é a estabilidade que impede o algarismo de saltitar ao
 * arrastar.
 *
 * Agrupa no ecrã e não no terreno de propósito: assim desfaz-se ao aproximar,
 * e quem mexe na roda tem recompensa visível.
 */
export function ajuntarSobras<T>(sobras: readonly Sobra<T>[], raio = RAIO_MANCHA): Sobra<T>[][] {
  const r2 = raio * raio;
  const usados = new Set<Sobra<T>>();
  const grupos: Sobra<T>[][] = [];
  for (;;) {
    let lider: Sobra<T> | null = null;
    let melhor = 0;
    for (const e of sobras) {
      if (usados.has(e)) continue;
      let n = 0;
      for (const o of sobras) {
        if (!usados.has(o) && dist2(e.ecraX, e.ecraY, o.ecraX, o.ecraY) <= r2) n++;
      }
      if (n > melhor) {
        melhor = n;
        lider = e;
      }
    }
    if (!lider) break;
    const l = lider;
    const g = sobras.filter(
      (o) => !usados.has(o) && dist2(l.ecraX, l.ecraY, o.ecraX, o.ecraY) <= r2
    );
    for (const o of g) usados.add(o);
    grupos.push(g);
  }
  return grupos;
}

/**
 * As solitárias colam-se à mancha mais próxima; quem não tiver nenhuma por
 * perto fica com mancha própria, de uma só.
 *
 * Um algarismo «1» parece pouco, e é de propósito que fica: continua a dizer
 * «aqui está uma coudelaria» e continua a abrir-se no nome dela, que é tudo o
 * que faltava ao ponto anónimo.
 */
export function adoptarSolitarias<T>(
  grupos: Sobra<T>[][],
  raioAdopcao = RAIO_ADOPCAO
): Sobra<T>[][] {
  const cheios = grupos.filter((g) => g.length > 1);
  const adopcao2 = raioAdopcao * raioAdopcao;
  for (const g of grupos) {
    if (g.length !== 1) continue;
    const [so] = g;
    let alvo: Sobra<T>[] | null = null;
    let menor = adopcao2;
    for (const c of cheios) {
      const d = dist2(so.ecraX, so.ecraY, c[0].ecraX, c[0].ecraY);
      if (d < menor) {
        menor = d;
        alvo = c;
      }
    }
    if (alvo) alvo.push(so);
    else cheios.push(g);
  }
  return cheios;
}

const centro = <T>(g: readonly Sobra<T>[]) => {
  let cx = 0;
  let cy = 0;
  for (const e of g) {
    cx += e.ecraX;
    cy += e.ecraY;
  }
  return [cx / g.length, cy / g.length] as const;
};

/**
 * A espiral do degrau 3: anéis de oito, sempre mais largos, até a janela
 * acabar. Não é uma lista de palpites — é uma varredura, e por isso ou
 * encontra um lugar ou prova que não há nenhum.
 *
 * O passo é meia largura do algarismo: mais fino não descobre lugares novos,
 * porque nenhum buraco menor do que o algarismo lhe serve.
 */
function* espiral(passo: number, alcance: number) {
  for (let r = passo; r <= alcance; r += passo) {
    const quantos = Math.max(8, Math.round((2 * Math.PI * r) / passo));
    for (let k = 0; k < quantos; k++) {
      const g = (2 * Math.PI * k) / quantos;
      yield [Math.round(r * Math.cos(g)), Math.round(r * Math.sin(g))] as const;
    }
  }
}

function procurar(
  cx: number,
  cy: number,
  chip: MedidaChip,
  janela: Janela,
  ocupadas: readonly Caixa[],
  sitios: Iterable<readonly [number, number]>
): Caixa | null {
  for (const [dx, dy] of sitios) {
    const c: Caixa = {
      x: cx + dx - chip.l / 2,
      y: cy + dy - chip.a / 2,
      l: chip.l,
      a: chip.a,
    };
    if (!dentro(c, janela)) continue;
    let bate = false;
    for (const o of ocupadas) {
      if (cruzaComFolga(c, o, FOLGA_MANCHA)) {
        bate = true;
        break;
      }
    }
    if (!bate) return c;
  }
  return null;
}

/**
 * Decide onde ficam os algarismos das sobras.
 *
 * `ocupadas` entra e **sai** com as manchas colocadas lá dentro: quem chama
 * precisa delas na lista para que, no quadro a seguir, nenhum nome pouse por
 * cima de um algarismo. É por isso que recebe o vector e o estende, em vez de
 * devolver uma cópia — a lista é a mesma que a colocação dos nomes usou.
 */
export function colocarManchas<T>(
  sobras: readonly Sobra<T>[],
  {
    chip,
    janela,
    ocupadas,
    raio = RAIO_MANCHA,
    raioAdopcao = RAIO_ADOPCAO,
  }: {
    chip: MedidaChip;
    janela: Janela;
    ocupadas: Caixa[];
    raio?: number;
    raioAdopcao?: number;
  }
): Mancha<T>[] {
  if (!sobras.length) return [];

  const grupos = adoptarSolitarias(ajuntarSobras(sobras, raio), raioAdopcao);
  // A mais povoada escolhe lugar primeiro.
  grupos.sort((x, y) => y.length - x.length);

  const postas: Mancha<T>[] = [];
  const semLugar: Sobra<T>[][] = [];

  for (const g of grupos) {
    const [cx, cy] = centro(g);
    const c = procurar(cx, cy, chip, janela, ocupadas, ANEL_MANCHA);
    if (!c) {
      semLugar.push(g);
      continue;
    }
    ocupadas.push(c);
    postas.push({
      x: c.x,
      y: c.y,
      membros: g.flatMap((e) => [...e.membros]),
      sobras: g.length,
      afastada: false,
      adoptou: 0,
    });
  }

  if (!semLugar.length) return postas;

  /* Degrau 3, e só se nada foi colocado: o quadro estava cheio desde o
     primeiro ajuntamento, logo não há ninguém para adoptar seja quem for.
     Abre-se a procura à janela inteira para o maior, e os outros passam a
     ser adoptados por ele. */
  if (!postas.length) {
    const maior = semLugar[0];
    const [cx, cy] = centro(maior);
    const alcance = Math.hypot(janela.x1 - janela.x0, janela.y1 - janela.y0);
    const c = procurar(cx, cy, chip, janela, ocupadas, espiral(Math.max(4, chip.l / 2), alcance));
    /* Não há uma única posição livre na janela inteira. Nada se pode fazer
       aqui que não seja escrever por cima de um nome, e um nome apagado é
       pior do que uma conta por escrever: as sobras deste quadro ficam sem
       algarismo, e o quadro seguinte — em que basta a câmara mexer-se um
       pixel — volta a tentar. Devolve-se o que se conseguiu, sem fingir. */
    if (!c) return postas;
    ocupadas.push(c);
    postas.push({
      x: c.x,
      y: c.y,
      membros: maior.flatMap((e) => [...e.membros]),
      sobras: maior.length,
      afastada: true,
      adoptou: 0,
    });
    semLugar.shift();
  }

  /* Degrau 2 — adopção. Cada ajuntamento sem lugar entra na mancha colocada
     mais próxima. Sem tecto de distância de propósito: um tecto aqui é a
     mesma linha que se está a tirar, com outro nome. */
  for (const g of semLugar) {
    const [cx, cy] = centro(g);
    let alvo = postas[0];
    let menor = Infinity;
    for (const m of postas) {
      const d = dist2(cx, cy, m.x + chip.l / 2, m.y + chip.a / 2);
      if (d < menor) {
        menor = d;
        alvo = m;
      }
    }
    for (const e of g) alvo.membros.push(...e.membros);
    alvo.sobras += g.length;
    alvo.adoptou += 1;
  }

  return postas;
}
