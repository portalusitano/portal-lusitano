/**
 * A consulta ao stud-book da APSL. Aqui é só a porta.
 *
 * ## O estado disto, em duas frases
 *
 * Tudo o que rodeia a consulta está feito e testado: o interruptor, o ritmo, a
 * identificação, o cruzamento com o anúncio e a forma dos factos. **O
 * analisador da resposta está escrito contra um formato suposto**, porque
 * nenhuma resposta real da APSL foi vista — ver o cabeçalho do `analisador.ts`,
 * que explica porquê e o que muda no dia em que a primeira chegar.
 *
 * ## Como se usa, do lado de quem submete um anúncio
 *
 * ```ts
 * const escolha = escolherIdentificador(pedido);
 * const decisao = deveConsultar(consultaGuardada, escolha?.chave ?? null, Date.now());
 * if (decisao.consultar) {
 *   const resultado = await consultarStudBook(pedido);
 *   // guardar `resultado` com o anúncio, e somar 1 às tentativas se ficou
 *   // `indisponivel` — ou repor a zero se a chave mudou.
 * }
 * ```
 *
 * E do lado de quem revê:
 *
 * ```ts
 * const factos = reunirFactosDoStudBook(anuncios);
 * ```
 *
 * ## As regras, em quatro linhas
 *
 * - Desligado por omissão. Sem as três variáveis de ambiente, zero pedidos.
 * - Uma consulta por anúncio, e nunca mais — salvo se o vendedor mudar o número.
 * - Uma ausência de resposta **nunca** vira uma acusação a um vendedor.
 * - Nada aqui recusa um anúncio, nem escreve na base, nem carimba nada.
 */

export {
  ESTADOS_DA_CONSULTA,
  IDENTIFICADORES_DE_CONSULTA,
  MOTIVOS_DE_INDISPONIVEL,
  ORDEM_DOS_IDENTIFICADORES,
  reduzirParaGuardar,
  temRegistoConfirmadoNoStudBook,
} from "./contrato";
export type {
  ConsultaGuardada,
  EstadoDaConsulta,
  IdentificadorDeConsulta,
  MotivoDeIndisponivel,
  PedidoDeConsulta,
  RegistoGuardado,
  RegistoNoStudBook,
  ResultadoDaConsulta,
} from "./contrato";

export {
  INTERVALO_MINIMO_MS,
  lerConfiguracao,
  montarUserAgent,
  TECTO_DIARIO,
  VAR_ACTIVO,
  VAR_CONTACTO,
  VAR_INTERVALO_MS,
  VAR_TECTO_DIARIO,
  VAR_URL,
} from "./configuracao";
export type { Configuracao, RazaoDeDesligado } from "./configuracao";

export {
  avaliarRitmo,
  deveConsultar,
  diaUtc,
  ESPERA_APOS_DESCONHECIDO_MS,
  ESPERA_ENTRE_TENTATIVAS_MS,
  ESPERA_MAXIMA_ENTRE_TENTATIVAS_MS,
  esperaDaTentativa,
  MAX_RESPOSTAS_DESCONHECIDO,
  MAX_TENTATIVAS,
  registarPedido,
  RITMO_VAZIO,
} from "./ritmo";
export type {
  ConsultaAnterior,
  DecisaoDeConsultar,
  DecisaoDoRitmo,
  EstadoDoRitmo,
  RazaoDeConsultar,
  RazaoDeNaoConsultar,
} from "./ritmo";

export { analisarRespostaApsl, normalizarData } from "./analisador";
export type { Analisador, RespostaAnalisada } from "./analisador";

export {
  consultarStudBook,
  escolherIdentificador,
  montarUrlDaConsulta,
  ORCAMENTO_MS,
  reiniciarRitmo,
  TIMEOUT_MS,
} from "./consulta";
export type { EscolhaDeIdentificador, OpcoesDaConsulta } from "./consulta";

export { CAMPOS_DE_DIVERGENCIA, cruzarComStudBook } from "./cruzar";
export type { AnuncioParaStudBook, DivergenciaComStudBook } from "./cruzar";

export {
  assentarResultado,
  consultaDaLinha,
  guardarConsultaDoCavalo,
  lerConsultaDoCavalo,
  lerMemoriaDaChave,
  linhaDaConsulta,
  registarConsultaDoAnuncio,
  TABELA_CONSULTAS,
} from "./registo";
export type {
  ClienteDoRegisto,
  OpcoesDoRegisto,
  PedidoDeRegisto,
  ResumoDoRegisto,
} from "./registo";

export { factosDoAnuncio, reunirFactosDoStudBook, TIPOS_DE_FACTO } from "./factos";
export type { EntradaDoStudBook, FactoDoStudBook, TipoDeFacto } from "./factos";
