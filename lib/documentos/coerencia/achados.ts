/**
 * O que sai da verificação de coerência: factos, com a sua natureza.
 *
 * ## A pergunta que este subsistema responde, e a que não responde
 *
 * O site **não consegue** perguntar à APSL se um cavalo está registado — essa
 * verdade vive no livro de origem e não aqui. O que consegue é outra coisa, e
 * é de maior alcance do que parece: **um pedigree inventado quase nunca é
 * biologicamente coerente**. Um pai mais novo do que o filho, uma égua com dois
 * filhos a quarenta dias de distância, um cavalo que consta como seu próprio
 * avô — nada disto precisa de sair da nossa base para se ver.
 *
 * O que sai daqui é da mesma família do que sai do `../sinais.ts`: **factos com
 * identificadores**, nunca notas nem semáforos. Não há `gravidade`, não há
 * `risco`, não há pontuação e não há acção recomendada. Quem decide é uma
 * pessoa, ou a `components/vender-cavalo/inspeccao.ts`, que faz a pergunta ao
 * vendedor no instante em que ele ainda está a pensar naquilo.
 *
 * ## As duas naturezas, e porque é que não são três
 *
 * - **`impossivel`** — as duas afirmações não podem ser ambas verdadeiras. Um
 *   pai nascido depois do filho é isto: não há mundo em que as duas datas
 *   estejam certas. O facto **não diz qual delas está errada**, e é importante
 *   que não diga.
 * - **`improvavel`** — as duas afirmações podem ser ambas verdadeiras, e
 *   raramente são. Um cavalo de 32 anos, uma égua que primeiro pariu aos dois.
 *   Acontece.
 *
 * **Um improvável nunca é um impedimento.** Está escrito assim em vários
 * módulos deste repositório e é para respeitar: recusar um anúncio verdadeiro
 * custa um vendedor honesto e a reputação de quem o recusou; fazer uma pergunta
 * a mais custa dez segundos a quem a lê.
 *
 * ## Como se identifica um antepassado, e porque é que isso manda em tudo
 *
 * Um antepassado é texto que um vendedor escreveu numa caixa. Duas linhas são
 * o mesmo cavalo quando têm o mesmo **número de registo** — e aí a identidade é
 * sólida —, ou quando têm o mesmo **nome** — e aí é um palpite, porque no livro
 * de origem do Lusitano os nomes repetem-se com fartura, entre gerações e entre
 * coudelarias.
 *
 * Daqui sai a regra que atravessa o módulo inteiro: **uma identidade fundada só
 * no nome nunca produz um `impossivel`**. A biologia pode dizer «impossível»,
 * mas se o que liga os dois lados é um nome repetido, o que está incerto é a
 * ligação e não a biologia. É o que `abrandar` faz, e é a única maneira que
 * este módulo tem de não transformar o costume de dar ao potro o nome do avô
 * numa acusação de fraude.
 */

import { lerData, mesesEntre } from "@/lib/datas-do-cavalo";
import { chaveRegistoApsl } from "@/components/vender-cavalo/registo-apsl";
import { chaveDeNome } from "@/lib/documentos/leitura/normalizar";
import type { Conflito } from "@/lib/documentos/contrato";

// ─── Natureza e identidade ───────────────────────────────────────────────────

/** Ver o cabeçalho: o que não pode ser, e o que pode ser e quase nunca é. */
export const NATUREZAS = ["impossivel", "improvavel"] as const;
export type Natureza = (typeof NATUREZAS)[number];

/** Por onde se reconheceu que duas linhas falam do mesmo cavalo. */
export type BaseDeIdentidade = "registo" | "nome";

/** Um cavalo nomeado por outro cavalo: a chave e a razão por que é essa. */
export interface Identidade {
  /** A forma canónica — `chaveRegistoApsl` ou `chaveDeNome`. */
  chave: string;
  base: BaseDeIdentidade;
}

/**
 * A natureza que sobra depois de se pesar a identidade que a sustenta.
 *
 * Um `impossivel` fundado num nome desce a `improvavel`. Um `improvavel`
 * fica-se onde está — não há nível abaixo, e não é preciso: o que estava em
 * causa era não subir.
 */
export function abrandar(natureza: Natureza, base: BaseDeIdentidade): Natureza {
  return base === "registo" ? natureza : "improvavel";
}

