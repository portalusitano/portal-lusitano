/**
 * O sítio único que responde «o que se sabe sobre este documento?».
 *
 * ## Porque é que isto existe
 *
 * Havia cinco motores — a leitura, a forense, a coerência, os sinais e o
 * cruzamento com o formulário — e nenhum deles se conhecia. Um ecrã que
 * quisesse a resposta inteira tinha de chamar os cinco à mão, saber a ordem por
 * que se leem, e escrever de novo a explicação inocente de cada família. O
 * sexto ecrã ia chamar quatro, e ninguém ia dar por isso — porque um achado que
 * falta não se vê: a página continua a parecer completa.
 *
 * Este módulo é a junta. Não calcula nada de novo: pega no que os cinco
 * devolvem e transforma-o numa lista só, com uma forma só.
 *
 * ## A regra que manda em tudo o que está aqui
 *
 * **Nada disto verifica nem recusa coisa nenhuma.** `verificado` continua a
 * escrever-se num sítio só — `app/api/admin/documentos/[id]/verificar/route.ts`
 * — e continua a exigir que uma pessoa carregue num botão. Não há nesta saída
 * nota, percentagem, semáforo, contagem de gravidade nem «probabilidade de
 * fraude»; há factos, cada um com a sua explicação inocente ao lado. O teste
 * `documentos-verificacao-vocabulario` percorre a saída inteira e falha se lá
 * aparecer a chave `gravidade`, `risco`, `score`, `pontuacao`, `accao` ou
 * `decisao`.
 *
 * ## A explicação inocente é obrigatória, e nem todos a traziam
 *
 * O `forense/` escreve a sua ao lado de cada achado, e diz porquê: no dia em
 * que a frase vive noutro ficheiro, existe um dia em que alguém mostra o facto
 * sem ela. O `coerencia/` e o `sinais.ts` **não a trazem** — a saída deles é
 * feita de identificadores e números, para poder servir tanto um formulário
 * como um painel. Como não posso tocar nesses módulos, as frases deles vivem
 * aqui, presas ao `tipo` num `Record` que o TypeScript obriga a estar completo:
 * acrescentar um tipo novo lá e esquecer a frase aqui não compila.
 *
 * É a segunda melhor solução. A melhor era estarem ao lado do facto, como no
 * forense. Fica escrito no relatório.
 *
 * ## O que não se guarda, e é a razão de haver um `leituraParaGuardar`
 *
 * O `lerDocumento` devolve o **texto inteiro** do documento. Num passaporte
 * equino esse texto tem o nome e a morada do proprietário. O que serve para
 * confrontar são os quatro identificadores; o resto é dado pessoal a mais numa
 * coluna que ninguém cifra e que uma consulta mal feita despeja num registo.
 * Guarda-se o que confronta e deita-se fora o resto — quem precisa de ler o
 * documento abre o documento, que é o que a ficha de revisão já faz.
 */

import type {
  Conflito,
  LeituraDoDocumento,
  MimeDeDocumento,
  TipoDeDocumento,
} from "@/lib/documentos/contrato";
import {
  type Achado as AchadoDeCoerencia,
  type TipoDeAchado as TipoDeAchadoDeCoerencia,
} from "@/lib/documentos/coerencia";
import {
  reunirForense,
  type Achado as AchadoForense,
  type TipoDeAchado as TipoDeAchadoForense,
} from "@/lib/documentos/forense";
import { lerDocumento, type DadosDoAnuncio } from "@/lib/documentos/leitura";
import { cruzarComFormulario } from "@/lib/documentos/leitura/cruzar";
import type { Sinal, TipoDeSinal } from "@/lib/documentos/sinais";

// ─── O que sai daqui ─────────────────────────────────────────────────────────

/**
 * De onde é que uma nota veio.
 *
 * Serve para o painel poder agrupar e para quem lê saber que espécie de
 * pergunta é que foi feita — «o ficheiro» é uma pergunta sobre bytes, «entre
 * anúncios» é uma pergunta sobre a tabela, e as duas enganam-se de maneiras
 * diferentes. **Não é uma escala**: nenhuma destas origens vale mais do que
 * outra.
 */
