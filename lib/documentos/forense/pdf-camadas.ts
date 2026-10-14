/**
 * Tinta opaca desenhada por cima de texto que já lá estava.
 *
 * ## O truque, e porque é que a ordem o denuncia
 *
 * Tapar um campo com um rectângulo branco é a falsificação mais banal que há
 * num PDF: não é preciso ferramenta nenhuma especial, o resultado imprime-se
 * igual ao original, e o texto por baixo continua lá — é por isso que uma
 * pesquisa dentro do ficheiro ainda o encontra e a leitura do
 * `leitura/texto-pdf.ts` ainda o lê.
 *
 * O que o denuncia é a **ordem de desenho**. Uma página desenha-se de trás para
 * a frente: o fundo, as tarjas, as fotografias, e o texto por cima — se fosse
 * ao contrário não se via o texto. Tinta a seguir ao texto, no mesmo sítio do
 * texto, é o desenho a andar para trás, e isso não acontece por acaso num
 * documento composto de uma vez.
 *
 * ## Porque é que se guarda um ponto e não uma caixa
 *
 * De cada operação de escrita guarda-se o **ponto onde o texto arranca**, que
 * sai directamente da matriz de texto e é exacto. Não se guarda a caixa que o
 * texto ocupa porque para a saber era preciso somar as larguras dos glifos da
 * fonte — o `leitura/texto-pdf.ts` faz-o, e são trezentas linhas —, e uma caixa
 * estimada faria este achado depender de uma estimativa. Perde-se com isso o
 * rectângulo que tapa o meio de uma linha sem lhe tapar o princípio; ganha-se
 * que o que se afirma é medido. Falhar um caso custa uma revisão que não
 * aconteceu; inventar um custa a acusação de um criador honesto.
 *
 * ## Os quatro casos que estão de fora, e não por esquecimento
 *
 * 1. **Texto invisível não conta.** O modo de desenho de texto 3 é o que os
 *    programas de reconhecimento de caracteres usam para pôr o texto lido por
 *    baixo — ou por cima — da imagem digitalizada. Sem isto, **todo** o Livro
 *    Azul passado num multifunções com OCR aparecia aqui, que é precisamente o
 *    ficheiro mais comum e mais honesto que este site recebe.
 * 2. **Opacidade zero não conta.** Pintar transparente não tapa nada.
 * 3. **Só rectângulos e imagens.** Um traçado com curvas por cima de um campo
 *    passa despercebido. Preferi perdê-lo a calcular mal a área de uma curva.
 * 4. **Anotações não entram.** Vivem fora do fluxo de desenho da página, e um
 *    leitor de PDF mostra-as como sendo anotações — quem revê vê-as na mesma.
 */

import type { AchadoPdfTintaPorCimaDeTexto, TintaPorCima } from "./achados";
import {
  MAX_PAGINAS,
  referencia,
  valorDe,
  vistaLatin1,
  type ObjectoCru,
  type PdfCru,
} from "./pdf-cru";

/** Um fluxo de desenho com mais operações do que isto não é um Livro Azul. */
const MAX_SIMBOLOS = 400_000;
/** Formulários dentro de formulários: oito níveis chegam a qualquer desenho. */
const MAX_FUNDO = 8;
/** Marcas e pontos guardados por página. Além disto, conta-se mas não se guarda. */
const MAX_MARCAS = 4_000;
const MAX_PONTOS = 40_000;
/** Marcas nomeadas no achado. O painel mostra uma lista, não um despejo. */
const MAX_MARCAS_RELATADAS = 20;

/**
 * A margem, em pontos, que uma marca tem de exceder o ponto de texto.
 *
 * Um fundo de célula de tabela e o texto dela partilham o canto com frequência,
 * e uma comparação exacta contaria o toque como cobertura. Meio ponto é menos
 * de um décimo de milímetro: não deixa passar nada que tape um campo, e apara
 * os encostos.
 */
const FOLGA = 0.5;

type Matriz = readonly [number, number, number, number, number, number];

const IDENTIDADE: Matriz = [1, 0, 0, 1, 0, 0];

