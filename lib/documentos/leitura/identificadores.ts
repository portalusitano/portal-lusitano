/**
 * Os identificadores do cavalo, encontrados dentro do texto de um documento.
 *
 * ## A regra que manda em tudo o que está aqui
 *
 * **Na dúvida, não se encontrou nada.** Este módulo alimenta uma comparação
 * cujo resultado é um `Conflito`, e um conflito inventado custa mais do que um
 * conflito perdido: manda um anúncio verdadeiro para a fila de revisão, e ao
 * fim de meia dúzia desses quem revê aprende a passar os olhos por cima dos
 * avisos — que é o mesmo que não haver aviso nenhum. Um identificador que não
 * se apanhou é uma **ausência**, e uma ausência não contradiz coisa nenhuma.
 *
 * Por isso, sempre que houver mais do que um candidato e não houver maneira
 * honesta de escolher entre eles, devolve-se `undefined`. Escolher o primeiro
 * seria dar à sorte a decisão de acusar alguém de falsidade.
 *
 * ## O formato não decide sozinho
 *
 * Um UELN português e um microchip são **os dois quinze algarismos**
 * (`620015004471234`), e portanto o formato não distingue um do outro. Quem
 * distingue é o rótulo impresso ao lado — «Microchip», «Transponder», «UELN» —,
 * e é por isso que a proximidade ao rótulo é o critério principal e não um
 * enfeite. Onde não há rótulo e há dois candidatos, não se escolhe.
 *
 * ## O que não se valida, e porquê
 *
 * As regras de formato não são reescritas aqui. O UELN é validado pelo
 * `lerPassaporte`, o microchip pelo `lerMicrochip`, e o número de registo pelo
 * `lerRegistoApsl` — que, esse, quase não valida nada, e de propósito: o
 * formato do Livro Genealógico não se conhece, e uma expressão regular
 * inventada recusaria números verdadeiros. Está escrito no `registo-apsl.ts` e
 * o raciocínio é o mesmo aqui.
 */

import { lerRegistoApsl, normalizarRegistoApsl } from "@/components/vender-cavalo/registo-apsl";
import {
  COMPRIMENTO_UELN,
  lerPassaporte,
  limparPassaporte,
} from "@/components/vender-cavalo/passaporte-ueln";
import { DIGITOS_MICROCHIP, lerMicrochip, normalizarMicrochip } from "@/lib/microchip-iso";
import { aplanar, chaveDeNome } from "@/lib/documentos/leitura/normalizar";
import { ROTULOS_DO_PASSAPORTE } from "@/lib/documentos/vocabulario-passaporte";

/** Os campos que se procuram. São os do `Conflito` do contrato. */
export type CampoDoDocumento = "ueln" | "microchip" | "numero_registo" | "nome";

/** Quantos caracteres antes de um número ainda contam como «ao lado do rótulo». */
const JANELA_ROTULO = 60;

/** Um documento com mais candidatos do que isto não é um documento de cavalo. */
const MAX_CANDIDATOS = 200;

/** Quantas linhas se varrem à procura de números. Acima disto não é um documento. */
const MAX_BLOCOS = 20_000;

/**
 * Quantos rótulos se guardam. O filtro de sobreposição é quadrático, e um
 * tecto aqui é o que garante que um documento anormal não custa um minuto.
 */
const MAX_ROTULOS = 2_000;

/** Nem o nome mais comprido de um Lusitano chega aqui. */
const MAX_NOME = 60;

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

/**
 * O que se aceita como rótulo de cada campo, já sem acentos e em maiúsculas.
 *
 * A lista é curta de propósito: cada palavra a mais é uma hipótese a mais de
 * apanhar o número errado. `CHIP` sozinho ficou de fora — aparece em
 * «chipado», em «chip de leitura», e não custa nada perder o rótulo quando o
 * número está ao lado da palavra inteira.
 */
/**
 * Os rótulos que o **regulamento** manda imprimir, tirados do
 * `ROTULOS_DO_PASSAPORTE`.
 *
 * Até aqui esta tabela era inteiramente inferida — «do que esses documentos
 * costumam imprimir», como estava escrito —, e isso era o ponto mais fraco de
 * todo o sistema de verificação. O Anexo II do Regulamento de Execução (UE)
 * 2021/963 fixa o modelo do documento, e agora os rótulos vêm de lá.
 *
 * Só se aproveitam os que **identificam o animal**: o transpondedor, o código
 * único, o nome e o número no livro genealógico. Os outros cinquenta são
 * cabeçalhos, secções e campos de assinatura, e um deles — «Data» — casaria
 * com metade do documento.
 *
 * O rótulo do regulamento é uma frase inteira, com pontuação e parênteses. O
 * que aqui interessa é a parte que se procura no texto de um PDF, e por isso
 * corta-se no primeiro parêntese e nos dois pontos: `Transponder code (where
 * available)` procura-se como `TRANSPONDER CODE`.
 */
