/**
 * O interruptor.
 *
 * ## Porque é que isto está desligado, e porque é que assim fica
 *
 * A consulta pública ao stud-book da APSL é gratuita e não pede registo — mas
 * **ser pública para uma pessoa não é o mesmo que ser autorizada a um programa
 * que a interroga em nome de terceiros**. O `robots.txt` e os termos de
 * utilização do `cavalo-lusitano.com` não foram lidos: o ambiente onde este
 * código foi escrito não tem rede de saída, e a secção 1 do
 * `docs/verificacao-documental.md` mostra o registo dos pedidos todos a
 * falharem no CONNECT, incluindo para `example.com`.
 *
 * Quem decide isto é o dono do sítio, depois de falar com a APSL. Até lá,
 * **nenhum pedido pode sair**, e é esta função que o garante: sem as variáveis
 * de ambiente todas, `lerConfiguracao` devolve `ligado: false` e o
 * `consulta.ts` nem chega a tocar no `fetch`. Há um teste que o prova contando
 * chamadas.
 *
 * ## As três condições, e nenhuma delas é dispensável
 *
 * 1. **O interruptor** (`STUD_BOOK_APSL_ACTIVO`) — uma afirmação deliberada de
 *    quem administra. Por omissão, ausente, e ausente quer dizer desligado.
 * 2. **O endereço** (`STUD_BOOK_APSL_URL`) — não há valor por omissão porque
 *    **não sabemos qual é**. O endereço real do motor de pesquisa só se
 *    descobre abrindo a página de acesso público, e inventá-lo seria mandar
 *    pedidos a um sítio à sorte. Tem de ser `https`: a pergunta leva o
 *    microchip de um cavalo, que é dado de identificação.
 * 3. **O contacto** (`STUD_BOOK_APSL_CONTACTO`) — vai no `User-Agent`, com o
 *    nome do sítio. **Quem consulta a coberto do anonimato está a assumir que
 *    não seria autorizado.** É por isso que a falta do contacto desliga tudo em
 *    vez de mandar um cabeçalho vago: um pedido anónimo não é uma versão pior
 *    deste sistema, é outro sistema, e não é este que se quis construir.
 */

import { SITE_URL } from "@/lib/constants";

export const VAR_ACTIVO = "STUD_BOOK_APSL_ACTIVO";
export const VAR_URL = "STUD_BOOK_APSL_URL";
export const VAR_CONTACTO = "STUD_BOOK_APSL_CONTACTO";
export const VAR_INTERVALO_MS = "STUD_BOOK_APSL_INTERVALO_MS";
export const VAR_TECTO_DIARIO = "STUD_BOOK_APSL_TECTO_DIARIO";

/**
 * Cinco segundos entre pedidos.
 *
 * É um formulário de página, feito para uma pessoa a escrever num teclado.
 * Doze pedidos por minuto no pior caso é abaixo do que uma pessoa apressada
 * faz, e é o ritmo que se propõe à APSL por escrito — não um número que se
 * aperta depois em silêncio.
 */
export const INTERVALO_MINIMO_MS = 5_000;

/**
 * Duzentas consultas por dia.
 *
 * A conta é: uma por anúncio submetido, e nunca mais. Duzentos anúncios num dia
 * é muito acima do que este site recebe, o que faz do tecto o que ele deve ser
 * — uma rede contra um ciclo enganado, e não uma quota que se gaste.
 */
export const TECTO_DIARIO = 200;

/** Nunca abaixo de um segundo, por muito que a variável diga. */
const INTERVALO_MINIMO_ABSOLUTO_MS = 1_000;
const INTERVALO_MAXIMO_MS = 600_000;
const TECTO_MAXIMO = 5_000;

/**
 * Porque é que está desligado. Serve o registo e o painel; nenhum destes
 * motivos chega ao público, e nenhum diz nada sobre cavalo nenhum.
 */
export type RazaoDeDesligado =
  /** A variável do interruptor não está posta, ou não é uma afirmação. */
  | "interruptor_desligado"
  /** Não há endereço, e não há endereço por omissão porque não o sabemos. */
  | "sem_endereco"
  /** O endereço não se lê como URL. */
  | "endereco_invalido"
  /** O endereço não é `https`. */
  | "endereco_inseguro"
  /** Não há contacto, e sem contacto não se consulta. */
  | "sem_contacto";

export interface ConfiguracaoLigada {
  ligado: true;
  url: string;
  /** Diz quem somos e como nos encontrar. Vai em todos os pedidos. */
  userAgent: string;
  intervaloMs: number;
  tectoDiario: number;
}

export interface ConfiguracaoDesligada {
  ligado: false;
  razao: RazaoDeDesligado;
}

export type Configuracao = ConfiguracaoLigada | ConfiguracaoDesligada;

/** O que conta como um «sim». Tudo o resto — e a ausência — é «não». */
const AFIRMACOES = new Set(["1", "true", "sim", "on", "yes"]);

function afirmativo(valor: string | undefined): boolean {
  return typeof valor === "string" && AFIRMACOES.has(valor.trim().toLowerCase());
}

function inteiroEntre(valor: string | undefined, minimo: number, maximo: number, omissao: number) {
  if (typeof valor !== "string" || valor.trim() === "") return omissao;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return omissao;
  const inteiro = Math.trunc(numero);
  if (inteiro < minimo || inteiro > maximo) return omissao;
  return inteiro;
}

/**
 * O `User-Agent` com que nos apresentamos.
 *
 * Traz o nome, o endereço do sítio, o que andamos a fazer e por onde se fala
 * connosco. Quem receber o pedido consegue, em dez segundos, perceber quem é e
 * mandar-nos parar — que é exactamente o ponto.
 */
export function montarUserAgent(contacto: string, siteUrl: string = SITE_URL): string {
  return `PortalLusitano/1.0 (+${siteUrl}; verificacao-de-anuncios; ${contacto})`;
}

/**
 * Lê o ambiente e diz se se pode consultar.
 *
 * A ordem por que se verificam as condições é a ordem por que se resolvem: não
 * vale a pena queixar-se do contacto em falta a quem nem sequer ligou o
 * interruptor.
 */
export function lerConfiguracao(
  ambiente: Record<string, string | undefined> = process.env
): Configuracao {
  if (!afirmativo(ambiente[VAR_ACTIVO])) {
    return { ligado: false, razao: "interruptor_desligado" };
  }

  const url = ambiente[VAR_URL]?.trim();
  if (!url) return { ligado: false, razao: "sem_endereco" };

  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    return { ligado: false, razao: "endereco_invalido" };
  }
  if (endereco.protocol !== "https:") return { ligado: false, razao: "endereco_inseguro" };

  const contacto = ambiente[VAR_CONTACTO]?.trim();
  if (!contacto) return { ligado: false, razao: "sem_contacto" };

  return {
    ligado: true,
    url: endereco.toString(),
    userAgent: montarUserAgent(contacto),
    intervaloMs: inteiroEntre(
      ambiente[VAR_INTERVALO_MS],
      INTERVALO_MINIMO_ABSOLUTO_MS,
      INTERVALO_MAXIMO_MS,
      INTERVALO_MINIMO_MS
    ),
    tectoDiario: inteiroEntre(ambiente[VAR_TECTO_DIARIO], 1, TECTO_MAXIMO, TECTO_DIARIO),
  };
}
