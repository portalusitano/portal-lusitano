/**
 * O cavalo consigo próprio.
 *
 * ## O que aqui está, e sobretudo o que não está
 *
 * A `components/vender-cavalo/inspeccao.ts` já lê o formulário inteiro campo a
 * campo, e já apanha várias contradições internas: a idade contra o nível de
 * treino, os anos de treino contra a idade, cada data de saúde contra o futuro,
 * contra o nascimento e contra o «está em dia» respondido duas linhas acima.
 * **Nada disso se repete aqui.** Duas verificações da mesma coisa em dois
 * sítios são duas frases que um dia deixam de dizer o mesmo, e quem as lê não
 * sabe qual delas está certa.
 *
 * O que falta, e é o que este ficheiro faz:
 *
 * 1. **A data de nascimento no futuro.** A inspecção verifica o futuro nas três
 *    datas de saúde e não na data de nascimento, que é a que manda em todas as
 *    outras. Um cavalo que ainda não nasceu não está à venda.
 * 2. **O nascimento depois de todo o historial.** A inspecção aponta cada data
 *    de saúde anterior ao nascimento no campo dessa data — e para uma só data é
 *    a leitura certa, porque não há como saber qual dos dois campos está
 *    errado. Quando são **duas ou mais**, e todas caem antes do nascimento, o
 *    campo isolado passa a ser o outro: é a data de nascimento que está errada,
 *    e é sobre ela que se pergunta. É uma afirmação diferente, e não a mesma
 *    dita outra vez.
 * 3. **A idade guardada contra a data.** A coluna `idade` de `cavalos_venda` é
 *    uma conta que o browser fez no dia em que o anúncio foi pago; a
 *    `data_nascimento` é o dado. O formulário não tem caixa nenhuma para a
 *    idade, e por isso esta é uma verificação que só existe do lado das linhas
 *    já guardadas.
 * 4. **A longevidade.** Nunca verificada em lado nenhum.
 * 5. **A altura contra a idade.** A inspecção verifica a altura contra o padrão
 *    da raça, sem olhar à idade. Um potro de seis meses com a altura de um
 *    adulto é coerente com o padrão e continua a não poder ser.
 *
 * ## A ausência nunca é um conflito
 *
 * Metade dos anúncios pode não ter data de nascimento, e isso não é um
 * problema: é um campo em branco. **Sem data de nascimento nenhuma destas
 * cinco regras corre**, e é o teste que o prova. A tentação de tratar o `null`
 * como um valor é a maneira mais rápida de encher uma fila de revisão com
 * cavalos honestos.
 */

import {
  ALTURA_ADULTA_MAXIMA_CREDIVEL,
  ANOS_LONGEVIDADE_INVULGAR,
  MESES_CRESCIMENTO_COMPLETO,
  fraccaoDaAlturaAdulta,
} from "./biologia";
import {
  type Achado,
  type AchadoAlturaParaAIdade,
  type AchadoIdadeDeclaradaDiverge,
  type AchadoLongevidadeInvulgar,
  type AchadoNascimentoDepoisDoHistorial,
  type AchadoNascimentoNoFuturo,
  type CavaloParaCoerencia,
  type DataDeHistorial,
  data,
  mesesEntre,
  porTexto,
} from "./achados";

/**
 * Quantos anos de diferença entre a idade guardada e a data de nascimento
 * deixam de se poder explicar pela passagem do tempo.
 *
 * **Não é um número biológico** — é aritmética sobre como a coluna foi
 * escrita. A `idade` é calculada no dia do pagamento e não volta a ser tocada:
 * um anúncio de dois anos tem lá uma idade dois anos abaixo da verdadeira, e
 * isso é o funcionamento normal e não uma contradição. O que o tempo **não**
 * consegue fazer é envelhecer o cavalo para trás. Por isso só se olha para a
 * diferença no sentido em que a passagem do tempo não a explica — a idade
 * guardada ser **maior** do que a que a data dá —, e mesmo aí com dois anos de
 * folga, que é o que absorve um aniversário a passar entre uma coisa e outra.
 */
const ANOS_DE_FOLGA_NA_IDADE = 2;

/** A data de hoje escrita como as outras, para o achado poder ser comparado. */
function diaDe(momento: Date): string {
  return momento.toISOString().slice(0, 10);
}

/** A idade em anos completos entre duas datas. */
function anosEntre(nascimento: Date, momento: Date): number {
  return Math.floor(mesesEntre(nascimento, momento) / 12);
}

/**
 * Tudo o que um anúncio diz de si próprio e não fecha.
 *
 * É uma função pura sobre uma linha já lida: não vai à base, não escreve nada,
 * e para a mesma entrada dá sempre a mesma saída pela mesma ordem.
 */
