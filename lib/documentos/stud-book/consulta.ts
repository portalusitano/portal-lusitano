/**
 * A consulta em si: um pedido de cada vez, identificado, com pressa, e que
 * nunca estraga a submissão de um anúncio.
 *
 * ## Onde é que isto corre, e o que isso obriga
 *
 * No caminho de submissão de um anúncio. É um vendedor à espera que o
 * formulário avance, e **não pode ficar a olhar para uma barra a rodar por
 * causa de um servidor de terceiros**. Daí o orçamento total: passado ele,
 * desiste-se e devolve-se `indisponivel`, que é um estado inofensivo — o
 * anúncio publica-se na mesma, fica «por confirmar», e tenta-se mais tarde.
 *
 * Daí também a segunda regra: **isto nunca lança**. Não há caminho de código
 * que faça um `throw` chegar a quem chama. Uma consulta ao stud-book que
 * rebentasse a submissão de um anúncio seria uma verificação que custa
 * anúncios, que é o pior negócio possível.
 *
 * ## A ordem das travas, e porque é esta
 *
 * 1. **O interruptor primeiro, antes de tudo.** Se estiver em baixo,
 *    devolve-se `desligado` e não se toca no `fetch` — nem para montar um URL.
 *    Há um teste que conta as chamadas e exige zero.
 * 2. **Depois o identificador.** Sem número por que perguntar não há pergunta.
 * 3. **Depois a fila.** Um pedido de cada vez, sempre, mesmo que cheguem dez
 *    submissões no mesmo segundo. Nunca dois nossos em voo ao mesmo tempo.
 * 4. **Depois o ritmo.** Intervalo mínimo e tecto diário, do `ritmo.ts`.
 * 5. **Só então o pedido**, com `User-Agent` que diz quem somos.
 *
 * ## O endereço, e a segunda parte do buraco
 *
 * Tal como o formato da resposta, **o endereço real do formulário e os nomes
 * dos parâmetros não são conhecidos** — só se descobrem abrindo a página de
 * acesso público, e este ambiente não tem rede. Por isso o URL não está escrito
 * em código nenhum: vem da variável de ambiente, e aceita os marcadores
 * `{campo}` e `{valor}`. Assim o dono acerta o endereço no dia em que o souber,
 * sem esperar por uma versão nova do site — que é o comportamento certo para
 * uma coisa que nós não sabemos e ele vai saber.
 */

import { chaveRegistoApsl } from "@/components/vender-cavalo/registo-apsl";
import { limparPassaporte } from "@/components/vender-cavalo/passaporte-ueln";
import { normalizarMicrochip } from "@/lib/microchip-iso";
import { logger } from "@/lib/logger";

import { analisarRespostaApsl, type Analisador } from "./analisador";
import {
  ORDEM_DOS_IDENTIFICADORES,
  reduzirParaGuardar,
  type IdentificadorDeConsulta,
  type MotivoDeIndisponivel,
  type PedidoDeConsulta,
  type ResultadoDaConsulta,
} from "./contrato";
import { lerConfiguracao, type Configuracao } from "./configuracao";
import { avaliarRitmo, registarPedido, RITMO_VAZIO, type EstadoDoRitmo } from "./ritmo";

/**
 * Três segundos para a APSL responder.
 *
 * É curto de propósito. O que se ganha em esperar mais é uma fracção de
 * respostas lentas; o que se perde é tempo de um vendedor que está a publicar
 * um anúncio. E o que se perde não se perde de vez: um `indisponivel`
 * volta a ser tentado seis horas depois.
 */
export const TIMEOUT_MS = 3_000;

/**
 * Quatro segundos para tudo — esperar a vez, cumprir o intervalo, e receber.
 *
 * É o tecto do que a submissão de um anúncio empresta a esta verificação. Se a
 * vez na fila não couber cá dentro, não se espera: devolve-se `indisponivel` e
 * fica para depois.
 */
export const ORCAMENTO_MS = 4_000;

/** A forma comparável de cada identificador. Cada um usa a do módulo que manda nele. */
const CHAVE: Readonly<Record<IdentificadorDeConsulta, (valor: string) => string>> = {
  numero_registo: chaveRegistoApsl,
  ueln: limparPassaporte,
  microchip: normalizarMicrochip,
};

const CAMPO_DO_PEDIDO: Readonly<Record<IdentificadorDeConsulta, keyof PedidoDeConsulta>> = {
  numero_registo: "numeroRegisto",
  ueln: "ueln",
  microchip: "microchip",
};

