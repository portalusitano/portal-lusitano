/**
 * Reconhecer o endereço de um vídeo em vez de aceitar qualquer texto.
 *
 * O campo pede o vídeo do cavalo a trabalhar, que é a peça que mais vende um
 * anúncio. Aceitar qualquer texto significa que só se descobre que o endereço
 * não presta quando alguém carrega nele — e nessa altura o anúncio já está
 * pago e no ar. Quem sabe ler o endereço sabe dizer, no momento em que ele é
 * escrito, se aquilo vai dar um vídeo.
 *
 * Reconhecem-se as duas plataformas que este mercado usa: **YouTube** e
 * **Vimeo**. Um endereço de outro sítio não é recusado — é assinalado, porque
 * fica no anúncio como uma ligação e não como um vídeo embebido.
 *
 * As formas de endereço são as que as duas plataformas publicam:
 * `youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `/live/`, e
 * `vimeo.com/<id>` com a variante `player.vimeo.com/video/<id>`.
 */

export type PlataformaVideo = "youtube" | "vimeo";

export interface VideoReconhecido {
  plataforma: PlataformaVideo;
  /** O identificador do vídeo na plataforma. */
  id: string;
  /** O endereço canónico — sem parâmetros de seguimento, sem lista, sem tempo. */
  url: string;
  /** O endereço a usar num `<iframe>`, para quando o anúncio embeber o vídeo. */
  embed: string;
}

/** Um id do YouTube tem onze caracteres do alfabeto base64 para URL. */
const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
/** Um id do Vimeo é um número, hoje com sete a nove algarismos. */
const ID_VIMEO = /^\d{6,12}$/;

function comEsquema(valor: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(valor) ? valor : `https://${valor}`;
}

/**
 * Devolve o vídeo reconhecido, ou `null`. Nunca lança — um endereço meio
 * escrito é o estado normal de um campo a ser preenchido, não uma excepção.
 */
export function identificarVideo(valor: string): VideoReconhecido | null {
  const texto = valor.trim();
  if (!texto) return null;

  let url: URL;
  try {
    url = new URL(comEsquema(texto));
  } catch {
    return null;
  }

  const anfitriao = url.hostname.toLowerCase().replace(/^www\./, "");
  const caminho = url.pathname.replace(/\/+$/, "");

  if (anfitriao === "youtu.be") {
    const id = caminho.slice(1);
    return ID_YOUTUBE.test(id) ? youtube(id) : null;
  }

  if (
    anfitriao === "youtube.com" ||
    anfitriao === "m.youtube.com" ||
    anfitriao === "youtube-nocookie.com"
  ) {
    const doParametro = url.searchParams.get("v");
    if (doParametro && ID_YOUTUBE.test(doParametro)) return youtube(doParametro);
    const doCaminho = caminho.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})$/);
    if (doCaminho) return youtube(doCaminho[1]);
    return null;
  }

  if (anfitriao === "vimeo.com" || anfitriao === "player.vimeo.com") {
    // O Vimeo tem `vimeo.com/<id>`, `player.vimeo.com/video/<id>` e ainda os
    // endereços de canal, `vimeo.com/<canal>/<id>`. Interessa o último número.
    const numeros = caminho.split("/").filter((p) => ID_VIMEO.test(p));
    const id = numeros[numeros.length - 1];
    return id ? vimeo(id) : null;
  }

  return null;
}

function youtube(id: string): VideoReconhecido {
  return {
    plataforma: "youtube",
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    embed: `https://www.youtube.com/embed/${id}`,
  };
}

function vimeo(id: string): VideoReconhecido {
  return {
    plataforma: "vimeo",
    id,
    url: `https://vimeo.com/${id}`,
    embed: `https://player.vimeo.com/video/${id}`,
  };
}