function doRegulamento(...seccoes: string[]): string[] {
  const fatiar = (r: string) =>
    r
      .split(/[(:]/)[0]
      .trim()
      .toUpperCase()
      // Sem acentos, porque é assim que o resto deste módulo compara.
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  return ROTULOS_DO_PASSAPORTE.filter((r) => seccoes.includes(r.campo))
    .flatMap((r) => [r.pt, r.en, r.fr].filter((x): x is string => Boolean(x)))
    .map(fatiar)
    .filter((r) => r.length >= 4);
}

/**
 * O que se procura ao lado de um número, para saber de que campo ele é.
 *
 * São duas famílias, e a distinção importa:
 *
 * - **As do regulamento**, que é o que um passaporte da União imprime. Vêm do
 *   `vocabulario-passaporte.ts`, que é gerado a partir do Anexo II.
 * - **As inferidas**, que ficam porque um Livro Azul da APSL **não é um
 *   passaporte da União** e não segue aquele modelo — imprime «Registo»,
 *   «APSL», «Stud Book» —, e porque há documentos anteriores a 2021 em
 *   circulação. Tirá-las seria trocar cobertura por pureza.
 *
 * O conjunto elimina repetições: várias secções do anexo imprimem o mesmo
 * rótulo, e procurar duas vezes a mesma palavra é procurar duas vezes.
 */
const ROTULOS: Readonly<Record<CampoDoDocumento, readonly string[]>> = {
  microchip: [
    ...new Set([
      ...doRegulamento("Transponder / microchip", "Código do transpondedor"),
      "MICROCHIP",
      "MICRO CHIP",
      "TRANSPONDER",
      "TRANSPONDEDOR",
      "TRANSPONDEUR",
    ]),
  ],
  ueln: [
    ...new Set([
      ...doRegulamento("UELN / código único", "Número único vitalício (UELN)"),
      "UELN",
      "PASSAPORTE",
      "PASSPORT",
      "PASAPORTE",
    ]),
  ],
  numero_registo: [
    ...new Set([
      ...doRegulamento("Número no livro genealógico", "Número de identificação individual"),
      "REGISTO",
      "REGISTRO",
      "APSL",
      "STUD BOOK",
      "STUD-BOOK",
    ]),
  ],
  nome: [
    ...new Set([
      ...doRegulamento("Nome do animal"),
      "NOME DO ANIMAL",
      "NOME DO CAVALO",
      "NOME DO EQUIDEO",
      "NOME DO EQUINO",
      "NOME DE REGISTO",
      "NOME REGISTADO",
      "NAME OF ANIMAL",
      "NOME",
    ]),
  ],
};

/**
 * Palavras que, à volta de um rótulo, dizem que aquele rótulo é de outra
 * coisa.
 *
 * Não é uma precaução teórica. Um Livro Azul traz o número de registo do pai e
 * o da mãe ao lado do do próprio cavalo, e um passaporte traz o nome do
 * proprietário ao lado do nome do animal. Sem isto, o número de registo do pai
 * entrava como sendo o do cavalo e contradizia o formulário sempre — um
 * conflito falso em todos os documentos verdadeiros.
 */
const DE_OUTREM: Readonly<Record<CampoDoDocumento, readonly string[]>> = {
  microchip: [],
  ueln: [],
  numero_registo: ["PAI", "MAE", "AVO", "AVOS", "PROGENITOR", "SIRE", "DAM", "COUDELARIA"],
  nome: ["PROPRIETARIO", "DETENTOR", "CRIADOR", "OWNER", "BREEDER", "PAI", "MAE", "AVO"],
};

/** Quantos caracteres antes de um rótulo se olha à procura de um dono alheio. */
const JANELA_DE_OUTREM = 40;

interface Rotulo {
  /** Onde começa a palavra do rótulo no texto plano. */
  inicio: number;
  /** Onde acaba. */
  fim: number;
  campo: CampoDoDocumento;
}

/**
 * O rótulo é de outra coisa?
 *
 * São duas perguntas e não uma, porque o dono alheio tanto aparece antes como
 * depois. Antes: `Pai … Registo: 4321`. Depois: `Nome do proprietário: João
 * Silva` — e nesse caso a palavra tem de vir **imediatamente** a seguir, atrás
 * de um «do» ou de um «da» quando muito. Uma janela larga para a frente
 * apanhava o `Proprietário` da linha seguinte e deitava fora o rótulo bom.
 */
function ehDeOutrem(plano: string, campo: CampoDoDocumento, inicio: number, fim: number): boolean {
  const alheias = DE_OUTREM[campo];
  if (alheias.length === 0) return false;

  const antes = plano.slice(Math.max(0, inicio - JANELA_DE_OUTREM), inicio);
  if (alheias.some((p) => new RegExp(`\\b${p}\\b`).test(antes))) return true;

  const depois = plano.slice(fim, fim + 30);
  return alheias.some((p) => new RegExp(`^\\s*(?:D[AEO]S?\\s+)?${p}\\b`).test(depois));
}

/**
 * Onde estão todos os rótulos conhecidos, por ordem.
 *
 * Guardam-se todos e não só os de um campo porque o que interessa a um
 * candidato é **qual é o rótulo mais próximo à esquerda** — se for o de outro
 * campo, este candidato não é deste campo.
 *
 * Quando dois rótulos se sobrepõem ganha o mais comprido, e é uma regra que
 * faz falta: em `Nome de registo: MAESTOSO XV` cabem três — o «Nome de
 * registo» inteiro, o «Nome» lá dentro e o «registo» lá dentro. Sem esta
 * regra, o «Nome» apanhava «de registo» como se fosse o nome do cavalo.
 */
function acharRotulos(plano: string): Rotulo[] {
  const encontrados: Rotulo[] = [];

  for (const campo of Object.keys(ROTULOS) as CampoDoDocumento[]) {
    for (const palavra of ROTULOS[campo]) {
      let de = plano.indexOf(palavra);
      while (de !== -1 && encontrados.length < MAX_ROTULOS) {
        const fim = de + palavra.length;
        if (!ehDeOutrem(plano, campo, de, fim)) encontrados.push({ inicio: de, fim, campo });
        de = plano.indexOf(palavra, de + 1);
      }
    }
  }

  const sobrevivem = encontrados.filter(
    (r) =>
      !encontrados.some(
        (outro) =>
          outro !== r &&
          outro.inicio <= r.inicio &&
          outro.fim >= r.fim &&
          outro.fim - outro.inicio > r.fim - r.inicio
      )
  );

  return sobrevivem.sort((a, b) => a.fim - b.fim);
}

/** O campo do rótulo mais próximo à esquerda, se estiver perto o bastante. */
function campoDoRotuloAnterior(rotulos: Rotulo[], posicao: number): CampoDoDocumento | null {
  let melhor: Rotulo | null = null;
  for (const rotulo of rotulos) {
    if (rotulo.fim > posicao) break;
    melhor = rotulo;
  }
  if (!melhor || posicao - melhor.fim > JANELA_ROTULO) return null;
  return melhor.campo;
}

// ---------------------------------------------------------------------------
// Candidatos
// ---------------------------------------------------------------------------

export interface Candidato {
  /** A forma canónica: é por esta que se compara. */
  valor: string;
  /** Onde começa no texto. */
  posicao: number;
  /** O campo do rótulo mais próximo, quando havia um perto. */
  rotuladoComo: CampoDoDocumento | null;
}

/**
 * Os separadores que um número traz impresso.
 *
 * `620 015 004471234` é como o UELN aparece em quase todos os passaportes, e
 * `985 141 000123456` é como um microchip vem escrito num Livro Azul. Nenhum
 * deles faz parte do número, e nenhum deles é um erro de leitura.
 */
const SEPARADOR = /[ .\u00A0\u2007\u2009\u202F\-]/;

/**
 * As sequências de comprimento certo dentro de um bloco de texto.
 *
 * Parte-se o bloco pelos separadores e procuram-se **janelas de grupos
 * inteiros** que somem o comprimento pedido. É o que faz com que
 * `Microchip 620 015 004471234 Nascimento 1998` dê o número certo: as três
 * primeiras parcelas somam quinze, a quarta fica de fora.
 *
 * Repare-se no que isto **não** faz: nunca corta um grupo ao meio. Um bloco de
 * vinte algarismos seguidos não produz candidato nenhum, porque não há maneira
 * honesta de decidir onde é que o número começava.
 */
function janelasDe(grupos: string[], comprimento: number): string[] {
  const janelas: string[] = [];
  for (let i = 0; i < grupos.length; i += 1) {
    let soma = 0;
    for (let j = i; j < grupos.length; j += 1) {
      soma += grupos[j].length;
      if (soma > comprimento) break;
      if (soma === comprimento) {
        janelas.push(grupos.slice(i, j + 1).join(""));
        break;
      }
    }
  }
  return janelas;
}

interface Bloco {
  grupos: string[];
  posicao: number;
}

/** Os blocos de algarismos (ou de algarismos e letras) separados por espaços. */
function blocos(texto: string, corpo: RegExp): Bloco[] {
  const encontrados: Bloco[] = [];
  const padrao = new RegExp(`${corpo.source}(?:${SEPARADOR.source}?${corpo.source})*`, "g");

  for (const m of texto.matchAll(padrao)) {
    if (encontrados.length >= MAX_BLOCOS) break;
    const grupos = m[0].split(new RegExp(SEPARADOR.source, "g")).filter(Boolean);
    encontrados.push({ grupos, posicao: m.index });
  }

  return encontrados;
}

function candidatos(
  texto: string,
  rotulos: Rotulo[],
  corpo: RegExp,
  comprimento: number,
  aceitar: (valor: string) => boolean
): Candidato[] {
  const saida: Candidato[] = [];
  const vistos = new Set<string>();

  for (const bloco of blocos(texto, corpo)) {
    for (const valor of janelasDe(bloco.grupos, comprimento)) {
      if (!aceitar(valor) || vistos.has(valor)) continue;
      vistos.add(valor);
      saida.push({
        valor,
        posicao: bloco.posicao,
        rotuladoComo: campoDoRotuloAnterior(rotulos, bloco.posicao),
      });
      if (saida.length >= MAX_CANDIDATOS) return saida;
    }
  }

  return saida;
}

/**
 * Qual dos candidatos é o do campo — ou nenhum.
 *
 * Por esta ordem, e a ordem é o que aqui há de mais importante:
 *
 * 1. **Um só candidato rotulado com este campo.** É a prova mais forte que
 *    existe: está impresso no papel que aquele número é o microchip. Quando ela
 *    existe, é ela que manda — mesmo que o número do formulário apareça algures
 *    no documento com outro rótulo. É este degrau que apanha a troca de caixas,
 *    que o degrau seguinte, sozinho, deixava passar em silêncio.
 * 2. **Se o valor do formulário está no documento, é esse.** Sem rótulo que
 *    decida, enquanto o número que o vendedor escreveu aparecer no papel não há
 *    contradição a levantar: levantá-la seria acusar alguém por causa de um
 *    segundo número que nós não soubemos identificar.
 * 3. **Nenhum rótulo em lado nenhum e um só candidato.** Um documento com um
 *    número e sem legendas.
 *
 * Fora destes três, `undefined` — porque um UELN português e um microchip são
 * os dois quinze algarismos, e escolher à sorte entre eles seria dar à sorte a
 * decisão de acusar.
 */
function escolher(
  lista: Candidato[],
  campo: CampoDoDocumento,
  chaveDoFormulario: string
): string | undefined {
  if (lista.length === 0) return undefined;

  const rotulados = lista.filter((c) => c.rotuladoComo === campo);
  if (rotulados.length === 1) return rotulados[0].valor;
  if (rotulados.length > 1) return undefined;

  if (chaveDoFormulario && lista.some((c) => c.valor === chaveDoFormulario)) {
    return chaveDoFormulario;
  }

  // Um candidato rotulado com outro campo não conta como candidato deste.
  const soltos = lista.filter((c) => c.rotuladoComo === null);
  if (soltos.length === 1 && lista.length === 1) return soltos[0].valor;

  return undefined;
}

// ---------------------------------------------------------------------------
// Os campos que só se apanham pelo rótulo
// ---------------------------------------------------------------------------

/**
 * O que vem a seguir a um rótulo, até ao fim da linha.
 *
 * Corta-se também nos dois pontos seguintes, e deita-se fora a palavra que
 * vem imediatamente antes deles: numa linha como `Nome: MAESTOSO XV Sexo:
 * Macho`, essa palavra é o rótulo seguinte e não faz parte do valor.
 */
function valorAposRotulo(texto: string, inicio: number): string {
  let i = inicio;
  // Os dois pontos, o travessão e um único fim de linha ainda fazem parte da
  // separação entre o rótulo e o valor.
  let linhas = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (c === "\n") {
      linhas += 1;
      if (linhas > 1) break;
    } else if (!/[\s:.\-–—]/.test(c)) {
      break;
    }
    i += 1;
  }

  let valor = texto.slice(i, i + 200).split("\n")[0] ?? "";
  const doisPontos = valor.indexOf(":");
  if (doisPontos !== -1) valor = valor.slice(0, doisPontos).replace(/\s*\S+$/, "");
  return valor.trim();
}

