/**
 * Geometria do banco de provas do globo.
 *
 * Aqui só há contas: nada toca no browser, nada lê ficheiros. É de propósito —
 * é esta a parte que se fixa com testes de unidade (`__tests__/lib/`), e é a
 * parte que decide se um número do relatório está certo. O resto do banco é
 * recolha; isto é a medida.
 */

/** Distância euclidiana entre dois pontos `{x, y}`. */
export function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Todos os pares de pontos, do mais próximo ao mais distante.
 *
 * Devolve a lista inteira e não só os que interessam: quem chama é que decide
 * o limiar, e um instrumento que já filtrou não deixa comparar duas corridas
 * com limiares diferentes.
 */
export function pares(pontos) {
  const saida = [];
  for (let i = 0; i < pontos.length; i++) {
    for (let j = i + 1; j < pontos.length; j++) {
      saida.push({ a: i, b: j, d: distancia(pontos[i], pontos[j]) });
    }
  }
  saida.sort((p, q) => p.d - q.d);
  return saida;
}

/**
 * Quantos pares ficam abaixo de cada limiar, e a distância ao vizinho mais
 * próximo de cada ponto.
 *
 * `limiares` em pixéis de ecrã. O vizinho mais próximo é o número que conta
 * para quem aponta: um ponto com um vizinho a 3px não se acerta, por muito
 * arrumado que o resto do quadro esteja.
 */
export function aglomeracao(pontos, limiares = [3, 6, 12, 24]) {
  const todos = pares(pontos);
  const vizinho = pontos.map(() => Infinity);
  for (const p of todos) {
    if (p.d < vizinho[p.a]) vizinho[p.a] = p.d;
    if (p.d < vizinho[p.b]) vizinho[p.b] = p.d;
  }
  /** @type {Record<number, number>} */
  const contagem = {};
  for (const l of limiares) contagem[l] = todos.filter((p) => p.d < l).length;
  return {
    n: pontos.length,
    contagem,
    vizinho,
    piores: todos.slice(0, 12),
    estatistica: estatistica(vizinho.filter((v) => Number.isFinite(v))),
  };
}

/** Mínimo, mediana, p95, máximo e média de uma lista de números. */
export function estatistica(valores) {
  if (!valores.length) return { n: 0, min: null, p50: null, p95: null, max: null, media: null };
  const v = [...valores].sort((a, b) => a - b);
  const quantil = (q) => v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))];
  return {
    n: v.length,
    min: v[0],
    p50: quantil(0.5),
    p95: quantil(0.95),
    max: v[v.length - 1],
    media: v.reduce((s, x) => s + x, 0) / v.length,
  };
}

/**
 * Centro e raio de um círculo que passa pelos pontos dados.
 *
 * Serve para recuperar a posição do alfinete a partir da fronteira livre da
 * sua área de acerto: onde a área não foi cortada por um vizinho, o limite
 * está exactamente ao raio de toque do alfinete. Ajustar o centro à fronteira
 * é a maneira de saber onde está o ponto sem perguntar ao componente — e um
 * número que se obtém sem gancho é um número que sobrevive a uma alteração
 * do componente.
 *
 * Gauss-Newton sobre o resíduo `|p − c| − R`, com o raio a sair da média das
 * distâncias a cada passo. Arranca no centróide, que para uma coroa fechada
 * já é quase a resposta.
 */
