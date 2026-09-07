/**
 * O que custa publicar um anúncio.
 *
 * ## Um preço
 *
 * Eram quatro planos — 29 €, 49 €, 79 €, 149 € — numa grelha com um distintivo
 * «Popular» a apontar para o segundo. Passa a ser **um: 79 €**, e a decisão é
 * do dono do site.
 *
 * O que isso muda não é só a conta. Quatro planos punham, entre quem quer
 * vender um cavalo e o formulário, uma escolha que ninguém sabe fazer à
 * chegada: quantos dias vou precisar? quantas fotografias tenho? vale a pena o
 * destaque? São perguntas cuja resposta só se sabe depois — e o preço da
 * dúvida paga-se todo ali, no primeiro ecrã. Com um preço não há ecrã de
 * escolha nenhum: há uma frase, e a seguir o formulário.
 *
 * ## O que o preço leva, e porquê
 *
 * **Sessenta dias e fotografias sem tecto** — mais do que o antigo plano de
 * 79 €, que dava trinta dias e quinze fotografias. Sendo o único, tem de ser o
 * bom: um plano único que fosse o mais apertado dos quatro era uma subida de
 * preço disfarçada de simplificação.
 *
 * **Sem destaque e sem distintivo**, e isto é o oposto de uma poupança. O
 * antigo plano de 79 € vendia catorze dias de destaque; se todos os anúncios o
 * levarem, a secção de destaques passa a ser «os anúncios recentes» e o
 * distintivo deixa de distinguir seja o que for. O sistema visual do site já o
 * diz por escrito a respeito do dourado: o `.selo-destaque` é para o que é
 * raro. Um selo que toda a gente tem não é um selo, é uma moldura.
 *
 * A coluna `destaque` da base fica livre, e isso é o ganho: passa a poder
 * assinalar o que o portal escolher pôr à frente, que vale mais do que o que
 * alguém pagou para lá estar.
 *
 * ## Porque é que a forma continua a ser um registo de planos
 *
 * Porque o `listing_tier` está gravado em cada linha de `cavalos_venda` e nos
 * metadados do Stripe, e porque um dia pode haver outro plano. O que mudou foi
 * quantos há, não que haja o conceito — e um `if` espalhado por cinco ficheiros
 * a dizer «o preço é 7900» era pior do que este objecto.
 *
 * Um `listing_tier` que já não existe — de um anúncio comprado ao abrigo dos
 * quatro planos — devolve `undefined` daqui, e quem chama já sabia tratar
 * disso: o `normalizeListing` mostra o identificador em bruto e o
 * `computeExpiry` devolve `null`. **Não se inventa um plano para o cobrir**,
 * que seria dizer que um anúncio antigo tem condições que ninguém lhe vendeu.
 * Nenhum caminho de compra aceita um plano que não esteja aqui: o
 * `/api/vender-cavalo/checkout` valida contra este registo antes de falar com
 * o Stripe.
 */

/** A definição de um plano. */
export interface ListingTier {
  /** O identificador gravado na base e nos metadados do Stripe. */
  id: string;
  /** O nome que se mostra. */
  name: string;
  /** O preço em cêntimos — nunca em vírgula flutuante. */
  priceInCents: number;
  /** Quantos dias o anúncio fica visível. */
  durationDays: number;
  /** Tecto de fotografias. `-1` é sem tecto. */
  maxPhotos: number;
  /** Dias na secção de destaques. Zero: ver o cabeçalho. */
  featuredDays: number;
  /** O distintivo no cartão, ou `null`. Ver o cabeçalho. */
  badge: string | null;
}

/** O identificador do plano único. É o que fica gravado em `listing_tier`. */
export const PLANO_UNICO = "anuncio";

export const LISTING_TIERS: Record<string, ListingTier> = {
  [PLANO_UNICO]: {
    id: PLANO_UNICO,
    name: "Anúncio",
    priceInCents: 7900,
    durationDays: 60,
    maxPhotos: -1,
    featuredDays: 0,
    badge: null,
  },
} as const;

/** O plano, para quem só precisa dele e não de o procurar por identificador. */
export const PLANO = LISTING_TIERS[PLANO_UNICO];

/**
 * O plano com este identificador, ou `undefined`.
 *
 * O `undefined` é o ponto: um identificador antigo não se converte em silêncio
 * no plano de hoje. Ver o cabeçalho.
 */
export function getListingTier(tierId: string): ListingTier | undefined {
  return LISTING_TIERS[tierId];
}
