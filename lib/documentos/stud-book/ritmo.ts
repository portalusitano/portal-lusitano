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
 * ## Uma resposta guardada não é eterna nem é descartável
 *
 * Os três estados que gastaram um pedido não envelhecem da mesma maneira, e
 * tratá-los todos por igual seria errar de um dos dois lados: ou se pergunta
 * outra vez o que já está respondido para sempre, ou se guarda como definitiva
 * uma resposta que só quer dizer «hoje não deu».
 *
 * - **`confirmado` — nunca mais.** Não há prazo, e não é por preguiça: a
 *   inscrição no Livro Genealógico é um facto de nascimento e de filiação
 *   confirmada em laboratório, não um estado que caduque. Um cavalo que está no
 *   livro não sai de lá. A única coisa que muda a resposta é a **pergunta**
 *   mudar — o vendedor corrigir o número —, e isso o `deveConsultar` já vê pela
 *   chave.
 *
 * - **`desconhecido` — passados seis meses, e uma vez só.** A APSL respondeu e
 *   não tem o número. Isso pode mudar: um poldro inscreve-se depois, e a
 *   consulta pública só mostra os animais com filiação confirmada em
 *   laboratório (é o que a ficha do gov.pt diz), o que põe entre «o vendedor já
 *   tem papel» e «a APSL já o mostra» um ciclo de laboratório de semanas a
 *   meses. Voltar a perguntar antes disso é voltar a perguntar pela mesma razão
 *   por que falhou.
 *
 * - **`indisponivel` — com espaçamento a dobrar, e com tecto.** Não sabemos
 *   nada. Repete-se, cada vez mais devagar, e a certa altura pára — mas
 *   **nunca vira `desconhecido`**. Desistir de perguntar não é ter obtido uma
 *   resposta, e não há neste ficheiro caminho nenhum que transforme um estado
 *   no outro: o `deveConsultar` decide se se pergunta, e quem escreve o estado
 *   é a resposta que vier.
 */

/**
 * Seis horas até à segunda tentativa, a dobrar daí em diante.
 *
 * A primeira falha é quase sempre passageira — o nosso orçamento de quatro
 * segundos, o nosso tecto diário, um tempo esgotado. Seis horas chegam para
 * isso e não custam nada a ninguém: o anúncio fica «por confirmar», que é um
 * estado inofensivo.
 *
 * A partir da segunda, a leitura muda: falhar duas vezes seguidas já não parece
 * um soluço, parece o sítio ter mudado de desenho ou não nos querer lá.
 * Insistir ao mesmo ritmo num servidor que continua a falhar é a maneira mais
 * rápida de deixar de ser bem-vindo, e por isso cada espera é o dobro da
 * anterior.
 */
export const ESPERA_ENTRE_TENTATIVAS_MS = 6 * 60 * 60 * 1000;

/**
 * E nunca mais do que dois dias entre duas tentativas.
 *
 * O tecto está escrito para que mexer no `MAX_TENTATIVAS` não produza, em
 * silêncio, esperas de uma semana: quem lá mexer decide o número de tentativas,
 * não a duração de cada intervalo.
 */
export const ESPERA_MAXIMA_ENTRE_TENTATIVAS_MS = 48 * 60 * 60 * 1000;

/**
 * Quanto se espera depois de `n` tentativas falhadas sobre a mesma chave.
 *
 * Com os valores de hoje: 6h, 12h, 24h, 48h — a quinta tentativa cai cerca de
 * três dias e três quartos depois da primeira. É tempo que chega para uma
 * manutenção ou uma entrega do outro lado acabarem, e são cinco pedidos ao todo
 * por cavalo, o que numa avaria completa da APSL continua a ser um número que
 * se escreve numa carta sem vergonha.
 */
export function esperaDaTentativa(tentativas: number): number {
  if (!Number.isFinite(tentativas) || tentativas <= 1) return ESPERA_ENTRE_TENTATIVAS_MS;
  const dobrada = ESPERA_ENTRE_TENTATIVAS_MS * 2 ** (Math.trunc(tentativas) - 1);
  return Math.min(dobrada, ESPERA_MAXIMA_ENTRE_TENTATIVAS_MS);
}

/**
 * Quantas vezes se tenta antes de desistir.
 *
 * Cinco, e depois pára. **Desistir não é acusar**: o anúncio fica «por
 * confirmar» para sempre, exactamente como estava, e ninguém lhe põe marca
 * nenhuma. O que se perde é a consulta, não o vendedor.
 */
export const MAX_TENTATIVAS = 5;

/**
 * Seis meses até se voltar a perguntar por um número que a APSL não conhecia.
 *
 * Duas âncoras, e nenhuma delas é um número escolhido por soar bem:
 *
 * 1. **Por baixo** — a razão para voltar a perguntar é uma inscrição que ainda
 *    não estava feita. Esse ciclo é de meses (filiação confirmada em
 *    laboratório antes de o animal aparecer na consulta pública), e perguntar
 *    ao fim de trinta dias é perguntar outra vez pela mesma razão por que a
 *    primeira falhou.
 * 2. **Por cima** — o anúncio mais longo que este site vende dura sessenta dias
 *    (`lib/listing-tiers.ts`). Seis meses é mais do que qualquer anúncio vive,
 *    o que garante que a segunda pergunta **nunca cai a meio de um anúncio**:
 *    cai quando o mesmo número voltar a ser submetido, meses depois. A regra de
 *    «uma consulta por cavalo submetido» fica de pé — a segunda consulta custa
 *    uma segunda submissão, e não uma varredura.
 *
 * Um ano seria de mais: um poldro inscrito entretanto ficaria por confirmar uma
 * época de vendas inteira, que é precisamente o caso que vale a pena apanhar.
 */