export function ajustarCirculo(
  pontos,
  /** @type {{ raioFixo?: number | null, voltas?: number }} */ { raioFixo = null, voltas = 40 } = {}
) {
  if (pontos.length < 3) return null;
  let cx = 0;
  let cy = 0;
  for (const p of pontos) {
    cx += p.x;
    cy += p.y;
  }
  cx /= pontos.length;
  cy /= pontos.length;
  let raio = raioFixo ?? media(pontos.map((p) => Math.hypot(p.x - cx, p.y - cy)));

  for (let volta = 0; volta < voltas; volta++) {
    let a11 = 0;
    let a12 = 0;
    let a22 = 0;
    let b1 = 0;
    let b2 = 0;
    for (const p of pontos) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < 1e-9) continue;
      const ux = dx / d;
      const uy = dy / d;
      const r = d - raio;
      a11 += ux * ux;
      a12 += ux * uy;
      a22 += uy * uy;
      b1 += ux * r;
      b2 += uy * r;
    }
    // Regularização mínima: com a fronteira reduzida a um arco curto a matriz
    // fica quase singular e o passo dispara para fora do quadro.
    a11 += 1e-6;
    a22 += 1e-6;
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-12) break;
    const dx = (b1 * a22 - b2 * a12) / det;
    const dy = (a11 * b2 - a12 * b1) / det;
    cx += dx;
    cy += dy;
    if (raioFixo === null) raio = media(pontos.map((p) => Math.hypot(p.x - cx, p.y - cy)));
    if (Math.hypot(dx, dy) < 1e-6) break;
  }

  const erros = pontos.map((p) => Math.abs(Math.hypot(p.x - cx, p.y - cy) - raio));
  return { x: cx, y: cy, raio, erro: media(erros), erroMax: Math.max(...erros) };
}

function media(v) {
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
}

/** Área de intersecção de dois rectângulos `{x, y, l, a}`. Zero se não se tocam. */
export function sobreposicao(p, q) {
  const l = Math.min(p.x + p.l, q.x + q.l) - Math.max(p.x, q.x);
  const a = Math.min(p.y + p.a, q.y + q.a) - Math.max(p.y, q.y);
  return l > 0 && a > 0 ? l * a : 0;
}

/**
 * Todos os pares de rectângulos que se sobrepõem em mais de `minimo` px².
 *
 * O mínimo não é zelo a mais: dois nomes que partilham uma linha de um pixel
 * por arredondamento não se estorvam, e contá-los enchia o relatório de ruído
 * que esconde as sobreposições a sério.
 */
export function sobreposicoes(caixas, minimo = 4) {
  const saida = [];
  for (let i = 0; i < caixas.length; i++) {
    for (let j = i + 1; j < caixas.length; j++) {
      const area = sobreposicao(caixas[i], caixas[j]);
      if (area > minimo) saida.push({ a: i, b: j, area });
    }
  }
  return saida.sort((p, q) => q.area - p.area);
}

/** Fracção de `r` que fica dentro de `caixa`. 1 = inteiro lá dentro, 0 = fora. */
export function fraccaoDentro(r, caixa) {
  const total = r.l * r.a;
  if (total <= 0) return 1;
  return sobreposicao(r, caixa) / total;
}

/**
 * Recupera a posição de cada alfinete a partir do mapa de acertos do
 * varrimento.
 *
 * `mapa` é um array de índices (−1 = não acerta em nada), lido em coluna e
 * depois em linha a partir de `origem` com o passo dado. Para cada alfinete
 * junta-se a fronteira livre — as células suas cuja vizinha não é de ninguém
 * — e ajusta-se-lhe um círculo. Onde a fronteira livre não chega (o alfinete
 * está encostado a outro e a área dele foi cortada de todos os lados) cai-se
 * no centróide e marca-se `preciso: false`, que é o honesto: o número existe
 * mas não vale o mesmo.
 */