export const ORIGENS_DA_NOTA = ["ficheiro", "cavalo", "entre_anuncios", "formulario"] as const;
export type OrigemDaNota = (typeof ORIGENS_DA_NOTA)[number];

/**
 * Um facto, com a sua explicação inocente ao lado.
 *
 * É a forma única em que este módulo entrega tudo o que os cinco motores
 * dizem. `observacao` conta o que se mediu, em indicativo e sem adjectivos;
 * `explicacaoInocente` diz porque é que um documento honesto dá este mesmo
 * resultado. **Nunca há uma sem a outra** — é isso que impede que uma lista de
 * factos técnicos se leia como um dossiê de acusação.
 */
export interface Nota {
  origem: OrigemDaNota;
  /** A chave estável do achado dentro da família dele. Para o painel agrupar. */
  chave: string;
  observacao: string;
  explicacaoInocente: string;
  /**
   * Os anúncios a que a nota diz respeito, quando ela nasce de mais do que um.
   * Vazio numa nota que fala só do documento que se está a rever.
   */
  cavalos: string[];
}

/**
 * O estado do exame automático sobre **este ficheiro**.
 *
 * Os três não são graus da mesma coisa, são respostas a perguntas diferentes, e
 * um painel que os confunda dá por examinado o único documento que ninguém
 * abriu:
 *
 * - `por_correr` — nunca se tentou. É o que se lê num documento que subiu antes
 *   de este sistema existir.
 * - `falhou` — tentou-se e rebentou. O documento ficou guardado à mesma; o que
 *   falta é o exame, não o ficheiro.
 * - `correu` — fez-se. As notas que estiverem na lista são as que há, e uma
 *   lista vazia quer dizer que não se encontrou nada.
 */
export const ESTADOS_DA_ANALISE = ["por_correr", "falhou", "correu"] as const;
export type EstadoDaAnalise = (typeof ESTADOS_DA_ANALISE)[number];

/** Tudo o que se sabe sobre um documento, numa vista só. */
export interface VistaDeVerificacao {
  /** Os factos, pela ordem de leitura descrita mais abaixo. */
  notas: Nota[];
  /** Se o exame automático do ficheiro chegou a correr, e o que lhe aconteceu. */
  analise: EstadoDaAnalise;
  /** Quando é que o exame correu, em ISO-8601. Ausente se nunca correu. */
  analisadoEm?: string;
  /**
   * Não se conseguiu ir buscar o que era preciso para responder à pergunta.
   *
   * É diferente de tudo o que está acima, e a diferença tinha de existir: sem
   * ela, uma consulta que falhasse dava uma lista vazia com a análise «por
   * correr» — e isso é **uma afirmação falsa**, porque a análise pode muito bem
   * ter corrido e ser a recolha que não a foi buscar. Quem revê veria um painel
   * calmo em vez de um painel avariado, que é a pior maneira de falhar num ecrã
   * onde se decide.
   */
  recolhaFalhou?: boolean;
}

// ─── A ordem de leitura ──────────────────────────────────────────────────────

/**
 * A ordem por que as notas se leem.
 *
 * **Não é uma ordenação por importância, e a distinção não é retórica.** Uma
 * ordenação por importância é uma pontuação com outro nome: dizia a quem revê
 * quanto é que cada facto pesa, e o peso é de quem revê. O que esta ordem usa é
 * outra coisa — **quão raro e quão específico é o facto**, que é uma propriedade
 * observável da espécie do achado e não um juízo sobre este documento.
 *
 * O mesmo ficheiro em dois anúncios acontece a um documento em muitos milhares
 * e não tem segunda leitura; o campo `Producer` de um PDF dizer o nome de um
 * multifunções acontece a quase todos e não quer dizer nada. Pôr o segundo
 * primeiro é enterrar o primeiro — e um aviso que se lê depois de a decisão
 * estar tomada é um aviso que não existe.
 *
 * O que **não** acontece: este número não sai daqui. Não há na `Nota` nenhum
 * campo de posição, de grau ou de peso; a ordem é a ordem do array e mais nada.
 * Duas notas do mesmo tipo mantêm a ordem que o motor delas lhes deu.
 */
