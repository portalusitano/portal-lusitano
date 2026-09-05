/**
 * O que o próprio ficheiro denuncia sobre si mesmo.
 *
 * ## Onde é que isto fica, e porquê aqui
 *
 * O `sinais.ts` pergunta coisas à **base de dados**: este hash aparece em dois
 * anúncios, este microchip está declarado duas vezes. São perguntas sobre o
 * conjunto. Este módulo não vê o conjunto nenhum — vê **um ficheiro** e lê os
 * vestígios que ele traz de como foi feito e do que lhe fizeram depois: quantas
 * vezes foi guardado, que programa o produziu, se tem assinatura, se alguém lhe
 * pintou tinta por cima do texto, que aparelho tirou a fotografia.
 *
 * A fronteira é a mesma que separa o `leitura/` do `sinais.ts`: aquele lê o que
 * o documento **diz**, este lê o que o ficheiro **é**. Um passaporte pode ter
 * lá dentro o UELN certo e ter sido montado ontem num editor de imagem, e
 * nenhuma leitura de texto sabe isso.
 *
 * ## A regra que manda em tudo o resto
 *
 * **Nada aqui acusa ninguém.** Cada achado é um facto observável —
 * «tem duas tabelas de referências cruzadas», «o campo `Software` diz X»,
 * «há 41 pontos de texto por baixo de um rectângulo pintado depois deles» — e
 * traz, obrigatoriamente, a sua **explicação inocente** ao lado. O
 * `explicacaoInocente` não é um campo opcional nem decorativo: é o que impede
 * que uma lista de factos técnicos se leia como um dossiê de acusação.
 *
 * Não há nota, não há percentagem, não há semáforo e não há «probabilidade de
 * fraude». Não é formalidade: um número que diz «73% de suspeita» é lido como
 * sentença, e o preço de estar errado é acusar de falsificação um criador que
 * digitalizou o Livro Azul com o software que o multifunções dele trazia. Há um
 * teste — `documentos-forense-vocabulario` — que percorre a saída inteira e
 * falha se lá aparecer a chave `gravidade`, `risco`, `score`, `pontuacao`,
 * `accao` ou `decisao`. Está lá para que a regra não dependa de quem revê o
 * código se lembrar dela.
 *
 * Pela mesma razão **não há ordenação por importância**. A saída vem pela ordem
 * em que os exames correm, que é uma ordem de mecânica e não de suspeita: pôr
 * um achado à frente de outro é dar-lhe um peso, e o peso é de quem revê.
 *
 * ## Porque é que o texto vem em português dentro do módulo
 *
 * O `observacao` e o `explicacaoInocente` são frases feitas, aqui, em
 * português. Podia argumentar-se que pertencem ao `locales/` — e num site
 * traduzido pertencem. Ficam cá por duas razões: o painel de revisão é interno
 * e fala uma língua só, e sobretudo **a explicação inocente não pode ser
 * separável do facto**. No dia em que a frase vive noutro ficheiro, existe um
 * dia em que alguém mostra o facto sem ela. O `tipo` é a chave estável para
 * quando houver tradução; a frase daqui é a omissão.
 */

import type { MimeDeDocumento } from "@/lib/documentos/contrato";

// ─── O que um achado é ───────────────────────────────────────────────────────

export const TIPOS_DE_ACHADO = [
  "nao_examinado",
  "pdf_guardado_mais_do_que_uma_vez",
  "pdf_metadados",
  "pdf_historico_de_edicao",
  "pdf_assinatura",
  "pdf_campo_de_assinatura_por_assinar",
  "pdf_tinta_por_cima_de_texto",
  "imagem_metadados",
  "imagem_coordenadas",
  "imagem_medidas_diferentes_das_do_exif",
  "jpeg_estrutura",
] as const;
export type TipoDeAchado = (typeof TIPOS_DE_ACHADO)[number];