/**
 * A identidade de uma linha de ascendência.
 *
 * O registo ganha ao nome sempre que existe: é o único dos dois que foi feito
 * para identificar. Uma linha sem registo e sem nome não tem identidade
 * nenhuma — devolve `null`, e é esse `null` que impede o erro simétrico de
 * juntar num grupo todos os antepassados que ficaram em branco.
 */
export function identidadeDe(linha: {
  nome?: string | null;
  registo?: string | null;
}): Identidade | null {
  const registo = typeof linha.registo === "string" ? chaveRegistoApsl(linha.registo) : "";
  if (registo.length >= 3) return { chave: registo, base: "registo" };
  const nome = typeof linha.nome === "string" ? chaveDeNome(linha.nome) : "";
  if (nome.length >= 3) return { chave: nome, base: "nome" };
  return null;
}

/**
 * Duas identidades são a mesma quando a chave e a base coincidem.
 *
 * A base entra na comparação de propósito. Um antepassado identificado pelo
 * registo `LUS201900421` e outro identificado pelo nome `ZIMBRO` **não** se
 * juntam, mesmo que sejam o mesmo cavalo: cruzar os dois espaços de nomes daria
 * grupos que não querem dizer nada, e um antepassado com registo que casasse
 * por acaso com o nome de outro seria um achado do nada.
 */
export function mesmaIdentidade(a: Identidade, b: Identidade): boolean {
  return a.base === b.base && a.chave === b.chave;
}

/** A chave de agrupamento, que carrega a base para não misturar os dois espaços. */
export function chaveDeGrupo(identidade: Identidade): string {
  return `${identidade.base}:${identidade.chave}`;
}

// ─── Posição na árvore ───────────────────────────────────────────────────────

/** As duas posições que um antepassado pode ocupar em cada passo da árvore. */
export type Papel = "pai" | "mae";

/**
 * O papel que o último passo do caminho exige.
 *
 * O `caminho` conta-se do exemplar para trás — `pai.mae` é a mãe do pai —, e
 * por isso quem manda no sexo é sempre o último segmento. Devolve `null` num
 * caminho que não é feito de `pai` e `mae`: melhor não saber do que adivinhar.
 */
export function papelDoCaminho(caminho: string): Papel | null {
  const passos = caminho.split(".");
  const ultimo = passos[passos.length - 1];
  return ultimo === "pai" || ultimo === "mae" ? ultimo : null;
}

/**
 * `a` é um antepassado de `b` pela mesma linha?
 *
 * `pai` é antepassado de `pai.pai` — o caminho mais curto está mais perto do
 * exemplar e o mais longo continua-o. `pai` **não** é antepassado de `mae.pai`:
 * são duas linhas diferentes, e o mesmo cavalo nas duas é um garanhão que
 * cobriu a própria filha, o que é consanguinidade e não uma impossibilidade.
 */
export function eAntepassadoDe(a: string, b: string): boolean {
  return b.length > a.length && b.startsWith(`${a}.`);
}

/**
 * Os campos do formulário onde cada posição da árvore mora.
 *
 * É este mapa que permite a um achado da ascendência aterrar no sítio certo do
 * formulário. Os nomes são os do `FormData` do `components/vender-cavalo`; um
 * caminho de terceira geração — que a tabela já aceita — não tem campo, e por
 * isso o mapa responde `undefined` em vez de inventar um.
 */
export const CAMPO_DO_CAMINHO: Readonly<Record<string, string>> = {
  pai: "pai_nome",
  mae: "mae_nome",
  "pai.pai": "avo_paterno_nome",
  "pai.mae": "avo_paterno_mae_nome",
  "mae.pai": "avo_materno_nome",
  "mae.mae": "avo_materno_mae_nome",
};

// ─── As entradas ─────────────────────────────────────────────────────────────

/**
 * Um anúncio, reduzido ao que a coerência lê.
 *
 * Os nomes são os das colunas de `cavalos_venda`, tal e qual — `registro_apsl`
 * com o `r` a mais incluído. Copiá-los poupa uma tradução que só existiria para
 * ficar bonita e que seria mais um sítio onde alguém se engana.
 */
export interface CavaloParaCoerencia {
  id: string;
  data_nascimento: string | null;
  /** A idade em anos como o formulário a escreveu no dia em que foi pago. */
  idade: number | null;
  /** `Garanhão`, `Égua` ou `Castrado` — os valores são fixos e não traduzidos. */
  sexo: string | null;
  /** Ao garrote, em centímetros. */
  altura: number | null;
  nome: string | null;
  nome_registo: string | null;
  registro_apsl: string | null;
  status: string | null;
}

