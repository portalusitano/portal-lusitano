/**
 * O exame forense de um documento: a porta única.
 *
 * ## O que entra e o que sai
 *
 * Entram os bytes de **um** ficheiro e o MIME que o `tipo-real.ts` leu neles —
 * nunca o que o cliente declarou, pela segunda regra do `contrato.ts`. Sai uma
 * lista de factos, cada um com a sua explicação inocente. Não se lê a base de
 * dados, não se escreve nada, não se contacta serviço nenhum: é uma função pura
 * sobre um array de bytes, e é isso que a torna testável com ficheiros montados
 * em código em vez de amostras gravadas.
 *
 * **Nunca lança.** Um ficheiro que não se sabe abrir não é uma excepção do
 * sistema, é um resultado — e o resultado tem nome: `nao_examinado`, com a
 * razão. É a diferença entre «olhámos e não há nada» e «não olhámos», e essas
 * duas mandam quem revê fazer coisas opostas.
 *
 * ## A ordem em que os exames correm
 *
 * A ordem é a da mecânica — estrutura, metadados, assinaturas, desenho — e não
 * a de nenhuma importância. Pôr um achado à frente de outro seria dar-lhe um
 * peso, e o peso é de quem revê. Pela mesma razão não há totais, não há
 * contagem de «quantos achados», e uma lista de cinco achados brandos não é
 * pior do que uma de um.
 *
 * ## Onde isto corre
 *
 * Só no servidor: usa `node:zlib` e `node:crypto`. Nunca no navegador — os
 * documentos não saem do lado do servidor, e a primeira regra do `contrato.ts`
 * é essa.
 */

import { createHash } from "node:crypto";

import type { MimeDeDocumento } from "@/lib/documentos/contrato";

import type { Achado, AchadoNaoExaminado, CampoDeMetadados } from "./achados";
import { reconhecerFerramentas } from "./ferramentas";
import { lerImagem, type EstruturaJpeg } from "./imagem";
import { examinarCamadas } from "./pdf-camadas";
import { MAX_BYTES_PDF, PdfCru, vistaLatin1 } from "./pdf-cru";
import {
  examinarAssinaturas,
  examinarCamposPorAssinar,
  examinarHistoricoXmp,
  examinarMetadados,
  examinarRevisoes,
} from "./pdf-historia";

export type * from "./achados";
export { TIPOS_DE_ACHADO } from "./achados";
export { familiaDaFerramenta } from "./ferramentas";
export { lerExif, dataExifParaIso } from "./exif";
export { lerImagem } from "./imagem";
export { dataPdfParaIso } from "./pdf-cru";