/**
 * O que todo o achado tem, sem excepção.
 *
 * `observacao` descreve o que se mediu, em indicativo e sem adjectivos: conta o
 * que lá está, não o que isso quer dizer. `explicacaoInocente` diz porque é que
 * um ficheiro honesto dá este mesmo resultado — e há sempre pelo menos uma
 * maneira de isso acontecer, senão o achado não entrava nesta lista.
 */
interface AchadoBase {
  tipo: TipoDeAchado;
  observacao: string;
  explicacaoInocente: string;
}

/**
 * Não se examinou o ficheiro, e a razão.
 *
 * Existe porque **uma lista vazia é ambígua**: pode querer dizer «não há nada
 * a assinalar» ou «não se conseguiu abrir isto». As duas mandam quem revê fazer
 * coisas opostas, e um painel que as confunda dá por examinado o único ficheiro
 * que ninguém olhou.
 */
export interface AchadoNaoExaminado extends AchadoBase {
  tipo: "nao_examinado";
  mime: MimeDeDocumento;
  /** Um motivo de uma lista curta, para o painel poder agrupar. */
  porque:
    | "formato_sem_exame"
    | "ficheiro_vazio"
    | "ficheiro_grande_de_mais"
    | "nao_parece_o_formato"
    | "pdf_cifrado"
    | "estrutura_ilegivel";
}

// ─── PDF: o que a estrutura conta ────────────────────────────────────────────

/**
 * O ficheiro foi escrito, fechado, e depois escrito outra vez por cima.
 *
 * Um PDF acaba em `startxref`, o deslocamento da tabela de referências
 * cruzadas, e `%%EOF`. Guardá-lo de novo sem reescrever o ficheiro inteiro —
 * uma actualização incremental — acrescenta uma segunda tabela e um segundo
 * `%%EOF` ao fim do primeiro, deixando o original inteiro por baixo. Contar
 * estes remates é contar quantas vezes o ficheiro foi fechado.
 */
export interface AchadoPdfGuardadoMaisDoQueUmaVez extends AchadoBase {
  tipo: "pdf_guardado_mais_do_que_uma_vez";
  /** Remates `startxref … %%EOF` encontrados. Um ficheiro escrito de uma vez tem um. */
  revisoes: number;
  /**
   * O ficheiro está optimizado para leitura na web, o que **por si só** produz
   * dois remates sem nunca ter havido edição nenhuma. Quando isto é verdade, a
   * conta de revisões acima já vem descontada de um.
   */
  linearizado: boolean;
  /** Dicionários de trailer ou de XRef que apontam para uma tabela anterior. */
  tabelasEncadeadas: number;
  /**
   * Números de objecto definidos mais do que uma vez no ficheiro. É a marca de
   * água de uma reescrita: a definição nova fica em cima e a velha continua lá.
   * Limitado aos primeiros vinte, por ordem.
   */
  objectosRedefinidos: string[];
  /** Bytes depois do último `%%EOF`, se sobrarem. */
  bytesDepoisDoFim: number;
}

/** Um par chave/valor lido de um dicionário de informação ou de um XMP. */
export interface CampoDeMetadados {
  campo: string;
  /** Como está escrito no ficheiro, limpo de caracteres de controlo e truncado. */
  valor: string;
  /**
   * Só quando o valor é uma data que se soube ler, em ISO-8601. Uma data que
   * não se percebeu fica só no `valor` — inventar-lhe um formato seria dizer
   * mais do que se leu.
   */
  iso?: string;
}

/**
 * Uma família de programas, para quem revê saber o que está a ler.
 *
 * **Não é uma escala.** `digitalizador` e `editor_de_imagem` estão os dois
 * aqui, e nenhum deles é pior do que o outro: a família diz o que a ferramenta
 * faz, não o que quem a usou queria. Está no módulo porque o nome cru de um
 * produtor — `Adobe Photoshop 24.0 (Windows)`, `WorkCentre 7845 v1.03` — só
 * diz alguma coisa a quem já os conhece todos, e quem revê anúncios de cavalos
 * não tem de conhecer.
 *
 * `desconhecida` é a resposta honesta e é a mais comum. Não se adivinha.
 */