const ORDEM_DE_LEITURA: readonly string[] = [
  // Raro, e sem segunda leitura possível: é o mesmo ficheiro, byte a byte.
  "documento_repetido",
  // Raro: alguém pintou por cima de texto que já lá estava.
  "pdf_tinta_por_cima_de_texto",
  // O que não pode ser, pela biologia ou pela árvore.
  "nascimento_no_futuro",
  "nascimento_depois_do_historial",
  "antepassado_de_si_proprio",
  "sexo_contra_papel",
  "progenitor_mais_novo",
  "papel_contraditorio",
  // O mesmo identificador em dois sítios onde só podia estar num.
  "microchip_repetido",
  "ueln_repetido",
  "registo_em_vendedores_diferentes",
  // O documento contradiz o que o vendedor escreveu, ou o outro documento.
  "conflito_com_o_formulario",
  "contradicao_por_rever",
  "contradicao_entre_documentos",
  // O ficheiro traz vestígios de quem lhe mexeu.
  "pdf_historico_de_edicao",
  "pdf_assinatura",
  "pdf_campo_de_assinatura_por_assinar",
  // Improvável, e existe: um cavalo de 32 anos existe.
  "partos_demasiado_juntos",
  "registo_com_dois_nomes",
  "nome_com_dois_registos",
  "idade_declarada_diverge",
  "altura_para_a_idade",
  "longevidade_invulgar",
  // Comum ao ponto de não distinguir nada. Fica em baixo, e fica.
  "pdf_guardado_mais_do_que_uma_vez",
  "imagem_medidas_diferentes_das_do_exif",
  "imagem_coordenadas",
  "pdf_metadados",
  "imagem_metadados",
  "jpeg_estrutura",
  // Não é um achado sobre o documento: é a confissão de que não se olhou.
  "nao_examinado",
];

const POSICAO = new Map(ORDEM_DE_LEITURA.map((chave, i) => [chave, i]));

/** O que não estiver na lista vai para o fim, sem rebentar nada. */
function posicaoDe(chave: string): number {
  return POSICAO.get(chave) ?? ORDEM_DE_LEITURA.length;
}

// ─── As explicações inocentes que os módulos não trazem ──────────────────────

/**
 * Porque é que um cavalo honesto dá cada um destes achados de coerência.
 *
 * O `Record` é sobre o tipo completo de propósito: acrescentar um achado ao
 * `coerencia/achados.ts` e esquecer a frase aqui **não compila**. É a mesma
 * garantia que o forense tem por ter a frase ao lado do facto, feita da única
 * maneira que sobra a quem não pode tocar no módulo.
 */