export function coerenciaDoCavalo(
  cavalo: CavaloParaCoerencia,
  contexto: { hoje?: Date; historial?: readonly DataDeHistorial[] } = {}
): Achado[] {
  const nascimento = data(cavalo.data_nascimento);
  // Sem data de nascimento não há nada a comparar. Ausência não é conflito.
  if (!nascimento || !cavalo.data_nascimento) return [];

  const hoje = contexto.hoje ?? new Date();
  const saida: Achado[] = [];
  const dataNascimento = cavalo.data_nascimento;
  const cavalos = [cavalo.id];

  // --- 1. Nascer depois de hoje --------------------------------------------
  const noFuturo = nascimento.getTime() > hoje.getTime();
  if (noFuturo) {
    const achado: AchadoNascimentoNoFuturo = {
      tipo: "nascimento_no_futuro",
      natureza: "impossivel",
      cavalos,
      dataNascimento,
      hoje: diaDe(hoje),
    };
    saida.push(achado);
  }

  // --- 2. Nascer depois de todo o historial ---------------------------------
  // Só quando são duas ou mais e **todas** ficam para trás: com uma só, quem
  // fala é a inspecção, no campo dessa data, e não este módulo. E não se diz
  // isto sobre um nascimento já apontado como estando no futuro — seria a
  // mesma queixa contada duas vezes.
  if (!noFuturo) {
    const historial = (contexto.historial ?? [])
      .map((h) => ({ entrada: h, quando: data(h.data) }))
      .filter((h): h is { entrada: DataDeHistorial; quando: Date } => h.quando !== null);

    if (
      historial.length >= 2 &&
      historial.every((h) => h.quando.getTime() < nascimento.getTime())
    ) {
      const achado: AchadoNascimentoDepoisDoHistorial = {
        tipo: "nascimento_depois_do_historial",
        natureza: "impossivel",
        cavalos,
        dataNascimento,
        historial: historial
          .map((h) => h.entrada)
          .sort((a, b) => porTexto(a.campo, b.campo) || porTexto(a.data, b.data)),
      };
      saida.push(achado);
    }
  }

  const idadePelaData = anosEntre(nascimento, hoje);

  // --- 3. A idade guardada contra a data ------------------------------------
  if (typeof cavalo.idade === "number" && Number.isFinite(cavalo.idade) && !noFuturo) {
    const diferenca = cavalo.idade - idadePelaData;
    if (diferenca >= ANOS_DE_FOLGA_NA_IDADE) {
      const achado: AchadoIdadeDeclaradaDiverge = {
        tipo: "idade_declarada_diverge",
        natureza: "improvavel",
        cavalos,
        dataNascimento,
        idadeDeclarada: cavalo.idade,
        idadePelaData,
        anosDeDiferenca: diferenca,
      };
      saida.push(achado);
    }
  }

  // --- 4. Longevidade -------------------------------------------------------
  // Improvável e nada mais. Um cavalo de 32 anos existe, e é o dono desse que
  // menos se pode dar ao luxo de ver o anúncio recusado.
  if (idadePelaData > ANOS_LONGEVIDADE_INVULGAR) {
    const achado: AchadoLongevidadeInvulgar = {
      tipo: "longevidade_invulgar",
      natureza: "improvavel",
      cavalos,
      dataNascimento,
      anos: idadePelaData,
    };
    saida.push(achado);
  }

  // --- 5. A altura contra a curva de crescimento ----------------------------
  const mesesDeIdade = mesesEntre(nascimento, hoje);
  const altura = typeof cavalo.altura === "number" ? cavalo.altura : null;
  if (
    altura !== null &&
    Number.isFinite(altura) &&
    altura > 0 &&
    !noFuturo &&
    mesesDeIdade >= 0 &&
    mesesDeIdade < MESES_CRESCIMENTO_COMPLETO
  ) {
    const alturaAdultaImplicita = Math.round(altura / fraccaoDaAlturaAdulta(mesesDeIdade));
    if (alturaAdultaImplicita > ALTURA_ADULTA_MAXIMA_CREDIVEL) {
      const achado: AchadoAlturaParaAIdade = {
        tipo: "altura_para_a_idade",
        natureza: "improvavel",
        cavalos,
        dataNascimento,
        alturaCm: altura,
        mesesDeIdade,
        alturaAdultaImplicita,
      };
      saida.push(achado);
    }
  }

  return saida;
}

/**
 * O mesmo, sobre um conjunto de anúncios, por ordem de anúncio.
 *
 * O `historial` vem indexado pelo id do anúncio: quem chama passa o que tiver
 * lido do `saude` de cada linha, e os anúncios sem historial nenhum entram na
 * mesma — só não produzem o segundo achado.
 */
export function coerenciaDosCavalos(
  cavalos: readonly CavaloParaCoerencia[],
  contexto: { hoje?: Date; historial?: Readonly<Record<string, DataDeHistorial[]>> } = {}
): Achado[] {
  return [...cavalos]
    .sort((a, b) => porTexto(a.id, b.id))
    .flatMap((cavalo) =>
      coerenciaDoCavalo(cavalo, {
        hoje: contexto.hoje,
        historial: contexto.historial?.[cavalo.id],
      })
    );
}