export type FamiliaDeFerramenta =
  | "digitalizador"
  | "editor_de_imagem"
  | "editor_de_pdf"
  | "gerador_de_documento"
  | "camara_ou_telemovel"
  | "desconhecida";

export interface FerramentaReconhecida {
  /** Onde estava escrito: `Producer`, `Creator`, `Software`, … */
  campo: string;
  valor: string;
  familia: FamiliaDeFerramenta;
}

/**
 * O que os dicionários de informação do PDF dizem.
 *
 * Vêm **todos**, e não só o último. Uma actualização incremental substitui o
 * dicionário de informação e deixa o anterior no ficheiro: dois produtores
 * diferentes dentro do mesmo PDF é o registo de que a ferramenta mudou pelo
 * caminho — e é um facto que se perde se só se ler o mais recente.
 */
export interface AchadoPdfMetadados extends AchadoBase {
  tipo: "pdf_metadados";
  campos: CampoDeMetadados[];
  ferramentas: FerramentaReconhecida[];
  /**
   * Dias inteiros entre a criação e a última modificação, quando as duas datas
   * se souberam ler e a modificação é posterior. Ausente quando não se sabe.
   */
  diasEntreCriacaoEModificacao?: number;
  /** Quantos dicionários de informação distintos o ficheiro traz. */
  dicionarios: number;
}

/**
 * O que o XMP guarda sobre o que já se fez ao ficheiro.
 *
 * O `xmpMM:History` é um registo que as ferramentas da Adobe escrevem no
 * próprio documento a cada gravação: acção, ferramenta e quando. Não é preciso
 * deduzir nada — está escrito.
 */
export interface AchadoPdfHistoricoDeEdicao extends AchadoBase {
  tipo: "pdf_historico_de_edicao";
  /** Entradas do `xmpMM:History` contadas. */
  entradas: number;
  /** As ferramentas nomeadas nessas entradas, distintas e por ordem. */
  ferramentas: string[];
  /** As acções nomeadas (`created`, `saved`, `converted`, …), distintas. */
  operacoes: string[];
  /** O `xmpMM:DerivedFrom`, quando existe: este ficheiro saiu de outro. */
  derivadoDe?: string;
}

/**
 * Há uma assinatura digital no ficheiro.
 *
 * ## O que este achado não diz, e é a parte importante
 *
 * **Não diz que a assinatura é válida.** Validar uma assinatura é verificar um
 * PKCS#7 contra uma cadeia de certificados, contra uma lista de confiança e
 * contra o momento em que foi feita — nada disso se faz aqui, e escrever
 * «assinatura válida» sem o ter feito seria exactamente a falsidade que este
 * trabalho existe para acabar. O que se diz é: existe um dicionário de
 * assinatura, o formato dele é este, e o intervalo que ele declara cobrir
 * acaba aqui.
 *
 * O `bytesForaDoIntervaloAssinado` é a única coisa próxima de uma verificação,
 * e é aritmética simples: o `/ByteRange` diz que segmentos do ficheiro a
 * assinatura cobre; se o último acabar antes do fim do ficheiro, há bytes que
 * ela não cobre. Isso é medível sem certificado nenhum.
 */
export interface AchadoPdfAssinatura extends AchadoBase {
  tipo: "pdf_assinatura";
  /** O `/SubFilter`: `adbe.pkcs7.detached`, `ETSI.CAdES.detached`, … */
  formato?: string;
  /** O `/Filter`, tipicamente `Adobe.PPKLite`. */
  motor?: string;
  /** Um carimbo do tempo do documento em vez de uma assinatura de pessoa. */
  carimboDoTempo: boolean;
  /** O `/Name`, `/Reason`, `/Location` e o `/M`, tal como estão escritos. */
  campos: CampoDeMetadados[];
  /** Bytes do ficheiro que o `/ByteRange` declarado não cobre. */
  bytesForaDoIntervaloAssinado?: number;
}