const EXPLICACAO_DA_COERENCIA: Readonly<Record<TipoDeAchadoDeCoerencia, string>> = {
  nascimento_no_futuro:
    "Uma data no futuro é quase sempre um engano de escrita — o ano trocado, ou o dia e o mês " +
    "invertidos por quem está habituado a outro formato. O formulário aceita a data que lhe " +
    "derem, e ninguém relê uma data depois de a escrever.",
  nascimento_depois_do_historial:
    "As datas de saúde são preenchidas de memória e muitas vezes com o ano corrente por " +
    "omissão, enquanto a data de nascimento vem do documento. Basta uma delas estar com o ano " +
    "errado para todas ficarem antes do nascimento sem que nada de estranho tenha acontecido.",
  idade_declarada_diverge:
    "A idade foi escrita no dia em que o anúncio foi pago e não se actualiza sozinha; a data de " +
    "nascimento não muda. Um anúncio renovado ao fim de um ano mostra exactamente esta " +
    "diferença, e um cavalo que faz anos depois de o anúncio ser posto também.",
  longevidade_invulgar:
    "Cavalos assim existem e são-no com orgulho. A idade sai da conta entre duas datas, e um " +
    "ano mal escrito na data de nascimento produz o mesmo resultado sem haver cavalo nenhum " +
    "fora do comum.",
  altura_para_a_idade:
    "A altura ao garrote é medida à fita por quem tem o cavalo à frente, e a curva de " +
    "crescimento é uma média: um poldro grande de uma linhagem grande sai dela sem nada de " +
    "errado. Um número escrito em polegadas, ou com um algarismo a mais, dá o mesmo.",
  progenitor_mais_novo:
    "Quem preenche a ascendência copia-a do Livro Azul, onde os nomes se repetem de geração em " +
    "geração — há muitos cavalos com o mesmo nome e décadas de diferença. Duas linhas com o " +
    "mesmo nome podem ser dois cavalos, e a data de nascimento do anúncio pode estar mal " +
    "escrita de um dos dois lados.",
  partos_demasiado_juntos:
    "Duas éguas diferentes com o mesmo nome é o caso mais comum de todos, e uma data de " +
    "nascimento mal copiada é o segundo. Nada disto vem de um registo oficial: vem de dois " +
    "vendedores a escrever à mão o nome da mãe dos cavalos deles.",
  antepassado_de_si_proprio:
    "A consanguinidade é prática corrente na criação do Lusitano, e um mesmo antepassado " +
    "aparece legitimamente em vários ramos da mesma árvore. Além disso os nomes repetem-se " +
    "entre gerações da mesma coudelaria, e é por nome que muitas destas linhas se reconhecem.",
  papel_contraditorio:
    "O mesmo nome em posição de pai num anúncio e de mãe noutro é, quase sempre, dois cavalos " +
    "diferentes com o mesmo nome — ou um campo trocado por quem preencheu a árvore de cor. " +
    "Trocar o pai com a mãe num formulário de seis caixas é um engano de um segundo.",
  sexo_contra_papel:
    "O campo do sexo do outro anúncio pode estar errado, ou os dois nomes iguais podem ser dois " +
    "cavalos. Um garanhão castrado depois de ter coberto continua a ser pai de quem já gerou, e " +
    "o anúncio dele diz «Castrado» com razão.",
  registo_com_dois_nomes:
    "Um cavalo é conhecido pelo nome de casa e registado com outro, e cada vendedor escreve o " +
    "que lhe é mais familiar. Um algarismo mal copiado num número de registo põe o número de um " +
    "cavalo debaixo do nome de outro sem má intenção nenhuma.",
  nome_com_dois_registos:
    "Nomes repetem-se muito na criação do Lusitano — a mesma coudelaria usa o mesmo nome de " +
    "geração em geração. Dois registos diferentes debaixo do mesmo nome são, na maior parte das " +
    "vezes, dois cavalos diferentes.",
  contradicao_entre_documentos:
    "Os dois valores foram lidos por uma máquina, e uma leitura automática engana-se: um " +
    "carimbo por cima de um algarismo, uma digitalização torta, um oito que sai seis. Os " +
    "documentos também podem ser de datas diferentes, com o mais antigo a trazer um dado que " +
    "entretanto mudou.",
};

/**
 * E o mesmo para os sinais entre anúncios.
 *
 * Repare-se no que a explicação do `documento_repetido` **não** diz: não diz
 * que é inocente. Diz qual é a maneira de ser inocente, que é o que quem revê
 * tem de ir confirmar. Uma explicação que não exista não se inventa — mas
 * também não há aqui nenhum achado sem pelo menos uma, senão não entrava.
 */
const EXPLICACAO_DO_SINAL: Readonly<Record<TipoDeSinal, string>> = {
  documento_repetido:
    "O mesmo vendedor a anunciar dois cavalos da mesma coudelaria pode ter anexado o ficheiro " +
    "errado a um deles, e um anúncio recomeçado do princípio depois de uma desistência deixa " +
    "documentos ligados a duas submissões. O que isto diz é que há dois destinos para o mesmo " +
    "ficheiro — não de quem é o cavalo.",
  microchip_repetido:
    "O mesmo cavalo anunciado duas vezes pela mesma pessoa — um anúncio esquecido por baixar, " +
    "outro posto de novo com fotografias melhores — dá exactamente isto. O número também pode " +
    "ter sido copiado do documento errado por quem tem vários cavalos a anunciar ao mesmo tempo.",
  ueln_repetido:
    "Vale o mesmo que para o microchip: um anúncio repetido pela mesma pessoa, ou o número do " +
    "passaporte de um cavalo copiado para o formulário de outro por quem estava a preencher " +
    "dois seguidos.",
  registo_em_vendedores_diferentes:
    "Um cavalo muda de dono e é revendido, e isso é legítimo e acontece. Se o anúncio antigo " +
    "não foi baixado pelo dono anterior, os dois ficam de pé ao mesmo tempo sem que ninguém " +
    "tenha feito nada de mal. Um número de registo mal copiado dá o mesmo.",
  contradicao_por_rever:
    "Os valores do lado do documento foram lidos por uma máquina a partir da camada de texto do " +
    "PDF, e essa leitura engana-se. Um passaporte digitalizado traz números impressos a corpo " +
    "pequeno por cima de tramas de segurança, e o vendedor pode ter escrito o dele de cor.",
};

