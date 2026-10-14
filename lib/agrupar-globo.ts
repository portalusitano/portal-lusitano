/**
 * Juntar num ponto só o que o mapa não consegue mostrar separado.
 *
 * ── Porque é que isto existe ──────────────────────────────────────────────
 *
 * Vinte e nove coudelarias, e metade delas no mesmo vale do Ribatejo. No
 * enquadramento de repouso a lona mostra 746 km de largura em 891 pixéis —
 * 837 metros por pixel —, e por isso há pares que ficam a **um pixel e meio**
 * um do outro: a Coudelaria de Vila Viçosa e a Jupiter Classical Dressage
 * distam 1,17 km. Desenhar dois alfinetes ali é desenhar um borrão e chamar-
 * lhe dois: não se vê que são dois, não se sabe quantos são, e apontar acerta
 * sempre no mesmo — o outro fica inalcançável.
 *
 * O zoom não resolve isto sozinho. Medido: o terreno só aguenta 3,4× de
 * ampliação antes de os blocos de compressão do mapa de relevo virarem um
 * xadrez à vista; a 3,4× aquele par ainda está a cinco pixéis. Prometer que
 * a roda os abre seria prometer o que a geometria não dá.
 *
 * Por isso o que não se pode mostrar separado mostra-se **junto e contado**:
 * um ponto, um algarismo, e a lista dos nomes ao carregar. É o mesmo idioma
 * que a página já usava para as etiquetas que não cabiam (as manchas), agora
 * aplicado ao próprio alfinete — que era onde a confusão estava.
 *
 * ── A regra que fixa o raio ───────────────────────────────────────────────
 *
 * O raio não é um número à sorte: é **o dobro do raio de toque**. Assim dois
 * pontos distintos nunca partilham área de acerto — quem aponta um alfinete
 * acerta naquele alfinete e em mais nenhum —, e tudo o que ficaria mais perto
 * do que isso deixa de ser dois alvos e passa a ser um, com a conta à vista.
 * Quem quiser separá-los aproxima-se: o raio é medido em metros de chão a
 * partir dos pixéis, e portanto encolhe com o zoom até os grupos se
 * desfazerem sozinhos.
 *
 * O agrupamento é **por distância no chão** e não por pixéis no ecrã. Dá o
 * mesmo resultado — o raio vem dos pixéis —, mas não muda ao arrastar o
 * globo, que é o que impede os algarismos de saltitarem enquanto se roda.
 */

/** Um ponto que se pode agrupar: só se lhe pede as coordenadas. */
export interface PontoNoChao {
  /** `[latitude, longitude]`, em graus. */
  coords: [number, number];
}

export interface Ajuntamento<T extends PontoNoChao> {
  /** O centro do que ali está — a média dos membros. */
  coords: [number, number];
  membros: T[];
}

const GRAU = Math.PI / 180;
/** Raio da Terra em quilómetros. */
export const RAIO_TERRA_KM = 6371;

/**
 * Distância entre dois pontos, em quilómetros.
 *
 * Equirectangular e não haversine de propósito: à escala a que isto serve —
 * dezenas de quilómetros, tudo à latitude de Portugal — o erro é de
 * milésimos, e o que se ganha é uma conta que não tem trigonometria inversa
 * dentro de um laço quadrático.
 */
export function distanciaKm(a: readonly [number, number], b: readonly [number, number]): number {
  const dLat = (a[0] - b[0]) * GRAU;
  const dLon = (b[1] - a[1]) * GRAU;
  const latMedia = ((a[0] + b[0]) / 2) * GRAU;
  return Math.hypot(dLat, dLon * Math.cos(latMedia)) * RAIO_TERRA_KM;
}

/**
 * Junta os pontos que estão a menos de `raioKm` uns dos outros.
 *
 * Guloso e por ordem fixa — norte para sul, e a longitude a desempatar —,
 * para que a mesma entrada dê sempre exactamente o mesmo desenho. A
 * estabilidade não é um extra: é ela que impede um algarismo de mudar de
 * conta entre dois quadros que mostram a mesma coisa.
 *
 * Cada líder absorve quem estiver dentro do raio **dele**, e por isso um
 * ajuntamento pode esticar-se até dois raios. É o preço de uma passagem só;
 * a alternativa (ligação simples, transitiva) encadeia grupos ao longo de um
 * vale inteiro e junta pontos que estão longe um do outro.
 *
 * Com `raioKm <= 0` devolve cada ponto por si.
 */
export function agrupar<T extends PontoNoChao>(
  pontos: readonly T[],
  raioKm: number
): Ajuntamento<T>[] {
  const ordem = pontos
    .map((p, i) => i)
    .sort(
      (x, y) =>
        pontos[y].coords[0] - pontos[x].coords[0] ||
        pontos[x].coords[1] - pontos[y].coords[1] ||
        x - y
    );

  const tomado = new Array<boolean>(pontos.length).fill(false);
  const saida: Ajuntamento<T>[] = [];

  for (const i of ordem) {
    if (tomado[i]) continue;
    tomado[i] = true;
    const membros: T[] = [pontos[i]];
    if (raioKm > 0) {
      for (const j of ordem) {
        if (tomado[j]) continue;
        if (distanciaKm(pontos[i].coords, pontos[j].coords) <= raioKm) {
          tomado[j] = true;
          membros.push(pontos[j]);
        }
      }
    }
    let lat = 0;
    let lon = 0;
    for (const m of membros) {
      lat += m.coords[0];
      lon += m.coords[1];
    }
    saida.push({
      coords: [lat / membros.length, lon / membros.length],
      membros,
    });
  }

  return saida;
}

/**
 * Quantos quilómetros de chão vale um pixel de lona, no ponto para onde a
 * câmara aponta.
 *
 * `distancia` é a distância da câmara à mira em raios do planeta — sai da
 * geometria do enquadramento, que vive no componente. Aqui só se converte.
 */
export function kmPorPixel(
  distancia: number,
  campoVerticalGraus: number,
  aspecto: number,
  larguraPx: number
): number {
  const meiaLargura = distancia * Math.tan((campoVerticalGraus / 2) * GRAU) * aspecto;
  return (2 * meiaLargura * RAIO_TERRA_KM) / Math.max(1, larguraPx);
}

/**
 * O raio de agrupamento, arredondado a degraus.
 *
 * Sem degraus, cada dente da roda mudava o raio um bocadinho e obrigava a
 * refazer os grupos — e refazer os grupos deita fora a memória de onde cada
 * nome estava, que é o que impede os nomes de saltarem. Com degraus de 35%
 * — os mesmos 35% de um toque no botão de aproximar —, o curso inteiro do
 * zoom dá meia dúzia de reconstruções, cada uma delas um momento em que se
 * vê um grupo abrir-se. É a recompensa visível de quem se aproxima.
 */
export function raioEmDegraus(raioKm: number, degrau = 1.35): number {
  if (!(raioKm > 0)) return 0;
  return Math.pow(degrau, Math.round(Math.log(raioKm) / Math.log(degrau)));
}
