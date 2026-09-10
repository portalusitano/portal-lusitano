/**
 * O sítio único que responde «e então, o que se faz a este anúncio?».
 *
 * ## O que isto é, e o que não é — leia-se isto primeiro
 *
 * **Isto não abre nenhuma porta nova de recusa.** Hoje, e antes de este
 * ficheiro existir, **todos** os anúncios nascem em `status: "pending"` e é uma
 * pessoa que os aprova, em `app/api/admin/cavalos/[id]`. Nada aqui muda isso:
 * não há neste módulo — e não pode vir a haver — uma saída chamada «recusado»,
 * porque recusar continua a ser um acto de uma pessoa e continua a acontecer no
 * mesmo sítio de sempre.
 *
 * O que este módulo faz é **ordenar a fila** dessa pessoa e dizer-lhe o que
 * olhar primeiro. Se daqui a um ano alguém abrir este ficheiro à procura do
 * sítio onde o sistema decide sozinho: não existe, e a ausência é o desenho.
 *
 * ## As três saídas, e porque é que nenhuma é «recusado»
 *
 * - **`segue`** — nada levantou a mão. Vai para a fila normal.
 * - **`segue_com_nota`** — há coisas a olhar, nenhuma impeditiva. Vai para a
 *   fila **à frente**, com o que há para ver ao lado.
 * - **`espera_por_pessoa`** — há uma contradição que não se resolve sem alguém
 *   decidir. O anúncio **não é recusado**: fica à espera de revisão, e o
 *   vendedor é informado disso e do que pode reconferir.
 *
 * A diferença entre as duas primeiras é a ordem da fila e mais nada. A terceira
 * é a única que diz alguma coisa ao vendedor, e diz-lhe que está à espera —
 * nunca que está errado.
 *
 * ## A regra que define o valor disto: só o impossível segura
 *
 * O `coerencia/` já separa, por dados e não por opinião, o **`impossivel`** do
 * **`improvavel`** — e o `NIVEL_DA_NATUREZA` traduz o primeiro para `erro` e o
 * segundo para `aviso`. Este módulo lê essa distinção e não inventa outra.
 *
 * A razão é aritmética de custos, não escrúpulo: um pai nascido depois do filho
 * é impossível e é raro; um cavalo de 32 anos é improvável e existe. Se os
 * improváveis segurassem anúncios, a fila enchia-se de criadores honestos, e
 * quem revê aprendia a carimbar sem olhar — que é exactamente como se mata um
 * sistema de verificação. Uma fila que só cresce com contradições verdadeiras é
 * uma fila que se lê.
 *
 * E repare-se no que um `impossivel` diz e no que não diz: diz que **duas
 * afirmações não podem ser ambas verdadeiras**, e não diz qual delas está
 * errada. É por isso que a saída dele é «espera por uma pessoa» e não
 * «recusado» — escolher qual das duas cai é um juízo, e o juízo é de quem revê.
 * Todas as outras famílias deste sistema escrevem, ao lado de cada facto, uma
 * maneira de ele acontecer com as duas afirmações verdadeiras; um facto assim
 * pede olhos, não segura nada.
 *
 * ## O que **nunca** segura, e está escrito para não se perder
 *
 * 1. **Um improvável.** Ver acima. É a regra inteira.
 * 2. **A APSL calada.** `indisponivel` e `desligado` são problemas nossos — o
 *    serviço em baixo, o nosso tecto diário, o nosso próprio interruptor, que
 *    está em baixo por omissão. Nem sequer produzem uma razão: se produzissem,
 *    **todos** os anúncios do site seriam `segue_com_nota` enquanto o
 *    interruptor estivesse desligado, e uma fila em que tudo está à frente não
 *    tem frente nenhuma.
 * 3. **Um `desconhecido` da APSL.** A APSL respondeu e não conhece o número.
 *    Um erro de escrita, um cavalo estrangeiro por inscrever, um número antigo
 *    e uma falsificação produzem o mesmo silêncio, e nós não os distinguimos. É
 *    uma nota, e mais nada.
 * 4. **Uma ausência.** Sem data de nascimento, sem microchip, sem documento
 *    examinado, sem nada — não há contradição nenhuma, porque não há duas
 *    afirmações. Um anúncio com metade dos campos vazios sai `segue`. Nada
 *    neste ficheiro conta campos preenchidos.
 * 5. **Uma contagem.** Não há aqui nenhum sítio onde duas notas somem uma
 *    espera. Um limiar de contagem é uma pontuação com outro nome, e chegaria
 *    ao ecrã como um número ao lado do anúncio.
 *
 * ## Zero notas, percentagens e semáforos
 *
 * A saída são **três valores nomeados e uma lista de razões**. Não há aqui —
 * nem pode vir a haver — `gravidade`, `risco`, `score`, `pontuacao`, `accao`
 * nem `decisao`; o teste `documentos-decisao-vocabulario` percorre a saída
 * inteira e falha se lá aparecer uma dessas chaves. Um «73% de confiança» é
 * lido como sentença, e o preço de estar errado é acusar de fraude um criador
 * que digitalizou o Livro Azul com o software do multifunções dele.
 *
 * ## Cada razão leva a explicação inocente, e não se escreve duas vezes
 *
 * O `verificacao.ts` já é a junta que põe o forense, a coerência, os sinais e
 * os conflitos todos com a mesma forma — observação e explicação inocente lado
 * a lado — e já escreveu as frases que o `coerencia/` e o `sinais.ts` não
 * trazem. Este módulo **chama-o** em vez de as reescrever: uma segunda cópia da
 * mesma frase é uma frase que amanhã diverge da primeira.
 *
 * O que ele não conhece são as duas famílias que nasceram depois — a consulta
 * ao stud-book e as impressões das fotografias. Essas duas têm as frases aqui,
 * num `switch` exaustivo sobre a união: um tipo novo lá dentro sem frase aqui
 * **não compila**. É o mesmo padrão que o `verificacao.ts` usa com o `Record`
 * completo, feito da única maneira que sobra a quem não pode tocar no módulo.
 *
 * ## É pura, e chega-lhe o que lhe derem
 *
 * Não lê a base, não escreve nada, não contacta serviço nenhum. Quem chama traz
 * os achados já calculados — como no `reunirVerificacao`, e pela mesma razão:
 * calcular a coerência e os sinais exige as linhas vizinhas, e ir buscá-las é
 * trabalho de quem tem a ligação à base. Também não filtra por anúncio: os
 * achados que chegam são os que dizem respeito a este anúncio, e inventar aqui
 * uma segunda ideia de «este anúncio» seria uma segunda fonte de verdade a par
 * da lista que já foi entregue.
 */