/** A explicação da contradição entre o documento e o formulário. */
const EXPLICACAO_DO_CONFLITO =
  "O valor do lado do documento foi lido por uma máquina e pode estar errado — é para isso que " +
  "o documento está aqui ao lado, para uma pessoa o ler. O vendedor também pode ter escrito o " +
  "número de cor, ou ter anexado o documento de outro cavalo dele por engano.";

// ─── As observações que os módulos não trazem ────────────────────────────────

function lista(valores: readonly string[]): string {
  if (valores.length <= 1) return valores[0] ?? "";
  return `${valores.slice(0, -1).join(", ")} e ${valores[valores.length - 1]}`;
}

/** Como se nomeia um cavalo reconhecido por registo ou por nome. */
function porIdentidade(identidade: { chave: string; base: "registo" | "nome" }): string {
  return identidade.base === "registo"
    ? `o registo ${identidade.chave}`
    : `o nome «${identidade.chave}»`;
}

/**
 * O que cada achado de coerência diz, por palavras.
 *
 * Em indicativo e sem adjectivos, como as do forense: conta-se o que se mediu,
 * não o que isso quer dizer. O `switch` é exaustivo sobre a união — um achado
 * novo sem frase não compila.
 */
function observacaoDaCoerencia(achado: AchadoDeCoerencia): string {
  switch (achado.tipo) {
    case "nascimento_no_futuro":
      return `a data de nascimento declarada é ${achado.dataNascimento}, que é posterior a ${achado.hoje}.`;
    case "nascimento_depois_do_historial":
      return (
        `o nascimento é ${achado.dataNascimento} e as ${achado.historial.length} datas do ` +
        `historial são todas anteriores: ${lista(achado.historial.map((h) => `${h.campo} em ${h.data}`))}.`
      );
    case "idade_declarada_diverge":
      return (
        `o anúncio diz ${achado.idadeDeclarada} anos e a data de nascimento ` +
        `(${achado.dataNascimento}) dá ${achado.idadePelaData}, ${achado.anosDeDiferenca} de diferença.`
      );
    case "longevidade_invulgar":
      return `a data de nascimento ${achado.dataNascimento} dá ${achado.anos} anos.`;
    case "altura_para_a_idade":
      return (
        `com ${achado.mesesDeIdade} meses e ${achado.alturaCm} cm ao garrote, a curva de ` +
        `crescimento aponta para ${achado.alturaAdultaImplicita} cm em adulto.`
      );
    case "progenitor_mais_novo":
      return (
        `em ${achado.caminho}, ${porIdentidade(achado.identidade)} está à venda noutro anúncio ` +
        `com nascimento em ${achado.dataNascimentoDoProgenitor}, contra ${achado.dataNascimento} ` +
        `deste — ${achado.mesesEntreOsNascimentos} meses, quando ${achado.geracoes} ` +
        `${achado.geracoes === 1 ? "geração exige" : "gerações exigem"} pelo menos ` +
        `${achado.mesesMinimosExigidos}.`
      );
    case "partos_demasiado_juntos":
      return (
        `${porIdentidade(achado.mae)}, em posição de mãe, tem dois nascimentos a ${achado.dias} ` +
        `dias um do outro: ${lista(achado.nascimentos.map((n) => n.data))}.`
      );
    case "antepassado_de_si_proprio":
      return (
        `${porIdentidade(achado.identidade)} aparece na própria ascendência, em ` +
        `${lista(achado.caminhos)}.`
      );
    case "papel_contraditorio":
      return (
        `${porIdentidade(achado.identidade)} aparece em posição de pai e em posição de mãe, em ` +
        `${lista(achado.ocorrencias.map((o) => o.caminho))}.`
      );
    case "sexo_contra_papel":
      return (
        `em ${achado.caminho}, ${porIdentidade(achado.identidade)} ocupa a posição de ` +
        `${achado.papel} e o anúncio desse cavalo declara o sexo «${achado.sexo}».`
      );
    case "registo_com_dois_nomes":
      return `o registo ${achado.registo} aparece escrito com os nomes ${lista(achado.nomes)}.`;
    case "nome_com_dois_registos":
      return `o nome «${achado.nome}» aparece com os registos ${lista(achado.registos)}.`;
    case "contradicao_entre_documentos":
      return (
        `no campo ${achado.campo}, os documentos desta submissão dizem coisas diferentes: ` +
        `${lista(achado.leituras.map((l) => `${l.tipoDeDocumento} diz «${l.valor}»`))}.`
      );
  }
}

