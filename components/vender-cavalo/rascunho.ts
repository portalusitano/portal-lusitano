import type { FormData } from "@/components/vender-cavalo/types";

/**
 * O rascunho do anúncio, guardado no browser de quem o escreve.
 *
 * Um formulário de quatro passos que se perde é um anúncio que não se publica,
 * e o que o perde não é só fechar o separador: é o telemóvel a descarregar, é
 * ir ver o número de registo a outro lado, é o Stripe a recusar o cartão.
 *
 * Três coisas que o guardar anterior não fazia e que custam:
 *
 * 1. **As fotografias e os documentos não cabem aqui.** São `File`, e um
 *    `File` não sobrevive a um `JSON.stringify` — o que voltava era um `{}`.
 *    Quem restaurava ficava no passo 3 com o texto todo e sem uma única
 *    fotografia, e só descobria ao carregar em Continuar. Não se resolve
 *    guardando as fotos (são megabytes e o `localStorage` tem cinco); resolve-se
 *    dizendo-o, e é para isso que existe o `perdeuFicheiros`.
 * 2. **Um rascunho não envelhece bem.** Um anúncio começado há três meses é
 *    sobre um cavalo que talvez já esteja vendido, e restaurá-lo em silêncio
 *    é pior do que começar limpo.
 * 3. **A versão.** Quando a forma do formulário muda, um rascunho antigo
 *    entra em campos que já não existem. Sem versão não há como o saber.
 */
export const CHAVE_RASCUNHO = "vender-cavalo-draft";

export const VERSAO_RASCUNHO = 2;

/** Trinta dias. Passado isso o cavalo pode já estar vendido. */
export const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

export interface Rascunho {
  versao: number;
  guardadoEm: number;
  formData: FormData;
  passo: number;
  plano: string;
  /** Quantas fotografias existiam quando se guardou — não os ficheiros, a conta. */
  fotografias: number;
  /** Quantos documentos existiam quando se guardou. */
  documentos: number;
}

export interface RascunhoLido {
  rascunho: Rascunho | null;
  /** Havia um rascunho, mas passou da validade e foi deitado fora. */
  expirado: boolean;
  /** O rascunho trazia texto mas os ficheiros ficaram para trás. */
  perdeuFicheiros: boolean;
}

const semArmazenamento = (): boolean => typeof window === "undefined" || !window.localStorage;

export function guardarRascunho(dados: {
  formData: FormData;
  passo: number;
  plano: string;
  fotografias: number;
  documentos: number;
}): void {
  if (semArmazenamento()) return;
  const rascunho: Rascunho = {
    versao: VERSAO_RASCUNHO,
    guardadoEm: Date.now(),
    ...dados,
  };
  try {
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(rascunho));
  } catch {
    // Quota cheia ou armazenamento negado. Não há nada a fazer e não vale a
    // pena interromper quem está a escrever para o dizer.
  }
}

export function lerRascunho(agora: number = Date.now()): RascunhoLido {
  const vazio: RascunhoLido = { rascunho: null, expirado: false, perdeuFicheiros: false };
  if (semArmazenamento()) return vazio;

  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE_RASCUNHO);
  } catch {
    return vazio;
  }
  if (!bruto) return vazio;

  let lido: unknown;
  try {
    lido = JSON.parse(bruto);
  } catch {
    limparRascunho();
    return vazio;
  }
  if (!lido || typeof lido !== "object") {
    limparRascunho();
    return vazio;
  }

  const d = lido as Partial<Rascunho> & { step?: number; selectedTier?: string };
  if (!d.formData || typeof d.formData !== "object") {
    limparRascunho();
    return vazio;
  }

  // Um rascunho da versão anterior não tinha data. Trata-se como acabado de
  // guardar em vez de o deitar fora: quem o escreveu não tem culpa da versão.
  const guardadoEm = typeof d.guardadoEm === "number" ? d.guardadoEm : agora;
  if (agora - guardadoEm > VALIDADE_MS) {
    limparRascunho();
    return { ...vazio, expirado: true };
  }

  const rascunho: Rascunho = {
    versao: typeof d.versao === "number" ? d.versao : 1,
    guardadoEm,
    formData: d.formData as FormData,
    // `step`/`selectedTier` são os nomes da versão 1.
    passo: d.passo ?? d.step ?? 1,
    plano: d.plano ?? d.selectedTier ?? "standard",
    fotografias: d.fotografias ?? 0,
    documentos: d.documentos ?? 0,
  };

  return {
    rascunho,
    expirado: false,
    perdeuFicheiros: rascunho.fotografias > 0 || rascunho.documentos > 0,
  };
}

export function limparRascunho(): void {
  if (semArmazenamento()) return;
  try {
    localStorage.removeItem(CHAVE_RASCUNHO);
  } catch {
    // idem
  }
}

/**
 * A que passo se pode voltar sem mentir.
 *
 * O passo 2 exige o Livro Azul e o passo 3 exige três fotografias, e nenhum
 * dos dois sobrevive ao rascunho. Devolver alguém ao passo 3 com o texto todo
 * e sem fotografias é pô-lo a carregar num botão que não vai andar, sem lhe
 * dizer porquê — foi o que aconteceu na medição. Volta-se ao passo onde
 * ficaram os ficheiros que faltam, que é onde há alguma coisa a fazer.
 */
export function passoSeguro(rascunho: Rascunho): number {
  if (rascunho.documentos > 0) return Math.min(rascunho.passo, 2);
  if (rascunho.fotografias > 0) return Math.min(rascunho.passo, 3);
  return rascunho.passo;
}
