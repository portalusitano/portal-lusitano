import type { FormData } from "@/components/vender-cavalo/types";
import { niveisTreino } from "@/components/vender-cavalo/data";
import { lerMicrochip } from "@/lib/microchip-iso";
import { lerNif, lerTelefonePT, pareceTelefoneInternacional } from "@/lib/identificacao-pt";
import { sugerirDominioEmail } from "@/lib/dominios-email";
import { identificarVideo } from "@/lib/video-partilhado";
import { lerRegistoApsl } from "@/components/vender-cavalo/registo-apsl";
import { lerPassaporte } from "@/components/vender-cavalo/passaporte-ueln";
import { lerData, mesesEntre } from "@/lib/datas-do-cavalo";
import {
  reunirCoerencia,
  campoDoAchado,
  NIVEL_DA_NATUREZA,
  type Achado,
} from "@/lib/documentos/coerencia";

/**
 * O que cada campo sabe sobre si próprio.
 *
 * A `validacao.ts` responde a uma pergunta só — «pode avançar?» — e responde-a
 * ao carregar em Continuar. Isto responde a outra: **«o que é que este campo
 * acabou de receber?»**, e responde-a no instante em que a pessoa sai dele,
 * que é o único instante em que ela ainda está a pensar naquilo. Seis passos
 * depois já não está.
 *
 * ## Três níveis, e a diferença entre eles é o custo de estar errado
 *
 * - **`erro`** — impede. Só para o que é impossível: quinze algarismos que são
 *   catorze, um dígito de controlo que não fecha, uma pontuação de 140 numa
 *   escala até 100. Nestes casos o dado que ficaria guardado seria lixo.
 * - **`aviso`** — deixa passar e pergunta. Para o improvável: 193cm de altura,
 *   um preço de mil euros, um cavalo de dois anos em Alta Escola. Nenhuma
 *   destas é impossível, e todas são quase sempre uma gralha de tecla. Quem
 *   sabe que está certo passa à frente; quem se enganou vê-o a tempo.
 * - **`sugestao`** — propõe uma correcção que se aceita com um clique.
 *   `gmial.com` → `gmail.com`, `16.2` mãos → `168` cm. É o único nível que
 *   escreve no campo, e nunca sem que alguém carregue no botão.
 *
 * ## O que não está aqui
 *
 * Nada que dependa de um formato que não se conseguiu confirmar. O número de
 * registo da APSL tem o seu módulo próprio e a razão está escrita lá.
 */

export type NivelApontamento = "erro" | "aviso" | "sugestao";

export interface Apontamento {
  /** O `id` do campo no DOM — é o que liga o apontamento ao sítio onde ele mora. */
  campo: string;
  nivel: NivelApontamento;
  mensagem: string;
  /** Só nas sugestões: o valor que o botão escreve no campo. */
  correccao?: string;
}

/** As frases, já traduzidas. Esta camada não sabe de línguas, tal como a validação. */
/**
 * As frases dos achados de coerência que aterram num campo do formulário.
 *
 * São sete — as outras seis nascem do cruzamento de mais do que um anúncio e
 * o `campoDoAchado` devolve-lhes `null`, porque o que estiver errado pode
 * estar do outro lado e quem está à frente do ecrã não tem como o corrigir.
 *
 * Recebem os números crus por argumento em vez de virem já escritas: quem
 * traduz precisa de os poder pôr onde a língua os quer.
 */
export interface MensagensCoerencia {
  nascimentoNoFuturo: string;
  nascimentoDepoisDoHistorial: string;
  longevidadeInvulgar: (anos: number) => string;
  alturaParaAIdade: (alturaAdultaImplicita: number) => string;
  progenitorNovoDemais: (meses: number) => string;
  progenitorPoucoHabitual: (meses: number) => string;
  antepassadoDeSiProprio: string;
  papelContraditorio: string;
  sexoContraPapel: string;
}