function observacaoDoSinal(sinal: Sinal): string {
  switch (sinal.tipo) {
    case "documento_repetido":
      return (
        `este ficheiro, byte a byte, está ligado a ${sinal.destinos.length} destinos ` +
        `diferentes, em ${sinal.documentos.length} linhas` +
        (sinal.cavalosComDocumentacaoVerificada.length > 0
          ? `; ${sinal.cavalosComDocumentacaoVerificada.length} desses anúncios já mostram documentação verificada ao público.`
          : ".")
      );
    case "microchip_repetido":
      return (
        `o microchip ${sinal.chave} está declarado em ${sinal.anuncios.length} anúncios em pé ` +
        `ao mesmo tempo.`
      );
    case "ueln_repetido":
      return (
        `o passaporte ${sinal.chave} está declarado em ${sinal.anuncios.length} anúncios em pé ` +
        `ao mesmo tempo.`
      );
    case "registo_em_vendedores_diferentes":
      return (
        `o registo ${sinal.chave} está em ${sinal.anuncios.length} anúncios em pé de ` +
        `${sinal.vendedores.length} contas diferentes` +
        (sinal.anunciosSemVendedor.length > 0
          ? `, mais ${sinal.anunciosSemVendedor.length} sem conta associada.`
          : ".")
      );
    case "contradicao_por_rever":
      return (
        `a leitura deste documento tinha guardado ${sinal.conflitos.length} ` +
        `${sinal.conflitos.length === 1 ? "contradição" : "contradições"} com o formulário: ` +
        `${lista(sinal.conflitos.map((c) => c.campo))}.`
      );
  }
}

/** Os anúncios que um sinal nomeia, sem repetições e por ordem. */
function cavalosDoSinal(sinal: Sinal): string[] {
  switch (sinal.tipo) {
    case "documento_repetido":
      return [...new Set(sinal.documentos.map((d) => d.cavaloId).filter((v): v is string => !!v))];
    case "microchip_repetido":
    case "ueln_repetido":
    case "registo_em_vendedores_diferentes":
      return [...new Set(sinal.anuncios.map((a) => a.cavaloId))];
    case "contradicao_por_rever":
      return sinal.documento.cavaloId ? [sinal.documento.cavaloId] : [];
  }
}

// ─── As conversões ───────────────────────────────────────────────────────────

function notaDoForense(achado: AchadoForense): Nota {
  return {
    origem: "ficheiro",
    chave: achado.tipo satisfies TipoDeAchadoForense,
    observacao: achado.observacao,
    explicacaoInocente: achado.explicacaoInocente,
    cavalos: [],
  };
}

function notaDaCoerencia(achado: AchadoDeCoerencia): Nota {
  return {
    origem: achado.cavalos.length > 1 ? "entre_anuncios" : "cavalo",
    chave: achado.tipo,
    observacao: observacaoDaCoerencia(achado),
    explicacaoInocente: EXPLICACAO_DA_COERENCIA[achado.tipo],
    cavalos: achado.cavalos,
  };
}

function notaDoSinal(sinal: Sinal): Nota {
  return {
    origem: sinal.tipo === "contradicao_por_rever" ? "formulario" : "entre_anuncios",
    chave: sinal.tipo,
    observacao: observacaoDoSinal(sinal),
    explicacaoInocente: EXPLICACAO_DO_SINAL[sinal.tipo],
    cavalos: cavalosDoSinal(sinal),
  };
}