export function centrosDoVarrimento({ mapa, nx, ny, passo, origem = { x: 0, y: 0 } }) {
  const celulas = new Map();
  // Duas passagens. Na primeira o raio sai das áreas inteiras — as dos
  // alfinetes que não têm vizinho a cortá-las — e na segunda esse raio, que
  // é o mesmo para todos porque é uma constante do componente, entra fixo no
  // ajuste dos que ficaram com um arco curto. Sem isto, os alfinetes
  // aglomerados, que são precisamente os que interessam, eram os únicos sem
  // posição fiável.
  const px = (i) => origem.x + i * passo;
  const py = (j) => origem.y + j * passo;

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v = mapa[j * nx + i];
      if (v < 0) continue;
      if (!celulas.has(v)) celulas.set(v, []);
      celulas.get(v).push([i, j]);
    }
  }

  const fronteiras = new Map();
  for (const [indice, lista] of celulas) {
    const livres = [];
    for (const [i, j] of lista) {
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const vi = i + di;
        const vj = j + dj;
        const fora = vi < 0 || vj < 0 || vi >= nx || vj >= ny;
        const v = fora ? -1 : mapa[vj * nx + vi];
        // Fronteira livre é a que dá para o vazio. A que dá para outro
        // alfinete é um corte de Voronói e não diz nada sobre o raio.
        if (v === -1 && !fora) livres.push({ x: (px(i) + px(vi)) / 2, y: (py(j) + py(vj)) / 2 });
      }
    }
    fronteiras.set(indice, livres);
  }

  const inteiros = [];
  for (const livres of fronteiras.values()) {
    if (livres.length < 16) continue;
    const a = ajustarCirculo(livres);
    if (a && a.erro < passo) inteiros.push(a.raio);
  }
  inteiros.sort((a, b) => a - b);
  const raioComum = inteiros.length ? inteiros[Math.floor(inteiros.length / 2)] : null;

  const saida = [];
  for (const [indice, lista] of celulas) {
    const livres = fronteiras.get(indice);
    const centroide = {
      x: media(lista.map(([i]) => px(i))),
      y: media(lista.map(([, j]) => py(j))),
    };
    const ajuste = livres.length >= 5 ? ajustarCirculo(livres, { raioFixo: raioComum }) : null;
    const bom = ajuste !== null && ajuste.erro < passo;
    saida.push({
      indice,
      x: bom ? ajuste.x : centroide.x,
      y: bom ? ajuste.y : centroide.y,
      raio: bom ? ajuste.raio : null,
      erroAjuste: bom ? ajuste.erro : null,
      celulas: lista.length,
      area: lista.length * passo * passo,
      fronteiraLivre: livres.length,
      preciso: bom,
    });
  }
  saida.sort((a, b) => a.indice - b.indice);
  return { centros: saida, raioComum };
}

/**
 * Simula o mapa de acertos a partir de um conjunto de posições e devolve a
 * fracção de células em que concorda com o mapa medido.
 *
 * É o número que diz se se pode confiar nas posições recuperadas. O teste de
 * acerto do componente é «o alfinete mais próximo, se estiver a menos do raio
 * de toque»; se as posições estiverem certas, a simulação reproduz o mapa. Uma
 * concordância de 99% e tal quer dizer que o modelo explica o que se mediu;
 * uma de 80% quer dizer que os números da aglomeração não valem nada.
 */
export function concordancia({ mapa, nx, ny, passo, origem = { x: 0, y: 0 } }, centros, raio) {
  let iguais = 0;
  let total = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = origem.x + i * passo;
      const y = origem.y + j * passo;
      let melhor = -1;
      let menor = raio * raio;
      for (const c of centros) {
        const d = (c.x - x) ** 2 + (c.y - y) ** 2;
        if (d < menor) {
          menor = d;
          melhor = c.indice;
        }
      }
      total++;
      if (melhor === mapa[j * nx + i]) iguais++;
    }
  }
  return { iguais, total, fraccao: total ? iguais / total : 0 };
}

/**
 * Afina as posições que o ajuste de círculo não conseguiu fixar.
 *
 * Um alfinete no meio de um aglomerado não tem fronteira livre nenhuma: a área
 * dele foi cortada de todos os lados por vizinhos, e o círculo não tem arco em
 * que assentar. O que sobra é a informação que está nos cortes — cada fronteira
 * entre dois alfinetes está na mediatriz deles. Em vez de resolver isso por
 * equações, procura-se: desloca-se o alfinete numa grelha fina e fica-se com a
 * posição que melhor explica o mapa que **se mediu**. É a mesma ideia do resto
 * do banco — não se pergunta ao componente onde está o ponto, vê-se onde é que
 * ele tem de estar para o ecrã dar o que deu.
 */
