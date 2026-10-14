/**
 * As contas de datas que tanto o formulário como a coerência precisam de fazer.
 *
 * Viviam no `components/vender-cavalo/inspeccao.ts`, que é onde nasceram, e a
 * `lib/documentos/coerencia` importava-as de lá. Enquanto a seta apontou só
 * num sentido, funcionou. Quando a inspecção passou a chamar a coerência —
 * para o formulário poder dizer «este pai nasceu depois do filho» —, os dois
 * ficheiros passaram a importar-se um ao outro, e um ciclo em ESM não dá um
 * erro claro: dá uma constante `undefined` no meio de um módulo que já parecia
 * carregado. Foi assim que apareceu, num `TIPOS_DE_ACHADO.map` sobre nada.
 *
 * Estão aqui porque não pertencem a nenhum dos dois: são aritmética de
 * calendário, não sabem o que é um cavalo nem o que é um formulário, e não
 * importam coisa nenhuma. Um módulo folha não entra em ciclo com ninguém.
 */

/** Uma data escrita num campo, ou `null` se não houver ou não for uma data. */
export function lerData(valor: string): Date | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Quantos meses completos passaram entre duas datas. Negativo quando a segunda
 * é anterior à primeira — e é esse sinal que diz que um antepassado nasceu
 * depois do descendente.
 */
export function mesesEntre(desde: Date, ate: Date): number {
  let meses = (ate.getFullYear() - desde.getFullYear()) * 12 + (ate.getMonth() - desde.getMonth());
  if (ate.getDate() < desde.getDate()) meses--;
  return meses;
}