function notaDoConflito(conflito: Conflito): Nota {
  return {
    origem: "formulario",
    chave: "conflito_com_o_formulario",
    observacao:
      `no campo ${conflito.campo}, o formulário diz «${conflito.noFormulario}» e a leitura do ` +
      `documento diz «${conflito.noDocumento}».`,
    explicacaoInocente: EXPLICACAO_DO_CONFLITO,
    cavalos: [],
  };
}

// ─── A porta ─────────────────────────────────────────────────────────────────

/**
 * Tudo o que se sabe sobre um documento, numa lista só.
 *
 * É **pura**: não lê a base, não escreve nada, não contacta serviço nenhum.
 * Quem a chama traz as linhas já lidas. É isso que a torna testável sem base de
 * dados, e é isso que impede que um ecrã a chame dentro de um laço sem dar por
 * isso.
 *
 * Os sinais e a coerência chegam já calculados de fora — quem os calcula
 * precisa das linhas vizinhas, e ir buscá-las é trabalho de quem tem a ligação
 * à base. O que este módulo garante é que, venham de onde vierem, saem daqui
 * todos com a mesma forma e com a explicação inocente ao lado.
 */
export function reunirVerificacao(entrada: {
  /** Os achados do exame do ficheiro, ou `undefined` se ele não correu. */
  forense?: readonly AchadoForense[];
  coerencia?: readonly AchadoDeCoerencia[];
  sinais?: readonly Sinal[];
  /** As contradições guardadas na linha, ou recalculadas contra o anúncio. */
  conflitos?: readonly Conflito[];
  analise?: EstadoDaAnalise;
  analisadoEm?: string;
}): VistaDeVerificacao {
  const notas: Nota[] = [
    ...(entrada.forense ?? []).map(notaDoForense),
    ...(entrada.coerencia ?? []).map(notaDaCoerencia),
    ...(entrada.sinais ?? []).map(notaDoSinal),
    ...(entrada.conflitos ?? []).map(notaDoConflito),
  ];

  // Um `sort` estável: agrupa por espécie sem desfazer a ordem que cada motor
  // trouxe de dentro. A mesma entrada dá sempre a mesma saída — um painel que
  // muda de ordem entre dois carregamentos faz quem revê perder o sítio.
  notas.sort((a, b) => posicaoDe(a.chave) - posicaoDe(b.chave));

  return {
    notas,
    analise: entrada.analise ?? "por_correr",
    ...(entrada.analisadoEm ? { analisadoEm: entrada.analisadoEm } : {}),
  };
}

// ─── O que se guarda, e o que se deita fora ──────────────────────────────────

/**
 * A leitura reduzida ao que serve para confrontar.
 *
 * Sai o `texto`. Ele é útil — quem revê procura nele sem abrir o PDF — mas num
 * passaporte equino são páginas com o nome e a morada do proprietário, e a
 * quarta regra deste trabalho é não guardar mais do que é preciso. Os quatro
 * identificadores são o que a ficha confronta e o que os sinais entre anúncios
 * leem; o documento inteiro está no balde privado, a um clique, para quem
 * precisar de o ler.
 *
 * A `origem` fica. É ela que distingue «o PDF não tinha camada de texto» de
 * «tinha e não trazia nenhum destes campos», e essas duas mandam quem revê
 * fazer coisas diferentes.
 */
export function leituraParaGuardar(leitura: LeituraDoDocumento): LeituraDoDocumento {
  const { texto: _texto, ...semTexto } = leitura;
  return semTexto;
}

/** O envelope que fica na coluna `forense`. Ver `EstadoDaAnalise`. */
export type ForenseGuardada =
  | { correu: true; em: string; achados: AchadoForense[] }
  | { correu: false; em: string };

/**
 * O que a subida guarda sobre um documento.
 *
 * As três peças saem juntas para que a linha da base fique coerente: escrever a
 * leitura num sítio e o exame noutro é a maneira mais rápida de acabar com uma
 * linha que diz que se leu e não diz se se examinou.
 */
