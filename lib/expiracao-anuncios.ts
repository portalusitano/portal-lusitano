/**
 * Quando avisar o vendedor de que o anúncio está a acabar.
 *
 * O anúncio é pago e tem prazo. Sem aviso, o vendedor só descobre que o
 * anúncio saiu da montra quando estranha o silêncio — e nessa altura já
 * perdeu dias de visibilidade que pagou.
 */

/**
 * Limiares de aviso, em dias até ao fim, do mais folgado para o mais urgente.
 * O 0 é o aviso do próprio dia: "o anúncio termina hoje".
 */
export const LIMIARES_AVISO = [7, 1, 0] as const;

export type LimiarAviso = (typeof LIMIARES_AVISO)[number];

/**
 * Dias depois da expiração em que o último aviso ainda faz sentido.
 *
 * Sem esta janela, a primeira execução do cron mandaria um aviso por cada
 * anúncio que expirou algures no passado — dezenas de emails sobre anúncios
 * de que já ninguém se lembra.
 */
export const JANELA_POS_EXPIRACAO = 3;

/** O que já foi avisado sobre um anúncio. */
export interface EstadoAviso {
  /** Limiar do último aviso enviado, ou null se nunca houve nenhum. */
  limiar: number | null;
  /** Prazo (`listing_expires_at`) a que esse aviso dizia respeito. */
  prazo: string | null;
}

/** Dois prazos são o mesmo instante, escritos como estiverem escritos. */
export function mesmoPrazo(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return ta === tb;
}

/**
 * Qual o aviso a enviar agora, ou null quando não há nenhum a enviar.
 *
 * Avisa-se uma vez por limiar: quem recebeu o aviso dos 7 dias só volta a ser
 * incomodado no de 1 dia. Renovar o anúncio empurra o prazo para a frente e o
 * ciclo recomeça — é por isso que o que ficou guardado é o limiar *e* o prazo
 * a que ele dizia respeito; comparar só dias nunca distinguiria um anúncio
 * renovado de um anúncio já avisado.
 */
export function avisoDevido(
  diasRestantes: number | null,
  prazoActual: string | null,
  ultimo: EstadoAviso = { limiar: null, prazo: null }
): LimiarAviso | null {
  if (diasRestantes === null || !Number.isFinite(diasRestantes)) return null;
  if (diasRestantes < -JANELA_POS_EXPIRACAO) return null;

  const cruzados = LIMIARES_AVISO.filter((limiar) => diasRestantes <= limiar);
  if (cruzados.length === 0) return null;

  // O limiar mais urgente já cruzado é o menor deles.
  const alvo = Math.min(...cruzados) as LimiarAviso;

  // Um aviso de outro prazo é de um ciclo anterior e não conta.
  const jaAvisado = mesmoPrazo(ultimo.prazo, prazoActual) ? ultimo.limiar : null;
  if (jaAvisado === null || !Number.isFinite(jaAvisado)) return alvo;

  return alvo < jaAvisado ? alvo : null;
}

/** O que dizer ao vendedor, por limiar. */
export function descreverAviso(
  limiar: LimiarAviso,
  nome: string
): { assunto: string; titulo: string; corpo: string } {
  if (limiar === 0) {
    return {
      assunto: `O anúncio de ${nome} termina hoje`,
      titulo: "O seu anúncio termina hoje",
      corpo: `O período de publicação de "${nome}" acaba hoje. A partir de amanhã o anúncio deixa de aparecer nas pesquisas do Portal Lusitano.`,
    };
  }
  if (limiar === 1) {
    return {
      assunto: `Falta 1 dia para o anúncio de ${nome} terminar`,
      titulo: "Falta 1 dia",
      corpo: `O anúncio de "${nome}" tem mais um dia de publicação. Depois disso sai das pesquisas e deixa de receber contactos.`,
    };
  }
  return {
    assunto: `Faltam ${limiar} dias para o anúncio de ${nome} terminar`,
    titulo: `Faltam ${limiar} dias`,
    corpo: `O anúncio de "${nome}" está a chegar ao fim do período de publicação. Se o cavalo ainda não foi vendido, vale a pena renová-lo antes de sair das pesquisas.`,
  };
}