export const ESPERA_APOS_DESCONHECIDO_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Quantas respostas de «não conheço» se aceitam antes de se ficar por elas.
 *
 * Duas: a primeira e a repetição seis meses depois. A terceira perguntaria, um
 * ano volvido, a mesma coisa sobre um número que duas respostas dizem não estar
 * no livro — e a essa altura a explicação provável já não é uma inscrição a
 * caminho, é um número mal copiado, que não se corrige com o tempo a passar.
 * Ficar por aqui **não é dizer que o cavalo não existe**: continua a ser
 * `desconhecido`, que é um facto para quem revê e mais nada.
 */
export const MAX_RESPOSTAS_DESCONHECIDO = 2;

export type RazaoDeConsultar =
  | "nunca_se_perguntou"
  /** O vendedor mudou o número: é outra pergunta, e faz-se. */
  | "o_numero_mudou"
  /** Ficou por saber e já passou a espera. */
  | "tentar_outra_vez"
  /** A APSL não o conhecia, e passou tempo que chegue para ter sido inscrito. */
  | "pode_ter_sido_inscrito";

export type RazaoDeNaoConsultar =
  /** A APSL confirmou. Um cavalo que está no livro não sai de lá. */
  | "ja_respondida"
  /** Ficou por saber, mas ainda não passou a espera. */
  | "ainda_cedo"
  /** Não o conhecia, e ainda não passaram os seis meses. */
  | "desconhecido_recente"
  /** Não o conhecia duas vezes, com meio ano pelo meio. Fica-se por aí. */
  | "desconhecido_assente"
  /** Ficou por saber e já se tentou as vezes que se tinha para tentar. */
  | "tentativas_esgotadas"
  /** O anúncio não trouxe nada por que perguntar. */
  | "sem_identificador";

export type DecisaoDeConsultar =
  | { consultar: true; razao: RazaoDeConsultar }
  | { consultar: false; razao: RazaoDeNaoConsultar };

/**
 * O que já se guardou sobre esta **chave**, reduzido ao que esta decisão lê.
 *
 * É um subconjunto do `ConsultaGuardada` e não um tipo à parte, para que uma
 * linha vinda da base entre aqui sem conversão nenhuma.
 *
 * O `tentativas` conta os pedidos já feitos sobre esta chave que **não** a
 * deixaram respondida — os `indisponivel` e os `desconhecido`. Um `confirmado`
 * não o incrementa porque depois dele não há mais pergunta nenhuma a fazer.
 */
export interface ConsultaAnterior {
  estado: string;
  chave?: string;
  consultadoEm?: string;
  tentativas: number;
}

/** Quanto tempo passou desde a resposta, ou `null` se a data não se lê. */
function decorridoDesde(consultadoEm: string | undefined, agora: number): number | null {
  const desde = consultadoEm ? Date.parse(consultadoEm) : Number.NaN;
  if (!Number.isFinite(desde)) return null;
  return agora - desde;
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

  // Confirmado é para sempre. Ver o cabeçalho desta secção.
  if (anterior.estado === "confirmado") {
    return { consultar: false, razao: "ja_respondida" };
  }

  if (anterior.estado === "desconhecido") {
    if (anterior.tentativas >= MAX_RESPOSTAS_DESCONHECIDO) {
      return { consultar: false, razao: "desconhecido_assente" };
    }
    const decorrido = decorridoDesde(anterior.consultadoEm, agora);
    // Sem data legível não se sabe que os seis meses passaram — e o tempo
    // passado é a **única** razão que justifica repetir esta pergunta. Ao
    // contrário do `indisponivel`, aqui há uma resposta na mão: fica-se com
    // ela. Decidir ao contrário fazia de uma coluna de datas estragada um
    // pedido a mais por cada anúncio que a APSL não conhece.
    if (decorrido === null) return { consultar: false, razao: "desconhecido_recente" };
    if (decorrido < ESPERA_APOS_DESCONHECIDO_MS) {
      return { consultar: false, razao: "desconhecido_recente" };
    }
    return { consultar: true, razao: "pode_ter_sido_inscrito" };
  }

  // Daqui para baixo é o `indisponivel`: não se sabe nada, e é o único estado
  // que se repete depressa.
  if (anterior.tentativas >= MAX_TENTATIVAS) {
    return { consultar: false, razao: "tentativas_esgotadas" };
  }

  const decorrido = decorridoDesde(anterior.consultadoEm, agora);
  // Sem data legível não se sabe quanto tempo passou. Tenta-se — não há
  // resposta nenhuma a perder —, e a contagem de tentativas é que impede isto
  // de andar em círculo.
  if (decorrido === null) return { consultar: true, razao: "tentar_outra_vez" };
  if (decorrido < esperaDaTentativa(anterior.tentativas)) {
    return { consultar: false, razao: "ainda_cedo" };
  }

  return { consultar: true, razao: "tentar_outra_vez" };
}