function todosOsValores(
  texto: string,
  rotulos: Rotulo[],
  campo: CampoDoDocumento,
  aceitar: (valor: string) => boolean
): string[] {
  const valores: string[] = [];
  const vistos = new Set<string>();

  for (const rotulo of rotulos) {
    if (rotulo.campo !== campo) continue;
    const valor = valorAposRotulo(texto, rotulo.fim);
    if (!valor || !aceitar(valor)) continue;
    const chave = valor.toUpperCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    valores.push(valor);
  }

  return valores;
}

// ---------------------------------------------------------------------------
// A porta
// ---------------------------------------------------------------------------

/** O que o formulário diz, para servir de desempate ao ler o documento. */
export interface Pistas {
  ueln?: string;
  microchip?: string;
  numeroRegisto?: string;
  nome?: string;
  /** O nome de registo, quando o anúncio o distingue do nome corrente. */
  nomeRegisto?: string;
}

export interface Identificadores {
  ueln?: string;
  microchip?: string;
  numeroRegisto?: string;
  nome?: string;
}

/**
 * Os identificadores que o texto tiver.
 *
 * As `pistas` são o que o vendedor escreveu, e entram aqui **só para
 * desempatar** — nunca para inventar. Se o formulário diz `620015004471234` e
 * esse número está no documento, é esse o número do documento; se não está,
 * as pistas não mudam nada e a escolha continua a depender do rótulo.
 */
