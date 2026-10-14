/**
 * ██ ATENÇÃO ██ O FORMATO QUE ESTE FICHEIRO SUPÕE NUNCA FOI OBSERVADO. ██
 *
 * Nenhuma resposta real da APSL foi vista por quem escreveu isto. O ambiente
 * onde este código nasceu **não tem rede de saída** — todos os pedidos morrem
 * no CONNECT com 403, incluindo para `example.com`, e o registo está na secção
 * 1 do `docs/verificacao-documental.md`. A página de acesso público ao
 * stud-book nunca foi aberta.
 *
 * Portanto: **as etiquetas, a estrutura e as fixtures deste módulo são
 * inventadas por mim**, a partir do que a página norte-americana _Searching the
 * APSL Studbook_ diz que a consulta devolve — criador, proprietário, data de
 * nascimento, pelagem, NIN, número no Livro de Nascimentos, e a descendência.
 * Que campos existem é **provável**; como estão escritos na página é
 * **suposição pura**.
 *
 * **A primeira resposta real vai obrigar a mexer aqui.** Conte-se com isso. O
 * resto da directoria — o interruptor, o ritmo, o cruzamento, os factos — não
 * depende do formato e não deve precisar de tocar-se.
 *
 * ## A decisão de desenho que torna esta ignorância suportável
 *
 * Há **três** saídas, e nunca duas:
 *
 * - `encontrado` — reconheceu-se um registo de cavalo.
 * - `nao_encontrado` — a página **diz** positivamente que não há resultados.
 * - `formato_desconhecido` — não se percebeu a página.
 *
 * A terceira é a que faz o trabalho todo. Um analisador com duas saídas trata
 * «não percebi a página» como «a APSL não conhece este cavalo» — e no dia em
 * que a APSL mudar o desenho do sítio, este sistema começaria a dizer que
 * nenhum cavalo consta do Livro Genealógico. Seria uma acusação em massa
 * causada por uma folha de estilo. Aqui, `formato_desconhecido` sobe até ao
 * `consulta.ts` como `indisponivel`, que quer dizer «não conseguimos saber», e
 * o anúncio fica «por confirmar».
 *
 * Pela mesma razão, `encontrado` exige **nome ou número de registo**. Uma
 * página de onde só se arrancou uma pelagem não é um cavalo: é ruído com sorte.
 *
 * ## Como se substitui isto quando a resposta real chegar
 *
 * 1. Guardar as páginas reais (ver a lista no relatório: uma resposta com
 *    resultado, uma sem resultado, e uma de erro, para cinco cavalos).
 * 2. Trocar `ROTULOS` pelos rótulos verdadeiros e `MARCAS_DE_VAZIO` pelas
 *    frases verdadeiras.
 * 3. Se a resposta for JSON e não HTML, escrever outra função com a mesma
 *    assinatura e passá-la ao `consultar` pelo `opcoes.analisar` — é para isso
 *    que a costura existe.
 * 4. Substituir as fixtures de `__tests__/lib/stud-book-fixtures.ts` pelas
 *    páginas reais, e apagar deste cabeçalho o aviso todo.
 */

import { chaveDeNome } from "@/lib/documentos/leitura/normalizar";

import type { RegistoNoStudBook } from "./contrato";

export type RespostaAnalisada =
  | { estado: "encontrado"; registo: RegistoNoStudBook }
  | { estado: "nao_encontrado" }
  | { estado: "formato_desconhecido" };

/** A assinatura da costura. Trocar de analisador é trocar esta função. */
export type Analisador = (corpo: string) => RespostaAnalisada;

/**
 * Um megabyte de página chega e sobra.
 *
 * Um tecto existe porque a resposta vem de fora e pode vir do tamanho que
 * quiserem. Corta-se e analisa-se o princípio — que é onde, em qualquer
 * desenho plausível, os campos do animal estão.
 */
const MAX_CARACTERES = 1_000_000;

