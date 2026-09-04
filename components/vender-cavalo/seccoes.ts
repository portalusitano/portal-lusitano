import { CAMPOS, type Nome } from "@/components/vender-cavalo/campos";
import type { IndiceLingua } from "@/components/vender-cavalo/validacao";

/**
 * Os nomes que o formulário usa para se referir a si próprio.
 *
 * Existe porque o resumo do topo passou a dizer **onde** é que falta responder,
 * e «onde» num formulário de noventa e nove campos é a secção — não o campo.
 * Para o dizer, o resumo precisa do mesmo texto que o cabeçalho da secção
 * mostra, e a única maneira de garantir que são o mesmo texto é haver um só.
 *
 * Enquanto o título de cada secção era um `tr(...)` escrito dentro do passo,
 * o resumo teria de o copiar. Duas cópias do mesmo rótulo divergem à primeira
 * revisão de prosa, e a que fica errada é sempre a que a pessoa está a ler —
 * é a mesma razão pela qual a conta do cabeçalho e a conta do botão saem
 * ambas do `contarSeccao`.
 *
 * A chave é a mesma do `campos.ts` (`seccao`), por isso ir de um campo à
 * secção dele é uma consulta e não uma tabela paralela.
 */
export const TITULOS_SECCAO: Readonly<Record<string, Nome>> = {
  // Passo 1 — quem vende, e o que vai no cartão do anúncio
  contacto: ["Como o contactam", "How buyers reach you", "Cómo le contactan"],
  facturacao: [
    "Facturação e contacto adicional",
    "Billing and extra contact",
    "Facturación y contacto adicional",
  ],
  cavalo: ["O que vai no anúncio", "What goes on the listing", "Lo que va en el anuncio"],
  identificacao: [
    "Identificação oficial e morfologia",
    "Official identification and conformation",
    "Identificación oficial y morfología",
  ],

  // Passo 2 — linhagem, treino, comportamento, saúde
  pais: ["Pai e mãe", "Sire and dam", "Padre y madre"],
  avos: [
    "Avós, linhagem e coudelaria de origem",
    "Grandparents, lineage and stud of origin",
    "Abuelos, linaje y criadero de origen",
  ],
  treino: ["Treino e disciplinas", "Training and disciplines", "Doma y disciplinas"],
  uso: [
    "Uso, competições e quem o monta",
    "Use, competitions and who rides it",
    "Uso, competiciones y quién lo monta",
  ],
  comportamento: [
    "Comportamento e Maneabilidade",
    "Behaviour & Tractability",
    "Comportamiento y Manejabilidad",
  ],
  maneio: ["Maneio e Rotina", "Management & Routine", "Manejo y Rutina"],
  saude: ["Estado de saúde", "Health status", "Estado de salud"],
  historico: [
    "Datas, ferragem e histórico clínico",
    "Dates, shoeing and clinical history",
    "Fechas, herraje e historial clínico",
  ],

  // Passo 3 — preço, condições, apresentação
  preco: ["Preço e onde está", "Price and where it is", "Precio y dónde está"],
  condicoes: ["Condições de venda", "Terms of sale", "Condiciones de venta"],
  apresentacao: ["Descrição e vídeos", "Description and videos", "Descripción y vídeos"],

  // Passo 4 — não é uma secção do formulário, mas o resumo tem de a nomear
  pagamento: ["Publicação e pagamento", "Publishing and payment", "Publicación y pago"],
};

/**
 * O que o catálogo não sabe: os dois anexos e a caixa dos termos.
 *
 * Não são campos de `FormData` e por isso não estão no `campos.ts` — mas
 * travam um passo na mesma, aparecem no resumo na mesma, e o resumo tem de
 * saber como lhes chamar e onde é que eles vivem. A secção de cada um é a
 * mesma que o `ANEXOS` da validação usa para os pôr na ordem certa.
 */
const FORA_DO_CATALOGO: Readonly<Record<string, { nome: Nome; seccao: string }>> = {
  livro_azul: { nome: ["Livro Azul", "Blue Book", "Libro Azul"], seccao: "avos" },
  fotografias: { nome: ["Fotografias", "Photographs", "Fotografías"], seccao: "condicoes" },
  termos_aceites: {
    nome: ["Termos e condições", "Terms and conditions", "Términos y condiciones"],
    seccao: "pagamento",
  },
};

/** Consulta por `id` do DOM, montada uma vez. O resumo faz-lhe 27 perguntas. */
const POR_ID = new Map(CAMPOS.map((c) => [c.id, c]));

/** O título da secção, na língua pedida. Devolve a chave se não a conhecer —
 *  uma chave à vista é melhor do que uma secção sem nome. */
export function tituloDaSeccao(chave: string, lingua: IndiceLingua): string {
  return TITULOS_SECCAO[chave]?.[lingua] ?? chave;
}

/**
 * O nome do campo, e mais nada.
 *
 * É o que o resumo escreve em cada linha, em vez de «Falta preencher: NIF.».
 * A frase inteira dizia o nome do campo duas vezes — uma no verbo que já está
 * no cabeçalho do resumo, outra no rótulo que está ao lado do campo — e
 * vinte e sete frases iguais menos uma palavra leem-se como uma parede, não
 * como uma lista de sítios onde ir.
 */
export function nomeDoCampo(id: string, lingua: IndiceLingua): string | null {
  return POR_ID.get(id)?.nome[lingua] ?? FORA_DO_CATALOGO[id]?.nome[lingua] ?? null;
}

/** A secção onde este campo é desenhado. */
export function seccaoDoCampo(id: string): string | null {
  return POR_ID.get(id)?.seccao ?? FORA_DO_CATALOGO[id]?.seccao ?? null;
}

/** O índice da língua a partir do código que o contexto guarda. */
export function indiceDaLingua(language: string): IndiceLingua {
  return language === "pt" ? 0 : language === "es" ? 2 : 1;
}