export function acharIdentificadores(texto: string, pistas: Pistas = {}): Identificadores {
  if (!texto) return {};

  const plano = aplanar(texto);
  const rotulos = acharRotulos(plano);

  const microchips = candidatos(
    plano,
    rotulos,
    /\d/,
    DIGITOS_MICROCHIP,
    (v) => lerMicrochip(v).valido
  );
  const uelns = candidatos(
    plano,
    rotulos,
    /[0-9A-Z]/,
    COMPRIMENTO_UELN,
    (v) => lerPassaporte(v).pareceUeln
  );

  const microchip = escolher(microchips, "microchip", normalizarMicrochip(pistas.microchip ?? ""));
  const ueln = escolher(uelns, "ueln", limparPassaporte(pistas.ueln ?? ""));

  // O nome e o número de registo não têm formato que se possa procurar: um
  // sem o rótulo ao lado seria um palpite sobre que palavra da página é o
  // nome do cavalo. Por isso só se apanham quando há **um** rótulo e **um**
  // valor plausível a seguir a ele.
  const nomes = todosOsValores(
    texto,
    rotulos,
    "nome",
    (v) => v.length >= 2 && v.length <= MAX_NOME && /\p{L}/u.test(v) && !/^\d+$/.test(v)
  );
  const registos = todosOsValores(
    texto,
    rotulos,
    "numero_registo",
    (v) => v.length <= MAX_NOME && lerRegistoApsl(v).problema === undefined
  );

  // O mesmo desempate que vale para os números vale aqui: com vários valores
  // possíveis, se um deles for o que o formulário diz, é esse — não há
  // contradição a levantar enquanto o que o vendedor escreveu estiver no papel.
  const nome = umSo(nomes, [pistas.nome, pistas.nomeRegisto], chaveDeNome);
  const registo = umSo(registos, [pistas.numeroRegisto], chaveDeNome);

  return {
    ...(ueln ? { ueln } : {}),
    ...(microchip ? { microchip } : {}),
    ...(registo ? { numeroRegisto: normalizarRegistoApsl(registo) } : {}),
    ...(nome ? { nome } : {}),
  };
}

/**
 * Um valor só: o único que há, ou o que coincide com o formulário.
 *
 * Com dois valores e nenhum deles a coincidir, devolve nada — escolher um
 * seria dar à sorte a decisão de acusar.
 */
function umSo(
  valores: string[],
  doFormulario: (string | undefined)[],
  chave: (valor: string) => string
): string | undefined {
  if (valores.length === 1) return valores[0];
  if (valores.length === 0) return undefined;

  const esperadas = doFormulario
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map(chave)
    .filter(Boolean);

  return valores.find((v) => esperadas.includes(chave(v)));
}
