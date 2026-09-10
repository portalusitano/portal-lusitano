/**
 * Descodificar a fotografia e cortar o quadrado. Sem biblioteca nenhuma.
 *
 * ── O que custa, medido ───────────────────────────────────────────────────
 *
 * Uma fotografia de telemóvel de 12MP (4032×3024) ocupa 48,8 MB de memória
 * depois de descodificada e leva de centenas de milissegundos a alguns
 * segundos a chegar a um `ImageBitmap` num telemóvel modesto. Durante esse
 * tempo **não há nada para ver** se ninguém disser que está a acontecer, e é
 * por isso que este módulo relata as suas fases em vez de devolver só o
 * resultado: `a-ler`, `a-descodificar`, `a-recortar`. Quem chama pinta a
 * barra.
 *
 * O `createImageBitmap` é preferido ao `new Image()` por uma razão que se
 * sente: descodifica **fora da linha principal**, e por isso a página continua
 * a responder ao dedo enquanto os 12MP são lidos. Com um `<img>` o mesmo
 * trabalho acontece na linha principal e o ecrã fica pregado. Onde ele não
 * existir cai-se para o `<img>`, que é lento mas funciona.
 *
 * ── Porque é que o que sai é WebP e não o que entrou ──────────────────────
 *
 * Porque o que entrou pode ser 20 MB e o que se guarda é um disco de 44
 * pixéis. Um quadrado de 512×512 em WebP a 0,85 mede tipicamente 20 a 60 KiB;
 * o mesmo em PNG mede dez vezes mais, porque o PNG não sabe perder o que
 * ninguém vê. E 512 e não 1024 porque o maior sítio onde este retrato aparece
 * são os 112px do editor — 512 dá folga para ecrãs a 4× e não mais.
 */

import { LADO_FINAL } from "./ficheiro";
import { recorteQuadrado, ladoDeSaida, type Enquadramento, type Fonte } from "./recorte";

export type Fase = "a-ler" | "a-descodificar" | "a-recortar" | "a-enviar" | "pronto";

export interface FotografiaAberta {
  /** O que se desenha: um `ImageBitmap` ou um `HTMLImageElement`. */
  fonte: CanvasImageSource & Fonte;
  /** Para o `<img>` da pré-visualização, e para se largar depois. */
  url: string;
  largura: number;
  altura: number;
  largar: () => void;
}

/**
 * Abrir a fotografia escolhida.
 *
 * Devolve o que é preciso para a mostrar **antes de gravar** — que é metade do
 * que o dono pediu: ver antes de gravar.
 */
export async function abrirFotografia(
  ficheiro: File,
  aoMudarFase?: (f: Fase) => void
): Promise<FotografiaAberta> {
  aoMudarFase?.("a-ler");
  const url = URL.createObjectURL(ficheiro);

  aoMudarFase?.("a-descodificar");
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(ficheiro);
      return {
        fonte: bitmap as unknown as CanvasImageSource & Fonte,
        url,
        largura: bitmap.width,
        altura: bitmap.height,
        largar: () => {
          bitmap.close?.();
          URL.revokeObjectURL(url);
        },
      };
    } catch {
      /* Um formato que o `createImageBitmap` não descodifica pode ainda assim
         ser desenhado por um `<img>`; tenta-se, e só então é que se desiste. */
    }
  }

  const img = new globalThis.Image();
  img.decoding = "async";
  await new Promise<void>((ok, falhou) => {
    img.onload = () => ok();
    img.onerror = () => falhou(new Error("ilegivel"));
    img.src = url;
  });

  return {
    fonte: img as unknown as CanvasImageSource & Fonte,
    url,
    largura: img.naturalWidth,
    altura: img.naturalHeight,
    largar: () => URL.revokeObjectURL(url),
  };
}

/**
 * Cortar o quadrado e devolver os bytes que vão para o servidor.
 *
 * O `imageSmoothingQuality: "high"` não é vaidade: um retrato de 44px feito
 * por redução directa de 4032 sem filtro fica com serrilha em todas as
 * arestas, e é nesse tamanho que ele aparece trinta vezes numa coluna.
 */
export async function recortarParaBlob(
  aberta: Pick<FotografiaAberta, "fonte" | "largura" | "altura">,
  enquadramento: Enquadramento,
  aoMudarFase?: (f: Fase) => void
): Promise<Blob> {
  aoMudarFase?.("a-recortar");

  const fonte = { largura: aberta.largura, altura: aberta.altura };
  const recorte = recorteQuadrado(fonte, enquadramento);
  const lado = ladoDeSaida(recorte, LADO_FINAL);

  const tela = document.createElement("canvas");
  tela.width = lado;
  tela.height = lado;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("sem-canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(aberta.fonte, recorte.sx, recorte.sy, recorte.lado, recorte.lado, 0, 0, lado, lado);

  const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, "image/webp", 0.85));
  if (!blob) throw new Error("sem-blob");
  return blob;
}