import type { Conflito } from "@/lib/documentos/contrato";
import {
  campoDoAchado,
  NIVEL_DA_NATUREZA,
  type Achado as AchadoDeCoerencia,
} from "@/lib/documentos/coerencia";
import type {
  Achado as AchadoForense,
  TipoDeAchado as TipoDeAchadoForense,
} from "@/lib/documentos/forense";
import type { Sinal } from "@/lib/documentos/sinais";
import type { FactoDoStudBook, IdentificadorDeConsulta } from "@/lib/documentos/stud-book";
import { ORIGENS_DA_NOTA, reunirVerificacao, type Nota } from "@/lib/documentos/verificacao";
import type { SinalFotografiaParecida } from "@/lib/fotos/sinais";

// ─── O que sai daqui ─────────────────────────────────────────────────────────

/**
 * As três saídas. **Não é uma escala**, e a ordem em que estão escritas não é
 * um grau: são três respostas a três situações diferentes.
 *
 * Nenhuma delas é «recusado», e não é um esquecimento — ver o cabeçalho.
 */
export const SAIDAS = ["segue", "segue_com_nota", "espera_por_pessoa"] as const;
export type Saida = (typeof SAIDAS)[number];

/**
 * De onde é que uma razão veio.
 *
 * São as quatro origens que a junta já nomeia — e vêm de lá, não copiadas — mais
 * as duas famílias que ela não conhece. Serve para agrupar no painel e para quem
 * lê saber que espécie de pergunta foi feita: «o ficheiro» pergunta sobre bytes,
 * «entre anúncios» pergunta à tabela, «o stud-book» pergunta a outra
 * instituição, e as três enganam-se de maneiras diferentes.
 *
 * **Não é uma escala**: nenhuma origem vale mais do que outra.
 */
