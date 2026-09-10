/**
 * O tipo de um ficheiro, lido nos bytes dele.
 *
 * ## Porque não serve o `file.type`
 *
 * O `file.type` de um `File` que vem num `FormData` é o `Content-Type` que o
 * cliente escreveu na parte multipart. É texto que o cliente escolheu, tal
 * como a extensão do nome: quem quiser enviar outra coisa qualquer com um
 * `Content-Type: application/pdf` por cima consegue-o com uma linha de `curl`.
 * A única coisa que não se falsifica sem falsificar o próprio ficheiro é o que
 * está escrito nos primeiros bytes.
 *
 * As quatro assinaturas, e de onde vêm:
 *
 * - **PDF** — `%PDF-` (25 50 44 46 2D). ISO 32000-1, §7.5.2: a primeira linha
 *   de um ficheiro PDF é o cabeçalho de versão.
 * - **JPEG** — `FF D8 FF`. ISO/IEC 10918: o marcador SOI (`FF D8`) seguido do
 *   primeiro marcador de segmento, que começa sempre por `FF`.
 * - **PNG** — `89 50 4E 47 0D 0A 1A 0A`. RFC 2083, §3.1: a assinatura de oito
 *   bytes, desenhada de propósito para denunciar transferências que estragam
 *   os fins de linha.
 * - **WebP** — `RIFF` nos bytes 0–3 e `WEBP` nos bytes 8–11. É um contentor
 *   RIFF, e os quatro bytes do meio são o comprimento, que não entra na
 *   decisão.
 *
 * ## O que isto **não** diz, e é preciso ficar escrito
 *
 * 1. **Não diz que o documento é um Livro Azul.** Diz que é um PDF. Um PDF em
 *    branco, a factura do veterinário ou uma fotografia do cão passam aqui
 *    exactamente da mesma maneira. Quem distingue um Livro Azul de um PDF
 *    qualquer é a pessoa que revê — é para isso que o estado inicial é
 *    `por_verificar` e não outro.
 * 2. **Não diz que o ficheiro é seguro.** Um PDF pode trazer JavaScript lá
 *    dentro e um JPEG pode estar construído para rebentar um descodificador.
 *    O que protege daí não é esta função: é o balde ser privado, o ficheiro
 *    nunca ser servido ao público, e nada neste servidor o abrir para o
 *    interpretar.
 * 3. **Um ficheiro pode ser duas coisas ao mesmo tempo.** Há PDFs que também
 *    são ZIPs válidos, e imagens com um segundo formato colado atrás. A
 *    assinatura diz por onde começa, não o que vem depois — e não há
 *    verificação de assinatura, nem aqui nem em lado nenhum, que resolva isso.
 * 4. **Não há HEIC nesta lista**, e é uma decisão do contrato
 *    (`MIMES_DE_DOCUMENTO`), não um esquecimento. Um iPhone a escolher da
 *    galeria converte para JPEG antes de entregar o ficheiro ao formulário, e
 *    é por isso que na prática quase não aparece; se vier a aparecer, o sítio
 *    de o acrescentar é o contrato, e a assinatura é `ftypheic` no offset 4.
 */

import { MIMES_DE_DOCUMENTO, type MimeDeDocumento } from "./contrato";

/**
 * Quantos bytes chegam para decidir. Doze, por causa do WebP, que é o que
 * precisa de olhar mais longe (`WEBP` está no offset 8).
 */
export const BYTES_DE_ASSINATURA = 12;

/** Como se escrevem os quatro formatos a quem está a preencher o formulário. */
export const FORMATOS_ACEITES = "PDF, JPEG, PNG ou WebP";

interface Assinatura {
  mime: MimeDeDocumento;
  /** Os bytes que têm de estar lá, e a partir de que posição. */
  marcas: Array<{ posicao: number; bytes: readonly number[] }>;
}

const ASSINATURAS: readonly Assinatura[] = [
  // `%PDF-`
  { mime: "application/pdf", marcas: [{ posicao: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }] },
  { mime: "image/jpeg", marcas: [{ posicao: 0, bytes: [0xff, 0xd8, 0xff] }] },
  {
    mime: "image/png",
    marcas: [{ posicao: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  },
  {
    mime: "image/webp",
    marcas: [
      // `RIFF`, quatro bytes de comprimento que não interessam, e `WEBP`.
      { posicao: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
      { posicao: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
    ],
  },
];

function casa(bytes: Uint8Array, marca: { posicao: number; bytes: readonly number[] }): boolean {
  if (bytes.length < marca.posicao + marca.bytes.length) return false;
  for (let i = 0; i < marca.bytes.length; i += 1) {
    if (bytes[marca.posicao + i] !== marca.bytes[i]) return false;
  }
  return true;
}

/**
 * O tipo real, ou `null` se não for nenhum dos quatro.
 *
 * O `%PDF-` é exigido **no princípio do ficheiro**, e não procurado no
 * primeiro kilobyte como alguns leitores tolerantes fazem. A tolerância deles
 * existe para abrir ficheiros já estragados; aqui trocá-la-ia por um buraco —
 * um JPEG com `%PDF-` escrito num comentário EXIF passaria a ser classificado
 * como PDF, e um comentário EXIF escreve-o quem quiser. Um digitalizador põe o
 * cabeçalho no byte zero.
 */
export function tipoRealDosBytes(bytes: Uint8Array): MimeDeDocumento | null {
  for (const assinatura of ASSINATURAS) {
    if (assinatura.marcas.every((marca) => casa(bytes, marca))) return assinatura.mime;
  }
  return null;
}

export interface VeredictoDeTipo {
  /** O que os bytes dizem. `null` quando não é nenhum dos quatro. */
  real: MimeDeDocumento | null;
  /** O que o cliente declarou, normalizado. Serve para registar, não para decidir. */
  declarado: string | null;
  /**
   * O cliente declarou um dos quatro formatos e os bytes dizem outro.
   *
   * Não é o mesmo que «o ficheiro é inválido»: o ficheiro pode ser um PNG
   * perfeitamente bom declarado como PDF. O que se faz com isto é **registar**
   * — um browser a enganar-se no `Content-Type` é raro, e um pedido montado à
   * mão para ver o que passa é exactamente assim que se parece.
   *
   * Fica falso quando o cliente não declarou nada, ou declarou algo que nem
   * sequer está na lista (`application/octet-stream`, por exemplo): aí não há
   * duas afirmações a discordar, há uma só.
   */
  discordancia: boolean;
}

/** Normaliza um `Content-Type`: minúsculas, sem parâmetros (`; charset=…`). */
function normalizarDeclarado(declarado: string | null | undefined): string | null {
  if (!declarado) return null;
  const limpo = declarado.split(";")[0]?.trim().toLowerCase();
  return limpo ? limpo : null;
}

/**
 * Lê o tipo e compara-o com o que o cliente declarou.
 *
 * Quem decide é sempre `real`. O `declarado` só existe para se poder registar
 * a discordância, e a discordância só existe para se poder olhar mais tarde
 * para quem a produziu.
 */
export function avaliarTipo(
  bytes: Uint8Array,
  declarado: string | null | undefined
): VeredictoDeTipo {
  const real = tipoRealDosBytes(bytes);
  const declaradoLimpo = normalizarDeclarado(declarado);
  const declaradoConhecido =
    declaradoLimpo !== null && (MIMES_DE_DOCUMENTO as readonly string[]).includes(declaradoLimpo);

  return {
    real,
    declarado: declaradoLimpo,
    discordancia: declaradoConhecido && real !== null && real !== declaradoLimpo,
  };
}
