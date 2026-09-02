import type { FormData, Documentos } from "@/components/vender-cavalo/types";
import { MIN_IMAGES, MIN_DESCRIPTION_LENGTH } from "@/components/vender-cavalo/data";

/**
 * Validação do formulário de publicar anúncio.
 *
 * Vive fora do componente por duas razões. A primeira é poder ser exercitada
 * sem browser — são vinte regras e cada uma decide se alguém publica ou não.
 * A segunda é a que dá nome ao tipo: **cada erro sabe de que campo é**. Antes
 * a validação devolvia uma lista de frases soltas, e uma frase solta no topo
 * de um passo com quarenta e sete campos não diz onde está o problema; com o
 * `campo` a mensagem sabe onde mora, e quem a lê pode ir lá ter.
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

/** As frases, já traduzidas. A validação não sabe de línguas. */
export interface MensagensValidacao {
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

export function validarPasso(
  passo: number,
  estado: EstadoFormulario,
  m: MensagensValidacao
): ErroCampo[] {
  const { formData, documentos, imagens, termosAceites } = estado;
  const erros: ErroCampo[] = [];
  const falta = (campo: string, mensagem: string) => erros.push({ campo, mensagem });

  if (passo === 1) {
    // Contacto: sem isto ninguém chega ao vendedor, e o anúncio não serve.
    if (!formData.proprietario_nome.trim()) falta("proprietario_nome", m.nomeProprietario);
    if (!formData.proprietario_email.trim()) falta("proprietario_email", m.email);
    else if (!EMAIL.test(formData.proprietario_email.trim()))
      falta("proprietario_email", m.emailInvalido);
    if (!formData.proprietario_telefone.trim()) falta("proprietario_telefone", m.telefone);

    // Identificação: o que vai no anúncio e o que o identifica no livro.
    if (!formData.nome.trim()) falta("nome", m.nomeCavalo);
    if (!formData.numero_registo.trim()) falta("numero_registo", m.numeroRegisto);
    if (!formData.data_nascimento) falta("data_nascimento", m.dataNascimento);
    else {
      const nascimento = new Date(formData.data_nascimento);
      const hoje = new Date();
      const limite = new Date();
      limite.setFullYear(limite.getFullYear() - IDADE_MAXIMA_ANOS);
      if (nascimento > hoje || nascimento < limite)
        falta("data_nascimento", m.dataNascimentoFutura);
    }
    if (!formData.sexo) falta("sexo", m.sexo);
    // A pelagem é o que o cartão do anúncio mostra a seguir ao preço. Estava
    // com asterisco e sem regra nenhuma: o asterisco mentia.
    if (!formData.pelagem) falta("pelagem", m.pelagem);
  }

  if (passo === 2) {
    // Do pai e da mãe pede-se o nome, que é o que aparece no anúncio. Os
    // números de registo deles estão no Livro Azul, que já vem anexado — não
    // se pede a alguém que copie à mão o que acabou de enviar em PDF.
    if (!formData.pai_nome.trim()) falta("pai_nome", m.pai);
    if (!formData.mae_nome.trim()) falta("mae_nome", m.mae);
    if (!documentos.livroAzul) falta("livro_azul", m.livroAzul);
    if (!formData.nivel_treino) falta("nivel_treino", m.nivelTreino);
    if (!formData.estado_saude) falta("estado_saude", m.estadoSaude);
  }

  if (passo === 3) {
    if (!formData.preco.trim()) falta("preco", m.preco);
    else if (!(Number(formData.preco) > 0)) falta("preco", m.precoInvalido);
    if (!formData.regiao) falta("regiao", m.regiao);
    if (!formData.localizacao.trim()) falta("localizacao", m.localizacao);
    if (formData.descricao.trim().length < MIN_DESCRIPTION_LENGTH) falta("descricao", m.descricao);
    if (imagens.length < MIN_IMAGES) falta("fotografias", m.fotografias);
  }

  if (passo === 4) {
    if (!termosAceites) falta("termos_aceites", m.termos);
  }

  return erros;
}

/**
 * Quantos campos é que um passo ainda exige. Serve o rótulo do botão e o
 * indicador de progresso: dizer «faltam 2» é uma informação, «corrija os
 * erros» é uma repreensão.
 */
export function quantosFaltam(
  passo: number,
  estado: EstadoFormulario,
  m: MensagensValidacao
): number {
  return validarPasso(passo, estado, m).length;
}