/** Uma linha de `cavalos_venda_ascendentes`, reduzida ao mesmo. */
export interface AscendenteParaCoerencia {
  cavalo_id: string;
  /** `pai`, `mae`, `pai.pai`, `pai.mae`, `mae.pai`, `mae.mae`. */
  caminho: string;
  geracao: number;
  nome: string | null;
  registo: string | null;
}

/**
 * Uma data do historial do cavalo, com o campo de onde veio.
 *
 * Fica genérica de propósito: quem chama passa o que tiver — as três datas de
 * saúde de hoje, as que amanhã se acrescentarem — e este módulo não precisa de
 * saber o que cada uma quer dizer para reparar que **todas** são anteriores ao
 * nascimento.
 */
export interface DataDeHistorial {
  campo: string;
  data: string;
}

/** Uma linha de `documentos_cavalo`, reduzida ao que a coerência lê. */
export interface DocumentoParaCoerencia {
  id: string;
  referencia: string;
  tipo: string;
  estado: string;
  leitura: {
    ueln?: string;
    microchip?: string;
    numeroRegisto?: string;
    nome?: string;
  } | null;
}

// ─── O que um achado é ───────────────────────────────────────────────────────

/**
 * Os tipos, por ordem de leitura: primeiro o que o cavalo diz de si próprio,
 * depois a ascendência, e no fim os documentos entre si.
 */
export const TIPOS_DE_ACHADO = [
  "nascimento_no_futuro",
  "nascimento_depois_do_historial",
  "idade_declarada_diverge",
  "longevidade_invulgar",
  "altura_para_a_idade",
  "progenitor_mais_novo",
  "partos_demasiado_juntos",
  "antepassado_de_si_proprio",
  "papel_contraditorio",
  "sexo_contra_papel",
  "registo_com_dois_nomes",
  "nome_com_dois_registos",
  "contradicao_entre_documentos",
] as const;
export type TipoDeAchado = (typeof TIPOS_DE_ACHADO)[number];

interface AchadoBase {
  tipo: TipoDeAchado;
  natureza: Natureza;
  /**
   * Os anúncios a que o achado diz respeito, por ordem e sem repetições.
   *
   * Um achado com um só anúncio nasce inteiro dentro de uma submissão e pode
   * voltar ao formulário; um achado com dois nasce do cruzamento de duas
   * submissões e não tem campo nenhum onde aterrar. É esta contagem que
   * `campoDoAchado` lê.
   */
  cavalos: string[];
}

/** Uma data de nascimento posterior a hoje. */
export interface AchadoNascimentoNoFuturo extends AchadoBase {
  tipo: "nascimento_no_futuro";
  natureza: "impossivel";
  dataNascimento: string;
  hoje: string;
}

/** Todas as datas do historial são anteriores ao nascimento. */
export interface AchadoNascimentoDepoisDoHistorial extends AchadoBase {
  tipo: "nascimento_depois_do_historial";
  natureza: "impossivel";
  dataNascimento: string;
  /** As datas que ficaram para trás, por ordem de campo. */
  historial: DataDeHistorial[];
}

/** A idade guardada e a idade que a data de nascimento dá não são a mesma. */
export interface AchadoIdadeDeclaradaDiverge extends AchadoBase {
  tipo: "idade_declarada_diverge";
  natureza: "improvavel";
  dataNascimento: string;
  idadeDeclarada: number;
  idadePelaData: number;
  anosDeDiferenca: number;
}

/** Um cavalo acima da longevidade corrente. */
export interface AchadoLongevidadeInvulgar extends AchadoBase {
  tipo: "longevidade_invulgar";
  natureza: "improvavel";
  dataNascimento: string;
  anos: number;
}

/** A altura declarada implica uma altura adulta que não existe. */
export interface AchadoAlturaParaAIdade extends AchadoBase {
  tipo: "altura_para_a_idade";
  natureza: "improvavel";
  dataNascimento: string;
  alturaCm: number;
  mesesDeIdade: number;
  /** A altura a que o cavalo chegaria adulto, pela curva de crescimento. */
  alturaAdultaImplicita: number;
}

