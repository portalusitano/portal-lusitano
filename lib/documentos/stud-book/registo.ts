/**
 * O registo do que já perguntámos à APSL, e a política de quando se volta a
 * perguntar.
 *
 * ## ██ A regra que não se negoceia ██
 *
 * **Uma consulta por cavalo submetido. Nunca duas em paralelo. Nunca uma
 * varredura.**
 *
 * Quem vier a seguir e for tentado a escrever um ciclo por cima disto — «vamos
 * só confirmar os anúncios todos», «vamos preencher o que falta» — está a
 * escrever um raspador do Livro Genealógico, que é a base de dados de outra
 * gente e pertence ao Estado português. Este ficheiro tem **uma** chamada ao
 * `consultarStudBook`, está assinalada, e não há aqui `Promise.all`, `for` sobre
 * anúncios nem função que receba uma lista. Se um dia isso for preciso, é uma
 * conversa com a APSL primeiro e código depois — por essa ordem.
 *
 * O que faz o registo crescer não somos nós a ir buscar: é o uso. Cada anúncio
 * que nasce pergunta uma vez pelo seu cavalo, e a resposta fica. Ao fim de umas
 * centenas de anúncios o portal tem o seu próprio índice — do que consultou de
 * direito, um cavalo de cada vez, cada um por causa de alguém que o submeteu.
 *
 * ## Onde é que o registo mora
 *
 * Na `consultas_stud_book`, que já existe, e **não numa tabela nova**. A tabela
 * tem uma linha por anúncio (a chave primária é o `cavalo_id`), e lê-se de duas
 * maneiras que são a mesma tabela vista de dois lados:
 *
 * - **por `cavalo_id`** — «o que sabemos sobre este anúncio», que é o que a
 *   fila de revisão pergunta;
 * - **por `chave`** — «o que já sabemos sobre este número», que é o registo
 *   propriamente dito.
 *
 * A segunda leitura é a que faz a diferença entre um índice e um desperdício. A
 * chave é `identificador:numero-limpo` (ver `indice-conhecido.ts`), e é ela que
 * atravessa anúncios: o mesmo cavalo republicado no ano seguinte é outro
 * `cavalo_id` e **o mesmo número** — logo, zero pedidos à APSL. Sem esta
 * leitura, «não se volta a perguntar» queria dizer «não se volta a perguntar
 * dentro do mesmo anúncio», que não é a promessa que está escrita.
 *
 * Falta-lhe um índice em `chave`; o SQL vai no relatório.
 *
 * ## O que se guarda, e o que nunca chega aqui
 *
 * O que o `reduzirParaGuardar` do `contrato.ts` deixa passar: nome, data de
 * nascimento, pelagem, número e os pais. **Nunca o criador, nunca o
 * proprietário, nunca a descendência** — são dados de pessoas e não temos que
 * ver com eles. O proprietário e a descendência o analisador nem sequer os
 * procura; o criador é lido e deitado fora pela peneira.
 *
 * ## O que isto não faz, em nenhuma circunstância
 *
 * Não recusa um anúncio, não o marca, não escreve `verificado` e não lança.
 * `verificado` continua a escrever-se num sítio só, com um clique de uma pessoa.
 * Uma falha aqui é uma linha que não se escreveu: o anúncio fica «por
 * confirmar», que é o estado inofensivo de todo o site enquanto o interruptor
 * estiver em baixo.
 */

import { logger } from "@/lib/logger";

import { consultarStudBook, escolherIdentificador, type OpcoesDaConsulta } from "./consulta";
import {
  type ConsultaGuardada,
  type EstadoDaConsulta,
  type IdentificadorDeConsulta,
  type MotivoDeIndisponivel,
  type PedidoDeConsulta,
  type RegistoGuardado,
  type ResultadoDaConsulta,
} from "./contrato";
import { deveConsultar, type RazaoDeConsultar, type RazaoDeNaoConsultar } from "./ritmo";

export const TABELA_CONSULTAS = "consultas_stud_book";

/** As colunas que se leem. Não há `select("*")`: o que não se lê não se traz. */
const COLUNAS =
  "cavalo_id, estado, motivo, identificador, chave, registo, tentativas, consultado_em";

// ─── Da linha para o valor, e do valor para a linha ──────────────────────────

/**
 * Uma linha da tabela lida como `ConsultaGuardada`.
 *
 * Devolve `null` para o que não se percebe — uma linha sem estado, um estado
 * que a aplicação não conhece. Uma linha estragada não é uma resposta, e tratá-
 * la como tal seria deixar a base decidir o que o site afirma. Quem receber
 * `null` comporta-se como quem nunca perguntou, que é o lado que não afirma
 * nada.
 */
