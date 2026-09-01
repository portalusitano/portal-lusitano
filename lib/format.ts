import type { CavaloAdmin } from "@/types/cavalo";

/**
 * Formatadores de dinheiro partilhados pelos ecrãs de administração.
 *
 * Havia sete cópias destes corpos espalhadas por sete componentes, em duas
 * variantes que davam resultados diferentes para o mesmo número. Estão aqui as
 * duas, com nomes que dizem qual é qual, para que quem escolher escolha de
 * olhos abertos em vez de copiar a que estiver mais à mão.
 */

/**
 * Cêntimos para euros sem casas decimais, com os separadores de milhares do
 * português europeu: 123456 → "€1235".
 *
 * É a variante que os ecrãs de CRM usam. Arredonda — não serve para recibos.
 */
export function formatarEurosInteiros(cents: number): string {
  return `€${(cents / 100).toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Cêntimos para euros com duas casas decimais: 123456 → "€1234.56".
 *
 * Atenção, e é de propósito que não é igual à de cima: isto é `toFixed(2)`,
 * portanto o separador decimal é o ponto e não há separador de milhares — não
 * é a convenção do pt-PT. Fica assim porque é o que os dois sítios que a usam
 * (a folha de profissionais e o PDF do relatório mensal) já escreviam, e mudar
 * o separador mudava o que se lê num documento que vai para fora.
 */
export function formatarEurosComCentimos(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/**
 * Preço de um cavalo na tabela de administração, com os dois casos em que não
 * há número para mostrar.
 */
export function formatarPrecoCavalo(cavalo: CavaloAdmin): string {
  if (cavalo.preco_sob_consulta) return "Sob consulta";
  if (!cavalo.preco) return "A definir";
  return `€${cavalo.preco.toLocaleString("pt-PT")}`;
}
