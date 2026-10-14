/**
 * Fotografias de um anúncio: leitura, ordem e validação.
 *
 * As fotografias vivem em duas colunas — `fotos` (a lista) e `foto_principal`
 * (a que aparece nos cartões e nas partilhas) — escritas pelo webhook do
 * Stripe e, em linhas mais antigas, por scripts de seed com outros nomes.
 * Tudo o que lê fotografias passa por aqui para não ter de saber isso.
 */

/** Fotografias por anúncio. O mesmo limite do upload. */
export const MAX_FOTOS = 10;

/** `foto_principal` é VARCHAR(500) na base de dados. */
const MAX_COMPRIMENTO_URL = 500;

type Linha = Record<string, unknown>;

function texto(linha: Linha, ...chaves: string[]): string | null {
  for (const chave of chaves) {
    const valor = linha[chave];
    if (typeof valor === "string" && valor.trim() !== "") return valor.trim();
  }
  return null;
}

/**
 * As fotografias do anúncio, sem repetições e com a principal à cabeça.
 *
 * A principal pode não estar na lista (linhas antigas) ou estar a meio dela;
 * em qualquer dos casos passa a ser a primeira, que é o que a interface
 * assume em todo o lado.
 */
export function fotosDaLinha(linha: Linha): string[] {
  const ordenadas: string[] = [];
  const vistas = new Set<string>();

  const adicionar = (valor: unknown) => {
    if (typeof valor !== "string") return;
    const limpo = valor.trim();
    if (!limpo || vistas.has(limpo)) return;
    vistas.add(limpo);
    ordenadas.push(limpo);
  };

  adicionar(texto(linha, "foto_principal", "image_url"));

  for (const chave of ["fotos", "image_urls"]) {
    const valor = linha[chave];
    const lista = Array.isArray(valor) ? valor : typeof valor === "string" ? valor.split(",") : [];
    lista.forEach(adicionar);
  }

  return ordenadas;
}

/**
 * Se o URL aponta para o armazenamento do próprio projecto.
 *
 * É o que separa uma fotografia carregada pelo vendedor de um endereço
 * qualquer: sem esta verificação, o vendedor podia apontar o anúncio para
 * uma imagem alojada por si e trocá-la depois por outra coisa a qualquer
 * momento, já com a moderação feita.
 */
export function urlDeArmazenamento(url: string, supabaseUrl: string | null | undefined): boolean {
  if (!supabaseUrl) return false;
  let base: URL;
  let alvo: URL;
  try {
    base = new URL(supabaseUrl);
    alvo = new URL(url);
  } catch {
    return false;
  }
  if (alvo.protocol !== "https:") return false;
  if (alvo.host !== base.host) return false;
  return alvo.pathname.startsWith("/storage/v1/object/public/cavalos-imagens/");
}

export type ResultadoFotos =
  | { ok: true; fotos: string[]; principal: string }
  | { ok: false; erro: string };

/**
 * Valida a lista que o vendedor quer guardar.
 *
 * Aceita-se uma fotografia que já esteja no anúncio, seja qual for a sua
 * origem — há anúncios antigos com imagens fora do armazenamento e removê-las
 * à força não é o que o vendedor pediu — e, de resto, só ficheiros carregados
 * para o armazenamento do projecto.
 */
export function validarFotos(
  pedidas: unknown,
  existentes: string[],
  supabaseUrl: string | null | undefined
): ResultadoFotos {
  if (!Array.isArray(pedidas)) {
    return { ok: false, erro: "Lista de fotografias inválida." };
  }

  const permitidas = new Set(existentes);
  const fotos: string[] = [];

  for (const entrada of pedidas) {
    if (typeof entrada !== "string") {
      return { ok: false, erro: "Lista de fotografias inválida." };
    }
    const url = entrada.trim();
    if (!url) continue;
    if (url.length > MAX_COMPRIMENTO_URL) {
      return { ok: false, erro: "Endereço de fotografia demasiado longo." };
    }
    if (!permitidas.has(url) && !urlDeArmazenamento(url, supabaseUrl)) {
      return { ok: false, erro: "Só é possível usar fotografias carregadas no portal." };
    }
    if (!fotos.includes(url)) fotos.push(url);
  }

  if (fotos.length === 0) {
    return { ok: false, erro: "O anúncio tem de ficar com pelo menos uma fotografia." };
  }
  if (fotos.length > MAX_FOTOS) {
    return { ok: false, erro: `Máximo de ${MAX_FOTOS} fotografias por anúncio.` };
  }

  return { ok: true, fotos, principal: fotos[0] };
}

/** Move a fotografia para a primeira posição, que é a que representa o anúncio. */
export function definirPrincipal(fotos: string[], url: string): string[] {
  if (!fotos.includes(url)) return fotos;
  return [url, ...fotos.filter((f) => f !== url)];
}
