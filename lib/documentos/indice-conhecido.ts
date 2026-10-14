/**
 * O índice dos números que já passaram por nós.
 *
 * ## O que é, e porque é nosso de pleno direito
 *
 * Cada anúncio publicado traz até três identificadores do animal: o microchip,
 * o UELN impresso no passaporte e o número de registo no Livro Genealógico.
 * Juntos, os anúncios que passaram por este site formam um índice — **o nosso**
 * —, e a pergunta que ele responde de imediato é uma só: _«já vimos este número
 * antes, e em que anúncio?»_.
 *
 * Não depende da APSL, não depende de rede nenhuma, e não é uma cópia da base
 * de outra pessoa: é o registo do que os vendedores nos declararam a nós. Ao
 * fim de umas centenas de anúncios responde a quase tudo o que interessa
 * perguntar sobre um número — e responde sem sair daqui.
 *
 * ## O que já existia, e o que aqui é novo
 *
 * O `sinais.ts` já lê estes três campos, e já responde a **«que números se
 * repetem?»** — agrupa toda a tabela e devolve os grupos com mais do que uma
 * linha. É a pergunta de quem revê uma fila.
 *
 * O que faltava é a pergunta simétrica, que é a de quem tem **um** número na
 * mão: «este, já o vimos?». Um agrupamento não a responde sem varrer tudo, e é
 * essa a razão — a única — de este ficheiro existir. Nada aqui recalcula o que
 * o `sinais.ts` calcula, e a normalização é a mesma de sempre: `microchip-iso`,
 * `passaporte-ueln` e `registo-apsl`. **Uma terceira ideia de «é o mesmo
 * número» seria a que não veria a repetição que as outras duas vêem.**
 *
 * ## O que isto faz com o que encontra
 *
 * Nada. Devolve ocorrências — o anúncio, o vendedor, o valor como está escrito
 * e se o anúncio está em pé. É a mesma fronteira do `sinais.ts`: não há aqui
 * nota, gravidade, semáforo nem decisão. Dois anúncios com o mesmo microchip
 * podem ser uma fraude ou o mesmo cavalo revendido, e quem sabe distingui-los é
 * uma pessoa.
 */

import { chaveRegistoApsl } from "@/components/vender-cavalo/registo-apsl";
import { limparPassaporte } from "@/components/vender-cavalo/passaporte-ueln";
import { normalizarMicrochip } from "@/lib/microchip-iso";
import { logger } from "@/lib/logger";

import { anuncioEstaEmPe, type AnuncioParaSinais } from "./sinais";
import { IDENTIFICADORES_DE_CONSULTA, type IdentificadorDeConsulta } from "./stud-book/contrato";

/**
 * A forma comparável de cada identificador — cada uma vinda do módulo que manda
 * nesse número, e nenhuma escrita aqui.
 */
const NORMALIZAR: Readonly<Record<IdentificadorDeConsulta, (valor: string) => string>> = {
  numero_registo: chaveRegistoApsl,
  ueln: limparPassaporte,
  microchip: normalizarMicrochip,
};

/** A coluna de `cavalos_venda` onde cada identificador vive. */
export const COLUNA_DO_IDENTIFICADOR: Readonly<
  Record<IdentificadorDeConsulta, keyof AnuncioParaSinais>
> = {
  numero_registo: "registro_apsl",
  ueln: "passaporte_equino",
  microchip: "microchip",
};

/**
 * A chave de um número, com o nome do identificador à frente.
 *
 * O prefixo não é enfeite, e a razão está escrita no `stud-book/consulta.ts`,
 * que é quem a usa para saber se o vendedor mudou o número: sem ele, um anúncio
 * que trocasse o microchip pelo número de registo podia calhar na mesma chave e
 * a pergunta nova passaria por já feita.
 *
 * Devolve `null` quando não sobra nada de comparável — o campo vazio, um traço,
 * o nome do cavalo copiado para a caixa errada. É esse `null` que impede o erro
 * simétrico: juntar num grupo todos os anúncios que deixaram o campo em branco.
 */
export function chaveDoIdentificador(
  identificador: IdentificadorDeConsulta,
  valor: string | null | undefined
): string | null {
  if (typeof valor !== "string") return null;
  const limpo = NORMALIZAR[identificador](valor.trim());
  return limpo === "" ? null : `${identificador}:${limpo}`;
}

/** Um anúncio onde um número apareceu. */
export interface OcorrenciaConhecida {
  cavaloId: string;
  /** A conta do vendedor, ou `null` num anúncio que nunca foi reclamado. */
  vendedor: string | null;
  identificador: IdentificadorDeConsulta;
  /** O valor **como está guardado**, antes da limpeza. */
  valor: string;
  /** Se o anúncio está em pé hoje, pela definição única do `sinais.ts`. */
  emPe: boolean;
}