export function consultaDaLinha(linha: unknown): ConsultaGuardada | null {
  if (typeof linha !== "object" || linha === null) return null;
  const l = linha as Record<string, unknown>;
  if (typeof l.estado !== "string") return null;

  const consulta: ConsultaGuardada = {
    estado: l.estado as EstadoDaConsulta,
    tentativas:
      typeof l.tentativas === "number" && Number.isFinite(l.tentativas) ? l.tentativas : 0,
  };
  if (typeof l.motivo === "string") consulta.motivo = l.motivo as MotivoDeIndisponivel;
  if (typeof l.identificador === "string") {
    consulta.identificador = l.identificador as IdentificadorDeConsulta;
  }
  if (typeof l.chave === "string") consulta.chave = l.chave;
  if (typeof l.consultado_em === "string") consulta.consultadoEm = l.consultado_em;
  if (typeof l.registo === "object" && l.registo !== null && !Array.isArray(l.registo)) {
    consulta.registo = l.registo as RegistoGuardado;
  }
  return consulta;
}

/**
 * O valor escrito como linha.
 *
 * Os campos ausentes vão a `null` e não omitidos, para que uma consulta nova
 * sobre um anúncio que já tinha uma não deixe atrás o motivo da anterior. Uma
 * linha meio velha e meio nova é a única coisa aqui que consegue mentir.
 */
export function linhaDaConsulta(
  cavaloId: string,
  consulta: ConsultaGuardada
): Record<string, unknown> {
  return {
    cavalo_id: cavaloId,
    estado: consulta.estado,
    motivo: consulta.motivo ?? null,
    identificador: consulta.identificador ?? null,
    chave: consulta.chave ?? null,
    registo: consulta.registo ?? null,
    tentativas: consulta.tentativas,
    consultado_em: consulta.consultadoEm ?? null,
    actualizado_em: new Date().toISOString(),
  };
}

/**
 * O que fica guardado depois de uma resposta.
 *
 * A conta das tentativas é a única coisa que aqui se decide, e é por chave:
 *
 * - **chave diferente** — a memória anterior era de outra pergunta. Começa-se
 *   do zero, senão o número corrigido pelo vendedor herdava as falhas do
 *   número errado.
 * - **`confirmado`** — a contagem fica como estava. Não se incrementa porque
 *   depois de um confirmado não há mais pergunta nenhuma a fazer, e não se
 *   apaga porque apagar era fingir que as falhas anteriores não existiram.
 * - **`desconhecido` e `indisponivel`** — mais um. É esta contagem que o
 *   `ritmo.ts` usa para espaçar as tentativas e para saber quando parar.
 *
 * Repare-se no que **não** está aqui: nenhum caminho transforma um
 * `indisponivel` num `desconhecido`. O estado que se escreve é o que a resposta
 * trouxe, e desistir de perguntar deixa a linha exactamente como estava.
 */
export function assentarResultado(
  anterior: ConsultaGuardada | null | undefined,
  resultado: ResultadoDaConsulta
): ConsultaGuardada {
  const mesmaPergunta =
    anterior != null && anterior.chave !== undefined && anterior.chave === resultado.chave;
  const jaTentadas = mesmaPergunta ? (anterior?.tentativas ?? 0) : 0;

  const tentativas =
    resultado.estado === "desconhecido" || resultado.estado === "indisponivel"
      ? jaTentadas + 1
      : jaTentadas;

  return { ...resultado, tentativas };
}

// ─── A base ──────────────────────────────────────────────────────────────────

/**
 * Só o que este módulo precisa de um cliente Supabase: saber pedir uma tabela.
 *
 * **A fronteira é rasa de propósito.** Escrever aqui a forma inteira do
 * construtor do PostgREST obrigava o TypeScript a comparar, a cada chamada, os
 * genéricos encadeados do `supabase-js` — que são fundos ao ponto de o
 * compilador desistir com «type instantiation is excessively deep». Com um
 * `unknown` à entrada, a comparação é de uma linha, e as formas que este
 * ficheiro usa ficam escritas abaixo, verificadas onde importa: aqui dentro.
 *
 * E há um segundo ganho, que é o que interessa aos testes: passar um objecto de
 * dez linhas em vez de um servidor.
 */
export interface ClienteDoRegisto {
  from(tabela: string): unknown;
}

/** O que se faz a uma selecção: filtrar por uma coluna. */
interface Seleccao {
  eq(coluna: string, valor: string): Filtro;
}

