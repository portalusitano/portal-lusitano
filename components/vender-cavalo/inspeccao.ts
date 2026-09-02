import type { FormData } from "@/components/vender-cavalo/types";
import { niveisTreino } from "@/components/vender-cavalo/data";
import { lerMicrochip } from "@/lib/microchip-iso";
import { lerNif, lerTelefonePT, pareceTelefoneInternacional } from "@/lib/identificacao-pt";
import { sugerirDominioEmail } from "@/lib/dominios-email";
import { identificarVideo } from "@/lib/video-partilhado";
import { lerRegistoApsl } from "@/components/vender-cavalo/registo-apsl";

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
export interface MensagensInspeccao {
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
  if (formData.microchip.trim()) {
    const chip = lerMicrochip(formData.microchip);
    if (chip.problema === "nao-numerico") apontar("microchip", "erro", m.microchipNaoNumerico);
    else if (chip.problema === "comprimento")
      apontar("microchip", "erro", m.microchipComprimento(chip.diferencaDigitos ?? 0));
    else if (chip.problema === "repetido") apontar("microchip", "erro", m.microchipRepetido);
    else if (chip.problema === "prefixo-impossivel")
      apontar("microchip", "erro", m.microchipPrefixo);
  }

  // --- NIF: nove algarismos com dígito de controlo módulo 11 ---------------
  if (formData.proprietario_nif.trim()) {
    const nif = lerNif(formData.proprietario_nif);
    if (nif.problema === "nao-numerico" || nif.problema === "comprimento")
      apontar("proprietario_nif", "erro", m.nifComprimento);
    else if (nif.problema === "prefixo" || nif.problema === "controlo")
      apontar("proprietario_nif", "erro", m.nifControlo);
    else if (nif.valido) {
      // O primeiro algarismo diz o tipo de contribuinte, e isso casa — ou não
      // casa — com o «Tipo de Vendedor». Quem escolheu «Particular» e escreveu
      // o NIF da empresa vai receber uma factura em nome errado.
      const eEmpresa = ehVendedorColectivo(formData.tipo_proprietario);
      if (eEmpresa && nif.tipo === "singular")
        apontar("proprietario_nif", "aviso", m.nifSingularEmpresa);
      if (formData.tipo_proprietario && !eEmpresa && nif.tipo === "colectiva")
        apontar("proprietario_nif", "aviso", m.nifColectivoParticular);
    }
  }

  // --- Telefone -------------------------------------------------------------
  // A regra portuguesa só se aplica a quem vive em Portugal. Para os outros
  // vale o mínimo que vale em todo o lado, e mais nada: a numeração de cada
  // país é a dele, e recusar um número francês por não ser português custa
  // um anúncio e não impede nenhum engano.
  const emPortugal = formData.pais_proprietario === "" || formData.pais_proprietario === "Portugal";
  for (const campo of ["proprietario_telefone", "proprietario_whatsapp"] as const) {
    const valor = formData[campo].trim();
    if (!valor) continue;
    if (emPortugal) {
      if (!lerTelefonePT(valor).valido) apontar(campo, "erro", m.telefoneInvalido);
    } else if (!pareceTelefoneInternacional(valor)) {
      apontar(campo, "erro", m.telefoneInternacional);
    }
  }

  // --- Email: sugestão, nunca recusa ---------------------------------------
  const sugestao = sugerirDominioEmail(formData.proprietario_email);
  if (sugestao) {
    apontar(
      "proprietario_email",
      "sugestao",
      m.emailDominio(sugestao.sugerido),
      sugestao.emailCorrigido
    );
  }

  // --- Altura ---------------------------------------------------------------
  const altura = numero(formData.altura);
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
  const peso = numero(formData.peso);
  if (peso !== null) {
    if (peso < PESO_POSSIVEL.min || peso > PESO_POSSIVEL.max)
      apontar("peso", "erro", m.pesoImpossivel);
    else if (peso < PESO_HABITUAL.min || peso > PESO_HABITUAL.max)
      apontar("peso", "aviso", m.pesoInvulgar);
  }

  // --- Preço ----------------------------------------------------------------
  const preco = numero(formData.preco);
  if (preco !== null && preco > 0) {
    if (preco < PRECO_ZERO_A_MENOS)
      apontar("preco", "sugestao", m.precoZeroAMenos, String(Math.round(preco * 10)));
    else if (preco < PRECO_BAIXO) apontar("preco", "aviso", m.precoBaixo);
    else if (preco > PRECO_ALTO) apontar("preco", "aviso", m.precoAlto);
  }

  // --- Pontuação morfológica APSL ------------------------------------------
  const pontuacao = numero(formData.nivel_apsl);
  if (pontuacao !== null) {
    if (pontuacao < PONTUACAO_ESCALA.min || pontuacao > PONTUACAO_ESCALA.max)
      apontar("nivel_apsl", "erro", m.pontuacaoForaDaEscala);
    else if (pontuacao < PONTUACAO_HABITUAL.min || pontuacao > PONTUACAO_HABITUAL.max)
      apontar("nivel_apsl", "aviso", m.pontuacaoInvulgar);
  }

  // --- Número de registo ----------------------------------------------------
  if (formData.numero_registo.trim()) {
    const registo = lerRegistoApsl(formData.numero_registo, formData.nome);
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
    const valor = formData[campo].trim();
    if (valor && !identificarVideo(valor)) apontar(campo, "aviso", m.videoNaoReconhecido);
  }

  // --- Idade contra nível de treino ----------------------------------------
  const idade = idadeEmAnos(formData.data_nascimento, contexto.hoje);
  const nivel = indiceNivelTreino(formData.nivel_treino);
  if (idade !== null && idade >= 0 && nivel >= 0) {
    if (idade < IDADE_DESBASTE && nivel > NIVEL_POTRO)
      apontar("nivel_treino", "aviso", m.treinoCedoDemais(idade));
    else if (idade < IDADE_ALTA_ESCOLA && nivel >= NIVEL_ALTA_ESCOLA)
      apontar("nivel_treino", "aviso", m.treinoAltaEscolaCedo(idade));
    else if (idade >= IDADE_POTRO_TARDIO && nivel === NIVEL_POTRO)
      apontar("nivel_treino", "aviso", m.treinoPotroTarde(idade));
  }

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