export interface MensagensInspeccao {
  coerencia: MensagensCoerencia;
  microchipComprimento: (faltam: number) => string;
  microchipNaoNumerico: string;
  microchipPrefixo: string;
  microchipRepetido: string;
  nifComprimento: string;
  nifControlo: string;
  nifColectivoParticular: string;
  nifSingularEmpresa: string;
  telefoneInvalido: string;
  telefoneInternacional: string;
  emailDominio: (sugerido: string) => string;
  alturaEmMaos: (cm: number) => string;
  alturaImpossivel: string;
  alturaInvulgar: string;
  pesoImpossivel: string;
  pesoInvulgar: string;
  precoZeroAMenos: string;
  precoBaixo: string;
  precoAlto: string;
  pontuacaoForaDaEscala: string;
  pontuacaoInvulgar: string;
  registoCurto: string;
  registoRepetido: string;
  registoEONome: string;
  registoSemAlgarismos: string;
  registoDuplicado: string;
  videoNaoReconhecido: string;
  treinoCedoDemais: (idade: number) => string;
  treinoAltaEscolaCedo: (idade: number) => string;
  treinoPotroTarde: (idade: number) => string;
  passaporteComprimento: (faltam: number) => string;
  passaportePaisNaoNumerico: string;
  dataNoFuturo: string;
  dataAntesDeNascer: string;
  vacinacaoDesactualizada: (meses: number) => string;
  desparasitacaoDesactualizada: (meses: number) => string;
  ferragemAntiga: (meses: number) => string;
  treinoMaisAnosDoQueIdade: (anos: number, idade: number) => string;
}

// ---------------------------------------------------------------------------
// As medidas do Lusitano adulto
// ---------------------------------------------------------------------------

/**
 * O padrão da raça, no que a um formulário interessa. A APSL fixa alturas
 * mínimas à volta de 1,55 m para os machos e 1,50 m para as fêmeas aos seis
 * anos, e um Lusitano adulto anda tipicamente entre **150 e 170 cm** ao
 * garrote, com **400 a 650 kg**. Fora desta janela não se recusa nada: a
 * janela é o que se conhece de comum, e o incomum existe.
 */
const ALTURA_HABITUAL = { min: 150, max: 170 } as const;
const PESO_HABITUAL = { min: 400, max: 650 } as const;

/** Fora disto não é um cavalo em centímetros — é outra unidade ou uma gralha. */
const ALTURA_POSSIVEL = { min: 100, max: 220 } as const;
const PESO_POSSIVEL = { min: 50, max: 1200 } as const;

/**
 * A **mão** («hand») é a unidade em que o mundo anglófono mede cavalos: 4
 * polegadas, 10,16 cm. Escreve-se `16.2`, que quer dizer dezasseis mãos e
 * duas polegadas — não dezasseis vírgula dois. Um Lusitano anda pelas 15 a
 * 16.3 mãos, e quem escreve `16` numa caixa que pede centímetros não se
 * enganou: usou a unidade da casa dele. Converte-se e propõe-se.
 */
const CM_POR_MAO = 10.16;
const CM_POR_POLEGADA = 2.54;
const MAOS_PLAUSIVEIS = { min: 12, max: 19 } as const;

/**
 * A escala das classificações morfológicas do stud-book vai até 100. Na
 * prática as pontuações atribuídas concentram-se entre 60 e 80 — abaixo de 60
 * o cavalo não é aprovado, acima de 80 é excepcional.
 */
const PONTUACAO_ESCALA = { min: 0, max: 100 } as const;
const PONTUACAO_HABITUAL = { min: 60, max: 80 } as const;

/**
 * Quanto tempo pode passar entre um cuidado e a data que se escreve ao lado
 * de «está em dia».
 *
 * Estes três números não são de gosto — são os intervalos correntes da prática
 * veterinária equina, e servem só para apanhar a **contradição dentro do
 * próprio formulário**: alguém que respondeu «sim, está em dia» e escreveu uma
 * data de há três anos disse duas coisas que não podem ser ambas verdade, e
 * uma delas está errada.
 *
 * - **Vacinação: 12 meses.** O reforço da gripe equina e do tétano é anual. A
 *   FEI é ainda mais apertada para competir — reforço nos 6 meses e 21 dias
 *   anteriores —, e por isso doze meses é o limite generoso, não o exigente.
 * - **Desparasitação: 12 meses.** O intervalo corrente anda entre os 3 e os 6
 *   meses, conforme o programa e o resultado das contagens de ovos; aos doze
 *   já não há programa nenhum que o justifique.
 * - **Ferragem ou aparo: 6 meses.** O ciclo do casco é de 6 a 8 semanas, e
 *   vale tanto para o cavalo ferrado como para o descalço, que é aparado na
 *   mesma. Seis meses são quatro ciclos falhados.
 *
 * Nenhum destes recusa nada: são todos avisos. Um cavalo pode ter estado
 * parado, doente ou no estrangeiro — o que não pode é a resposta e a data
 * dizerem coisas diferentes sem que ninguém repare.
 */