function naoExaminado(
  mime: MimeDeDocumento,
  porque: AchadoNaoExaminado["porque"],
  observacao: string,
  explicacaoInocente: string
): AchadoNaoExaminado {
  return { tipo: "nao_examinado", mime, porque, observacao, explicacaoInocente };
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

function examinarPdf(conteudo: Uint8Array, mime: MimeDeDocumento): Achado[] {
  if (conteudo.length > MAX_BYTES_PDF) {
    return [
      naoExaminado(
        mime,
        "ficheiro_grande_de_mais",
        `o ficheiro tem ${conteudo.length} bytes e o exame recusa-se acima de ${MAX_BYTES_PDF}.`,
        "O tecto existe contra ficheiros feitos para consumir o servidor, e não contra " +
          "documentos. Um Livro Azul digitalizado a 300dpi fica muito abaixo dele."
      ),
    ];
  }

  const vista = vistaLatin1(conteudo);

  // O cabeçalho pode não estar no byte zero: há ficheiros com lixo à frente, e
  // o PDF manda procurá-lo nos primeiros mil bytes.
  if (!vista.slice(0, 1024).includes("%PDF-")) {
    return [
      naoExaminado(
        mime,
        "nao_parece_o_formato",
        "não se encontrou o cabeçalho «%PDF-» no início do ficheiro.",
        "Um ficheiro pode ter sido cortado no envio, ou ter à frente bytes que um " +
          "servidor intermédio acrescentou. Não quer dizer que o conteúdo seja falso — " +
          "quer dizer que este exame não o soube abrir."
      ),
    ];
  }

  if (/\/Encrypt\b/.test(vista)) {
    return [
      naoExaminado(
        mime,
        "pdf_cifrado",
        "o ficheiro está cifrado, e por isso não se leram nem os metadados nem o desenho das páginas.",
        "Cifrar um PDF é o que muitos programas fazem por omissão ao pôr-lhe uma " +
          "restrição de impressão ou de cópia, e várias entidades oficiais entregam os " +
          "documentos assim. Não é um sinal de nada; é um exame que não se pôde fazer."
      ),
    ];
  }

  try {
    const pdf = new PdfCru(conteudo, vista);
    const achados: Achado[] = [];

    const revisoes = examinarRevisoes(pdf);
    if (revisoes) achados.push(revisoes);

    const metadados = examinarMetadados(pdf);
    if (metadados) achados.push(metadados);

    const historico = examinarHistoricoXmp(pdf);
    if (historico) achados.push(historico);

    achados.push(...examinarAssinaturas(pdf));

    const porAssinar = examinarCamposPorAssinar(pdf);
    if (porAssinar) achados.push(porAssinar);

    const camadas = examinarCamadas(pdf);
    if (camadas) achados.push(camadas);

    return achados;
  } catch {
    return [
      naoExaminado(
        mime,
        "estrutura_ilegivel",
        "o exame da estrutura do PDF parou a meio e não se aproveitou nada.",
        "PDFs mal fechados são comuns — um download interrompido, um multifunções que " +
          "grava mal a última página. Um ficheiro que não se soube examinar não é um " +
          "ficheiro suspeito; é um ficheiro por olhar."
      ),
    ];
  }
}

// ─── Imagens ─────────────────────────────────────────────────────────────────

function impressaoDas(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

/**
 * O texto do achado da estrutura de um JPEG.
 *
 * A impressão das tabelas está aqui, e é o único número deste módulo que se
 * parece com uma medida técnica sem explicação ao lado — por isso a explicação
 * insiste no que ela não é. Não classifica nada: dois ficheiros com a mesma
 * impressão saíram do mesmo codificador com a mesma regulação, o que é o que
 * acontece a todas as fotografias tiradas com o mesmo telemóvel.
 */
function achadoDoJpeg(jpeg: EstruturaJpeg, temMiniatura: boolean): Achado {
  const partes = [
    jpeg.progressivo ? "é progressivo" : "é de varrimento único (baseline)",
    `traz ${jpeg.tabelasDeQuantizacao} ${jpeg.tabelasDeQuantizacao === 1 ? "tabela" : "tabelas"} de quantização`,
    `tem ${jpeg.varrimentos} ${jpeg.varrimentos === 1 ? "varrimento" : "varrimentos"}`,
  ];
  if (jpeg.bytesDepoisDoFim > 0) {
    partes.push(`e sobram ${jpeg.bytesDepoisDoFim} bytes depois do marcador de fim da imagem`);
  }

  return {
    tipo: "jpeg_estrutura",
    observacao: `${partes.join(", ")}.`,
    explicacaoInocente:
      "Nada disto distingue uma imagem verdadeira de uma montada. Cada codificador " +
      "escolhe as suas tabelas e o seu número de varrimentos, e as mesmas tabelas em dois " +
      "ficheiros querem dizer que saíram do mesmo programa com a mesma regulação — o que " +
      "é o caso de todas as fotografias do mesmo telemóvel. Bytes depois do fim são quase " +
      "sempre lixo que a aplicação que gravou deixou lá. Não se fez análise de recompressão, " +
      "e por isso este achado não diz nada sobre zonas coladas.",
    progressivo: jpeg.progressivo,
    tabelasDeQuantizacao: jpeg.tabelasDeQuantizacao,
    impressaoDasTabelas: impressaoDas(jpeg.bytesDasTabelas),
    varrimentos: jpeg.varrimentos,
    bytesDepoisDoFim: jpeg.bytesDepoisDoFim,
    temMiniatura,
  };
}

function achadoDosMetadados(
  campos: readonly CampoDeMetadados[],
  temNotaDoFabricante: boolean
): Achado {
  const nomeados = new Map(campos.map((c) => [c.campo, c.valor]));
  const partes: string[] = [];

  const aparelho = [nomeados.get("Make"), nomeados.get("Model")].filter(Boolean).join(" ");
  if (aparelho) partes.push(`o aparelho declarado é «${aparelho}»`);

  for (const campo of ["Software", "ProcessingSoftware", "xmp:CreatorTool"]) {
    const valor = nomeados.get(campo);
    if (valor) partes.push(`o campo ${campo} diz «${valor}»`);
  }

  const captada = nomeados.get("DateTimeOriginal");
  const alterada = nomeados.get("DateTime");
  if (captada) partes.push(`a data de captação é ${captada}`);
  if (alterada && alterada !== captada) partes.push(`a data do ficheiro é ${alterada}`);

  const historia = nomeados.get("xmpMM:History (ferramentas)");
  if (historia) partes.push(`o XMP regista as ferramentas ${historia}`);

  if (partes.length === 0) partes.push(`a imagem traz ${campos.length} campos de metadados`);

  return {
    tipo: "imagem_metadados",
    observacao: `${partes.join("; ")}.`,
    explicacaoInocente:
      "Estes campos são escritos pelo aparelho e por cada programa que abriu o ficheiro, e " +
      "ninguém os verifica — copiam-se, editam-se e apagam-se com uma linha de comando. O " +
      "nome de um editor de imagem no campo «Software» é o que fica sempre que alguém endireita, " +
      "corta ou clareia uma digitalização torta, que é o que se faz a um Livro Azul " +
      "fotografado em cima de uma mesa. Datas diferentes entre a captação e o ficheiro é o " +
      "que acontece a qualquer imagem que tenha sido aberta e voltada a gravar.",
    campos: [...campos],
    ferramentas: reconhecerFerramentas(campos),
    temNotaDoFabricante,
  };
}

function examinarImagem(conteudo: Uint8Array, mime: MimeDeDocumento): Achado[] {
  const leitura = lerImagem(conteudo, mime);

  if (!leitura) {
    return [
      naoExaminado(
        mime,
        "nao_parece_o_formato",
        `os bytes não correspondem à estrutura de um ${mime}, ou não trazem metadados nenhuns.`,
        "Uma imagem sem metadados é o caso mais comum de todos: as aplicações de " +
          "mensagens e as redes sociais apagam o EXIF inteiro ao reenviar uma fotografia, " +
          "e uma captura de ecrã nunca chega a ter nenhum. Não ter vestígios não é " +
          "esconder vestígios."
      ),
    ];
  }

  const achados: Achado[] = [];
  const campos = [...leitura.campos, ...(leitura.exif?.campos ?? [])];

  if (campos.length > 0) {
    achados.push(achadoDosMetadados(campos, leitura.exif?.temNotaDoFabricante ?? false));
  }

  const gps = leitura.exif?.coordenadas;
  if (gps) {
    achados.push({
      tipo: "imagem_coordenadas",
      observacao: `a imagem traz coordenadas: ${gps.latitude}, ${gps.longitude}${
        gps.altitude === undefined ? "" : ` a ${gps.altitude} metros`
      }.`,
      explicacaoInocente:
        "Isto não é um sinal de falsidade e não está aqui por isso: está aqui porque é " +
        "dado pessoal. Um telemóvel com a localização ligada escreve-as em todas as " +
        "fotografias sem que ninguém lho peça, e é normal que o sítio seja a coudelaria " +
        "ou a casa de quem digitalizou. O que quem revê tem de saber é que o ficheiro " +
        "diz onde a fotografia foi tirada, antes de o reencaminhar a alguém.",
      latitude: gps.latitude,
      longitude: gps.longitude,
      ...(gps.altitude === undefined ? {} : { altitude: gps.altitude }),
      ...(gps.dataGps === undefined ? {} : { dataGps: gps.dataGps }),
    });
  }

  const noExif = leitura.exif?.medidas;
  const noFicheiro = leitura.medidas;
  if (noExif && noFicheiro && !mesmasMedidas(noExif, noFicheiro)) {
    achados.push({
      tipo: "imagem_medidas_diferentes_das_do_exif",
      observacao:
        `o EXIF diz que a imagem tinha ${noExif[0]}×${noExif[1]} pixéis e o ficheiro tem ` +
        `${noFicheiro[0]}×${noFicheiro[1]}.`,
      explicacaoInocente:
        "Quase tudo o que toca numa fotografia a redimensiona: as aplicações de mensagens " +
        "encolhem-na para a enviar, os clientes de correio também, e um formulário que " +
        "limite o tamanho do ficheiro obriga a isso. O que se sabe daqui é que os pixéis " +
        "não são os que saíram do aparelho — não o que mudou neles.",
      noExif,
      noFicheiro,
    });
  }

  if (leitura.jpeg) {
    achados.push(achadoDoJpeg(leitura.jpeg, leitura.exif?.temMiniatura ?? false));
  }

  return achados;
}

/**
 * As medidas são as mesmas, com ou sem rotação.
 *
 * Compara-se o par **sem ordem** de propósito: uma fotografia de retrato é
 * guardada na horizontal com uma etiqueta de orientação, e vários programas
 * gravam a largura e a altura já trocadas. Exigir a mesma ordem levantava a mão
 * em todas as fotografias tiradas com o telemóvel ao alto.
 */
function mesmasMedidas(a: readonly [number, number], b: readonly [number, number]): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

// ─── A porta ─────────────────────────────────────────────────────────────────

/**
 * Tudo o que o ficheiro conta sobre si mesmo.
 *
 * Nunca lança e nunca devolve uma lista vazia sem dizer porquê: um ficheiro
 * limpo devolve os achados que houver, e um ficheiro que não se examinou
 * devolve um `nao_examinado` com a razão.
 */
export function reunirForense(conteudo: Uint8Array, mime: MimeDeDocumento): Achado[] {
  if (conteudo.length === 0) {
    return [
      naoExaminado(
        mime,
        "ficheiro_vazio",
        "o ficheiro não tem bytes nenhuns.",
        "Um envio interrompido dá um ficheiro de zero bytes. Não há aqui nada a ler, nem " +
          "nada a concluir."
      ),
    ];
  }

  try {
    if (mime === "application/pdf") return examinarPdf(conteudo, mime);
    return examinarImagem(conteudo, mime);
  } catch {
    // A rede por baixo de todas as outras. Se um exame novo trouxer um caminho
    // que rebenta, o painel recebe «não se examinou» — nunca uma página de erro
    // e nunca um documento silenciosamente dado por limpo.
    return [
      naoExaminado(
        mime,
        "estrutura_ilegivel",
        "o exame parou a meio e não se aproveitou nada.",
        "Um ficheiro que este exame não sabe abrir não é um ficheiro suspeito; é um " +
          "ficheiro por olhar, e continua a ir para a fila de revisão como qualquer outro."
      ),
    ];
  }
}