export interface EscolhaDeIdentificador {
  identificador: IdentificadorDeConsulta;
  /** O valor tal como o vendedor o escreveu. É este que vai no pedido. */
  valor: string;
  /**
   * A forma comparável, com o nome do identificador à frente.
   *
   * O prefixo não é enfeite: sem ele, um anúncio que trocasse o microchip pelo
   * NIN podia calhar na mesma chave e a pergunta nova passaria por já feita.
   */
  chave: string;
}

/**
 * Por que identificador se vai perguntar, se é que se vai.
 *
 * Devolve `null` quando nenhum dos três dá uma chave — o campo vazio, o campo
 * com um traço, o campo com o nome do cavalo copiado para o sítio errado.
 * Perguntar por uma chave vazia devolveria a primeira página de resultados de
 * seja o que for, e ninguém quer isso.
 */
export function escolherIdentificador(pedido: PedidoDeConsulta): EscolhaDeIdentificador | null {
  for (const identificador of ORDEM_DOS_IDENTIFICADORES) {
    const bruto = pedido[CAMPO_DO_PEDIDO[identificador]];
    if (typeof bruto !== "string") continue;
    const valor = bruto.trim();
    if (valor === "") continue;
    const chave = CHAVE[identificador](valor);
    if (!chave) continue;
    return { identificador, valor, chave: `${identificador}:${chave}` };
  }
  return null;
}

/**
 * O URL do pedido.
 *
 * **Os nomes dos parâmetros são suposição** — ver o cabeçalho. Se o endereço
 * configurado trouxer `{campo}` ou `{valor}`, substituem-se (já codificados);
 * senão, acrescentam-se dois parâmetros de consulta. As duas formas cobrem os
 * desenhos plausíveis sem que nenhum deles fique escrito em código.
 */
export function montarUrlDaConsulta(base: string, escolha: EscolhaDeIdentificador): string {
  const campo = encodeURIComponent(escolha.identificador);
  const valor = encodeURIComponent(escolha.valor);

  if (base.includes("{valor}") || base.includes("{campo}")) {
    return base.replace(/\{campo\}/g, campo).replace(/\{valor\}/g, valor);
  }

  const url = new URL(base);
  url.searchParams.set("campo", escolha.identificador);
  url.searchParams.set("valor", escolha.valor);
  return url.toString();
}

// ─── O depósito do ritmo e a fila ────────────────────────────────────────────

/** O estado do ritmo vive num depósito para poder ser trocado nos testes. */
export interface DepositoDoRitmo {
  estado: EstadoDoRitmo;
}

const depositoGlobal: DepositoDoRitmo = { estado: RITMO_VAZIO };

/** Esquece os pedidos já feitos. Existe para os testes, e só para eles. */
export function reiniciarRitmo(deposito: DepositoDoRitmo = depositoGlobal): void {
  deposito.estado = RITMO_VAZIO;
}

/**
 * A fila. É uma promessa encadeada, e é o que garante «um pedido de cada vez».
 *
 * Cada consulta espera pela anterior antes de sequer olhar para o ritmo. Uma
 * tarefa que rebente não parte a corrente: o `catch` devolve a fila a um estado
 * limpo, senão o primeiro erro deixava todas as consultas seguintes penduradas.
 */
let fila: Promise<unknown> = Promise.resolve();

function enfileirar<T>(tarefa: () => Promise<T>): Promise<T> {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.catch(() => undefined);
  return resultado;
}

// ─── A consulta ──────────────────────────────────────────────────────────────

export interface OpcoesDaConsulta {
  /** O ambiente de onde se lê o interruptor. */
  ambiente?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  /** O relógio, em ms. */
  agora?: () => number;
  dormir?: (ms: number) => Promise<void>;
  /** A costura do analisador. Trocar de formato é passar outro por aqui. */
  analisar?: Analisador;
  montarUrl?: (base: string, escolha: EscolhaDeIdentificador) => string;
  deposito?: DepositoDoRitmo;
  orcamentoMs?: number;
  timeoutMs?: number;
  /** Para onde vai o aviso de formato desconhecido. */
  registar?: (mensagem: string, contexto: Record<string, unknown>) => void;
}

