/**
 * O que um PDF conta sobre a própria vida: quantas vezes foi fechado, que
 * programas lhe mexeram, e se alguém o assinou.
 *
 * Os três exames deste ficheiro respondem à mesma pergunta por três caminhos
 * independentes — **este ficheiro é o que saiu da máquina que o fez, ou passou
 * por mais mãos?** — e é de propósito que são independentes: um PDF a que se
 * apagaram os metadados continua a ter os remates de cada gravação, e um a que
 * se reescreveu o ficheiro inteiro para os apagar perde os remates mas fica com
 * um `xmpMM:History` a contar tudo.
 *
 * Nenhum dos três conclui nada. Contam-se remates, copiam-se cadeias e
 * mede-se um intervalo de bytes.
 */

import type {
  AchadoPdfAssinatura,
  AchadoPdfCampoPorAssinar,
  AchadoPdfGuardadoMaisDoQueUmaVez,
  AchadoPdfHistoricoDeEdicao,
  AchadoPdfMetadados,
  CampoDeMetadados,
} from "./achados";
import { reconhecerFerramentas } from "./ferramentas";
import { dataPdfParaIso, textoDeStringPdf, valorDe, type PdfCru } from "./pdf-cru";
import { campoXmp, distintos, pareceXmp, valoresXmp } from "./xmp";

/** Vinte números de objecto chegam para se perceber o padrão. */
const MAX_OBJECTOS_REDEFINIDOS = 20;
/** Um ficheiro honesto tem um ou dois dicionários de informação; dez é folga. */
const MAX_DICIONARIOS_DE_INFO = 10;
/** Cada assinatura é uma linha no painel. Mais do que isto é um documento raro. */
const MAX_ASSINATURAS = 12;

// ─── Quantas vezes o ficheiro foi fechado ────────────────────────────────────

/**
 * O remate de uma revisão: `startxref`, um deslocamento, `%%EOF`.
 *
 * Conta-se o remate inteiro e não só o `%%EOF` porque `%%EOF` são cinco bytes
 * que aparecem por acaso dentro de um stream comprimido de vez em quando, e um
 * exame que se enganasse aí levantava a mão em ficheiros bons. `startxref`
 * seguido de algarismos seguido de `%%EOF` não aparece por acaso.
 */
const REMATE = /startxref[\s\r\n]*\d{1,12}[\s\r\n]*%%EOF/g;

function contarOcorrencias(vista: string, padrao: RegExp): number {
  let total = 0;
  const copia = new RegExp(
    padrao.source,
    padrao.flags.includes("g") ? padrao.flags : `${padrao.flags}g`
  );
  for (let m = copia.exec(vista); m !== null; m = copia.exec(vista)) total += 1;
  return total;
}

/**
 * As tabelas de referências cruzadas que apontam para uma anterior.
 *
 * Um `/Prev` num trailer, ou num dicionário de um stream `/Type /XRef`, quer
 * dizer «há mais tabela antes desta». É a mesma afirmação que os remates fazem,
 * vista do outro lado do ficheiro, e vale a pena tê-la porque sobrevive a
 * ficheiros em que o `%%EOF` do meio se estragou.
 */
function contarTabelasEncadeadas(pdf: PdfCru): number {
  let total = 0;

  for (const objecto of pdf.objectos) {
    if (!/\/Type\s*\/XRef\b/.test(objecto.dicionario)) continue;
    if (valorDe(objecto.dicionario, "Prev") !== null) total += 1;
  }

  let i = pdf.vista.indexOf("trailer");
  while (i !== -1) {
    // O bloco tem de acabar no `%%EOF` desta revisão. Sem esse corte, um
    // ficheiro guardado duas vezes lê o `/Prev` da revisão **seguinte** a
    // partir do trailer da primeira, e a mesma tabela conta duas vezes.
    const fimDaRevisao = pdf.vista.indexOf("%%EOF", i);
    const limite = fimDaRevisao === -1 ? i + 2048 : Math.min(fimDaRevisao, i + 2048);
    if (valorDe(pdf.vista.slice(i, limite), "Prev") !== null) total += 1;
    i = pdf.vista.indexOf("trailer", i + 7);
  }

  return total;
}

/**
 * O ficheiro está optimizado para leitura na web.
 *
 * Isto tem de ser detectado, e não é um pormenor: um PDF linearizado escreve
 * **duas** tabelas de referências cruzadas e **dois** `%%EOF` sem nunca ter
 * havido edição nenhuma — a primeira tabela serve para o leitor mostrar a
 * página um antes de ter o ficheiro todo. Sem isto, todo o PDF que tenha
 * passado por um servidor web aparecia no painel como «guardado duas vezes», e
 * um aviso que dispara em metade dos ficheiros bons deixa de ser um aviso.
 */
