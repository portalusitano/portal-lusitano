/**
 * O documento contra o formulário.
 *
 * ## O que é um conflito, e o que não é
 *
 * Um conflito é **uma contradição verificável**: o formulário diz que o
 * microchip é `620015004471234`, o passaporte anexado tem outro número, e os
 * dois números estão ali, lado a lado, para quem revê ver. É isso que o dono
 * pediu que este site apanhasse.
 *
 * O que **não** é conflito, e é a maior parte dos casos:
 *
 * - **O formulário não tem o campo.** Ninguém contradisse ninguém: falta um
 *   dado, e faltar um dado não é mentir.
 * - **Não se encontrou o campo no documento.** Idem, do outro lado. Uma
 *   fotografia tremida de um passaporte não dá nenhum dos quatro campos, e
 *   isso é o caso normal — está escrito no contrato.
 * - **Estão os dois lá e são o mesmo escrito de outra maneira.**
 *   `620 015 004471234` e `620015004471234` são o mesmo UELN; «MAESTOSO XV» e
 *   «Maestoso  XV» são o mesmo cavalo.
 * - **O valor do formulário não normaliza para nada.** Se o vendedor escreveu
 *   `--` no campo do microchip, não há número nenhum a contradizer. O
 *   formulário já tem quem lhe aponte isso; não é trabalho deste módulo.
 *
 * ## E o que um conflito faz
 *
 * Nada, por si. **Não recusa o anúncio, não recusa o documento, e não marca
 * nada como falso.** Põe o caso à frente na fila de quem revê, com os dois
 * valores lado a lado, e é uma pessoa que decide. Está escrito no contrato e
 * está repetido aqui porque é a regra que mais depressa se perde quando
 * alguém acrescentar um campo novo a este ficheiro.
 */

import type { Conflito } from "@/lib/documentos/contrato";
import { chaveRegistoApsl } from "@/components/vender-cavalo/registo-apsl";
import { limparPassaporte } from "@/components/vender-cavalo/passaporte-ueln";
import { normalizarMicrochip } from "@/lib/microchip-iso";
import { chaveDeNome } from "@/lib/documentos/leitura/normalizar";
import type { Identificadores } from "@/lib/documentos/leitura/identificadores";

/**
 * O que o vendedor escreveu, dos campos que um documento pode contradizer.
 *
 * Os nomes são os do `FormData` do formulário de venda, para que quem ligar as
 * duas coisas não tenha de traduzir nada de cabeça.
 */
export interface DadosDoAnuncio {
  /** `passaporte_equino` no formulário: o UELN. */
  ueln?: string;
  microchip?: string;
  numeroRegisto?: string;
  nome?: string;
  /**
   * `nome_registo`. Entra porque um documento oficial traz o nome registado e
   * o anúncio traz muitas vezes o nome por que o cavalo é conhecido. Bater
   * com **qualquer um dos dois** é bater.
   */
  nomeRegisto?: string;
}

/**
 * Como se compara cada campo.
 *
 * Cada um usa a forma canónica do módulo que manda nesse campo — o UELN a do
 * `passaporte-ueln`, o microchip a do `microchip-iso`, o registo a do
 * `registo-apsl`. Não se inventa aqui uma segunda maneira de normalizar um
 * número que já tem a sua.
 */
const CHAVE = {
  ueln: limparPassaporte,
  microchip: normalizarMicrochip,
  numero_registo: chaveRegistoApsl,
  nome: chaveDeNome,
} as const;

/**
 * As contradições entre o que se leu e o que o vendedor escreveu.
 *
 * Devolve uma lista vazia quando não há nada a apontar — que é, e deve
 * continuar a ser, o resultado da esmagadora maioria dos documentos.
 */
export function cruzarComFormulario(
  documento: Identificadores,
  anuncio: DadosDoAnuncio
): Conflito[] {
  const conflitos: Conflito[] = [];

  const comparar = (
    campo: Conflito["campo"],
    noFormulario: string | undefined,
    noDocumento: string | undefined,
    alternativas: (string | undefined)[] = []
  ) => {
    if (!noFormulario || !noDocumento) return;

    const chave = CHAVE[campo];
    const doDocumento = chave(noDocumento);
    if (!doDocumento) return;

    // Um campo que não normaliza para nada não contradiz nada. É o caso de um
    // microchip escrito com letras: o formulário já o assinala, e transformar
    // isso num conflito seria dizer que o documento o desmente quando o que se
    // passa é que não há número nenhum para comparar.
    const doFormulario = [noFormulario, ...alternativas]
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
      .map(chave)
      .filter(Boolean);
    if (doFormulario.length === 0) return;

    if (doFormulario.includes(doDocumento)) return;

    conflitos.push({ campo, noFormulario: noFormulario.trim(), noDocumento });
  };

  comparar("ueln", anuncio.ueln, documento.ueln);
  comparar("microchip", anuncio.microchip, documento.microchip);
  comparar("numero_registo", anuncio.numeroRegisto, documento.numeroRegisto);
  comparar("nome", anuncio.nome ?? anuncio.nomeRegisto, documento.nome, [
    anuncio.nome,
    anuncio.nomeRegisto,
  ]);

  return conflitos;
}