/**
 * O índice: da chave de um número para os anúncios onde ele apareceu.
 *
 * É um `Map` e não uma classe de propósito — quem o recebe consulta-o, conta-o
 * e escreve-o num teste sem precisar de saber nada sobre ele.
 */
export type IndiceConhecido = ReadonlyMap<string, OcorrenciaConhecida[]>;

/** Ordem estável, pela mesma razão do `sinais.ts`: um painel não muda de ordem. */
function porTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Os identificadores que um anúncio traz, já com chave. */
export function identificadoresDoAnuncio(
  anuncio: AnuncioParaSinais
): { identificador: IdentificadorDeConsulta; valor: string; chave: string }[] {
  const encontrados: { identificador: IdentificadorDeConsulta; valor: string; chave: string }[] =
    [];
  for (const identificador of IDENTIFICADORES_DE_CONSULTA) {
    const bruto = anuncio[COLUNA_DO_IDENTIFICADOR[identificador]];
    if (typeof bruto !== "string") continue;
    const chave = chaveDoIdentificador(identificador, bruto);
    if (chave === null) continue;
    encontrados.push({ identificador, valor: bruto, chave });
  }
  return encontrados;
}

/**
 * O índice a partir das linhas já lidas.
 *
 * **Entram todos os anúncios, em pé ou não.** É a diferença que interessa entre
 * isto e os sinais de repetição: um sinal só olha para os que estão em pé ao
 * mesmo tempo, porque dois anúncios em pé com o mesmo microchip é que não têm
 * explicação inocente. Aqui a pergunta é outra — «já vimos este número?» — e um
 * anúncio vendido há dois anos é exactamente a resposta que se procura. Quem
 * chama sabe o que está em pé pelo `emPe` de cada ocorrência.
 */
export function construirIndiceConhecido(anuncios: readonly AnuncioParaSinais[]): IndiceConhecido {
  const indice = new Map<string, OcorrenciaConhecida[]>();

  for (const anuncio of anuncios) {
    const emPe = anuncioEstaEmPe(anuncio);
    for (const { identificador, valor, chave } of identificadoresDoAnuncio(anuncio)) {
      const ocorrencia: OcorrenciaConhecida = {
        cavaloId: anuncio.id,
        vendedor: anuncio.user_id,
        identificador,
        valor,
        emPe,
      };
      const lista = indice.get(chave);
      if (lista) lista.push(ocorrencia);
      else indice.set(chave, [ocorrencia]);
    }
  }

  for (const lista of indice.values()) lista.sort((a, b) => porTexto(a.cavaloId, b.cavaloId));
  return indice;
}

/** «Já vimos este número neste campo?» */
export function jaVimosNoCampo(
  indice: IndiceConhecido,
  identificador: IdentificadorDeConsulta,
  valor: string | null | undefined
): OcorrenciaConhecida[] {
  const chave = chaveDoIdentificador(identificador, valor);
  if (chave === null) return [];
  return indice.get(chave) ?? [];
}

/**
 * «Já vimos este número, seja em que campo for?»
 *
 * Procura-se nos três porque o engano mais comum de todos é escrever o número
 * certo na caixa errada — o UELN na caixa do microchip, o número de registo na
 * do passaporte. Um índice que só procurasse na caixa de onde o número veio não
 * veria precisamente o caso que interessa ver.
 *
 * A mesma ocorrência nunca sai duas vezes: os três campos de um anúncio podem
 * calhar no mesmo valor limpo, e quem lê quer os anúncios, não as coincidências
 * de normalização.
 */
export function jaVimosEsteNumero(
  indice: IndiceConhecido,
  valor: string | null | undefined
): OcorrenciaConhecida[] {
  const vistos = new Set<string>();
  const ocorrencias: OcorrenciaConhecida[] = [];

  for (const identificador of IDENTIFICADORES_DE_CONSULTA) {
    for (const ocorrencia of jaVimosNoCampo(indice, identificador, valor)) {
      const marca = `${ocorrencia.cavaloId}:${ocorrencia.identificador}`;
      if (vistos.has(marca)) continue;
      vistos.add(marca);
      ocorrencias.push(ocorrencia);
    }
  }

  return ocorrencias.sort(
    (a, b) => porTexto(a.cavaloId, b.cavaloId) || porTexto(a.identificador, b.identificador)
  );
}

// ─── A consulta à base ───────────────────────────────────────────────────────