export const ORIGENS_DA_RAZAO = [...ORIGENS_DA_NOTA, "stud_book", "fotografias"] as const;
export type OrigemDaRazao = (typeof ORIGENS_DA_RAZAO)[number];

/**
 * Um facto que vale a pena olhar, com a sua explicação inocente ao lado.
 *
 * É a `Nota` da junta mais duas coisas que só fazem sentido quando se está a
 * responder «o que se faz a este anúncio»:
 *
 * - `segura` — esta razão, **sozinha**, é o que põe o anúncio à espera de uma
 *   pessoa. É um booleano e não um peso: não há meio-segura, e não há duas
 *   razões que somadas segurem.
 * - `campo` — o campo do formulário onde isto aterra, quando aterra em algum.
 *   É o que permite dizer ao vendedor o que pode reconferir. `null` sempre que
 *   o facto nasce do cruzamento com outro anúncio: o que estiver errado pode
 *   estar do outro lado, e quem está à frente do ecrã não tem como o corrigir.
 */
export interface Razao {
  origem: OrigemDaRazao;
  /** A chave estável do achado dentro da família dele. Para o painel agrupar. */
  chave: string;
  observacao: string;
  explicacaoInocente: string;
  /** Os anúncios a que a razão diz respeito. Vazio quando fala só deste. */
  cavalos: string[];
  segura: boolean;
  campo: string | null;
}

/**
 * O que se diz ao vendedor, e nada mais do que isso.
 *
 * Sem prazos: não há fila com prazo, não há nada que a percorra sozinha, e um
 * prazo escrito aqui é um compromisso que ninguém está a cumprir. E sem contar
 * ao vendedor o que se viu noutros anúncios — metade das razões deste sistema
 * nascem do cruzamento com anúncios de outras pessoas, e essas não são dele
 * para saber.
 */
export interface PalavrasParaOVendedor {
  titulo: string;
  explicacao: string;
  /**
   * Os campos do formulário que o vendedor pode reconferir, por ordem e sem
   * repetições. Vazio quando não há nada que ele possa corrigir — o que é o
   * caso sempre que a contradição envolve outro anúncio.
   *
   * São os nomes dos campos tal e qual, como em `PASSO_DE_CADA_CAMPO`: quem
   * desenha o ecrã já sabe traduzi-los, e traduzi-los aqui punha uma segunda
   * lista de rótulos a par da que o formulário já tem.
   */
  aRever: string[];
}

/** A resposta inteira: o que se faz, porquê, e o que se diz a quem enviou. */
export interface Decisao {
  saida: Saida;
  /** As razões, com as que seguram à frente. Ver `ordenar`. */
  razoes: Razao[];
  paraOVendedor: PalavrasParaOVendedor;
}

// ─── As palavras do vendedor ─────────────────────────────────────────────────

/**
 * O que `segue` e `segue_com_nota` dizem — e dizem **a mesma coisa**, de
 * propósito.
 *
 * A diferença entre as duas é a ordem da fila de quem revê, e a ordem da fila
 * de quem revê não é assunto do vendedor. Dizer-lhe «o seu anúncio tem notas»
 * sem lhe poder dizer quais — porque quase todas falam de anúncios de outras
 * pessoas — seria preocupá-lo com uma coisa sobre a qual ele não pode fazer
 * nada. Há um teste que compara os dois textos e falha se alguém os separar.
 */
const SEGUE_PARA_REVISAO = {
  titulo: "Anúncio recebido. Segue para revisão.",
  explicacao:
    "Todos os anúncios são revistos por uma pessoa da equipa antes de ficarem públicos. " +
    "Nada do que enviou levantou uma pergunta.",
} as const;

