/**
 * O ritmo: quantas vezes se pergunta, e com que intervalo.
 *
 * ## A ideia, numa frase
 *
 * **Não é um serviço a interrogar, é um documento a conferir uma vez.** Uma
 * consulta por anúncio submetido, no momento da submissão, e nunca mais. O
 * resultado guarda-se com o anúncio, e só se volta a perguntar se o vendedor
 * mudar o número.
 *
 * Isso é o que distingue isto de um raspador. Um raspador vai buscar o que
 * precisa quando precisa; nós perguntamos uma vez por cavalo, na vida do
 * anúncio, e ficamos com a resposta.
 *
 * ## As quatro travas, e o que cada uma apanha
 *
 * 1. **Uma pergunta por identificador, para sempre** (`deveConsultar`). É a
 *    trava que mais poupa: um anúncio que já foi confirmado ou já deu
 *    desconhecido não se volta a perguntar, por muitas vezes que o anúncio seja
 *    editado, republicado ou revisto.
 * 2. **Um pedido de cada vez** — está no `consulta.ts`, que serializa tudo numa
 *    fila. Nunca há dois pedidos nossos em voo ao mesmo tempo, nem que cheguem
 *    dez submissões no mesmo segundo.
 * 3. **Intervalo mínimo entre pedidos** (`avaliarRitmo`). Cinco segundos por
 *    omissão, e a variável de ambiente não o pode encurtar abaixo de um.
 * 4. **Tecto diário** (`avaliarRitmo`). A rede contra um ciclo enganado. Bater
 *    no tecto devolve `indisponivel`, que é um estado nosso e não uma
 *    afirmação sobre nenhum cavalo.
 *
 * ## Tudo aqui é uma função pura
 *
 * O estado entra e sai como valor, e o relógio é um argumento. Não há
 * `Date.now()` escondido nem temporizadores: uma política de ritmo que só se
 * consegue testar esperando é uma política que ninguém testa.
 */

/** O que se sabe sobre os pedidos já feitos. */
export interface EstadoDoRitmo {
  /** Quando saiu o último pedido, em ms. `null` se nunca saiu nenhum. */
  ultimoPedidoEm: number | null;
  /** O dia a que a contagem pertence, em UTC. */
  dia: string | null;
  pedidosNoDia: number;
}

export const RITMO_VAZIO: EstadoDoRitmo = { ultimoPedidoEm: null, dia: null, pedidosNoDia: 0 };

export interface LimitesDoRitmo {
  intervaloMs: number;
  tectoDiario: number;
}

export type DecisaoDoRitmo =
  /** Pode sair já. */
  | { decisao: "seguir" }
  /** Ainda não: faltam tantos milissegundos para o intervalo se cumprir. */
  | { decisao: "esperar"; esperaMs: number }
  /** O tecto do dia esgotou-se. Não se espera por isto — desiste-se. */
  | { decisao: "tecto_diario" };

/**
 * O dia a que uma contagem pertence, em UTC.
 *
 * Em UTC e não na hora local de propósito: o servidor pode mudar de fuso entre
 * dois arranques, e um tecto diário que se reinicia a meio da noite conforme a
 * configuração da máquina é um tecto que ninguém consegue explicar.
 */
export function diaUtc(agora: number): string {
  return new Date(agora).toISOString().slice(0, 10);
}

/**
 * Pode sair um pedido agora?
 *
 * O tecto vem antes do intervalo porque são coisas diferentes: o intervalo
 * resolve-se esperando, o tecto não se resolve de todo até ao dia seguinte.
 */
export function avaliarRitmo(
  estado: EstadoDoRitmo,
  agora: number,
  limites: LimitesDoRitmo
): DecisaoDoRitmo {
  const hoje = diaUtc(agora);
  // Um dia novo traz um tecto novo. Se o estado guardado é de ontem, a contagem
  // que interessa é zero — não se arrasta o gasto de ontem para hoje.
  const gastosHoje = estado.dia === hoje ? estado.pedidosNoDia : 0;
  if (gastosHoje >= limites.tectoDiario) return { decisao: "tecto_diario" };

  if (estado.ultimoPedidoEm === null) return { decisao: "seguir" };

  // Um relógio que ande para trás — um acerto de NTP, uma máquina suspensa —
  // não pode virar uma espera de horas. `decorrido` negativo trata-se como
  // «acabou de sair um pedido», que é o lado prudente.
  const decorrido = agora - estado.ultimoPedidoEm;
  if (decorrido < 0) return { decisao: "esperar", esperaMs: limites.intervaloMs };
  if (decorrido >= limites.intervaloMs) return { decisao: "seguir" };

  return { decisao: "esperar", esperaMs: limites.intervaloMs - decorrido };
}