/**
 * As frases que dizem «não há resultados».
 *
 * **Suposição.** São as formulações correntes em português e inglês, e a página
 * é bilingue. Se nenhuma aparecer, não se conclui que há resultados — conclui-se
 * que não se percebeu a página.
 */
const MARCAS_DE_VAZIO = [
  "sem resultados",
  "nao foram encontrados",
  "nao foi encontrado",
  "nenhum resultado",
  "nenhum registo",
  "nada encontrado",
  "no results",
  "no records found",
  "not found",
  "nothing found",
];

/**
 * Os rótulos por que se procura cada campo, em português e inglês.
 *
 * **Suposição, toda ela.** Compara-se pela chave sem acentos, sem espaços e sem
 * pontuação (`chaveDeNome`), que é a mesma normalização que o resto do sistema
 * usa para nomes — assim «Data de Nascimento», «DATA DE NASCIMENTO:» e «Data
 * nascimento» batem todas certo sem três entradas na tabela.
 *
 * A ordem dentro de cada campo é a da preferência: o rótulo mais específico
 * primeiro, para que «Nome do Pai» não seja apanhado por «Nome».
 */
const ROTULOS: Readonly<Record<keyof RegistoNoStudBook, readonly string[]>> = {
  numeroRegisto: [
    "numero de registo",
    "n de registo",
    "n registo",
    "nin",
    "registration number",
    "stud book no",
  ],
  nome: ["nome do cavalo", "nome", "horse name", "name"],
  dataNascimento: ["data de nascimento", "data nascimento", "nascimento", "date of birth", "born"],
  pelagem: ["pelagem", "capa", "coat colour", "coat color", "colour", "color"],
  criador: ["criador", "breeder"],
  pai: ["pai", "sire"],
  mae: ["mae", "dam"],
};

/**
 * O que **nunca** se procura, e é uma decisão e não um esquecimento.
 *
 * O **proprietário actual** e a **descendência** são dado de terceiro que não
 * serve para confrontar nada com o anúncio. A peneira do `contrato.ts` já os
 * deitaria fora se aqui aparecessem; não aparecerem de todo é a mesma regra um
 * passo mais cedo, e é o passo que conta — o que não se lê não se pode guardar
 * por distracção.
 */
export const CAMPOS_QUE_NAO_SE_LEEM = ["proprietario", "descendencia"] as const;

/** Um valor tem de caber numa linha de painel. Acima disto é a página, não um campo. */
const MAX_CARACTERES_VALOR = 200;

/**
 * As entidades que se sabem descodificar.
 *
 * As acentuadas estão cá porque uma página portuguesa as usa a rodo, e porque
 * o que se perde ao não as perceber não é cosmético: `N&ordm; de Registo` sem
 * descodificação dá um rótulo que não bate certo com nenhum da tabela, e o
 * campo perde-se inteiro. O que **não** se conhecer é apagado e não trocado por
 * um espaço — assim uma palavra partida ao meio por uma entidade volta a
 * juntar-se em vez de virar duas.
 */
const ENTIDADES: Readonly<Record<string, string>> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&ordm;": "º",
  "&ordf;": "ª",
  "&aacute;": "á",
  "&agrave;": "à",
  "&acirc;": "â",
  "&atilde;": "ã",
  "&ccedil;": "ç",
  "&eacute;": "é",
  "&ecirc;": "ê",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&ocirc;": "ô",
  "&otilde;": "õ",
  "&uacute;": "ú",
  "&uuml;": "ü",
  "&ntilde;": "ñ",
};

/** `&#233;` e `&#xE9;`. Fora da tabela porque são uma regra e não uma lista. */
function entidadeNumerica(entidade: string): string | undefined {
  const decimal = /^&#(\d{1,7});$/.exec(entidade);
  if (decimal) return codigoParaTexto(Number(decimal[1]));
  const hexadecimal = /^&#x([0-9a-f]{1,6});$/i.exec(entidade);
  if (hexadecimal) return codigoParaTexto(Number.parseInt(hexadecimal[1], 16));
  return undefined;
}