/**
 * As palavras de cada saída.
 *
 * O `Record` é sobre a união completa: uma saída nova sem palavras **não
 * compila**. E as palavras de `espera_por_pessoa` dizem três coisas e nenhuma a
 * mais — que está à espera, porquê, e que **não foi recusado**. Essa última
 * frase é a que impede que quem a lê presuma o pior.
 */
export const PALAVRAS_DA_SAIDA: Readonly<
  Record<Saida, { readonly titulo: string; readonly explicacao: string }>
> = {
  segue: SEGUE_PARA_REVISAO,
  segue_com_nota: SEGUE_PARA_REVISAO,
  espera_por_pessoa: {
    titulo: "Anúncio recebido. Está à espera de uma pessoa.",
    explicacao:
      "Há duas coisas no anúncio que não podem estar ambas certas, e não somos nós que " +
      "escolhemos qual delas está errada — vai olhar uma pessoa da equipa. O anúncio não foi " +
      "recusado.",
  },
};

// ─── Ajudas de escrita ───────────────────────────────────────────────────────

function lista(valores: readonly string[]): string {
  if (valores.length <= 1) return valores[0] ?? "";
  return `${valores.slice(0, -1).join(", ")} e ${valores[valores.length - 1]}`;
}

/** Valores distintos, por ordem de chegada, sem repetições e sem nulos. */
function distintos(valores: readonly (string | null | undefined)[]): string[] {
  return [...new Set(valores.filter((v): v is string => typeof v === "string" && v !== ""))];
}

/** Por que identificador se perguntou à APSL, por extenso. */
const NOME_DO_IDENTIFICADOR: Readonly<Record<IdentificadorDeConsulta, string>> = {
  numero_registo: "número de registo",
  ueln: "passaporte (UELN)",
  microchip: "microchip",
};

// ─── Quais dos achados do ficheiro pedem olhos ───────────────────────────────

/**
 * Nem tudo o que o forense encontra é uma coisa a olhar.
 *
 * A fronteira não é minha: é a que o `verificacao.ts` já escreveu na ordem de
 * leitura dele, onde os achados vêm agrupados por **quão raros e quão
 * específicos** são — e onde o último grupo se chama, por extenso, «comum ao
 * ponto de não distinguir nada». Copio essa fronteira em vez de inventar uma
 * segunda: um `Producer` de PDF a dizer o nome de um multifunções acontece a
 * quase todos os ficheiros, e uma razão que aparece em quase todos os anúncios
 * não põe nenhum à frente na fila — só faz a fila deixar de ter frente.
 *
 * O `nao_examinado` fica de fora por outro motivo, e é o quarto ponto do
 * cabeçalho: não é um achado sobre o ficheiro, é a confissão de que ninguém o
 * abriu. Ausência não levanta a mão.
 *
 * O `Record` é sobre o tipo completo: um achado novo no `forense/achados.ts`
 * sem uma linha aqui **não compila**.
 */
const FORENSE_QUE_PEDE_OLHOS: Readonly<Record<TipoDeAchadoForense, boolean>> = {
  // Ausência: ninguém abriu o ficheiro.
  nao_examinado: false,
  // Vestígios de quem mexeu no ficheiro. Específicos, e raros.
  pdf_tinta_por_cima_de_texto: true,
  pdf_historico_de_edicao: true,
  pdf_assinatura: true,
  pdf_campo_de_assinatura_por_assinar: true,
  // Comuns ao ponto de não distinguir nada. Ficam de fora, e ficam.
  pdf_guardado_mais_do_que_uma_vez: false,
  pdf_metadados: false,
  imagem_metadados: false,
  imagem_coordenadas: false,
  imagem_medidas_diferentes_das_do_exif: false,
  jpeg_estrutura: false,
};

// ─── Das quatro famílias que a junta já conhece ──────────────────────────────

/**
 * A nota que a junta escreve para **um** achado.
 *
 * Chamar o `reunirVerificacao` com um achado de cada vez é deliberado: é o que
 * garante que a nota que sai é a deste achado e não a de outro do mesmo tipo. A
 * função é pura e a lista tem um elemento; o custo é o de montar um objecto.
 * A alternativa — passar tudo de uma vez e depois emparelhar a saída ordenada
 * com a entrada — dependia da estabilidade de uma ordenação noutro ficheiro,
 * que é uma dependência invisível e do pior género.
 */