const MESES_VACINACAO = 12;
const MESES_DESPARASITACAO = 12;
const MESES_FERRAGEM = 6;

/**
 * Preços. Um PSL registado, com Livro Azul e linhagem, não muda de mãos por
 * centenas de euros: abaixo de mil, o caso esmagadoramente mais provável é um
 * zero que ficou por escrever, e por isso este é o único preço que ganha uma
 * sugestão em vez de uma pergunta.
 */
const PRECO_ZERO_A_MENOS = 1000;
const PRECO_BAIXO = 2500;
const PRECO_ALTO = 500_000;

// ---------------------------------------------------------------------------
// Níveis de treino, sem depender da língua
// ---------------------------------------------------------------------------

/**
 * O nível de treino é guardado como texto na língua em que foi escolhido.
 * Comparar com `"Alta Escola"` só funcionaria em português. Compara-se com o
 * **índice** dentro da lista, que é o mesmo nas três — as listas em `data.ts`
 * são paralelas de propósito.
 */
export function indiceNivelTreino(valor: string): number {
  if (!valor) return -1;
  for (const lista of Object.values(niveisTreino)) {
    const i = lista.indexOf(valor);
    if (i >= 0) return i;
  }
  return -1;
}

/** Índice 0: «Potro (sem desbaste)». */
const NIVEL_POTRO = 0;
/** Índices 5 e 6: «Alta Escola» e «Competição». */
const NIVEL_ALTA_ESCOLA = 5;

/**
 * Um cavalo desbrava-se aos três ou quatro anos; antes disso ainda está a
 * crescer e não se monta. A Alta Escola e a competição são anos de trabalho
 * em cima do desbaste — abaixo dos seis, não há tempo material para lá
 * chegar. E um cavalo de dez anos que continue «sem desbaste» é possível, mas
 * é raro o bastante para valer a pena confirmar a data.
 */
const IDADE_DESBASTE = 3;
const IDADE_ALTA_ESCOLA = 6;
const IDADE_POTRO_TARDIO = 10;

// ---------------------------------------------------------------------------
// Utensílios
// ---------------------------------------------------------------------------

/**
 * O texto de um campo, mesmo que o campo não exista.
 *
 * Não é paranóia: o rascunho é reposto com `{ ...initialFormData, ...guardado }`
 * e um rascunho gravado por uma versão anterior do formulário não tem os campos
 * que essa versão ainda não pedia. Ler `.trim()` de um `undefined` rebentava a
 * página inteira — e rebentava-a no `useMemo` da inspecção, que corre a cada
 * tecla, portanto sem sequer chegar a mostrar o formulário.
 */
function texto(formData: FormData, campo: keyof FormData): string {
  const valor = formData[campo];
  return typeof valor === "string" ? valor : "";
}

/** Um número escrito por gente: vírgula decimal, espaços, símbolo de moeda. */
function numero(valor: string): number | null {
  const limpo = valor.trim().replace(/\s/g, "").replace(",", ".");
  if (!limpo) return null;
  const encontrado = limpo.match(/-?\d+(?:\.\d+)?/);
  if (!encontrado) return null;
  const n = Number(encontrado[0]);
  return Number.isFinite(n) ? n : null;
}

/** A idade em anos completos a partir da data de nascimento. */
export function idadeEmAnos(dataNascimento: string, hoje = new Date()): number | null {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento);
  if (Number.isNaN(nascimento.getTime())) return null;
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) anos--;
  return anos;
}