/** E a um filtro: ou uma linha só, ou as mais recentes. */
interface Filtro {
  maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
  order(
    coluna: string,
    opcoes: { ascending: boolean; nullsFirst?: boolean }
  ): { limit(n: number): PromiseLike<{ data: unknown[] | null; error: unknown }> };
}

/** E a uma tabela: ler e escrever. */
interface Tabela {
  select(colunas: string): Seleccao;
  upsert(
    linha: Record<string, unknown>,
    opcoes: { onConflict: string }
  ): PromiseLike<{ error: unknown }>;
}

/**
 * A tabela, com a forma que este ficheiro lhe reconhece.
 *
 * É o único sítio onde se afirma alguma coisa sobre o cliente sem o compilador
 * a verificar, e está sozinho para que se veja. Se o `supabase-js` mudar de
 * API, é aqui que parte — e parte em três funções, não em toda a aplicação.
 */
function tabelaDoRegisto(cliente: ClienteDoRegisto, nome: string): Tabela {
  return cliente.from(nome) as Tabela;
}

/** «O que sabemos sobre este anúncio.» */
export async function lerConsultaDoCavalo(
  cavaloId: string,
  supabase: ClienteDoRegisto
): Promise<ConsultaGuardada | null> {
  try {
    const { data, error } = await tabelaDoRegisto(supabase, TABELA_CONSULTAS)
      .select(COLUNAS)
      .eq("cavalo_id", cavaloId)
      .maybeSingle();
    if (error) throw error;
    return consultaDaLinha(data);
  } catch (erro) {
    logger.warn("stud-book: falha a ler a consulta de um anúncio", {
      cavaloId,
      erro,
    });
    return null;
  }
}

/**
 * «O que já sabemos sobre este número.» É esta leitura que faz do registo um
 * índice: atravessa anúncios, e é por ela que um cavalo republicado não custa
 * um segundo pedido à APSL.
 *
 * A mais recente ganha. As linhas guardadas para anúncios diferentes com a
 * mesma chave são cópias da mesma resposta — mas se uma delas for mais nova
 * (uma repetição passados os seis meses), é a nova que vale.
 */
export async function lerMemoriaDaChave(
  chave: string,
  supabase: ClienteDoRegisto
): Promise<ConsultaGuardada | null> {
  try {
    const { data, error } = await tabelaDoRegisto(supabase, TABELA_CONSULTAS)
      .select(COLUNAS)
      .eq("chave", chave)
      .order("consultado_em", { ascending: false, nullsFirst: false })
      .limit(1);
    if (error) throw error;
    const primeira = (data ?? [])[0];
    return primeira === undefined ? null : consultaDaLinha(primeira);
  } catch (erro) {
    logger.warn("stud-book: falha a ler a memória de uma chave", {
      erro,
    });
    return null;
  }
}

/**
 * Escreve a linha deste anúncio.
 *
 * `upsert` sobre o `cavalo_id`, que é a chave primária: uma segunda passagem
 * pelo mesmo anúncio — o Stripe a repetir a entrega, o dono a reprocessar —
 * reescreve a mesma linha em vez de rebentar com um conflito.
 *
 * Devolve se conseguiu. Não lança: quem chama está no meio de outra coisa.
 */
export async function guardarConsultaDoCavalo(
  cavaloId: string,
  consulta: ConsultaGuardada,
  supabase: ClienteDoRegisto
): Promise<boolean> {
  try {
    const { error } = await tabelaDoRegisto(supabase, TABELA_CONSULTAS).upsert(
      linhaDaConsulta(cavaloId, consulta),
      { onConflict: "cavalo_id" }
    );
    if (error) throw error;
    return true;
  } catch (erro) {
    logger.warn("stud-book: falha a guardar a consulta de um anúncio", {
      cavaloId,
      erro,
    });
    return false;
  }
}

// ─── O caminho inteiro, uma vez por cavalo ───────────────────────────────────

/** O que aconteceu, para quem registar. Nada disto chega ao público. */
export type ResumoDoRegisto =
  /** Saiu **um** pedido à APSL, e a resposta ficou guardada. */
  | { accao: "consultada"; estado: EstadoDaConsulta; razao: RazaoDeConsultar }
  /**
   * Já sabíamos: a resposta veio do registo e não saiu pedido nenhum.
   *
   * A `razao` é a do `ritmo.ts` quando foi a política a decidir que não valia a
   * pena perguntar. Fica ausente quando quem decidiu foi o interruptor: aí não
   * houve política nenhuma a correr, houve um sistema desligado — e escrever
   * ali uma razão de espera seria dizer que se esperou por alguma coisa.
   */
  | { accao: "reaproveitada"; estado: EstadoDaConsulta; razao?: RazaoDeNaoConsultar }
  /** O interruptor está em baixo. Nenhum pedido saiu e nada se escreveu. */
  | { accao: "desligado" }
  /** O anúncio não trouxe número nenhum por que perguntar. */
  | { accao: "sem_identificador" };