function notaDaCoerencia(achado: AchadoDeCoerencia): Nota {
  return reunirVerificacao({ coerencia: [achado] }).notas[0];
}

function razaoDaCoerencia(achado: AchadoDeCoerencia): Razao {
  return {
    ...notaDaCoerencia(achado),
    // A regra inteira deste módulo, numa linha. `NIVEL_DA_NATUREZA` já
    // distingue o impossível do improvável, e o `abrandar` do `coerencia/` já
    // desceu a improvável tudo o que se funda num nome repetido em vez de num
    // número de registo — que é o que impede que o costume de dar ao potro o
    // nome do avô segure anúncios.
    segura: NIVEL_DA_NATUREZA[achado.natureza] === "erro",
    campo: campoDoAchado(achado),
  };
}

function razaoDoSinal(sinal: Sinal): Razao {
  return {
    ...reunirVerificacao({ sinais: [sinal] }).notas[0],
    // Nenhum sinal entre anúncios segura nada, e a razão está escrita no
    // próprio `sinais.ts`: cada um deles tem uma leitura em que as duas linhas
    // são verdadeiras — o mesmo cavalo anunciado duas vezes, um anúncio antigo
    // por baixar, um ficheiro anexado ao cavalo errado por quem tem três a
    // anunciar. Um facto com leitura inocente pede olhos; não é uma
    // contradição.
    segura: false,
    // Nasce sempre do cruzamento de mais do que um anúncio: o que estiver
    // errado pode estar do outro lado.
    campo: null,
  };
}

function razaoDoConflito(conflito: Conflito): Razao {
  return {
    ...reunirVerificacao({ conflitos: [conflito] }).notas[0],
    // O lado do documento foi lido por uma máquina a partir da camada de texto
    // de um PDF, e essa leitura engana-se — um carimbo por cima de um
    // algarismo, um oito que sai seis. Duas afirmações em que uma delas é uma
    // leitura automática não são duas afirmações: são uma e um palpite.
    segura: false,
    campo: null,
  };
}

function razaoDoForense(achado: AchadoForense): Razao {
  return {
    ...reunirVerificacao({ forense: [achado] }).notas[0],
    // O que o ficheiro é não contradiz o que o ficheiro diz. Um Livro Azul
    // guardado dez vezes e assinado três continua a poder ser o Livro Azul
    // daquele cavalo; quem sabe disso é quem o abre.
    segura: false,
    campo: null,
  };
}

// ─── Da consulta ao stud-book ────────────────────────────────────────────────

/**
 * A razão que um facto do stud-book dá, ou `null` quando não dá nenhuma.
 *
 * Dois dos quatro factos não dão razão nenhuma, e são os dois que **não dizem
 * nada sobre o cavalo**:
 *
 * - `consulta_por_confirmar` junta o interruptor em baixo, a APSL sem
 *   responder, o nosso tecto diário e o anúncio sem identificador por que
 *   perguntar. Nenhum é do vendedor. E como o interruptor está **desligado por
 *   omissão**, este facto sai hoje para todos os anúncios do site: bastava
 *   deixá-lo virar razão para que todos fossem `segue_com_nota` e a fila
 *   deixasse de ter frente.
 * - `registo_confirmado` é boa notícia. Uma lista de coisas a olhar não é sítio
 *   para uma coisa que não é preciso olhar.
 *
 * O `switch` é exaustivo sobre a união: um facto novo no `stud-book/factos.ts`
 * sem uma decisão aqui não compila.
 */