/** O estado depois de um pedido sair. Não muta o que recebeu. */
export function registarPedido(estado: EstadoDoRitmo, agora: number): EstadoDoRitmo {
  const hoje = diaUtc(agora);
  const gastosHoje = estado.dia === hoje ? estado.pedidosNoDia : 0;
  return { ultimoPedidoEm: agora, dia: hoje, pedidosNoDia: gastosHoje + 1 };
}

// ─── Voltar a perguntar, ou não ──────────────────────────────────────────────

/**
 * Quanto tempo se espera antes de tentar outra vez o que ficou por saber.
 *
 * Seis horas. É folgado de propósito: um `indisponivel` quer dizer que a APSL
 * não respondeu, e insistir de dez em dez minutos num servidor que está em
 * apuros é a maneira mais rápida de deixar de ser bem-vindo. O anúncio não
 * perde nada por esperar — fica «por confirmar», que é um estado inofensivo.
 */
export const ESPERA_ENTRE_TENTATIVAS_MS = 6 * 60 * 60 * 1000;

/**
 * Quantas vezes se tenta antes de desistir.
 *
 * Cinco, e depois pára. **Desistir não é acusar**: o anúncio fica «por
 * confirmar» para sempre, exactamente como estava, e ninguém lhe põe marca
 * nenhuma. O que se perde é a consulta, não o vendedor.
 */
export const MAX_TENTATIVAS = 5;

export type RazaoDeConsultar =
  | "nunca_se_perguntou"
  /** O vendedor mudou o número: é outra pergunta, e faz-se. */
  | "o_numero_mudou"
  /** Ficou por saber e já passou a espera. */
  | "tentar_outra_vez";

export type RazaoDeNaoConsultar =
  /** Já se perguntou e houve resposta. Confirmado ou desconhecido, acabou. */
  | "ja_respondida"
  /** Ficou por saber, mas ainda não passou a espera. */
  | "ainda_cedo"
  /** Ficou por saber e já se tentou as vezes que se tinha para tentar. */
  | "tentativas_esgotadas"
  /** O anúncio não trouxe nada por que perguntar. */
  | "sem_identificador";

export type DecisaoDeConsultar =
  | { consultar: true; razao: RazaoDeConsultar }
  | { consultar: false; razao: RazaoDeNaoConsultar };

/**
 * O que já se guardou sobre este anúncio, reduzido ao que esta decisão lê.
 *
 * É um subconjunto do `ConsultaGuardada` e não um tipo à parte, para que uma
 * linha vinda da base entre aqui sem conversão nenhuma.
 */
export interface ConsultaAnterior {
  estado: string;
  chave?: string;
  consultadoEm?: string;
  tentativas: number;
}

/**
 * Vale a pena perguntar?
 *
 * A `chaveActual` é a forma comparável do identificador que o anúncio traz
 * hoje. `null` quer dizer que não há nada por que perguntar — e nesse caso não
 * se pergunta, o que não é um problema do anúncio: é um anúncio sem número.
 *
 * Os estados `desligado` e `sem_identificador` não gastaram pedido nenhum, e
 * por isso não sofrem espera: no dia em que o interruptor subir, o primeiro
 * anúncio que passar por aqui é consultado.
 */
export function deveConsultar(
  anterior: ConsultaAnterior | null | undefined,
  chaveActual: string | null,
  agora: number
): DecisaoDeConsultar {
  if (chaveActual === null) return { consultar: false, razao: "sem_identificador" };
  if (!anterior) return { consultar: true, razao: "nunca_se_perguntou" };

  // Nunca chegou a sair um pedido, logo não há nada de que descansar.
  if (anterior.estado === "desligado" || anterior.estado === "sem_identificador") {
    return { consultar: true, razao: "nunca_se_perguntou" };
  }

  // O vendedor corrigiu o número: é outra pergunta, e o que se sabia da
  // anterior não diz nada sobre esta. A contagem de tentativas também não se
  // herda — quem chama trata disso ao guardar.
  if (anterior.chave !== chaveActual) return { consultar: true, razao: "o_numero_mudou" };

  // Houve resposta. Confirmado ou desconhecido, a pergunta está feita e não se
  // repete: é a regra do «uma consulta por anúncio e nunca mais».
  if (anterior.estado === "confirmado" || anterior.estado === "desconhecido") {
    return { consultar: false, razao: "ja_respondida" };
  }

  if (anterior.tentativas >= MAX_TENTATIVAS) {
    return { consultar: false, razao: "tentativas_esgotadas" };
  }

  const desde = anterior.consultadoEm ? Date.parse(anterior.consultadoEm) : Number.NaN;
  // Sem data legível não se sabe quanto tempo passou. Tenta-se, e a contagem de
  // tentativas é que impede isto de andar em círculo.
  if (!Number.isFinite(desde)) return { consultar: true, razao: "tentar_outra_vez" };
  if (agora - desde < ESPERA_ENTRE_TENTATIVAS_MS) {
    return { consultar: false, razao: "ainda_cedo" };
  }

  return { consultar: true, razao: "tentar_outra_vez" };
}