function codigoParaTexto(codigo: number): string | undefined {
  if (!Number.isFinite(codigo) || codigo <= 0 || codigo > 0x10ffff) return undefined;
  try {
    return String.fromCodePoint(codigo);
  } catch {
    return undefined;
  }
}

function descodificar(entidade: string): string {
  // A tabela tem as chaves em minúsculas, e a procura exacta vem primeiro: se
  // se começasse por baixar a caixa, `&Aacute;` dava «á» e a maiúscula
  // perdia-se — o ramo de baixo nunca chegava a correr.
  const exacta = ENTIDADES[entidade];
  if (exacta !== undefined) return exacta;

  const minuscula = entidade.toLowerCase();
  const conhecida = ENTIDADES[minuscula];
  if (conhecida !== undefined) {
    return /^&[A-Z]/.test(entidade) ? conhecida.toUpperCase() : conhecida;
  }

  return entidadeNumerica(minuscula) ?? "";
}

/**
 * A página reduzida a linhas de texto.
 *
 * As marcas viram quebras de linha em vez de desaparecerem: `<td>Pelagem</td>`
 * seguido de `<td>Castanho</td>` tem de dar duas linhas e não a palavra
 * «PelagemCastanho». É essa transformação que faz o mesmo leitor servir uma
 * tabela, uma lista de definições e texto corrido.
 */
function emLinhas(html: string): string[] {
  const semScripts = html
    .slice(0, MAX_CARACTERES)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const texto = semScripts.replace(/<[^>]*>/g, "\n").replace(/&#?[a-z0-9]+;/gi, descodificar);

  return texto
    .split("\n")
    .map((linha) => linha.replace(/\s+/g, " ").trim())
    .filter((linha) => linha !== "");
}

/** Um valor aceitável: não vazio, não gigante, e com alguma coisa dentro. */
function valorUtil(valor: string): string | undefined {
  const limpo = valor
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[:\-–—]\s*/, "");
  if (limpo === "" || limpo.length > MAX_CARACTERES_VALOR) return undefined;
  if (!/[0-9A-Za-zÀ-ÿ]/.test(limpo)) return undefined;
  return limpo;
}

/**
 * Todas as chaves de rótulo conhecidas, para saber se uma linha **é** um
 * rótulo.
 *
 * Serve o caso «rótulo numa linha, valor na seguinte»: se a linha seguinte for
 * ela própria um rótulo, então o campo está vazio na página e não se inventa
 * um valor com o nome do campo ao lado.
 */
const TODAS_AS_CHAVES = new Set(
  Object.values(ROTULOS).flatMap((lista) => lista.map((r) => chaveDeNome(r)))
);

/**
 * Procura um campo pelos seus rótulos.
 *
 * Dois desenhos são aceites, e são os dois que qualquer página de ficha usa:
 * `Rótulo: valor` na mesma linha, ou o rótulo numa linha e o valor na
 * seguinte. O primeiro rótulo da lista que der resultado ganha.
 */
function acharCampo(linhas: readonly string[], rotulos: readonly string[]): string | undefined {
  for (const rotulo of rotulos) {
    const alvo = chaveDeNome(rotulo);
    if (!alvo) continue;

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];

      // «Rótulo: valor», na mesma linha.
      const doisPontos = linha.indexOf(":");
      const eRotuloComDoisPontos =
        doisPontos > 0 && chaveDeNome(linha.slice(0, doisPontos)) === alvo;
      if (eRotuloComDoisPontos) {
        const valor = valorUtil(linha.slice(doisPontos + 1));
        if (valor) return valor;
      }

      // O rótulo sozinho, e o valor na linha a seguir. Também se chega aqui
      // vindo do caso de cima quando o rótulo trazia os dois pontos e nada
      // depois — `<dt>Nome:</dt><dd>Rubi</dd>` dá exactamente essas duas
      // linhas, e é um desenho demasiado corrente para se deixar passar.
      if (!eRotuloComDoisPontos && chaveDeNome(linha) !== alvo) continue;
      const seguinte = linhas[i + 1];
      if (seguinte === undefined) continue;
      // A linha a seguir é outro rótulo: o campo está vazio na página.
      if (TODAS_AS_CHAVES.has(chaveDeNome(seguinte))) continue;
      const valor = valorUtil(seguinte);
      if (valor) return valor;
    }
  }
  return undefined;
}