/**
 * Um campo de assinatura preparado e nunca preenchido.
 *
 * Um `/FT /Sig` sem `/V` é um sítio onde uma assinatura devia estar. O
 * documento pode ter sido impresso a partir de um modelo que já trazia o
 * campo, e nesse caso não quer dizer nada; ou pode ter sido guardado antes de
 * ser assinado.
 */
export interface AchadoPdfCampoPorAssinar extends AchadoBase {
  tipo: "pdf_campo_de_assinatura_por_assinar";
  campos: number;
}

/** Uma marca de tinta opaca desenhada por cima de texto já desenhado. */
export interface TintaPorCima {
  /** Ordem da página no ficheiro, a contar de um. */
  pagina: number;
  especie: "imagem" | "preenchimento";
  /**
   * A cor do preenchimento como o ficheiro a declara — `cinzento 1`,
   * `rgb 1 1 1`, `cmyk 0 0 0 0` —, ou ausente numa imagem e num espaço de cor
   * que não se soube ler. Não se traduz para um nome de cor: `1 1 1` é branco
   * em RGB e não é preciso dizê-lo por outras palavras.
   */
  cor?: string;
  /** A caixa em pontos, no espaço da página, arredondada à unidade. */
  caixa: [number, number, number, number];
  /** Quantos pontos de arranque de texto ficaram por baixo dela. */
  pontosDeTextoCobertos: number;
}

/**
 * Tinta opaca por cima de texto que já lá estava.
 *
 * ## O que se mede, exactamente
 *
 * Percorre-se o fluxo de desenho de cada página pela ordem em que ele corre. De
 * cada operação de escrita guarda-se o **ponto onde o texto começa** — não a
 * caixa que ele ocupa: a largura de uma linha depende das larguras dos glifos
 * da fonte, e uma caixa estimada faria o achado depender de uma estimativa.
 * De cada rectângulo preenchido e de cada imagem desenhada guarda-se a caixa,
 * que essa sai da matriz e é exacta. No fim conta-se quantos pontos de texto
 * ficaram dentro de uma marca **desenhada depois deles**.
 *
 * A ordem é tudo. Um fundo de tabela, uma tarja de cabeçalho e uma fotografia
 * de fundo são pintados **antes** do texto que os acompanha — é assim que o
 * texto se vê. Tinta a seguir ao texto, no mesmo sítio do texto, é o desenho a
 * andar para trás.
 *
 * ## O que fica de fora, e porquê
 *
 * Só contam rectângulos (`re`) e imagens. Um traçado com curvas que tape um
 * campo passa despercebido: mais vale perder esse do que passar a contar áreas
 * que não sei calcular. Uma marca com opacidade zero não conta — pintar
 * transparente não tapa nada. E anotações não entram: vivem fora do fluxo da
 * página, e uma nota amarela por cima de um número é uma anotação honesta que
 * qualquer leitor mostra como sendo uma.
 */
export interface AchadoPdfTintaPorCimaDeTexto extends AchadoBase {
  tipo: "pdf_tinta_por_cima_de_texto";
  marcas: TintaPorCima[];
  /** Total de pontos de arranque de texto cobertos, em todas as páginas. */
  pontosDeTextoCobertos: number;
  /** As páginas onde isto acontece, por ordem. */
  paginas: number[];
}

// ─── Imagens ─────────────────────────────────────────────────────────────────

/**
 * O que o EXIF, o XMP e os comentários da imagem dizem.
 *
 * Uma fotografia tirada com um telemóvel traz a marca, o modelo e a data. Uma
 * imagem que passou por um editor traz também o nome do editor no `Software`.
 * Uma imagem sem nada disto é o caso mais comum de todos — quase toda a gente
 * envia fotografias já passadas por uma aplicação de mensagens, e essas limpam
 * o EXIF inteiro.
 */