/**
 * A chave canónica com `%` entre cada caractere, para o `ilike` do Postgres.
 *
 * As três colunas guardam o número **como o vendedor o escreveu**, com os
 * separadores que ele usou: `PSL 2019 4471` e `PSL-2019/4471` são o mesmo
 * número e um `eq` nunca os juntaria. Não há coluna canónica na tabela, e por
 * isso a procura é em duas passagens: esta, no servidor, para trazer poucas
 * linhas — e apanha de propósito alguma coisa a mais —, e a exacta, aqui, sobre
 * o que veio.
 *
 * O `%` e o `_` do próprio texto vão escapados. A chave já só tem letras e
 * algarismos, mas escapa-se na mesma: no dia em que a canonização mudar, esta
 * linha não passa a ser uma injecção de padrão.
 */
export function padraoDeProcura(chave: string): string {
  return chave
    .split("")
    .map((c) => c.replace(/[%_\\]/g, "\\$&"))
    .join("%");
}

/**
 * Só o que este módulo precisa de um cliente Supabase: saber pedir uma tabela.
 *
 * Rasa de propósito, pela mesma razão escrita no `stud-book/registo.ts`: a
 * forma inteira do construtor do PostgREST é funda ao ponto de o compilador
 * desistir de a comparar. As formas usadas ficam logo abaixo, e a única
 * afirmação sem verificação está numa função só.
 */
export interface LeitorDeAnuncios {
  from(tabela: string): unknown;
}

interface TabelaDeAnuncios {
  select(colunas: string): {
    ilike(
      coluna: string,
      padrao: string
    ): { limit(n: number): PromiseLike<{ data: unknown[] | null; error: unknown }> };
  };
}

function tabelaDeAnuncios(cliente: LeitorDeAnuncios, nome: string): TabelaDeAnuncios {
  return cliente.from(nome) as TabelaDeAnuncios;
}

export const TABELA_ANUNCIOS = "cavalos_venda";

/**
 * Quantas linhas se trazem por campo antes de as confirmar à mão.
 *
 * O `ilike` traz mais do que devia — é o preço de filtrar sem coluna canónica
 * —, e sem tecto uma chave curta podia arrastar a tabela inteira para memória.
 * Cinquenta é folga que chega: um número que apareça em mais de cinquenta
 * anúncios não é uma pergunta de identidade, é outra coisa qualquer.
 */
export const MAX_CANDIDATOS = 50;

const COLUNAS = "id, user_id, status, microchip, passaporte_equino, registro_apsl";

function comoAnuncio(linha: unknown): AnuncioParaSinais | null {
  if (typeof linha !== "object" || linha === null) return null;
  const l = linha as Record<string, unknown>;
  if (typeof l.id !== "string") return null;
  const texto = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    id: l.id,
    user_id: texto(l.user_id),
    status: texto(l.status),
    microchip: texto(l.microchip),
    passaporte_equino: texto(l.passaporte_equino),
    registro_apsl: texto(l.registro_apsl),
  };
}

/**
 * «Já vimos este número antes, e em que anúncio?» — perguntado à base.
 *
 * Uma consulta por campo, três ao todo, e **nenhuma delas sai deste site**: é a
 * nossa tabela a responder sobre os nossos anúncios. Não confundir com a
 * consulta ao stud-book, que é outra coisa, vai a um servidor de outra pessoa e
 * tem um interruptor próprio.
 *
 * Nunca lança. Uma falha de base devolve uma lista vazia e fica no registo —
 * quem chama não deve ter de decidir entre «não encontrei» e «não consegui
 * perguntar» no meio de outra coisa qualquer, e nenhum dos dois é uma afirmação
 * sobre um cavalo.
 */
export async function procurarNumeroConhecido(
  valor: string,
  opcoes: { supabase: LeitorDeAnuncios; limite?: number }
): Promise<OcorrenciaConhecida[]> {
  const limite = opcoes.limite ?? MAX_CANDIDATOS;
  const candidatos = new Map<string, AnuncioParaSinais>();

  for (const identificador of IDENTIFICADORES_DE_CONSULTA) {
    const chave = chaveDoIdentificador(identificador, valor);
    if (chave === null) continue;
    // A chave vem prefixada; para o `ilike` interessa só o número limpo.
    const limpo = chave.slice(identificador.length + 1);

    try {
      const { data, error } = await tabelaDeAnuncios(opcoes.supabase, TABELA_ANUNCIOS)
        .select(COLUNAS)
        .ilike(COLUNA_DO_IDENTIFICADOR[identificador], padraoDeProcura(limpo))
        .limit(limite);
      if (error) throw error;
      for (const linha of data ?? []) {
        const anuncio = comoAnuncio(linha);
        if (anuncio) candidatos.set(anuncio.id, anuncio);
      }
    } catch (erro) {
      logger.warn("indice-conhecido: falha a procurar um número na nossa base", {
        identificador,
        erro,
      });
    }
  }

  // A segunda passagem, e é esta que é exacta: o `ilike` trouxe candidatos, o
  // índice em memória é que diz quais são mesmo o mesmo número.
  return jaVimosEsteNumero(construirIndiceConhecido([...candidatos.values()]), valor);
}
