/**
 * Ler um documento de um cavalo e compará-lo com o formulário.
 *
 * São três passos e cada um vive no seu ficheiro: tirar o texto
 * (`texto-pdf.ts`), achar os identificadores (`identificadores.ts`), cruzar
 * com o que o vendedor escreveu (`cruzar.ts`). Aqui é só a porta.
 *
 * ## Porque é que não há OCR — e isto é uma decisão, não uma falta
 *
 * O contrato prevê duas origens, `pdf` e `nenhuma`, e não uma terceira. Não é
 * um esquecimento de quem o escreveu: é a resposta certa, e chegou-se à mesma
 * conclusão por este lado.
 *
 * O que se passa com uma fotografia tirada com um telemóvel a um passaporte
 * pousado numa mesa é que ela não está direita, tem a página curva, tem
 * sombra do próprio telemóvel e tem o número do microchip impresso a corpo
 * seis por cima de uma trama de segurança. Um reconhecimento de caracteres em
 * JavaScript puro, sem binário nativo e sem pedido a servidor de fora, lê
 * isso mal — e **mal, aqui, não quer dizer que não lê: quer dizer que lê
 * outra coisa**. Um `8` que sai `6` transforma um passaporte verdadeiro numa
 * contradição, e uma contradição falsa é o pior resultado possível de todo
 * este trabalho: manda um anúncio honesto para a fila de revisão e, repetida,
 * ensina quem revê que os avisos não valem nada. A partir daí o aviso
 * verdadeiro — o que apanha a falsidade que o dono quer apanhar — passa
 * despercebido no meio do ruído que nós próprios criámos.
 *
 * Contra isso não há confiança baixa que chegue. Uma leitura com confiança
 * baixa continua a produzir um número, e é o número que vai para a coluna «no
 * documento» ao lado do do formulário; ninguém que reveja vinte anúncios por
 * dia lê o rodapé que diz que aquele número talvez esteja errado.
 *
 * O que se ganharia era pouco: quem digitaliza um Livro Azul numa coudelaria
 * usa quase sempre um multifunções, e um multifunções produz PDF com camada
 * de texto — que é exactamente o que o `texto-pdf.ts` lê, sem adivinhar nada.
 *
 * Fica portanto: uma imagem devolve `origem: "nenhuma"` e nenhum campo. O
 * documento continua a ser guardado, continua a ir para a fila, e uma pessoa
 * olha para ele — que é, no fim, o único carimbo que este site dá.
 */

import type { LeituraDoDocumento, MimeDeDocumento, Conflito } from "@/lib/documentos/contrato";
import { extrairTextoDePdf } from "@/lib/documentos/leitura/texto-pdf";
import { acharIdentificadores } from "@/lib/documentos/leitura/identificadores";
import { cruzarComFormulario, type DadosDoAnuncio } from "@/lib/documentos/leitura/cruzar";

export { extrairTextoDePdf } from "@/lib/documentos/leitura/texto-pdf";
export { acharIdentificadores } from "@/lib/documentos/leitura/identificadores";
export { cruzarComFormulario } from "@/lib/documentos/leitura/cruzar";
export { aplanar, chaveDeNome } from "@/lib/documentos/leitura/normalizar";
export type { DadosDoAnuncio } from "@/lib/documentos/leitura/cruzar";
export type { Identificadores, Pistas } from "@/lib/documentos/leitura/identificadores";

/** Uma leitura que não leu nada. É o que se devolve sempre que há dúvida. */
export const LEITURA_VAZIA: LeituraDoDocumento = { origem: "nenhuma" };

/**
 * O que se conseguiu ler de um documento.
 *
 * Nunca lança. Um ficheiro que não se sabe ler não é um erro do sistema: é o
 * caso normal, e o resultado normal é `origem: "nenhuma"`.
 *
 * O `anuncio` entra para desempatar, não para inventar: quando o documento tem
 * dois números de quinze algarismos e um deles é o que o vendedor escreveu, é
 * esse o que se regista — porque enquanto o número do formulário estiver no
 * papel não há contradição nenhuma a levantar.
 */
export function lerDocumento(
  conteudo: Uint8Array,
  mime: MimeDeDocumento,
  anuncio: DadosDoAnuncio = {}
): LeituraDoDocumento {
  if (mime !== "application/pdf") return LEITURA_VAZIA;

  const { texto, origem } = extrairTextoDePdf(conteudo);
  if (origem === "nenhuma" || !texto) return LEITURA_VAZIA;

  const identificadores = acharIdentificadores(texto, {
    ueln: anuncio.ueln,
    microchip: anuncio.microchip,
    numeroRegisto: anuncio.numeroRegisto,
    nome: anuncio.nome,
    nomeRegisto: anuncio.nomeRegisto,
  });

  return { texto, origem: "pdf", ...identificadores };
}

/**
 * A leitura e as contradições, de uma vez.
 *
 * É esta que quem guarda um documento chama: os dois campos que a linha da
 * base de dados tem — `leitura` e `conflitos` — saem daqui juntos e
 * coerentes, em vez de serem montados em dois sítios diferentes.
 */
export function lerECruzar(
  conteudo: Uint8Array,
  mime: MimeDeDocumento,
  anuncio: DadosDoAnuncio = {}
): { leitura: LeituraDoDocumento; conflitos: Conflito[] } {
  const leitura = lerDocumento(conteudo, mime, anuncio);
  return { leitura, conflitos: cruzarComFormulario(leitura, anuncio) };
}
