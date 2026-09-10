/**
 * O XMP — o bloco de metadados em XML que a Adobe pôs a andar e que hoje vive
 * dentro de PDFs, JPEGs e WebPs.
 *
 * ## Porque é que isto não usa um analisador de XML
 *
 * Não por preguiça, e não só por não haver dependências a acrescentar: um
 * analisador de XML a sério sobre bytes que vêm de fora abre a porta a
 * entidades externas, a expansão de entidades e a resolução de identificadores
 * de sistema — três maneiras conhecidas de um documento fazer um servidor ler
 * ficheiros locais ou consumir toda a memória que tem. O que aqui se quer são
 * seis valores de nomes conhecidos, e para isso um recorte com âncora fixa lê o
 * que é preciso e **não interpreta coisa nenhuma**: uma entidade num destes
 * ficheiros fica a ser texto e sai truncada, que é exactamente o desfecho certo.
 *
 * Perde-se com isto o XMP escrito de maneiras exóticas — com prefixos de
 * espaço de nomes diferentes dos habituais, por exemplo. Perde-se um campo;
 * não se ganha uma leitura errada.
 */

import { limparCampo } from "./pdf-cru";

/** Quanto de um valor XMP se aceita antes de o cortar. */
const MAX_VALOR = 500;

/** O valor de um campo XMP, escrito como elemento ou como atributo. */
export function campoXmp(xmp: string, nome: string): string | null {
  const elemento = new RegExp(`<${nome}[^>]*>([^<]{0,${MAX_VALOR}})</${nome}>`).exec(xmp);
  if (elemento) {
    const valor = limparCampo(elemento[1]);
    if (valor) return valor;
  }
  const atributo = new RegExp(`\\b${nome}\\s*=\\s*"([^"]{0,${MAX_VALOR}})"`).exec(xmp);
  if (atributo) {
    const valor = limparCampo(atributo[1]);
    if (valor) return valor;
  }
  return null;
}

/** Todos os valores de um campo XMP repetido, pelas duas escritas. */
export function valoresXmp(bloco: string, nome: string): string[] {
  const saida: string[] = [];
  for (const m of bloco.matchAll(new RegExp(`\\b${nome}\\s*=\\s*"([^"]{0,300})"`, "g"))) {
    saida.push(limparCampo(m[1]));
  }
  for (const m of bloco.matchAll(new RegExp(`<${nome}[^>]*>([^<]{0,300})</${nome}>`, "g"))) {
    saida.push(limparCampo(m[1]));
  }
  return saida.filter((v) => v.length > 0);
}

/** Valores distintos, pela ordem em que apareceram, com tecto. */
export function distintos(valores: readonly string[], tecto = 12): string[] {
  return [...new Set(valores)].slice(0, tecto);
}

/** Parece um bloco XMP? */
export function pareceXmp(texto: string): boolean {
  return texto.includes("xmpmeta") || texto.includes("<rdf:RDF");
}