/* `lerData` e `mesesEntre` mudaram-se para `lib/datas-do-cavalo.ts`, e a razão
   está escrita lá: a coerência importava-as daqui, esta passou a importar a
   coerência, e um ciclo em ESM não dá erro — dá uma constante `undefined`.
   Continuam a sair por aqui para quem já as importava deste sítio. */
export { lerData, mesesEntre };

/**
 * `16.2` são dezasseis mãos e duas polegadas, não dezasseis vírgula dois. A
 * parte decimal são polegadas e por isso nunca passa de 3.
 */
export function maosParaCentimetros(maos: number): number | null {
  const inteiras = Math.floor(maos);
  const polegadas = Math.round((maos - inteiras) * 10);
  if (polegadas > 3) return null;
  return Math.round(inteiras * CM_POR_MAO + polegadas * CM_POR_POLEGADA);
}

// ---------------------------------------------------------------------------
// A inspecção
// ---------------------------------------------------------------------------

/**
 * Lê o formulário inteiro e devolve o que há a dizer sobre cada campo.
 *
 * É uma função pura: as mesmas respostas dão sempre os mesmos apontamentos.
 * É isso que permite exercitá-la sem browser, e é isso que permite ao
 * formulário recalcular tudo a cada tecla sem guardar estado nenhum — quem
 * decide *quando* mostrar é a camada de cima.
 */