function razaoDoStudBook(facto: FactoDoStudBook): Razao | null {
  switch (facto.tipo) {
    case "consulta_por_confirmar":
    case "registo_confirmado":
      return null;

    case "registo_desconhecido":
      return {
        origem: "stud_book",
        chave: facto.tipo,
        observacao:
          `perguntou-se ao Livro Genealógico pelo ${NOME_DO_IDENTIFICADOR[facto.identificador]} ` +
          `e a APSL respondeu que não o conhece.`,
        explicacaoInocente:
          "Um erro de transcrição, um cavalo estrangeiro por inscrever, um número antigo e uma " +
          "falsificação produzem exactamente o mesmo silêncio, e nós não os sabemos distinguir. " +
          "A APSL responder que não conhece um número não é a APSL dizer que o cavalo não existe.",
        cavalos: [facto.cavaloId],
        // Um silêncio não contradiz coisa nenhuma: contradizer exige duas
        // afirmações, e aqui só há uma.
        segura: false,
        campo: null,
      };

    case "divergencia_com_o_stud_book":
      return {
        origem: "stud_book",
        chave: facto.tipo,
        observacao:
          `a APSL conhece o cavalo pelo ${NOME_DO_IDENTIFICADOR[facto.identificador]} e ` +
          `${lista(
            facto.divergencias.map(
              (d) => `no campo ${d.campo} o anúncio diz «${d.noAnuncio}» e a APSL «${d.noStudBook}»`
            )
          )}.`,
        explicacaoInocente:
          "Os valores do anúncio são escritos à mão, muitas vezes de memória ou copiados de um " +
          "passaporte fotografado numa mesa. E a ficha da APSL pode ser mais antiga do que o " +
          "anúncio: um cavalo passa a ser conhecido por outro nome, e a pelagem foi descrita por " +
          "duas pessoas diferentes. Uma data mal copiada dá esta mesma divergência.",
        cavalos: [facto.cavaloId],
        // Um dos dois lados é um sítio de onde se copiou à mão. Ver a
        // explicação: nenhuma destas divergências é uma impossibilidade, e o
        // `stud-book/cruzar.ts` diz o mesmo por escrito.
        segura: false,
        campo: null,
      };
  }
}

// ─── Das fotografias ─────────────────────────────────────────────────────────

/**
 * Duas fotografias parecidas em anúncios de contas diferentes.
 *
 * O `lib/fotos/sinais.ts` já filtrou o que interessa filtrar — só pares de
 * anúncios em pé, com duas contas conhecidas e diferentes —, por isso um sinal
 * que chegue aqui é sempre uma coisa a olhar. E nunca é uma coisa que segure:
 * o próprio módulo mediu **duas imagens genuinamente diferentes a distância 6**,
 * abaixo do limiar, e escreveu que não existe limiar que separe «a mesma
 * fotografia» de «duas fotografias do mesmo sítio».
 */
function razaoDaFotografia(sinal: SinalFotografiaParecida): Razao {
  const [primeira, segunda] = sinal.fotografias;
  return {
    origem: "fotografias",
    chave: sinal.tipo,
    observacao:
      `uma fotografia do anúncio ${primeira.cavaloId} e uma do anúncio ${segunda.cavaloId} ` +
      `discordam em ${sinal.distanciaPhash} dos 64 bits da impressão, no enquadramento ` +
      `«${sinal.enquadramento}». Os dois anúncios são de contas diferentes.`,
    explicacaoInocente:
      "O mesmo criador a republicar o mesmo cavalo, um cavalo revendido cujo novo dono reutiliza " +
      "as fotografias do anúncio de onde o comprou — que pode até tê-las recebido de propósito —, " +
      "e dois cavalos da mesma casa fotografados no mesmo picadeiro dão todos este resultado. A " +
      "medição do próprio módulo apanhou duas imagens genuinamente diferentes a esta distância.",
    cavalos: distintos([primeira.cavaloId, segunda.cavaloId]),
    segura: false,
    campo: null,
  };
}

// ─── A ordem ─────────────────────────────────────────────────────────────────