function estaLinearizado(vista: string): boolean {
  return /\/Linearized\b/.test(vista.slice(0, 4096));
}

/** Os números de objecto que aparecem definidos mais do que uma vez. */
function objectosRedefinidos(pdf: PdfCru): string[] {
  const contagem = new Map<string, number>();
  for (const objecto of pdf.objectos) {
    contagem.set(objecto.chave, (contagem.get(objecto.chave) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .filter(([, vezes]) => vezes > 1)
    .map(([chave]) => chave)
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
    .slice(0, MAX_OBJECTOS_REDEFINIDOS);
}

/**
 * Bytes a seguir ao último `%%EOF` que não pertencem ao fim do ficheiro.
 *
 * A quebra de linha logo a seguir ao `%%EOF` é parte da linha e não conta — sem
 * este desconto, **todos** os PDFs bem formados apareciam com «um byte a mais»,
 * que é ruído puro. O que conta é o que vem depois disso.
 */
function bytesDepoisDoUltimoFim(vista: string): number {
  const ultimo = vista.lastIndexOf("%%EOF");
  if (ultimo === -1) return 0;
  return vista
    .slice(ultimo + 5)
    .replace(/^\r?\n/, "")
    .replace(/[\s\r\n\0]+$/, "").length;
}

/**
 * Um PDF que foi guardado mais do que uma vez, quando o foi.
 *
 * Devolve `null` num ficheiro escrito de uma assentada, que é o caso normal e
 * não é um achado — um painel que carimbasse todos os documentos com «escrito
 * uma vez» estaria a gastar a atenção de quem revê em confirmações.
 */
export function examinarRevisoes(pdf: PdfCru): AchadoPdfGuardadoMaisDoQueUmaVez | null {
  const linearizado = estaLinearizado(pdf.vista);
  const remates = contarOcorrencias(pdf.vista, REMATE);
  // O par que a linearização produz sozinha não conta como uma gravação a mais.
  const revisoes = Math.max(1, remates - (linearizado ? 1 : 0));
  const repetidos = objectosRedefinidos(pdf);
  const encadeadas = contarTabelasEncadeadas(pdf);
  const sobras = bytesDepoisDoUltimoFim(pdf.vista);

  if (revisoes < 2 && repetidos.length === 0 && sobras === 0) return null;

  const partes: string[] = [];
  if (revisoes >= 2) partes.push(`o ficheiro tem ${revisoes} remates de fim`);
  if (encadeadas > 0) {
    partes.push(
      `${encadeadas} ${encadeadas === 1 ? "tabela aponta" : "tabelas apontam"} para uma tabela anterior`
    );
  }
  if (repetidos.length > 0) {
    partes.push(
      `${repetidos.length} ${repetidos.length === 1 ? "objecto está definido" : "objectos estão definidos"} mais do que uma vez`
    );
  }
  if (sobras > 0) partes.push(`sobram ${sobras} bytes depois do último %%EOF`);
  if (linearizado) partes.push("está optimizado para leitura na web, o que explica um dos remates");

  return {
    tipo: "pdf_guardado_mais_do_que_uma_vez",
    observacao: `${partes.join("; ")}.`,
    explicacaoInocente:
      "Guardar um PDF sem o reescrever de raiz — uma actualização incremental — é o " +
      "comportamento normal de quase todos os programas que mexem em PDFs. Preencher um " +
      "formulário no Acrobat, assinar digitalmente, rodar uma página, acrescentar uma " +
      "anotação ou juntar um marcador acrescentam todos um remate destes, e o conteúdo " +
      "anterior fica intacto por baixo. Que o ficheiro foi alterado depois de criado é " +
      "um facto; o que foi alterado não se sabe daqui.",
    revisoes,
    linearizado,
    tabelasEncadeadas: encadeadas,
    objectosRedefinidos: repetidos,
    bytesDepoisDoFim: sobras,
  };
}

// ─── Quem o fez ──────────────────────────────────────────────────────────────

const CAMPOS_DE_INFO = [
  "Title",
  "Author",
  "Subject",
  "Keywords",
  "Creator",
  "Producer",
  "CreationDate",
  "ModDate",
] as const;

const CAMPOS_DE_DATA = new Set<string>(["CreationDate", "ModDate"]);

function lerDicionarioDeInfo(dicionario: string): CampoDeMetadados[] {
  const campos: CampoDeMetadados[] = [];
  for (const chave of CAMPOS_DE_INFO) {
    const cru = valorDe(dicionario, chave);
    if (cru === null) continue;
    const valor = textoDeStringPdf(cru);
    if (!valor) continue;
    const iso = CAMPOS_DE_DATA.has(chave) ? dataPdfParaIso(valor) : null;
    campos.push(iso ? { campo: chave, valor, iso } : { campo: chave, valor });
  }
  return campos;
}

/**
 * Todos os dicionários de informação do ficheiro, e não só o que está em uso.
 *
 * Procura-se por duas vias porque as duas falham em sítios diferentes. A via
 * boa é seguir o `/Info` do trailer; a via de recurso é reconhecer um
 * dicionário de informação pelo conteúdo dele, e serve para os ficheiros cujo
 * trailer se estragou — que são justamente os que mais vale a pena examinar.
 *
 * Vindos os dois, dedupam-se pelo conteúdo. Dois dicionários **diferentes** no
 * mesmo ficheiro é que é o achado: uma gravação incremental substitui o
 * dicionário e deixa o antigo lá dentro, com o nome do programa que fez o
 * original.
 */
function acharDicionariosDeInfo(pdf: PdfCru): CampoDeMetadados[][] {
  const candidatos: string[] = [];

  for (const m of pdf.vista.matchAll(/\/Info\s+(\d{1,10})\s+(\d{1,5})\s+R/g)) {
    const objecto = pdf.objecto(`${Number(m[1])} ${Number(m[2])}`);
    if (objecto) candidatos.push(objecto.dicionario);
  }

  for (const objecto of pdf.objectos) {
    if (objecto.inicioDados !== undefined) continue;
    if (/\/Type\s*\//.test(objecto.dicionario)) continue;
    if (!/\/(Producer|Creator|CreationDate|ModDate)\b/.test(objecto.dicionario)) continue;
    candidatos.push(objecto.dicionario);
  }

  const vistos = new Set<string>();
  const saida: CampoDeMetadados[][] = [];
  for (const dicionario of candidatos) {
    if (saida.length >= MAX_DICIONARIOS_DE_INFO) break;
    const campos = lerDicionarioDeInfo(dicionario);
    if (campos.length === 0) continue;
    const marca = JSON.stringify(campos);
    if (vistos.has(marca)) continue;
    vistos.add(marca);
    saida.push(campos);
  }

  return saida;
}

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/** Dias inteiros entre a criação e a última modificação, quando as duas se leram. */
function diasEntre(campos: readonly CampoDeMetadados[]): number | undefined {
  const criacao = campos.find((c) => c.campo === "CreationDate")?.iso;
  const modificacao = campos.find((c) => c.campo === "ModDate")?.iso;
  if (!criacao || !modificacao) return undefined;
  const delta = Date.parse(modificacao) - Date.parse(criacao);
  if (!Number.isFinite(delta) || delta <= 0) return undefined;
  return Math.floor(delta / MILISSEGUNDOS_POR_DIA);
}

export function examinarMetadados(pdf: PdfCru): AchadoPdfMetadados | null {
  const dicionarios = acharDicionariosDeInfo(pdf);
  if (dicionarios.length === 0) return null;

  const campos = dicionarios.flat();
  const dias = diasEntre(dicionarios[dicionarios.length - 1]);
  const ferramentas = reconhecerFerramentas(
    campos.filter((c) => c.campo === "Producer" || c.campo === "Creator")
  );

  const partes: string[] = [];
  const produtor = campos.find((c) => c.campo === "Producer")?.valor;
  const criador = campos.find((c) => c.campo === "Creator")?.valor;
  if (produtor) partes.push(`o produtor declarado é «${produtor}»`);
  if (criador && criador !== produtor) partes.push(`o criador declarado é «${criador}»`);
  if (dicionarios.length > 1) {
    partes.push(`o ficheiro traz ${dicionarios.length} dicionários de informação diferentes`);
  }
  if (dias !== undefined) {
    partes.push(
      dias === 0
        ? "a data de modificação é posterior à de criação no mesmo dia"
        : `a data de modificação é ${dias} ${dias === 1 ? "dia" : "dias"} posterior à de criação`
    );
  }
  if (partes.length === 0) partes.push("o ficheiro traz um dicionário de informação");

  return {
    tipo: "pdf_metadados",
    observacao: `${partes.join("; ")}.`,
    explicacaoInocente:
      "Estes campos são texto livre que o programa que gravou o ficheiro escreve sobre si " +
      "mesmo, e ninguém os verifica. Um multifunções de coudelaria escreve lá o nome do " +
      "firmware; um Livro Azul digitalizado e endireitado num editor de imagem fica com o " +
      "nome do editor, o que diz que a página estava torta e não que o conteúdo mudou. As " +
      "datas seguem o relógio do computador que gravou — um relógio mal acertado inverte-as " +
      "—, e uma modificação anos depois da criação é o que acontece quando se abre um " +
      "modelo antigo e se volta a guardar.",
    campos,
    ferramentas,
    ...(dias === undefined ? {} : { diasEntreCriacaoEModificacao: dias }),
    dicionarios: dicionarios.length,
  };
}

// ─── O histórico que o XMP guarda ────────────────────────────────────────────

/** Os blocos XMP do ficheiro, já inflados quando estavam comprimidos. */
export function acharXmp(pdf: PdfCru): string[] {
  const blocos: string[] = [];
  for (const objecto of pdf.objectos) {
    if (objecto.inicioDados === undefined) continue;
    if (!/\/Type\s*\/Metadata\b/.test(objecto.dicionario)) continue;
    const dados = pdf.dados(objecto);
    if (!dados) continue;
    let texto = "";
    const passo = 0x8000;
    for (let i = 0; i < dados.length; i += passo) {
      texto += String.fromCharCode(...dados.subarray(i, Math.min(i + passo, dados.length)));
    }
    if (pareceXmp(texto)) blocos.push(texto);
  }
  return blocos;
}

/**
 * O registo de edição que as ferramentas da Adobe escrevem dentro do ficheiro.
 *
 * Não é dedução nenhuma: o `xmpMM:History` é uma lista de acções com a
 * ferramenta e a data de cada uma, escrita pelo próprio programa. Lê-se e
 * copia-se.
 */
export function examinarHistoricoXmp(pdf: PdfCru): AchadoPdfHistoricoDeEdicao | null {
  for (const xmp of acharXmp(pdf)) {
    const historia = /<xmpMM:History>([\s\S]{0,60000}?)<\/xmpMM:History>/.exec(xmp);
    const derivado =
      campoXmp(xmp, "stRef:documentID") ??
      (/<xmpMM:DerivedFrom[\s\S]{0,400}?>/.test(xmp) ? "" : null);
    if (!historia && derivado === null) continue;

    const bloco = historia?.[1] ?? "";
    const operacoes = distintos(valoresXmp(bloco, "stEvt:action"));
    const ferramentas = distintos(valoresXmp(bloco, "stEvt:softwareAgent"));
    const entradas = Math.max(
      valoresXmp(bloco, "stEvt:action").length,
      (bloco.match(/<rdf:li\b/g) ?? []).length
    );
    if (entradas === 0 && !derivado) continue;

    const partes: string[] = [];
    if (entradas > 0) {
      partes.push(
        `o XMP guarda ${entradas} ${entradas === 1 ? "entrada" : "entradas"} de histórico`
      );
    }
    if (operacoes.length > 0) partes.push(`as acções registadas são ${operacoes.join(", ")}`);
    if (ferramentas.length > 0)
      partes.push(`as ferramentas nomeadas são ${ferramentas.join(", ")}`);
    if (derivado) partes.push(`declara ter derivado do documento ${derivado}`);

    return {
      tipo: "pdf_historico_de_edicao",
      observacao: `${partes.join("; ")}.`,
      explicacaoInocente:
        "As aplicações da Adobe escrevem este registo sozinhas a cada gravação, e registam " +
        "tanto «guardado» como «convertido de outro formato». Um documento composto no " +
        "InDesign, exportado para PDF e depois comprimido acumula três entradas sem ninguém " +
        "lhe ter mudado uma letra. «Derivado de» quer dizer que saiu de outro ficheiro, o " +
        "que é o que acontece sempre que se exporta.",
      entradas,
      ferramentas,
      operacoes,
      ...(derivado ? { derivadoDe: derivado } : {}),
    };
  }
  return null;
}

// ─── Assinaturas ─────────────────────────────────────────────────────────────

const CAMPOS_DE_ASSINATURA = ["Name", "Reason", "Location", "ContactInfo", "M"] as const;

function lerIntervaloAssinado(dicionario: string, bytesDoFicheiro: number): number | undefined {
  const cru = valorDe(dicionario, "ByteRange");
  if (cru === null) return undefined;
  const numeros = (cru.match(/-?\d+/g) ?? []).map(Number);
  if (numeros.length < 4) return undefined;
  const inicio = numeros[numeros.length - 2];
  const comprimento = numeros[numeros.length - 1];
  if (!Number.isFinite(inicio) || !Number.isFinite(comprimento)) return undefined;
  if (inicio < 0 || comprimento < 0) return undefined;
  const fim = inicio + comprimento;
  if (fim > bytesDoFicheiro) return undefined;
  return bytesDoFicheiro - fim;
}

/**
 * As assinaturas presentes, e só isso.
 *
 * Repete-se aqui porque é o ponto onde a tentação é maior: **não se diz que a
 * assinatura é válida**. Não se abre o PKCS#7, não se olha para o certificado,
 * não se contacta autoridade nenhuma. Um painel que dissesse «assinado
 * digitalmente» a verde estaria a emprestar a um ficheiro uma garantia que
 * ninguém verificou — e um ficheiro falso com uma assinatura auto-emitida
 * passaria a valer mais do que um verdadeiro sem nenhuma.
 */
export function examinarAssinaturas(pdf: PdfCru): AchadoPdfAssinatura[] {
  const achados: AchadoPdfAssinatura[] = [];

  for (const objecto of pdf.objectos) {
    if (achados.length >= MAX_ASSINATURAS) break;
    if (valorDe(objecto.dicionario, "ByteRange") === null) continue;
    if (!/\/(SubFilter|Contents)\b/.test(objecto.dicionario)) continue;

    const formato = textoDeStringPdf(valorDe(objecto.dicionario, "SubFilter"));
    const motor = textoDeStringPdf(valorDe(objecto.dicionario, "Filter"));
    const carimbo =
      /\/Type\s*\/DocTimeStamp\b/.test(objecto.dicionario) || formato.includes("RFC3161");

    const campos: CampoDeMetadados[] = [];
    for (const chave of CAMPOS_DE_ASSINATURA) {
      const valor = textoDeStringPdf(valorDe(objecto.dicionario, chave));
      if (!valor) continue;
      const iso = chave === "M" ? dataPdfParaIso(valor) : null;
      campos.push(iso ? { campo: chave, valor, iso } : { campo: chave, valor });
    }

    const fora = lerIntervaloAssinado(objecto.dicionario, pdf.bruto.length);

    const partes: string[] = [
      carimbo
        ? "o ficheiro traz um carimbo do tempo do documento"
        : "o ficheiro traz um dicionário de assinatura digital",
    ];
    if (formato) partes.push(`no formato ${formato}`);
    const nome = campos.find((c) => c.campo === "Name")?.valor;
    if (nome) partes.push(`em nome de «${nome}»`);
    if (fora !== undefined && fora > 0) {
      partes.push(`e há ${fora} bytes do ficheiro fora do intervalo que ela declara cobrir`);
    }

    achados.push({
      tipo: "pdf_assinatura",
      observacao: `${partes.join(", ")}. Não se verificou o certificado nem a validade — só se registou a presença.`,
      explicacaoInocente:
        "Uma assinatura presente não é uma assinatura verificada, e a presença dela não diz " +
        "nada sobre quem assinou: qualquer pessoa pode assinar um PDF com um certificado " +
        "que ela própria emitiu, e o ficheiro fica com esta mesma estrutura. Bytes fora do " +
        "intervalo assinado também têm a explicação normal — cada assinatura cobre o " +
        "ficheiro até ao momento em que foi feita, e uma segunda assinatura, um " +
        "preenchimento de campo ou um carimbo do tempo acrescentados depois ficam " +
        "legitimamente de fora do intervalo da primeira.",
      ...(formato ? { formato } : {}),
      ...(motor ? { motor } : {}),
      carimboDoTempo: carimbo,
      campos,
      ...(fora === undefined ? {} : { bytesForaDoIntervaloAssinado: fora }),
    });
  }

  return achados;
}

/** Campos de assinatura preparados e nunca preenchidos. */
export function examinarCamposPorAssinar(pdf: PdfCru): AchadoPdfCampoPorAssinar | null {
  let campos = 0;
  for (const objecto of pdf.objectos) {
    if (!/\/FT\s*\/Sig\b/.test(objecto.dicionario)) continue;
    // Um objecto que junte o campo e o valor traz o `/ByteRange` aqui mesmo.
    if (valorDe(objecto.dicionario, "V") !== null) continue;
    if (valorDe(objecto.dicionario, "ByteRange") !== null) continue;
    campos += 1;
  }
  if (campos === 0) return null;

  return {
    tipo: "pdf_campo_de_assinatura_por_assinar",
    observacao: `há ${campos} ${campos === 1 ? "campo de assinatura" : "campos de assinatura"} sem assinatura dentro.`,
    explicacaoInocente:
      "Um formulário oficial traz os campos de assinatura desenhados de fábrica, esteja ou " +
      "não alguém para os assinar. Um documento que se imprime e se assina à mão em papel " +
      "fica sempre assim.",
    campos,
  };
}