/** `a` aplicada antes de `b`. */
function compor(a: Matriz, b: Matriz): Matriz {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

function aplicar(m: Matriz, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

type Caixa = [number, number, number, number];

/** A caixa que um rectângulo em coordenadas de utilizador ocupa na página. */
function caixaDe(m: Matriz, x: number, y: number, largura: number, altura: number): Caixa {
  const cantos = [
    aplicar(m, x, y),
    aplicar(m, x + largura, y),
    aplicar(m, x, y + altura),
    aplicar(m, x + largura, y + altura),
  ];
  const xs = cantos.map((c) => c[0]);
  const ys = cantos.map((c) => c[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function finita(caixa: Caixa): boolean {
  return caixa.every((v) => Number.isFinite(v));
}

// ─── O tokenizador ───────────────────────────────────────────────────────────

type Simbolo =
  | { especie: "numero"; valor: number }
  | { especie: "nome"; valor: string }
  | { especie: "operador"; valor: string }
  | { especie: "outro" };

const BRANCO = new Set([" ", "\t", "\r", "\n", "\f", "\0"]);
const FIM_DE_NOME = new Set([...BRANCO, "/", "[", "]", "<", ">", "(", ")", "{", "}", "%"]);

/**
 * Os símbolos de um fluxo de desenho.
 *
 * Não monta objectos: os operandos que interessam são números e nomes, e tudo o
 * resto — strings, dicionários, arrays — só precisa de ser **saltado sem
 * rebentar**. Uma string de texto pode ter um `)` escapado lá dentro, um
 * dicionário pode ter outro dentro, e uma imagem embutida traz bytes crus no
 * meio do fluxo; são esses três casos que aqui se tratam, e nenhum outro.
 */
function* simbolos(fluxo: string): Generator<Simbolo> {
  let i = 0;
  let contados = 0;

  while (i < fluxo.length && contados < MAX_SIMBOLOS) {
    const c = fluxo[i];

    if (BRANCO.has(c)) {
      i += 1;
      continue;
    }

    if (c === "%") {
      const fim = fluxo.indexOf("\n", i);
      i = fim === -1 ? fluxo.length : fim + 1;
      continue;
    }

    contados += 1;

    if (c === "(") {
      let fundo = 0;
      while (i < fluxo.length) {
        if (fluxo[i] === "\\") i += 2;
        else if (fluxo[i] === "(") {
          fundo += 1;
          i += 1;
        } else if (fluxo[i] === ")") {
          fundo -= 1;
          i += 1;
          if (fundo === 0) break;
        } else i += 1;
      }
      yield { especie: "outro" };
      continue;
    }

    if (fluxo.startsWith("<<", i)) {
      let fundo = 0;
      while (i < fluxo.length) {
        if (fluxo.startsWith("<<", i)) {
          fundo += 1;
          i += 2;
        } else if (fluxo.startsWith(">>", i)) {
          fundo -= 1;
          i += 2;
          if (fundo === 0) break;
        } else i += 1;
      }
      yield { especie: "outro" };
      continue;
    }

    if (c === "<") {
      const fim = fluxo.indexOf(">", i);
      i = fim === -1 ? fluxo.length : fim + 1;
      yield { especie: "outro" };
      continue;
    }

    if (c === "[" || c === "]" || c === "{" || c === "}") {
      i += 1;
      yield { especie: "outro" };
      continue;
    }

    if (c === "/") {
      let j = i + 1;
      while (j < fluxo.length && !FIM_DE_NOME.has(fluxo[j])) j += 1;
      const nome = fluxo.slice(i + 1, j);
      i = j;
      yield { especie: "nome", valor: nome };
      continue;
    }

    if ((c >= "0" && c <= "9") || c === "-" || c === "+" || c === ".") {
      let j = i;
      while (j < fluxo.length && /[-+.\d eE]/.test(fluxo[j]) && !BRANCO.has(fluxo[j])) j += 1;
      const bruto = fluxo.slice(i, j);
      i = j === i ? i + 1 : j;
      const valor = Number.parseFloat(bruto);
      yield Number.isFinite(valor) ? { especie: "numero", valor } : { especie: "outro" };
      continue;
    }

    let j = i;
    while (j < fluxo.length && /[A-Za-z*'"]/.test(fluxo[j])) j += 1;
    if (j === i) {
      i += 1;
      yield { especie: "outro" };
      continue;
    }
    const operador = fluxo.slice(i, j);
    i = j;

    // Uma imagem embutida traz bytes crus entre `ID` e `EI`. Tokenizá-los daria
    // lixo e podia dar um ciclo; salta-se o bloco inteiro e conta-se a imagem.
    if (operador === "BI") {
      const marca = fluxo.indexOf("ID", i);
      let fim = marca === -1 ? -1 : fluxo.indexOf("EI", marca + 2);
      if (fim === -1) fim = fluxo.length;
      i = Math.min(fluxo.length, fim + 2);
      yield { especie: "operador", valor: "BI" };
      continue;
    }

    yield { especie: "operador", valor: operador };
  }
}

// ─── O estado do desenho ─────────────────────────────────────────────────────

interface Estado {
  ctm: Matriz;
  alfa: number;
  /** A cor de preenchimento, como o ficheiro a declara. */
  cor?: string;
  /** O modo de desenho de texto. 3 e 7 não pintam nada. */
  modoDeTexto: number;
}

interface Marca {
  especie: "imagem" | "preenchimento";
  cor?: string;
  caixa: Caixa;
  ordem: number;
}

interface Ponto {
  x: number;
  y: number;
  ordem: number;
}

interface Colheita {
  marcas: Marca[];
  pontos: Ponto[];
  ordem: number;
}

/** O `/ca` de um `/ExtGState`, quando o há. `1` é o valor por omissão. */
function alfaDoExtGState(pdf: PdfCru, recursos: string | null, nome: string): number {
  const tabela = pdf.resolver(valorDe(recursos ?? "", "ExtGState"));
  if (!tabela) return 1;
  const entrada = pdf.resolver(valorDe(tabela, nome));
  if (!entrada) return 1;
  const ca = valorDe(entrada, "ca");
  if (ca === null) return 1;
  const valor = Number.parseFloat(ca);
  return Number.isFinite(valor) ? valor : 1;
}

function xobjectDe(pdf: PdfCru, recursos: string | null, nome: string): ObjectoCru | null {
  const tabela = pdf.resolver(valorDe(recursos ?? "", "XObject"));
  if (!tabela) return null;
  return pdf.objecto(referencia(valorDe(tabela, nome)));
}

function numeros(operandos: readonly Simbolo[], quantos: number): number[] | null {
  const cauda = operandos.slice(-quantos);
  if (cauda.length < quantos) return null;
  const valores: number[] = [];
  for (const s of cauda) {
    if (s.especie !== "numero") return null;
    valores.push(s.valor);
  }
  return valores;
}

function corLegivel(nome: string, valores: readonly number[]): string {
  return `${nome} ${valores.map((v) => Number(v.toFixed(3))).join(" ")}`;
}

/**
 * Percorre um fluxo de desenho e colhe as marcas e os pontos de texto.
 *
 * Recorre por formulários, que é onde muitos produtores metem quase todo o
 * desenho. Recorrer é a única maneira de manter a **ordem** coerente entre o
 * que está dentro e o que está fora: um formulário desenhado a seguir ao texto
 * da página tem lá dentro tinta que vem depois desse texto, e vista de fora
 * seria uma operação só.
 */
function percorrer(
  pdf: PdfCru,
  fluxo: string,
  recursos: string | null,
  colheita: Colheita,
  estadoInicial: Estado,
  fundo: number,
  visitados: Set<string>
): void {
  let estado: Estado = { ...estadoInicial };
  const pilha: Estado[] = [];
  let operandos: Simbolo[] = [];

  // O traçado em construção. Só se guardam rectângulos; um `m`/`l`/`c` conta
  // para o traçado mas não produz caixa nenhuma, e isso é uma perda assumida.
  let rectangulos: Caixa[] = [];

  let tm: Matriz = IDENTIDADE;
  let tlm: Matriz = IDENTIDADE;
  let entrelinha = 0;

  const pintar = (especie: "imagem" | "preenchimento", caixa: Caixa, cor?: string) => {
    if (estado.alfa <= 0) return;
    if (!finita(caixa)) return;
    if (caixa[2] - caixa[0] <= 0 || caixa[3] - caixa[1] <= 0) return;
    colheita.ordem += 1;
    if (colheita.marcas.length < MAX_MARCAS) {
      colheita.marcas.push({ especie, caixa, ordem: colheita.ordem, ...(cor ? { cor } : {}) });
    }
  };

  const escrever = () => {
    // Modo 3 (invisível) e 7 (só recorte) não põem tinta nenhuma na página.
    // É o que a camada de texto de um digitalizador com OCR usa.
    if (estado.modoDeTexto === 3 || estado.modoDeTexto === 7) return;
    const [x, y] = aplicar(compor(tm, estado.ctm), 0, 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    colheita.ordem += 1;
    if (colheita.pontos.length < MAX_PONTOS) colheita.pontos.push({ x, y, ordem: colheita.ordem });
  };

  for (const simbolo of simbolos(fluxo)) {
    if (simbolo.especie !== "operador") {
      operandos.push(simbolo);
      if (operandos.length > 64) operandos = operandos.slice(-64);
      continue;
    }

    switch (simbolo.valor) {
      case "q":
        pilha.push({ ...estado });
        break;
      case "Q": {
        const anterior = pilha.pop();
        if (anterior) estado = anterior;
        break;
      }
      case "cm": {
        const v = numeros(operandos, 6);
        if (v) estado.ctm = compor([v[0], v[1], v[2], v[3], v[4], v[5]], estado.ctm);
        break;
      }
      case "gs": {
        const nome = operandos[operandos.length - 1];
        if (nome?.especie === "nome") estado.alfa = alfaDoExtGState(pdf, recursos, nome.valor);
        break;
      }
      case "g": {
        const v = numeros(operandos, 1);
        estado.cor = v ? corLegivel("cinzento", v) : undefined;
        break;
      }
      case "rg": {
        const v = numeros(operandos, 3);
        estado.cor = v ? corLegivel("rgb", v) : undefined;
        break;
      }
      case "k": {
        const v = numeros(operandos, 4);
        estado.cor = v ? corLegivel("cmyk", v) : undefined;
        break;
      }
      case "cs":
      case "sc":
      case "scn":
        // Um espaço de cor nomeado, um padrão ou uma separação: sabe-se que a
        // cor mudou e não se sabe para qual. Dizer «branco» aqui era inventar.
        estado.cor = undefined;
        break;
      case "re": {
        const v = numeros(operandos, 4);
        if (v && rectangulos.length < MAX_MARCAS) {
          rectangulos.push(caixaDe(estado.ctm, v[0], v[1], v[2], v[3]));
        }
        break;
      }
      case "f":
      case "F":
      case "f*":
      case "B":
      case "B*":
      case "b":
      case "b*":
        for (const caixa of rectangulos) pintar("preenchimento", caixa, estado.cor);
        rectangulos = [];
        break;
      case "n":
      case "S":
      case "s":
        // `n` é o fim de um traçado que só serviu para recortar; `S` e `s`
        // desenham uma linha, e uma linha não tapa uma área.
        rectangulos = [];
        break;
      case "BT":
        tm = IDENTIDADE;
        tlm = IDENTIDADE;
        break;
      case "Tr": {
        const v = numeros(operandos, 1);
        if (v) estado.modoDeTexto = v[0];
        break;
      }
      case "TL": {
        const v = numeros(operandos, 1);
        if (v) entrelinha = v[0];
        break;
      }
      case "Tm": {
        const v = numeros(operandos, 6);
        if (v) {
          tm = [v[0], v[1], v[2], v[3], v[4], v[5]];
          tlm = tm;
        }
        break;
      }
      case "TD": {
        const v = numeros(operandos, 2);
        if (v) entrelinha = -v[1];
        if (v) {
          tlm = compor([1, 0, 0, 1, v[0], v[1]], tlm);
          tm = tlm;
        }
        break;
      }
      case "Td": {
        const v = numeros(operandos, 2);
        if (v) {
          tlm = compor([1, 0, 0, 1, v[0], v[1]], tlm);
          tm = tlm;
        }
        break;
      }
      case "T*":
        tlm = compor([1, 0, 0, 1, 0, -entrelinha], tlm);
        tm = tlm;
        break;
      case "Tj":
      case "TJ":
        escrever();
        break;
      case "'":
      case '"':
        tlm = compor([1, 0, 0, 1, 0, -entrelinha], tlm);
        tm = tlm;
        escrever();
        break;
      case "BI":
        pintar("imagem", caixaDe(estado.ctm, 0, 0, 1, 1));
        break;
      case "Do": {
        const nome = operandos[operandos.length - 1];
        if (nome?.especie !== "nome") break;
        const alvo = xobjectDe(pdf, recursos, nome.valor);
        if (!alvo) break;

        if (/\/Subtype\s*\/Image\b/.test(alvo.dicionario)) {
          pintar("imagem", caixaDe(estado.ctm, 0, 0, 1, 1));
          break;
        }
        if (!/\/Subtype\s*\/Form\b/.test(alvo.dicionario)) break;
        if (fundo >= MAX_FUNDO || visitados.has(alvo.chave)) break;

        const dados = pdf.dados(alvo);
        if (!dados) break;

        const matriz = valorDe(alvo.dicionario, "Matrix");
        const partes = matriz ? (matriz.match(/-?[\d.]+/g) ?? []).map(Number) : [];
        const propria: Matriz =
          partes.length === 6 && partes.every(Number.isFinite)
            ? [partes[0], partes[1], partes[2], partes[3], partes[4], partes[5]]
            : IDENTIDADE;

        visitados.add(alvo.chave);
        percorrer(
          pdf,
          vistaLatin1(dados),
          pdf.resolver(valorDe(alvo.dicionario, "Resources")) ?? recursos,
          colheita,
          { ...estado, ctm: compor(propria, estado.ctm) },
          fundo + 1,
          visitados
        );
        visitados.delete(alvo.chave);
        break;
      }
      default:
        break;
    }

    operandos = [];
  }
}

// ─── As páginas ──────────────────────────────────────────────────────────────

function recursosDaPagina(pdf: PdfCru, pagina: ObjectoCru): string | null {
  let actual: ObjectoCru | null = pagina;
  for (let salto = 0; actual && salto < 32; salto += 1) {
    const recursos = pdf.resolver(valorDe(actual.dicionario, "Resources"));
    if (recursos) return recursos;
    actual = pdf.objecto(referencia(valorDe(actual.dicionario, "Parent")));
  }
  return null;
}

function conteudoDaPagina(pdf: PdfCru, pagina: ObjectoCru): string {
  const conteudos = valorDe(pagina.dicionario, "Contents");
  if (!conteudos) return "";

  const chaves: string[] = [];
  const directa = referencia(conteudos);
  if (directa) {
    const alvo = pdf.objecto(directa);
    if (alvo && alvo.inicioDados === undefined && alvo.dicionario.trim().startsWith("[")) {
      for (const m of alvo.dicionario.matchAll(/\d{1,10}\s+\d{1,5}\s+R/g)) {
        const chave = referencia(m[0]);
        if (chave) chaves.push(chave);
      }
    } else {
      chaves.push(directa);
    }
  } else if (conteudos.trim().startsWith("[")) {
    for (const m of conteudos.matchAll(/\d{1,10}\s+\d{1,5}\s+R/g)) {
      const chave = referencia(m[0]);
      if (chave) chaves.push(chave);
    }
  }

  const partes: string[] = [];
  for (const chave of chaves) {
    const objecto = pdf.objecto(chave);
    if (!objecto) continue;
    const dados = pdf.dados(objecto);
    if (dados) partes.push(vistaLatin1(dados));
  }
  // O PDF manda tratar os vários fluxos de uma página como um só, e há
  // produtores que cortam a meio de um operador.
  return partes.join("\n");
}

/** As páginas do documento, uma vez cada, na definição que fica por cima. */
function paginasDo(pdf: PdfCru): ObjectoCru[] {
  const chaves: string[] = [];
  const vistas = new Set<string>();
  for (const objecto of pdf.objectos) {
    if (vistas.has(objecto.chave)) continue;
    vistas.add(objecto.chave);
    chaves.push(objecto.chave);
  }

  const paginas: ObjectoCru[] = [];
  for (const chave of chaves) {
    if (paginas.length >= MAX_PAGINAS) break;
    const objecto = pdf.objecto(chave);
    if (!objecto) continue;
    if (!/\/Type\s*\/Page(?![sA-Za-z])/.test(objecto.dicionario)) continue;
    paginas.push(objecto);
  }
  return paginas;
}

function cobre(marca: Marca, ponto: Ponto): boolean {
  return (
    ponto.ordem < marca.ordem &&
    ponto.x > marca.caixa[0] + FOLGA &&
    ponto.x < marca.caixa[2] - FOLGA &&
    ponto.y > marca.caixa[1] + FOLGA &&
    ponto.y < marca.caixa[3] - FOLGA
  );
}

/** Uma caixa em pontos, arredondada, para caber num painel sem seis decimais. */
function arredondar(caixa: Caixa): Caixa {
  return [Math.round(caixa[0]), Math.round(caixa[1]), Math.round(caixa[2]), Math.round(caixa[3])];
}

export function examinarCamadas(pdf: PdfCru): AchadoPdfTintaPorCimaDeTexto | null {
  const relatadas: TintaPorCima[] = [];
  const paginasAfectadas: number[] = [];
  let total = 0;

  const paginas = paginasDo(pdf);
  for (let n = 0; n < paginas.length; n += 1) {
    const fluxo = conteudoDaPagina(pdf, paginas[n]);
    if (!fluxo) continue;

    const colheita: Colheita = { marcas: [], pontos: [], ordem: 0 };
    try {
      percorrer(
        pdf,
        fluxo,
        recursosDaPagina(pdf, paginas[n]),
        colheita,
        { ctm: IDENTIDADE, alfa: 1, modoDeTexto: 0 },
        0,
        new Set()
      );
    } catch {
      // Uma página que não se soube percorrer não deita fora as outras. O que
      // não se pode é dar por examinada uma página que rebentou a meio.
      continue;
    }

    let daPagina = 0;
    for (const marca of colheita.marcas) {
      let cobertos = 0;
      for (const ponto of colheita.pontos) if (cobre(marca, ponto)) cobertos += 1;
      if (cobertos === 0) continue;
      daPagina += cobertos;
      if (relatadas.length < MAX_MARCAS_RELATADAS) {
        relatadas.push({
          pagina: n + 1,
          especie: marca.especie,
          caixa: arredondar(marca.caixa),
          pontosDeTextoCobertos: cobertos,
          ...(marca.cor ? { cor: marca.cor } : {}),
        });
      }
    }

    if (daPagina > 0) {
      total += daPagina;
      paginasAfectadas.push(n + 1);
    }
  }

  if (total === 0) return null;

  const imagens = relatadas.filter((m) => m.especie === "imagem").length;
  const preenchimentos = relatadas.length - imagens;
  const partes: string[] = [];
  if (preenchimentos > 0) {
    partes.push(
      preenchimentos === 1 ? "1 preenchimento opaco" : `${preenchimentos} preenchimentos opacos`
    );
  }
  if (imagens > 0) partes.push(imagens === 1 ? "1 imagem" : `${imagens} imagens`);

  // A frase põe os pontos de texto como sujeito, e não as marcas. Não é só
  // gosto: com as marcas à frente, o verbo tem de concordar em género com uma
  // lista que pode misturar «preenchimento» e «imagem», e a frase sai errada
  // exactamente no caso misto.
  const um = total === 1;
  return {
    tipo: "pdf_tinta_por_cima_de_texto",
    observacao:
      `${total} ${um ? "ponto de arranque de texto visível ficou" : "pontos de arranque de texto visível ficaram"} ` +
      `por baixo de tinta desenhada depois ${um ? "dele" : "deles"} — ${partes.join(" e ")} — ` +
      `${paginasAfectadas.length === 1 ? "na página" : "nas páginas"} ${paginasAfectadas.join(", ")}. ` +
      `O texto por baixo continua no ficheiro e continua a ser legível pela extracção de texto.`,
    explicacaoInocente:
      "Nem toda a tinta por cima de texto é uma tapadeira. Um selo, um logótipo, uma " +
      "assinatura digitalizada ou uma tarja colocados sobre um cabeçalho caem aqui; um " +
      "programa de composição que desenhe o realce de uma linha depois do texto dela, " +
      "também; e uma ocultação feita pela própria entidade emissora — que é uma coisa " +
      "legítima — tem exactamente esta forma. O que se mediu foi a ordem do desenho, não a " +
      "intenção de quem o fez.",
    marcas: relatadas,
    pontosDeTextoCobertos: total,
    paginas: paginasAfectadas,
  };
}