export function inspeccionar(
  formData: FormData,
  m: MensagensInspeccao,
  contexto: { hoje?: Date; registoDuplicado?: boolean } = {}
): Apontamento[] {
  const saida: Apontamento[] = [];
  const apontar = (
    campo: string,
    nivel: NivelApontamento,
    mensagem: string,
    correccao?: string
  ) => {
    saida.push(
      correccao === undefined ? { campo, nivel, mensagem } : { campo, nivel, mensagem, correccao }
    );
  };

  // --- Microchip: ISO 11784/11785 ------------------------------------------
  const microchip = texto(formData, "microchip");
  if (microchip.trim()) {
    const chip = lerMicrochip(microchip);
    if (chip.problema === "nao-numerico") apontar("microchip", "erro", m.microchipNaoNumerico);
    else if (chip.problema === "comprimento")
      apontar("microchip", "erro", m.microchipComprimento(chip.diferencaDigitos ?? 0));
    else if (chip.problema === "repetido") apontar("microchip", "erro", m.microchipRepetido);
    else if (chip.problema === "prefixo-impossivel")
      apontar("microchip", "erro", m.microchipPrefixo);
  }

  // --- NIF: nove algarismos com dígito de controlo módulo 11 ---------------
  const nifEscrito = texto(formData, "proprietario_nif");
  if (nifEscrito.trim()) {
    const nif = lerNif(nifEscrito);
    if (nif.problema === "nao-numerico" || nif.problema === "comprimento")
      apontar("proprietario_nif", "erro", m.nifComprimento);
    else if (nif.problema === "prefixo" || nif.problema === "controlo")
      apontar("proprietario_nif", "erro", m.nifControlo);
    else if (nif.valido) {
      // O primeiro algarismo diz o tipo de contribuinte, e isso casa — ou não
      // casa — com o «Tipo de Vendedor». Quem escolheu «Particular» e escreveu
      // o NIF da empresa vai receber uma factura em nome errado.
      const eEmpresa = ehVendedorColectivo(texto(formData, "tipo_proprietario"));
      if (eEmpresa && nif.tipo === "singular")
        apontar("proprietario_nif", "aviso", m.nifSingularEmpresa);
      if (texto(formData, "tipo_proprietario") && !eEmpresa && nif.tipo === "colectiva")
        apontar("proprietario_nif", "aviso", m.nifColectivoParticular);
    }
  }

  // --- Telefone -------------------------------------------------------------
  // A regra portuguesa só se aplica a quem vive em Portugal. Para os outros
  // vale o mínimo que vale em todo o lado, e mais nada: a numeração de cada
  // país é a dele, e recusar um número francês por não ser português custa
  // um anúncio e não impede nenhum engano.
  const pais = texto(formData, "pais_proprietario");
  const emPortugal = pais === "" || pais === "Portugal";
  for (const campo of ["proprietario_telefone", "proprietario_whatsapp"] as const) {
    const valor = texto(formData, campo).trim();
    if (!valor) continue;
    if (emPortugal) {
      if (!lerTelefonePT(valor).valido) apontar(campo, "erro", m.telefoneInvalido);
    } else if (!pareceTelefoneInternacional(valor)) {
      apontar(campo, "erro", m.telefoneInternacional);
    }
  }

  // --- Email: sugestão, nunca recusa ---------------------------------------
  const sugestao = sugerirDominioEmail(texto(formData, "proprietario_email"));
  if (sugestao) {
    apontar(
      "proprietario_email",
      "sugestao",
      m.emailDominio(sugestao.sugerido),
      sugestao.emailCorrigido
    );
  }

  // --- Altura ---------------------------------------------------------------
  const altura = numero(texto(formData, "altura"));
  if (altura !== null) {
    const emMaos =
      altura >= MAOS_PLAUSIVEIS.min && altura <= MAOS_PLAUSIVEIS.max
        ? maosParaCentimetros(altura)
        : null;
    if (emMaos !== null) {
      apontar("altura", "sugestao", m.alturaEmMaos(emMaos), String(emMaos));
    } else if (altura < ALTURA_POSSIVEL.min || altura > ALTURA_POSSIVEL.max) {
      apontar("altura", "erro", m.alturaImpossivel);
    } else if (altura < ALTURA_HABITUAL.min || altura > ALTURA_HABITUAL.max) {
      apontar("altura", "aviso", m.alturaInvulgar);
    }
  }

  // --- Peso -----------------------------------------------------------------
  const peso = numero(texto(formData, "peso"));
  if (peso !== null) {
    if (peso < PESO_POSSIVEL.min || peso > PESO_POSSIVEL.max)
      apontar("peso", "erro", m.pesoImpossivel);
    else if (peso < PESO_HABITUAL.min || peso > PESO_HABITUAL.max)
      apontar("peso", "aviso", m.pesoInvulgar);
  }

  // --- Preço ----------------------------------------------------------------
  const preco = numero(texto(formData, "preco"));
  if (preco !== null && preco > 0) {
    if (preco < PRECO_ZERO_A_MENOS)
      apontar("preco", "sugestao", m.precoZeroAMenos, String(Math.round(preco * 10)));
    else if (preco < PRECO_BAIXO) apontar("preco", "aviso", m.precoBaixo);
    else if (preco > PRECO_ALTO) apontar("preco", "aviso", m.precoAlto);
  }

  // --- Pontuação morfológica APSL ------------------------------------------
  const pontuacao = numero(texto(formData, "nivel_apsl"));
  if (pontuacao !== null) {
    if (pontuacao < PONTUACAO_ESCALA.min || pontuacao > PONTUACAO_ESCALA.max)
      apontar("nivel_apsl", "erro", m.pontuacaoForaDaEscala);
    else if (pontuacao < PONTUACAO_HABITUAL.min || pontuacao > PONTUACAO_HABITUAL.max)
      apontar("nivel_apsl", "aviso", m.pontuacaoInvulgar);
  }

  // --- Número de registo ----------------------------------------------------
  const registoEscrito = texto(formData, "numero_registo");
  if (registoEscrito.trim()) {
    const registo = lerRegistoApsl(registoEscrito, texto(formData, "nome"));
    if (registo.problema === "curto") apontar("numero_registo", "erro", m.registoCurto);
    else if (registo.problema === "repetido") apontar("numero_registo", "erro", m.registoRepetido);
    else if (registo.problema === "e-o-nome") apontar("numero_registo", "erro", m.registoEONome);
    else if (registo.problema === "sem-algarismos")
      apontar("numero_registo", "aviso", m.registoSemAlgarismos);
    // O duplicado vem de fora — é a única verificação de existência possível
    // hoje, e quem a faz é a camada que consegue falar com o servidor.
    if (contexto.registoDuplicado) apontar("numero_registo", "aviso", m.registoDuplicado);
  }

  // --- Vídeos ---------------------------------------------------------------
  for (const campo of ["videos_url", "videos_url_2"] as const) {
    const valor = texto(formData, campo).trim();
    if (valor && !identificarVideo(valor)) apontar(campo, "aviso", m.videoNaoReconhecido);
  }

  // --- Passaporte equino: UELN ----------------------------------------------
  // Nunca recusa. Um cavalo nascido antes de o UELN ser exigido tem um
  // passaporte com outro número, e recusá-lo seria impedir de publicar
  // precisamente os cavalos mais velhos. Ver `passaporte-ueln.ts`.
  const passaporteEscrito = texto(formData, "passaporte_equino");
  if (passaporteEscrito.trim()) {
    const passaporte = lerPassaporte(passaporteEscrito);
    if (passaporte.problema === "comprimento")
      apontar("passaporte_equino", "aviso", m.passaporteComprimento(passaporte.diferenca ?? 0));
    else if (passaporte.problema === "pais-nao-numerico")
      apontar("passaporte_equino", "aviso", m.passaportePaisNaoNumerico);
  }

  // --- As datas de saúde, contra o calendário e contra si próprias ----------
  // Três verificações, e nenhuma delas inventa nada: usa-se o que o próprio
  // formulário já sabe. Uma data no futuro é impossível; uma data anterior ao
  // nascimento do cavalo é impossível; e uma data que contradiz o «está em
  // dia» que se respondeu duas linhas acima é uma das duas respostas errada.
  const agora = contexto.hoje ?? new Date();
  const nascimento = lerData(texto(formData, "data_nascimento"));

  const datasDeSaude = [
    {
      campo: "data_ultima_vacinacao" as const,
      emDia: texto(formData, "vacinacao_atualizada") === "sim",
      limite: MESES_VACINACAO,
      frase: m.vacinacaoDesactualizada,
    },
    {
      campo: "data_ultima_desparasitacao" as const,
      emDia: texto(formData, "desparasitacao_atualizada") === "sim",
      limite: MESES_DESPARASITACAO,
      frase: m.desparasitacaoDesactualizada,
    },
    {
      // A ferragem não tem um «está em dia» ao lado: o que se compara é só
      // com o ciclo do casco, que corre quer o cavalo esteja ferrado quer
      // esteja descalço — o descalço é aparado na mesma.
      campo: "data_ultima_ferragem" as const,
      emDia: true,
      limite: MESES_FERRAGEM,
      frase: m.ferragemAntiga,
    },
  ];

  for (const { campo, emDia, limite, frase } of datasDeSaude) {
    const data = lerData(texto(formData, campo));
    if (!data) continue;
    if (data > agora) {
      apontar(campo, "aviso", m.dataNoFuturo);
      continue;
    }
    if (nascimento && data < nascimento) {
      apontar(campo, "aviso", m.dataAntesDeNascer);
      continue;
    }
    const meses = mesesEntre(data, agora);
    if (emDia && meses > limite) apontar(campo, "aviso", frase(meses));
  }

  // --- Anos de treino contra a idade ---------------------------------------
  // Um cavalo não pode ter treinado mais anos do que os que viveu. Fica em
  // aviso e não em erro pela mesma razão que a incoerência do nível de treino:
  // quem se enganou pode ter-se enganado **na data de nascimento**, e travar o
  // passo no campo errado manda a pessoa corrigir o que estava certo.
  const anosTreino = numero(texto(formData, "anos_treino"));
  const idadeParaTreino = idadeEmAnos(texto(formData, "data_nascimento"), contexto.hoje);
  if (anosTreino !== null && idadeParaTreino !== null && idadeParaTreino >= 0) {
    if (anosTreino > idadeParaTreino)
      apontar("anos_treino", "aviso", m.treinoMaisAnosDoQueIdade(anosTreino, idadeParaTreino));
  }

  // --- Idade contra nível de treino ----------------------------------------
  const idade = idadeEmAnos(texto(formData, "data_nascimento"), contexto.hoje);
  const nivel = indiceNivelTreino(texto(formData, "nivel_treino"));
  if (idade !== null && idade >= 0 && nivel >= 0) {
    if (idade < IDADE_DESBASTE && nivel > NIVEL_POTRO)
      apontar("nivel_treino", "aviso", m.treinoCedoDemais(idade));
    else if (idade < IDADE_ALTA_ESCOLA && nivel >= NIVEL_ALTA_ESCOLA)
      apontar("nivel_treino", "aviso", m.treinoAltaEscolaCedo(idade));
    else if (idade >= IDADE_POTRO_TARDIO && nivel === NIVEL_POTRO)
      apontar("nivel_treino", "aviso", m.treinoPotroTarde(idade));
  }

  saida.push(...apontamentosDeCoerencia(formData, m.coerencia, contexto.hoje));

  return saida;
}