export function refinarCentros(varrimento, centros, raio, { alcance = 4, fino = 0.25 } = {}) {
  const { mapa, nx, ny, passo, origem = { x: 0, y: 0 } } = varrimento;
  const pos = centros.map((c) => ({ ...c }));
  const soltos = pos.filter((c) => !c.preciso);
  if (!soltos.length) return pos;

  const desacordo = (alvo, cx, cy) => {
    const vizinhos = pos.filter((c) => c !== alvo && Math.hypot(c.x - cx, c.y - cy) < 3 * raio);
    const i0 = Math.max(0, Math.floor((cx - raio - passo - origem.x) / passo));
    const i1 = Math.min(nx - 1, Math.ceil((cx + raio + passo - origem.x) / passo));
    const j0 = Math.max(0, Math.floor((cy - raio - passo - origem.y) / passo));
    const j1 = Math.min(ny - 1, Math.ceil((cy + raio + passo - origem.y) / passo));
    let mal = 0;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = origem.x + i * passo;
        const y = origem.y + j * passo;
        let melhor = -1;
        let menor = raio * raio;
        const d0 = (cx - x) ** 2 + (cy - y) ** 2;
        if (d0 < menor) {
          menor = d0;
          melhor = alvo.indice;
        }
        for (const c of vizinhos) {
          const d = (c.x - x) ** 2 + (c.y - y) ** 2;
          if (d < menor) {
            menor = d;
            melhor = c.indice;
          }
        }
        const medido = mapa[j * nx + i];
        // Só conta o que diz respeito a este alfinete ou aos vizinhos dele:
        // um erro do outro lado da lona não é responsabilidade desta posição.
        if (melhor !== medido) mal++;
      }
    }
    return mal;
  };

  for (let volta = 0; volta < 4; volta++) {
    let mexeu = false;
    for (const alvo of soltos) {
      let melhorX = alvo.x;
      let melhorY = alvo.y;
      let melhor = desacordo(alvo, alvo.x, alvo.y);
      for (let dx = -alcance; dx <= alcance; dx += fino) {
        for (let dy = -alcance; dy <= alcance; dy += fino) {
          const v = desacordo(alvo, alvo.x + dx, alvo.y + dy);
          if (v < melhor) {
            melhor = v;
            melhorX = alvo.x + dx;
            melhorY = alvo.y + dy;
          }
        }
      }
      if (melhorX !== alvo.x || melhorY !== alvo.y) {
        alvo.x = melhorX;
        alvo.y = melhorY;
        alvo.afinado = true;
        mexeu = true;
      }
    }
    if (!mexeu) break;
  }
  return pos;
}

/**
 * O que acontece a quem carrega dentro do raio nominal de um alfinete.
 *
 * Três números por alfinete: quantas células acertam nele, quantas acertam
 * noutro — o erro que mais custa, porque abre a coudelaria errada sem avisar
 * — e quantas não acertam em nada.
 */
export function pontariaPorAlfinete(
  { mapa, nx, ny, passo, origem = { x: 0, y: 0 } },
  centros,
  raio
) {
  const saida = [];
  for (const c of centros) {
    let certo = 0;
    let errado = 0;
    let vazio = 0;
    const i0 = Math.floor((c.x - raio - origem.x) / passo);
    const i1 = Math.ceil((c.x + raio - origem.x) / passo);
    const j0 = Math.floor((c.y - raio - origem.y) / passo);
    const j1 = Math.ceil((c.y + raio - origem.y) / passo);
    for (let j = Math.max(0, j0); j <= Math.min(ny - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(nx - 1, i1); i++) {
        const x = origem.x + i * passo;
        const y = origem.y + j * passo;
        // Estritamente menor, como no componente: lá o teste é `d < raio²`,
        // e uma célula exactamente ao raio não acerta em nada. Contá-la como
        // «não acertou» punha uma coroa de falsos vazios à volta de cada
        // alfinete que estivesse sozinho.
        if (Math.hypot(x - c.x, y - c.y) >= raio) continue;
        const v = mapa[j * nx + i];
        if (v === c.indice) certo++;
        else if (v < 0) vazio++;
        else errado++;
      }
    }
    const total = certo + errado + vazio || 1;
    saida.push({
      indice: c.indice,
      certo,
      errado,
      vazio,
      areaCerta: certo * passo * passo,
      areaErrada: errado * passo * passo,
      fraccaoCerta: certo / total,
      fraccaoErrada: errado / total,
    });
  }
  return saida;
}