/**
 * A única partição que existe: o que segura vem primeiro.
 *
 * **Não é uma ordenação por importância**, e a distinção não é retórica: uma
 * ordenação por importância é uma pontuação com outro nome, e diria a quem revê
 * quanto é que cada facto pesa — o peso é de quem revê. Isto é outra coisa: é a
 * resposta deste módulo, escrita por ordem. As razões que seguram o anúncio são
 * a resposta à pergunta que foi feita, e por isso leem-se primeiro; as outras
 * ficam pela ordem em que as famílias entram, que é a ordem em que este módulo
 * as lê e não uma escala.
 *
 * Não há aqui um comparador, e é de propósito: um comparador com aritmética
 * sobre um booleano lê-se como um peso quando alguém passar por aqui à pressa.
 * São duas listas, e a mesma entrada dá sempre a mesma saída — um painel que
 * muda de ordem entre dois carregamentos faz quem revê perder o sítio.
 */
function ordenar(razoes: readonly Razao[]): Razao[] {
  return [...razoes.filter((r) => r.segura), ...razoes.filter((r) => !r.segura)];
}

// ─── A porta ─────────────────────────────────────────────────────────────────

/** Tudo o que se sabe sobre um anúncio, já calculado por quem tem a base. */
export interface EntradaDaDecisao {
  /** Os achados de coerência deste anúncio. Ver `reunirCoerencia`. */
  coerencia?: readonly AchadoDeCoerencia[];
  /** Os achados do exame dos ficheiros. Vazio quando o exame não correu. */
  forense?: readonly AchadoForense[];
  /** Os sinais entre anúncios. Ver `lib/documentos/sinais.ts`. */
  sinais?: readonly Sinal[];
  /** As contradições entre o documento e o formulário. */
  conflitos?: readonly Conflito[];
  /** O que a consulta ao stud-book deu. Ver `reunirFactosDoStudBook`. */
  studBook?: readonly FactoDoStudBook[];
  /** Os pares de fotografias parecidas. Ver `fotografiasParecidas`. */
  fotografias?: readonly SinalFotografiaParecida[];
}

/**
 * O que se faz a este anúncio: `segue`, `segue_com_nota` ou `espera_por_pessoa`.
 *
 * **Não recusa nada, não escreve nada, e não carimba nada.** O anúncio continua
 * a nascer em `pending` e continua a ser uma pessoa a aprová-lo. O que sai
 * daqui diz a essa pessoa por onde começar, e diz ao vendedor em que ponto o
 * anúncio dele está.
 *
 * É pura: a mesma entrada dá sempre a mesma saída, e uma entrada vazia dá
 * `segue` com zero razões — que é a resposta certa para um anúncio sobre o qual
 * ainda não se sabe nada, e não «por confirmar». Não saber não é uma
 * contradição.
 */
export function decidirSobreOAnuncio(entrada: EntradaDaDecisao): Decisao {
  const razoes = ordenar([
    ...(entrada.coerencia ?? []).map(razaoDaCoerencia),
    ...(entrada.sinais ?? []).map(razaoDoSinal),
    ...(entrada.conflitos ?? []).map(razaoDoConflito),
    ...(entrada.forense ?? []).filter((a) => FORENSE_QUE_PEDE_OLHOS[a.tipo]).map(razaoDoForense),
    ...(entrada.studBook ?? []).map(razaoDoStudBook).filter((r): r is Razao => r !== null),
    ...(entrada.fotografias ?? []).map(razaoDaFotografia),
  ]);

  const seguram = razoes.filter((r) => r.segura);

  // As três saídas, e a ordem em que se perguntam. Repare-se em que não há
  // nenhuma contagem: basta **uma** contradição para o anúncio esperar, e
  // nenhuma quantidade de notas alguma vez chega lá.
  const saida: Saida =
    seguram.length > 0 ? "espera_por_pessoa" : razoes.length > 0 ? "segue_com_nota" : "segue";

  return {
    saida,
    razoes,
    paraOVendedor: {
      ...PALAVRAS_DA_SAIDA[saida],
      // Só se pede ao vendedor para reconferir o que **ele** pode corrigir, e
      // só quando é isso que está a segurar o anúncio. Os campos das razões que
      // não seguram não entram: mandá-lo rever a data de nascimento por causa
      // de um improvável seria dizer-lhe que ela está errada quando ela pode
      // muito bem estar certa.
      aRever: distintos(seguram.map((r) => r.campo)),
    },
  };
}