/** Um vendedor que factura como empresa. As opções vêm de `data.ts`, nas três línguas. */
function ehVendedorColectivo(tipo: string): boolean {
  return [
    "Coudelaria",
    "Clube / Escola de Equitação",
    "Leiloeiro",
    "Marchante / Comerciante",
    "Stud farm",
    "Riding club / school",
    "Trader / Agent",
    "Criadero",
    "Club / Escuela de equitación",
    "Comerciante / Agente",
  ].includes(tipo);
}

// ---------------------------------------------------------------------------
// A coerência, vinda de `lib/documentos/coerencia`
// ---------------------------------------------------------------------------

/**
 * O que o vendedor escreveu **fecha**?
 *
 * O resto deste ficheiro olha para um campo de cada vez. Isto olha para o
 * conjunto: um pai nascido depois do filho, um cavalo que é seu próprio
 * antepassado, uma altura que implica um adulto de dois metros. É a
 * verificação de maior alcance que o site tem, porque um pedigree inventado
 * quase nunca fecha — e não depende de perguntar nada a ninguém.
 *
 * Duas coisas que esta função **não** faz, e são a razão de ela poder existir
 * dentro de um formulário:
 *
 * - **Não julga.** O `NIVEL_DA_NATUREZA` traduz `impossivel` para `erro` e
 *   `improvavel` para `aviso`, e essa tradução é a única no sistema. Um
 *   improvável — um cavalo de 32 anos, uma égua com dois filhos próximos — não
 *   trava nada: pergunta.
 * - **Não fala do que não é daqui.** Um achado que nasceu do cruzamento de
 *   dois anúncios não tem campo (`campoDoAchado` devolve `null`) e por isso
 *   nunca chega ao ecrã de quem está a preencher. Esse é assunto do painel de
 *   revisão, que vê os dois lados.
 *
 * O `id` é fixo porque só há um cavalo aqui — as regras de cruzamento precisam
 * de mais do que um e por isso não disparam, que é exactamente o que se quer.
 */
