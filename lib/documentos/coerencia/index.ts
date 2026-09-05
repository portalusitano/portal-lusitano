/**
 * A coerência de um cavalo: consigo próprio, com a sua ascendência e entre os
 * seus documentos.
 *
 * ## A ideia toda em três linhas
 *
 * O site não consegue perguntar à APSL se um cavalo está registado. Consegue
 * perguntar se o que o vendedor escreveu **fecha** — e um pedigree inventado
 * quase nunca fecha. É a verificação de maior alcance que este sistema pode
 * ter, e não depende de nenhum serviço que não temos.
 *
 * ## As quatro regras que mandam em tudo o que está debaixo desta pasta
 *
 * 1. **Distinguir o impossível do improvável, e tratá-los de maneira
 *    diferente.** Um pai nascido depois do filho é `impossivel`. Um cavalo de
 *    32 anos é `improvavel` e existe. **Um improvável nunca é um
 *    impedimento** — o `NIVEL_DA_NATUREZA` mapeia-o para `aviso`, que na
 *    inspecção deixa passar e pergunta.
 * 2. **Nada disto verifica um documento nem recusa um anúncio.** O que sai são
 *    factos com identificadores; quem decide é uma pessoa, ou o formulário no
 *    instante em que o vendedor ainda está a pensar naquilo. É a mesma
 *    fronteira do `../sinais.ts`, e o teste prova que nenhum objecto que sai
 *    daqui tem chave de gravidade, risco, pontuação ou acção.
 * 3. **Nenhum número biológico sem fonte.** Estão todos no `biologia.ts`, cada
 *    um com a sua. Um limiar inventado é uma recusa injusta com ar de rigor.
 * 4. **Ausência não é conflito.** Metade dos anúncios pode não ter data de
 *    nascimento; sem ela, quase nada aqui corre — e o que corre, corre por
 *    outra via. Um `null` tratado como valor é a maneira mais rápida de encher
 *    uma fila de revisão com cavalos honestos.
 *
 * ## Como isto se liga ao formulário
 *
 * `campoDoAchado` responde onde é que um achado aterra, e responde `null`
 * sempre que o achado nasceu do cruzamento de mais do que um anúncio: o que
 * estiver errado pode estar do outro lado, e quem está à frente do ecrã não tem
 * como o corrigir. É essa função que garante que nenhum `impossivel` de
 * cruzamento se torna um `erro` que trava um passo.
 */

import { type Achado, type TipoDeAchado, TIPOS_DE_ACHADO } from "./achados";
import {
  type AscendenteParaCoerencia,
  type CavaloParaCoerencia,
  type DataDeHistorial,
  type DocumentoParaCoerencia,
} from "./achados";
import { coerenciaDaAscendencia } from "./ascendencia";
import { contradicoesEntreDocumentos } from "./documentos";
import { coerenciaDosCavalos } from "./proprio";

export * from "./achados";
export * from "./ascendencia";
export * from "./biologia";
export * from "./documentos";
export * from "./proprio";

/** A posição de cada tipo na ordem de leitura, para a saída ser estável. */
const ORDEM: Readonly<Record<TipoDeAchado, number>> = Object.fromEntries(
  TIPOS_DE_ACHADO.map((tipo, i) => [tipo, i])
) as Record<TipoDeAchado, number>;

/**
 * Tudo o que não fecha, na ordem em que vale a pena ser lido.
 *
 * A ordem é a dos tipos e nada mais: **não é uma ordenação por importância**,
 * porque uma ordenação por importância seria uma pontuação com outro nome. Cada
 * família já sai ordenada de dentro, e por isso a mesma entrada dá sempre a
 * mesma saída — um painel que muda de ordem entre dois carregamentos faz quem
 * revê perder o sítio onde ia.
 */
export function reunirCoerencia(entrada: {
  cavalos?: readonly CavaloParaCoerencia[];
  ascendentes?: readonly AscendenteParaCoerencia[];
  documentos?: readonly DocumentoParaCoerencia[];
  historial?: Readonly<Record<string, DataDeHistorial[]>>;
  hoje?: Date;
}): Achado[] {
  const cavalos = entrada.cavalos ?? [];
  const ascendentes = entrada.ascendentes ?? [];
  const documentos = entrada.documentos ?? [];

  const achados: Achado[] = [
    ...coerenciaDosCavalos(cavalos, { hoje: entrada.hoje, historial: entrada.historial }),
    ...coerenciaDaAscendencia(cavalos, ascendentes),
    ...contradicoesEntreDocumentos(documentos),
  ];

  // Um `sort` estável sobre listas já ordenadas por dentro: o que ele faz é
  // agrupar por tipo sem desfazer a ordem que cada família trouxe.
  return achados.sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo]);
}