/**
 * A data de nascimento em `AAAA-MM-DD`, ou nada.
 *
 * **Uma data que não se percebe deita-se fora.** Guardá-la em cru daria uma
 * divergência falsa com o `data_nascimento` do anúncio, que está em ISO — e uma
 * divergência falsa é precisamente o que este sistema inteiro existe para não
 * produzir. Perder um campo custa uma linha em branco no painel; inventar uma
 * contradição custa a confiança de quem revê.
 *
 * `12/03/2019` lê-se como 12 de Março: a página é portuguesa e o dia vem
 * primeiro. Quando o primeiro número é maior do que 12 não há ambiguidade
 * nenhuma para desfazer.
 */
export function normalizarData(valor: string): string | undefined {
  const texto = valor.trim();

  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(texto);
  if (iso) return montarData(iso[1], iso[2], iso[3]);

  const diaPrimeiro = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(texto);
  if (diaPrimeiro) return montarData(diaPrimeiro[3], diaPrimeiro[2], diaPrimeiro[1]);

  return undefined;
}

function montarData(ano: string, mes: string, dia: string): string | undefined {
  const a = Number(ano);
  const m = Number(mes);
  const d = Number(dia);
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  // Um cavalo nascido no ano 300 ou em 2400 é um erro de leitura, não um cavalo.
  if (a < 1800 || a > 2200) return undefined;
  // 31 de Fevereiro não é uma data. `Date.UTC` normaliza em silêncio, por isso
  // confirma-se que os componentes sobreviveram à ida e volta.
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) {
    return undefined;
  }
  return `${String(a).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * A resposta da APSL, tal como a supomos.
 *
 * Nunca lança: um corpo que não se percebe é `formato_desconhecido`, que é um
 * resultado normal e previsto, não uma avaria.
 */
export function analisarRespostaApsl(corpo: string): RespostaAnalisada {
  if (typeof corpo !== "string" || corpo.trim() === "") {
    return { estado: "formato_desconhecido" };
  }

  const linhas = emLinhas(corpo);
  if (linhas.length === 0) return { estado: "formato_desconhecido" };

  const nome = acharCampo(linhas, ROTULOS.nome);
  const numeroRegisto = acharCampo(linhas, ROTULOS.numeroRegisto);

  // O que identifica um cavalo é o nome ou o número. Sem um dos dois não há
  // registo nenhum reconhecido, por muitos outros campos que a página tenha —
  // e aí a pergunta passa a ser se a página **diz** que não encontrou nada.
  if (!nome && !numeroRegisto) {
    const plano = chaveDeNome(linhas.join(" "));
    const vazia = MARCAS_DE_VAZIO.some((marca) => plano.includes(chaveDeNome(marca)));
    return vazia ? { estado: "nao_encontrado" } : { estado: "formato_desconhecido" };
  }

  const registo: RegistoNoStudBook = {};
  if (nome) registo.nome = nome;
  if (numeroRegisto) registo.numeroRegisto = numeroRegisto;

  const nascimento = acharCampo(linhas, ROTULOS.dataNascimento);
  const dataNascimento = nascimento ? normalizarData(nascimento) : undefined;
  if (dataNascimento) registo.dataNascimento = dataNascimento;

  const pelagem = acharCampo(linhas, ROTULOS.pelagem);
  if (pelagem) registo.pelagem = pelagem;

  const criador = acharCampo(linhas, ROTULOS.criador);
  if (criador) registo.criador = criador;

  const pai = acharCampo(linhas, ROTULOS.pai);
  if (pai) registo.pai = pai;

  const mae = acharCampo(linhas, ROTULOS.mae);
  if (mae) registo.mae = mae;

  return { estado: "encontrado", registo };
}