/** Um antepassado mais novo do que o descendente, ou novo de mais para o ser. */
export interface AchadoProgenitorMaisNovo extends AchadoBase {
  tipo: "progenitor_mais_novo";
  natureza: Natureza;
  /** O anúncio do descendente. */
  cavaloId: string;
  caminho: string;
  /** Quantos passos de geração separam os dois. `pai` é 1, `pai.pai` é 2. */
  geracoes: number;
  identidade: Identidade;
  /** O anúncio onde o antepassado também está à venda. */
  cavaloDoProgenitor: string;
  dataNascimento: string;
  dataNascimentoDoProgenitor: string;
  /**
   * Meses do nascimento do antepassado ao nascimento do descendente. **Negativo
   * quando o antepassado nasceu depois**, que é o caso que não pode ser.
   */
  mesesEntreOsNascimentos: number;
  /** O mínimo que estas gerações exigem, para quem lê saber contra o que se comparou. */
  mesesMinimosExigidos: number;
}

/** Dois anúncios com a mesma mãe e datas de nascimento demasiado juntas. */
export interface AchadoPartosDemasiadoJuntos extends AchadoBase {
  tipo: "partos_demasiado_juntos";
  natureza: "improvavel";
  mae: Identidade;
  /** Os dois anúncios, por ordem de data de nascimento. */
  nascimentos: { cavaloId: string; data: string }[];
  dias: number;
}

/** Um cavalo que consta da sua própria ascendência. */
export interface AchadoAntepassadoDeSiProprio extends AchadoBase {
  tipo: "antepassado_de_si_proprio";
  natureza: Natureza;
  cavaloId: string;
  identidade: Identidade;
  /**
   * As posições onde a mesma identidade aparece. O `exemplar` é o próprio
   * cavalo do anúncio; os outros são caminhos da tabela.
   */
  caminhos: string[];
}

/** A mesma identidade em posição de pai e em posição de mãe. */
export interface AchadoPapelContraditorio extends AchadoBase {
  tipo: "papel_contraditorio";
  natureza: Natureza;
  identidade: Identidade;
  ocorrencias: OcorrenciaDoAntepassado[];
}

/** Um antepassado que também está à venda, e cujo sexo não cabe na posição. */
export interface AchadoSexoContraPapel extends AchadoBase {
  tipo: "sexo_contra_papel";
  natureza: "impossivel";
  cavaloId: string;
  caminho: string;
  papel: Papel;
  identidade: Identidade;
  cavaloDoAntepassado: string;
  sexo: string;
}

/** O mesmo número de registo escrito com dois nomes diferentes. */
export interface AchadoRegistoComDoisNomes extends AchadoBase {
  tipo: "registo_com_dois_nomes";
  natureza: "improvavel";
  registo: string;
  /** As formas canónicas distintas, por ordem. */
  nomes: string[];
  ocorrencias: OcorrenciaDoAntepassado[];
}

/** O mesmo nome com dois números de registo diferentes. */
export interface AchadoNomeComDoisRegistos extends AchadoBase {
  tipo: "nome_com_dois_registos";
  natureza: "improvavel";
  nome: string;
  registos: string[];
  ocorrencias: OcorrenciaDoAntepassado[];
}

/** Dois documentos da mesma submissão que dizem coisas diferentes. */
export interface AchadoContradicaoEntreDocumentos extends AchadoBase {
  tipo: "contradicao_entre_documentos";
  natureza: Natureza;
  referencia: string;
  campo: Conflito["campo"];
  /** O que cada documento diz, por ordem de id. */
  leituras: { documentoId: string; tipoDeDocumento: string; valor: string }[];
}

/** Onde e como um antepassado aparece. */
export interface OcorrenciaDoAntepassado {
  cavaloId: string;
  caminho: string;
  papel: Papel | null;
  /** Os valores **como estão guardados**, antes de qualquer limpeza. */
  nome: string | null;
  registo: string | null;
}

export type Achado =
  | AchadoNascimentoNoFuturo
  | AchadoNascimentoDepoisDoHistorial
  | AchadoIdadeDeclaradaDiverge
  | AchadoLongevidadeInvulgar
  | AchadoAlturaParaAIdade
  | AchadoProgenitorMaisNovo
  | AchadoPartosDemasiadoJuntos
  | AchadoAntepassadoDeSiProprio
  | AchadoPapelContraditorio
  | AchadoSexoContraPapel
  | AchadoRegistoComDoisNomes
  | AchadoNomeComDoisRegistos
  | AchadoContradicaoEntreDocumentos;

// ─── A costura com o formulário ──────────────────────────────────────────────