function dormirComTemporizador(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function indisponivel(
  motivo: MotivoDeIndisponivel,
  escolha: EscolhaDeIdentificador,
  quando: string
): ResultadoDaConsulta {
  return {
    estado: "indisponivel",
    motivo,
    identificador: escolha.identificador,
    chave: escolha.chave,
    consultadoEm: quando,
  };
}

/**
 * Pergunta à APSL se conhece este cavalo.
 *
 * Nunca lança, nunca escreve na base, e nunca decide nada sobre o anúncio. O
 * que devolve é um dos cinco estados do `contrato.ts`, e três deles querem
 * dizer «não sabemos» — o que é a resposta honesta na esmagadora maioria dos
 * casos enquanto o interruptor estiver em baixo.
 */
export async function consultarStudBook(
  pedido: PedidoDeConsulta,
  opcoes: OpcoesDaConsulta = {}
): Promise<ResultadoDaConsulta> {
  // 1. O interruptor, antes de tudo o resto. Daqui para trás não há `fetch`,
  //    não há URL montado e não há sequer um identificador escolhido.
  const configuracao = lerConfiguracao(opcoes.ambiente);
  if (!configuracao.ligado) return { estado: "desligado" };

  // 2. Há alguma coisa por que perguntar?
  const escolha = escolherIdentificador(pedido);
  if (!escolha) return { estado: "sem_identificador" };

  // 3. A fila: um pedido de cada vez.
  return enfileirar(() => executar(escolha, configuracao, opcoes));
}

async function executar(
  escolha: EscolhaDeIdentificador,
  configuracao: Extract<Configuracao, { ligado: true }>,
  opcoes: OpcoesDaConsulta
): Promise<ResultadoDaConsulta> {
  const agora = opcoes.agora ?? Date.now;
  const dormir = opcoes.dormir ?? dormirComTemporizador;
  const analisar = opcoes.analisar ?? analisarRespostaApsl;
  const montarUrl = opcoes.montarUrl ?? montarUrlDaConsulta;
  const deposito = opcoes.deposito ?? depositoGlobal;
  const orcamentoMs = opcoes.orcamentoMs ?? ORCAMENTO_MS;
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_MS;
  const registar =
    opcoes.registar ?? ((mensagem, contexto) => logger.warn(mensagem, contexto as never));

  const limite = agora() + orcamentoMs;
  const limites = { intervaloMs: configuracao.intervaloMs, tectoDiario: configuracao.tectoDiario };

  // 4. O ritmo.
  const decisao = avaliarRitmo(deposito.estado, agora(), limites);
  if (decisao.decisao === "tecto_diario") {
    return indisponivel("tecto_diario", escolha, new Date(agora()).toISOString());
  }
  if (decisao.decisao === "esperar") {
    // Esperar só se a espera couber no orçamento. Não cabendo, desiste-se já —
    // é melhor um `indisponivel` imediato do que um vendedor parado.
    if (agora() + decisao.esperaMs >= limite) {
      return indisponivel("sem_vez_a_tempo", escolha, new Date(agora()).toISOString());
    }
    await dormir(decisao.esperaMs);
  }

  const restante = limite - agora();
  if (restante <= 0) {
    return indisponivel("sem_vez_a_tempo", escolha, new Date(agora()).toISOString());
  }

  // 5. O pedido. Conta para o ritmo **antes** de sair: falhado ou não, tocámos
  //    no servidor deles, e é isso que o intervalo mínimo mede.
  const quando = new Date(agora()).toISOString();
  deposito.estado = registarPedido(deposito.estado, agora());

  const buscar = opcoes.fetch ?? (typeof fetch === "function" ? fetch : undefined);
  if (!buscar) return indisponivel("sem_resposta", escolha, quando);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), Math.min(timeoutMs, restante));

  try {
    const resposta = await buscar(montarUrl(configuracao.url, escolha), {
      signal: controlador.signal,
      redirect: "follow",
      headers: {
        // Quem somos e por onde se fala connosco. Ver `configuracao.ts`.
        "User-Agent": configuracao.userAgent,
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
    });

    if (!resposta.ok) return indisponivel("resposta_recusada", escolha, quando);

    const corpo = await resposta.text();
    const analisada = analisar(corpo);

    if (analisada.estado === "formato_desconhecido") {
      // O único caso que quer dizer «alguém tem de vir ver este código». Não
      // quer dizer nada sobre o cavalo, e por isso sai daqui como indisponível.
      registar("stud-book: resposta da APSL não reconhecida", {
        identificador: escolha.identificador,
      });
      return indisponivel("formato_desconhecido", escolha, quando);
    }

    if (analisada.estado === "nao_encontrado") {
      return {
        estado: "desconhecido",
        identificador: escolha.identificador,
        chave: escolha.chave,
        consultadoEm: quando,
      };
    }

    return {
      estado: "confirmado",
      identificador: escolha.identificador,
      chave: escolha.chave,
      consultadoEm: quando,
      // A peneira do contrato: sai o criador, e o proprietário e a descendência
      // nem sequer foram lidos.
      registo: reduzirParaGuardar(analisada.registo),
    };
  } catch {
    // Tempo esgotado, ligação cortada, DNS em baixo, corpo ilegível. Nenhuma
    // destas é uma afirmação sobre o cavalo, e nenhuma sobe daqui como excepção.
    return indisponivel("sem_resposta", escolha, quando);
  } finally {
    clearTimeout(temporizador);
  }
}
