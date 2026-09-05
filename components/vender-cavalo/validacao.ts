import type { FormData, Documentos } from "@/components/vender-cavalo/types";
import { MIN_IMAGES, MIN_DESCRIPTION_LENGTH } from "@/components/vender-cavalo/data";
import {
  CAMPOS,
  eExigido,
  estaPreenchido,
  type CampoDoFormulario,
} from "@/components/vender-cavalo/campos";

/**
 * Validação do formulário de publicar anúncio.
 *
 * Vive fora do componente por duas razões. A primeira é poder ser exercitada
 * sem browser — são noventa e oito campos e dois anexos, e cada um decide se
 * alguém publica ou não. A segunda é a que dá nome ao tipo: **cada erro sabe
 * de que campo é**. Antes a validação devolvia uma lista de frases soltas, e
 * uma frase solta no topo de um passo com cinquenta campos não diz onde está o
 * problema; com o `campo` a mensagem sabe onde mora, e quem a lê pode ir lá
 * ter.
 *
 * **O que mudou.** Era uma lista de vinte `if` escritos à mão. Passou a ler o
 * `campos.ts`, que é o catálogo dos noventa e oito campos exigidos, e a
 * acrescentar-lhe as regras que não são «está preenchido?»: o formato do
 * email, a data de nascimento possível, o preço acima de zero, os cem
 * caracteres da descrição, os dois anexos e os termos.
 *
 * A separação que importa e que **não** se dissolveu: obrigatório é sobre
 * **estar preenchido**; a `inspeccao.ts` é sobre **estar certo**. Um campo
 * obrigatório continua a poder ter um aviso — 193cm de altura passa nesta
 * validação e leva um aviso de lá. As duas camadas encontram-se na página, não
 * aqui.
 */
export interface ErroCampo {
  /** `id` do elemento no DOM — é o que permite ir do erro ao campo. */
  campo: string;
  mensagem: string;
}

export interface EstadoFormulario {
  formData: FormData;
  documentos: Documentos;
  imagens: File[];
  termosAceites: boolean;
}

/**
 * As frases, já traduzidas. A validação não sabe de línguas.
 *
 * As quatro primeiras são **formas**, não frases: recebem o nome do campo e
 * montam a frase com o verbo do tipo dele. Escrever noventa e oito frases à
 * mão em três línguas era garantir que ninguém as revia; o que a pessoa
 * precisa de ler é o nome do campo, que é o mesmo que está no rótulo ao lado.
 *
 * As restantes são as que já existiam: prosa própria, escrita e revista, para
 * os campos onde a frase genérica seria pior do que a que lá está.
 */
export interface MensagensValidacao {
  porPreencher: (nome: string) => string;
  porEscolher: (nome: string) => string;
  porResponder: (nome: string) => string;
  porEscolherLista: (nome: string) => string;

  nomeProprietario: string;
  email: string;
  emailInvalido: string;
  telefone: string;
  nomeCavalo: string;
  numeroRegisto: string;
  dataNascimento: string;
  dataNascimentoFutura: string;
  sexo: string;
  pelagem: string;
  pai: string;
  mae: string;
  livroAzul: string;
  nivelTreino: string;
  estadoSaude: string;
  preco: string;
  precoInvalido: string;
  regiao: string;
  localizacao: string;
  descricao: string;
  fotografias: string;
  termos: string;
}

/** Um endereço com uma arroba e um ponto depois dela. Não se valida mais do
 *  que isto: a única prova de que um email existe é lá chegar um email, e
 *  recusar endereços válidos porque a expressão regular é esperta custa
 *  anúncios. O que esta apanha é a gralha — a arroba que faltou. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Um cavalo com mais de quarenta anos é uma gralha no ano, não um cavalo. */
const IDADE_MAXIMA_ANOS = 40;

/** O índice da língua do `createTranslator`: 0 pt, 1 en, 2 es. */
export type IndiceLingua = 0 | 1 | 2;

/**
 * Os anexos e as caixas que não são campos de `FormData` e por isso não estão
 * no catálogo, mas que travam um passo na mesma.
 *
 * `depoisDaSeccao` é o que os põe no sítio certo do resumo de erros. Um resumo
 * cuja ordem não é a da página manda quem o lê saltar para cima e para baixo à
 * procura — e com um formulário desta altura, isso custa.
 */
const ANEXOS: readonly {
  campo: string;
  passo: number;
  depoisDaSeccao: string;
  mensagem: keyof MensagensValidacao;
}[] = [
  { campo: "livro_azul", passo: 2, depoisDaSeccao: "avos", mensagem: "livroAzul" },
  { campo: "fotografias", passo: 3, depoisDaSeccao: "condicoes", mensagem: "fotografias" },
];

/** A frase genérica que corresponde ao tipo do campo. */
function frasePorTipo(campo: CampoDoFormulario, m: MensagensValidacao, lingua: IndiceLingua) {
  const nome = campo.nome[lingua];
  switch (campo.tipo) {
    case "escolha":
      return m.porEscolher(nome);
    case "resposta":
      return m.porResponder(nome);
    case "lista":
      return m.porEscolherLista(nome);
    default:
      return m.porPreencher(nome);
  }
}