export interface AnaliseDeDocumento {
  leitura: LeituraDoDocumento;
  conflitos: Conflito[];
  forense: ForenseGuardada;
}

/**
 * Correr a leitura e o exame forense sobre um ficheiro. **Nunca lança.**
 *
 * É a regra que não se negoceia: um erro no analisador não pode fazer perder um
 * Livro Azul que o vendedor enviou. Se rebentar, o que se guarda é
 * `correu: false` — que é uma afirmação diferente de «correu e não encontrou
 * nada», e é a diferença que impede um painel de dar por examinado o único
 * documento que ninguém abriu.
 *
 * ## O `anuncio` chega quase sempre vazio, e isso está certo
 *
 * Na subida o anúncio ainda não existe: o documento sobe antes do pagamento e o
 * `cavalo_id` só é preenchido quando o Stripe confirma. Sem os campos do
 * formulário, o `cruzarComFormulario` não tem contra o que comparar e devolve
 * uma lista vazia — o que é o resultado certo, porque ninguém contradisse
 * ninguém ainda. As contradições verdadeiras nascem mais tarde, e por isso quem
 * revê as recalcula a partir da leitura guardada e do anúncio que entretanto
 * nasceu. Ver `reunirVerificacao` e a nota no relatório.
 */
export function analisarDocumento(
  conteudo: Uint8Array,
  mime: MimeDeDocumento,
  anuncio: DadosDoAnuncio = {}
): AnaliseDeDocumento {
  const em = new Date().toISOString();

  let leitura: LeituraDoDocumento = { origem: "nenhuma" };
  let conflitos: Conflito[] = [];
  let forense: ForenseGuardada = { correu: false, em };

  try {
    leitura = lerDocumento(conteudo, mime, anuncio);
    conflitos = cruzarComFormulario(leitura, anuncio);
    forense = { correu: true, em, achados: reunirForense(conteudo, mime) };
  } catch {
    // Deliberadamente mudo quanto à causa: quem chama regista o que precisa, e
    // o documento entra na mesma. O que **não** pode acontecer é a subida
    // falhar por causa do exame.
    return { leitura: { origem: "nenhuma" }, conflitos: [], forense: { correu: false, em } };
  }

  return { leitura, conflitos, forense };
}

// ─── Ler de volta o que ficou guardado ───────────────────────────────────────

/**
 * A coluna `forense` vem de um `jsonb`, que aceita o que lá puserem.
 *
 * Quem a escreve é outro caminho do sistema, e o painel não pode assumir que a
 * escreveu bem: uma entrada malformada não pode deitar abaixo a ficha de quem
 * revê. O que não tiver a forma esperada lê-se como «por correr», que é a
 * afirmação mais fraca das três e portanto a única segura de fazer sem saber.
 */
export function forenseDaLinha(valor: unknown): {
  analise: EstadoDaAnalise;
  analisadoEm?: string;
  achados: AchadoForense[];
} {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return { analise: "por_correr", achados: [] };
  }

  const v = valor as Record<string, unknown>;
  const em = typeof v.em === "string" ? v.em : undefined;

  if (v.correu !== true) {
    return { analise: "falhou", ...(em ? { analisadoEm: em } : {}), achados: [] };
  }

  const achados = Array.isArray(v.achados)
    ? (v.achados.filter(
        (a) =>
          a !== null &&
          typeof a === "object" &&
          typeof (a as Record<string, unknown>).tipo === "string" &&
          typeof (a as Record<string, unknown>).observacao === "string" &&
          // Sem a explicação inocente o achado **não entra**. Um facto técnico
          // sozinho é exactamente o que este sistema existe para não mostrar.
          typeof (a as Record<string, unknown>).explicacaoInocente === "string"
      ) as AchadoForense[])
    : [];

  return { analise: "correu", ...(em ? { analisadoEm: em } : {}), achados };
}

/** Os tipos de documento por extenso, para as observações que os nomeiam. */
export const ROTULO_DO_TIPO_DE_DOCUMENTO: Readonly<Record<TipoDeDocumento, string>> = {
  livro_azul: "Livro Azul",
  passaporte: "passaporte equino",
  exame_vet: "exame veterinário",
};