export interface AchadoImagemMetadados extends AchadoBase {
  tipo: "imagem_metadados";
  campos: CampoDeMetadados[];
  ferramentas: FerramentaReconhecida[];
  /** O EXIF vinha com um bloco do fabricante, que não se lê. */
  temNotaDoFabricante: boolean;
}

/**
 * A imagem traz coordenadas.
 *
 * **Isto não é um sinal de falsidade e não está aqui por isso.** Está aqui
 * porque é **dado pessoal**: o documento diz onde estava quem o fotografou, e
 * quem revê tem de saber que o está a ver antes de reencaminhar o ficheiro a
 * alguém. Ver a primeira regra do `contrato.ts` — um documento nunca é público.
 */
export interface AchadoImagemCoordenadas extends AchadoBase {
  tipo: "imagem_coordenadas";
  latitude: number;
  longitude: number;
  /** Metros, quando o EXIF os traz. */
  altitude?: number;
  /** A data do GPS, quando existe, em ISO-8601. */
  dataGps?: string;
}

/**
 * A imagem não tem as medidas que o EXIF diz que ela tinha.
 *
 * O EXIF guarda a largura e a altura de quando a fotografia foi captada. Se os
 * pixéis que estão no ficheiro forem outros, alguém a redimensionou depois — e
 * quem redimensiona volta a comprimir. Compara-se o par sem ordem, para que uma
 * rotação de noventa graus não conte como corte.
 */
export interface AchadoImagemMedidasDiferentes extends AchadoBase {
  tipo: "imagem_medidas_diferentes_das_do_exif";
  noExif: [number, number];
  noFicheiro: [number, number];
}

/**
 * Como o JPEG está montado por dentro.
 *
 * ## O que aqui não está, e é uma decisão
 *
 * Não há análise de recompressão por níveis de erro, não há detecção de zonas
 * coladas e não há estimativa de qualidade. Fazer isso a sério é voltar a
 * comprimir a imagem e comparar — o que precisa de um codificador de JPEG que
 * este repositório não tem e que eu não escrevo bem em duzentas linhas. Uma
 * análise de recompressão mal feita não falha em silêncio: **aponta uma zona
 * colada onde não há nenhuma**, e uma acusação de montagem sobre um Livro Azul
 * verdadeiro é o pior desfecho que este módulo pode ter.
 *
 * O que fica é o que se mede sem adivinhar: quantas tabelas de quantização, se
 * é progressivo, quantos varrimentos, se sobram bytes depois do fim, e uma
 * impressão digital das tabelas. A impressão não classifica nada por si — serve
 * para quem revê poder ver que duas «digitalizações independentes» saíram do
 * mesmo codificador com a mesma regulação.
 */
export interface AchadoJpegEstrutura extends AchadoBase {
  tipo: "jpeg_estrutura";
  progressivo: boolean;
  tabelasDeQuantizacao: number;
  /** Os primeiros dezasseis hexadecimais do SHA-256 das tabelas. */
  impressaoDasTabelas: string;
  varrimentos: number;
  /** Bytes a seguir ao marcador de fim da imagem. */
  bytesDepoisDoFim: number;
  /** O EXIF trazia uma miniatura embutida, que é o caso normal numa fotografia. */
  temMiniatura: boolean;
}

export type Achado =
  | AchadoNaoExaminado
  | AchadoPdfGuardadoMaisDoQueUmaVez
  | AchadoPdfMetadados
  | AchadoPdfHistoricoDeEdicao
  | AchadoPdfAssinatura
  | AchadoPdfCampoPorAssinar
  | AchadoPdfTintaPorCimaDeTexto
  | AchadoImagemMetadados
  | AchadoImagemCoordenadas
  | AchadoImagemMedidasDiferentes
  | AchadoJpegEstrutura;