/**
 * A regra própria de um campo, quando ele tem uma além de «está preenchido?».
 *
 * Devolve `null` quando o campo passa. Só é chamada com o campo já preenchido:
 * o vazio é decidido antes, e por todos da mesma maneira.
 */
function regraPropria(
  campo: CampoDoFormulario,
  estado: EstadoFormulario,
  m: MensagensValidacao
): string | null {
  const { formData } = estado;

  if (campo.chave === "proprietario_email") {
    return EMAIL.test(formData.proprietario_email.trim()) ? null : m.emailInvalido;
  }

  if (campo.chave === "data_nascimento") {
    const nascimento = new Date(formData.data_nascimento);
    const hoje = new Date();
    const limite = new Date();
    limite.setFullYear(limite.getFullYear() - IDADE_MAXIMA_ANOS);
    return nascimento > hoje || nascimento < limite ? m.dataNascimentoFutura : null;
  }

  if (campo.chave === "preco") {
    return Number(formData.preco) > 0 ? null : m.precoInvalido;
  }

  if (campo.chave === "descricao") {
    return formData.descricao.trim().length < MIN_DESCRIPTION_LENGTH ? m.descricao : null;
  }

  return null;
}

export function validarPasso(
  passo: number,
  estado: EstadoFormulario,
  m: MensagensValidacao,
  lingua: IndiceLingua = 0
): ErroCampo[] {
  const { formData, documentos, imagens, termosAceites } = estado;
  const erros: ErroCampo[] = [];

  // O passo 4 não tem campos: tem uma caixa de aceitação e mais nada.
  if (passo === 4) {
    if (!termosAceites) erros.push({ campo: "termos_aceites", mensagem: m.termos });
    return erros;
  }

  const anexosDoPasso = ANEXOS.filter((a) => a.passo === passo);
  const emFalta = (campo: string) =>
    campo === "livro_azul" ? !documentos.livroAzul : imagens.length < MIN_IMAGES;

  let seccaoAnterior: string | null = null;
  const fecharSeccao = (seccao: string | null) => {
    if (seccao === null) return;
    for (const anexo of anexosDoPasso) {
      if (anexo.depoisDaSeccao === seccao && emFalta(anexo.campo)) {
        erros.push({ campo: anexo.campo, mensagem: m[anexo.mensagem] as string });
      }
    }
  };

  for (const campo of CAMPOS) {
    if (campo.passo !== passo) continue;
    if (campo.seccao !== seccaoAnterior) {
      fecharSeccao(seccaoAnterior);
      seccaoAnterior = campo.seccao;
    }
    if (!eExigido(campo, formData)) continue;

    if (!estaPreenchido(campo, formData)) {
      const propria = campo.mensagemPropria
        ? (m[campo.mensagemPropria as keyof MensagensValidacao] as string)
        : null;
      erros.push({
        campo: campo.id,
        mensagem: typeof propria === "string" && propria ? propria : frasePorTipo(campo, m, lingua),
      });
      continue;
    }

    const queixa = regraPropria(campo, estado, m);
    if (queixa) erros.push({ campo: campo.id, mensagem: queixa });
  }
  fecharSeccao(seccaoAnterior);

  return erros;
}

/**
 * Quantos campos é que um passo ainda exige. Serve o rótulo do botão e o
 * indicador de progresso: dizer «faltam 7 campos» é uma informação, «corrija
 * os erros» é uma repreensão — e com noventa e oito campos obrigatórios, a
 * diferença entre as duas é a diferença entre um anúncio que sai e um que não.
 */
export function quantosFaltam(
  passo: number,
  estado: EstadoFormulario,
  m: MensagensValidacao
): number {
  return validarPasso(passo, estado, m).length;
}

/** Quantos faltam em cada um dos quatro passos, pela ordem deles. */
export function faltamPorPasso(estado: EstadoFormulario, m: MensagensValidacao): number[] {
  return [1, 2, 3, 4].map((p) => quantosFaltam(p, estado, m));
}

/**
 * Quantas respostas é que cada passo pede, no estado actual do formulário.
 *
 * Não é uma constante, e é isso que interessa: dizer a um garanhão que o passo
 * 3 tem dezanove perguntas quando lhe vai fazer vinte e uma é mentir-lhe sobre
 * o caminho que falta. A conta segue as mesmas condições que a validação.
 */
export function totalPorPasso(estado: EstadoFormulario): number[] {
  const { formData } = estado;
  return [1, 2, 3, 4].map((passo) => {
    if (passo === 4) return 1;
    const campos = CAMPOS.filter((c) => c.passo === passo && eExigido(c, formData)).length;
    return campos + ANEXOS.filter((a) => a.passo === passo).length;
  });
}

/** Quantas já foram respondidas em cada passo. É o `total` menos o que falta. */
export function feitosPorPasso(estado: EstadoFormulario, m: MensagensValidacao): number[] {
  const total = totalPorPasso(estado);
  const faltam = faltamPorPasso(estado, m);
  return total.map((t, i) => Math.max(0, t - faltam[i]));
}