const ARVORE: ReadonlyArray<
  readonly [caminho: string, nome: keyof FormData, registo: keyof FormData]
> = [
  ["pai", "pai_nome", "pai_registo"],
  ["mae", "mae_nome", "mae_registo"],
  ["pai.pai", "avo_paterno_nome", "avo_paterno_registo"],
  ["pai.mae", "avo_paterno_mae_nome", "avo_paterno_mae_registo"],
  ["mae.pai", "avo_materno_nome", "avo_materno_registo"],
  ["mae.mae", "avo_materno_mae_nome", "avo_materno_mae_registo"],
];

const NESTE_FORMULARIO = "formulario";

function textoOuNulo(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function numeroOuNulo(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fraseDoAchado(a: Achado, m: MensagensCoerencia): string | null {
  switch (a.tipo) {
    case "nascimento_no_futuro":
      return m.nascimentoNoFuturo;
    case "nascimento_depois_do_historial":
      return m.nascimentoDepoisDoHistorial;
    case "longevidade_invulgar":
      return m.longevidadeInvulgar(Math.round(a.anos));
    case "altura_para_a_idade":
      return m.alturaParaAIdade(Math.round(a.alturaAdultaImplicita));
    case "progenitor_mais_novo":
      // O tipo é um só; quem separa «não pode ser» de «é fora do corrente» é a
      // natureza, e é ela que escolhe a frase. Os meses vêm negativos quando o
      // antepassado nasceu depois — mostra-se o valor absoluto, porque «−7
      // meses mais velho» não se lê.
      return a.natureza === "impossivel"
        ? m.progenitorNovoDemais(Math.abs(Math.round(a.mesesEntreOsNascimentos)))
        : m.progenitorPoucoHabitual(Math.round(a.mesesEntreOsNascimentos));
    case "antepassado_de_si_proprio":
      return m.antepassadoDeSiProprio;
    case "papel_contraditorio":
      return m.papelContraditorio;
    case "sexo_contra_papel":
      return m.sexoContraPapel;
    default:
      // Um tipo sem frase não fala. É melhor calar-se do que dizer o nome
      // interno do achado a quem está a vender um cavalo.
      return null;
  }
}

export function apontamentosDeCoerencia(
  formData: FormData,
  m: MensagensCoerencia,
  hoje?: Date
): Apontamento[] {
  const cavalo = {
    id: NESTE_FORMULARIO,
    data_nascimento: textoOuNulo(formData.data_nascimento),
    idade: null,
    sexo: textoOuNulo(formData.sexo),
    altura: numeroOuNulo(formData.altura),
    nome: textoOuNulo(formData.nome),
    nome_registo: textoOuNulo(formData.nome_registo),
    registro_apsl: textoOuNulo(formData.numero_registo),
    status: null,
  };

  const ascendentes = ARVORE.flatMap(([caminho, campoNome, campoRegisto]) => {
    const nome = textoOuNulo(formData[campoNome]);
    const registo = textoOuNulo(formData[campoRegisto]);
    // Um antepassado sem nome e sem registo não é uma caixa vazia a preencher:
    // é uma geração que o vendedor não sabe, e não há nada a verificar nela.
    if (!nome && !registo) return [];
    return [
      {
        cavalo_id: NESTE_FORMULARIO,
        caminho,
        geracao: caminho.includes(".") ? 2 : 1,
        nome,
        registo,
      },
    ];
  });

  const saida: Apontamento[] = [];
  for (const achado of reunirCoerencia({ cavalos: [cavalo], ascendentes, hoje })) {
    const campo = campoDoAchado(achado);
    if (!campo) continue;
    const mensagem = fraseDoAchado(achado, m);
    if (!mensagem) continue;
    saida.push({ campo, nivel: NIVEL_DA_NATUREZA[achado.natureza], mensagem });
  }
  return saida;
}

// ---------------------------------------------------------------------------
// De que passo é cada campo
// ---------------------------------------------------------------------------

/**
 * Um apontamento de nível `erro` tem de travar o passo onde o campo vive — se
 * só aparecesse ao sair do campo, bastava não sair dele. Este mapa é o que
 * permite a `validarPasso` juntar os erros da inspecção aos seus.
 */
export const PASSO_DE_CADA_CAMPO: Readonly<Record<string, number>> = {
  proprietario_telefone: 1,
  proprietario_whatsapp: 1,
  proprietario_nif: 1,
  proprietario_email: 1,
  microchip: 1,
  numero_registo: 1,
  altura: 1,
  peso: 1,
  // A data de nascimento e a árvore entraram com a coerência: sem estarem
  // aqui, um `erro` de coerência aparecia no campo e não travava o passo — e
  // bastava não sair do campo para o contornar.
  data_nascimento: 1,
  pai_nome: 2,
  mae_nome: 2,
  avo_paterno_nome: 2,
  avo_paterno_mae_nome: 2,
  avo_materno_nome: 2,
  avo_materno_mae_nome: 2,
  nivel_apsl: 1,
  nivel_treino: 2,
  preco: 3,
  videos_url: 3,
  videos_url_2: 3,
};

/** Os erros da inspecção que pertencem a este passo, no formato da validação. */
export function errosDeInspeccao(
  passo: number,
  apontamentos: Apontamento[]
): { campo: string; mensagem: string }[] {
  return apontamentos
    .filter((a) => a.nivel === "erro" && PASSO_DE_CADA_CAMPO[a.campo] === passo)
    .map((a) => ({ campo: a.campo, mensagem: a.mensagem }));
}

export type ApontamentosPorCampo = Record<string, Apontamento[]>;

/** Agrupa por campo, mantendo a ordem em que foram encontrados. */
export function porCampoApontamentos(apontamentos: Apontamento[]): ApontamentosPorCampo {
  const mapa: ApontamentosPorCampo = {};
  for (const a of apontamentos) (mapa[a.campo] ??= []).push(a);
  return mapa;
}