export interface PedidoDeRegisto {
  cavaloId: string;
  /** O que o anúncio declara: NIN, UELN e microchip, tal e qual. */
  pedido: PedidoDeConsulta;
}

export interface OpcoesDoRegisto extends OpcoesDaConsulta {
  supabase: ClienteDoRegisto;
  /** O relógio, em ms. */
  relogio?: () => number;
}

/**
 * O caminho inteiro para **um** cavalo: ver o que já se sabe, perguntar se e só
 * se valer a pena, e guardar.
 *
 * ██ Uma consulta por cavalo submetido. Nunca em paralelo. Nunca em varredura. ██
 * Há exactamente uma chamada ao `consultarStudBook` neste ficheiro, e está
 * marcada abaixo. Esta função recebe **um** cavalo de propósito: não há aqui
 * lista nem ciclo, e quem quiser fazer disto uma varredura tem de a escrever à
 * mão — e explicar-se.
 *
 * **Nunca lança.** Corre no fim do webhook do Stripe, onde uma excepção faz o
 * Stripe repetir a entrega e o anúncio nascer duas vezes. Ver o comentário no
 * `checkout-cavalo.ts`.
 */
export async function registarConsultaDoAnuncio(
  { cavaloId, pedido }: PedidoDeRegisto,
  opcoes: OpcoesDoRegisto
): Promise<ResumoDoRegisto> {
  const { supabase, relogio, ...opcoesDaConsulta } = opcoes;
  const agora = (relogio ?? Date.now)();

  // 1. Há alguma coisa por que perguntar? Sem número não há pergunta, e isso
  //    não é um defeito do anúncio: é um anúncio sem número.
  const escolha = escolherIdentificador(pedido);
  if (!escolha) return { accao: "sem_identificador" };

  // 2. O registo primeiro, sempre. Esta é a leitura que evita o pedido: se este
  //    número já passou por cá, a resposta está aqui e a APSL não é incomodada.
  //    Funciona na mesma com o interruptor em baixo — é a nossa base a
  //    responder sobre o que nós próprios já perguntámos.
  const memoria = await lerMemoriaDaChave(escolha.chave, supabase);
  const decisao = deveConsultar(memoria, escolha.chave, agora);

  if (!decisao.consultar) {
    // Sabemos a resposta e ela ainda vale. Copia-se para este anúncio para que
    // a fila de revisão a veja sem ter de saber que existe um índice por trás.
    if (memoria) {
      await guardarConsultaDoCavalo(cavaloId, memoria, supabase);
      return { accao: "reaproveitada", estado: memoria.estado, razao: decisao.razao };
    }
    // Sem memória, o `deveConsultar` só devolve `false` por falta de
    // identificador — e esse já saiu acima. Fica escrito para o caso de a
    // política mudar sem que este ramo mude com ela.
    return { accao: "sem_identificador" };
  }

  // 3. ██ O pedido. É esta linha, e não há outra. ██
  //    O `consultarStudBook` verifica o interruptor antes de tocar no `fetch`,
  //    serializa tudo numa fila (nunca dois pedidos nossos em voo), cumpre o
  //    intervalo mínimo e o tecto diário, e nunca lança.
  const resultado = await consultarStudBook(pedido, opcoesDaConsulta);

  // 4. Os dois estados que não gastaram pedido não se escrevem: escrever
  //    «desligado» numa linha é gastar uma escrita para dizer que não se sabe
  //    nada, e a fila de revisão já lê a ausência de linha como «por
  //    confirmar». O que se faz, isso sim, é não perder o que já se sabia.
  if (resultado.estado === "desligado" || resultado.estado === "sem_identificador") {
    if (memoria) {
      await guardarConsultaDoCavalo(cavaloId, memoria, supabase);
      return { accao: "reaproveitada", estado: memoria.estado };
    }
    return { accao: "desligado" };
  }

  const consulta = assentarResultado(memoria, resultado);
  await guardarConsultaDoCavalo(cavaloId, consulta, supabase);
  return { accao: "consultada", estado: consulta.estado, razao: decisao.razao };
}
