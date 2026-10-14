/**
 * Ler os tokens de movimento do `globals.css` a partir de JavaScript.
 *
 * As durações e as curvas do site vivem em tokens, e a regra da casa é que é
 * por lá que se mudam. Um componente que anime com um número escrito à mão
 * tem uma duração que ninguém encontra e que ninguém muda quando as outras
 * mudam — foi assim que os nomes do globo ficaram a nascer em 700ms sem que
 * esse 700 aparecesse em tabela nenhuma.
 *
 * Vive aqui, e não dentro do `GloboTerra`, pela mesma razão que o
 * `nomes-globo`: são regras sobre o CSS e não sobre o desenho, e assim
 * testam-se sem arrastar o three.js atrás.
 */

/**
 * A curva de Bézier do CSS, com os extremos fixos em (0,0) e (1,1).
 *
 * Recebe os quatro números de `cubic-bezier(x1, y1, x2, y2)` e devolve a
 * função de progresso: dado o tempo em 0..1, quanto do movimento já correu.
 *
 * A inversão de x para t é por bissecção e não por Newton. São vinte voltas,
 * custam nada, e não há derivada nenhuma para explodir num ponto de inflexão
 * ou numa curva com o controlo em cima do extremo — que é exactamente o caso
 * do `--ease-out`, cujo primeiro ponto de controlo está na origem.
 */
export function bezierCss(x1: number, y1: number, x2: number, y2: number) {
  const em = (a: number, b: number, t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
  };
  return (x: number) => {
    if (!(x > 0)) return 0;
    if (x >= 1) return 1;
    let baixo = 0;
    let cima = 1;
    for (let i = 0; i < 20; i++) {
      const t = (baixo + cima) / 2;
      if (em(x1, x2, t) < x) baixo = t;
      else cima = t;
    }
    return em(y1, y2, (baixo + cima) / 2);
  };
}

/** Uma duração de CSS (`320ms`, `0.5s`) em milissegundos, ou `null`. */
export function lerDuracao(valor: string): number | null {
  const m = /^([\d.]+)\s*(ms|s)$/.exec(valor.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n * (m[2] === "s" ? 1000 : 1);
}

/** Uma curva de CSS (`cubic-bezier(…)`) como função de 0..1, ou `null`. */
export function lerCurva(valor: string): ((t: number) => number) | null {
  const m = /^cubic-bezier\(([^)]+)\)$/.exec(valor.trim());
  if (!m) return null;
  const n = m[1].split(",").map((x) => Number(x.trim()));
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return null;
  return bezierCss(n[0], n[1], n[2], n[3]);
}

/** O valor de um token no elemento raiz. Fora do browser, cadeia vazia. */
function token(nome: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

/**
 * Um token de duração (`--d-drill`), em milissegundos.
 *
 * Lê-se à montagem, não por quadro: é uma consulta ao estilo do documento, e
 * uma consulta destas obriga o browser a recalcular estilo.
 */
export function duracaoDoToken(nome: string, porOmissao: number) {
  return lerDuracao(token(nome)) ?? porOmissao;
}

/** Um token de curva (`--ease-out`), como função de 0..1 para 0..1. */
export function curvaDoToken(nome: string, porOmissao: (t: number) => number) {
  return lerCurva(token(nome)) ?? porOmissao;
}