/**
 * O nível de apontamento que cada natureza merece, e mais nada.
 *
 * Fica aqui, exportado e num sítio só, para que a tradução seja **explícita e
 * de quem chama**. Um achado não sabe se vai parar a um formulário ou a um
 * painel de revisão, e não é ele que decide: os objectos que saem deste módulo
 * não têm — e o teste prova que não têm — nenhuma chave de gravidade, risco,
 * pontuação ou acção.
 *
 * A garantia que interessa é a de cima para baixo: `improvavel` dá `aviso`, que
 * na `inspeccao.ts` deixa passar e pergunta. **Nunca dá `erro`.**
 */
export const NIVEL_DA_NATUREZA: Readonly<Record<Natureza, "erro" | "aviso">> = {
  impossivel: "erro",
  improvavel: "aviso",
};

/**
 * O campo do formulário onde este achado aterra, se aterrar em algum.
 *
 * Devolve `null` — e é o caso mais comum — sempre que o achado nasceu do
 * cruzamento de mais do que um anúncio. Um facto que só existe porque **outro**
 * anúncio diz outra coisa não pode travar o passo de quem está a preencher o
 * formulário: o que estiver errado pode estar do outro lado, e o vendedor que
 * está à frente do ecrã não tem como o corrigir.
 *
 * É esta função que garante que nenhum `impossivel` de cruzamento se torna um
 * `erro` no formulário.
 */
export function campoDoAchado(achado: Achado): string | null {
  if (achado.cavalos.length !== 1) return null;

  switch (achado.tipo) {
    case "nascimento_no_futuro":
    case "nascimento_depois_do_historial":
    case "longevidade_invulgar":
      return "data_nascimento";
    case "altura_para_a_idade":
      return "altura";
    case "antepassado_de_si_proprio": {
      // O campo é o do antepassado mais fundo, que é o que o vendedor
      // escreveu a mais: o exemplar não tem caixa na árvore.
      const caminhos = achado.caminhos.filter((c) => c !== "exemplar");
      const caminho = caminhos[caminhos.length - 1];
      return caminho ? (CAMPO_DO_CAMINHO[caminho] ?? null) : null;
    }
    case "papel_contraditorio":
    case "registo_com_dois_nomes":
    case "nome_com_dois_registos": {
      const caminho = achado.ocorrencias[achado.ocorrencias.length - 1]?.caminho;
      return caminho ? (CAMPO_DO_CAMINHO[caminho] ?? null) : null;
    }
    default:
      // `idade_declarada_diverge` compara-se com uma coluna que o formulário
      // não tem; `progenitor_mais_novo`, `partos_demasiado_juntos` e
      // `sexo_contra_papel` dependem sempre de outro anúncio, e por isso nunca
      // chegam aqui com um só cavalo; e a contradição entre documentos não é
      // de nenhum campo em particular.
      return null;
  }
}

// ─── Utilitários partilhados ─────────────────────────────────────────────────

/** A ordem da saída é sempre a mesma para a mesma entrada. Ver `../sinais.ts`. */
export function porTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Valores distintos, por ordem, sem repetições. */
export function distintosOrdenados(valores: readonly string[]): string[] {
  return [...new Set(valores)].sort(porTexto);
}

/** Uma data guardada, ou `null` se não houver ou não for uma data. */
export function data(valor: string | null | undefined): Date | null {
  return typeof valor === "string" ? lerData(valor) : null;
}

/** Quantos dias completos vão de uma data à outra. Negativo se `ate` for antes. */
export function diasEntre(desde: Date, ate: Date): number {
  return Math.floor((ate.getTime() - desde.getTime()) / 86_400_000);
}

/** Quantos meses completos vão de uma data à outra. Reexportado para não haver duas contas. */
export { mesesEntre };

/**
 * A identidade do próprio exemplar.
 *
 * Um anúncio tem dois nomes — o nome por que o cavalo é conhecido e o nome
 * registado — e um número de registo. Devolve as identidades que der, porque
 * o exemplar tem de poder ser reconhecido na árvore de outro anúncio por
 * qualquer uma delas.
 */
export function identidadesDoCavalo(cavalo: CavaloParaCoerencia): Identidade[] {
  const saida: Identidade[] = [];
  const vistas = new Set<string>();
  const juntar = (linha: { nome?: string | null; registo?: string | null }) => {
    const id = identidadeDe(linha);
    if (!id) return;
    const k = chaveDeGrupo(id);
    if (vistas.has(k)) return;
    vistas.add(k);
    saida.push(id);
  };
  juntar({ registo: cavalo.registro_apsl });
  juntar({ nome: cavalo.nome });
  juntar({ nome: cavalo.nome_registo });
  return saida;
}
