/**
 * O que se faz a uma fotografia antes de a guardar.
 *
 * ── As duas coisas que este módulo existe para garantir ─────────────────────
 *
 * **1. Nada de metadados sai daqui.** Uma fotografia de telemóvel traz EXIF, e
 * o EXIF traz GPS. Numa fotografia de anúncio isso já era mau — o
 * `lib/comprimir-imagem` conta que publicava a morada da cavalariça —, mas
 * aqui é pior por uma razão de forma: **esta fotografia sai de uma pessoa e
 * chega a outra**, escrita na caixa de entrada de quem lhe respondeu a um
 * anúncio. Publicar as coordenadas da casa de alguém dentro de um ficheiro que
 * se entrega a um estranho é o contrário exacto da promessa que este site faz
 * na página inicial.
 *
 * O EXIF não se «limpa»: o que sai é uma imagem **redesenhada**, pixels novos
 * escritos de raiz. O `sharp` só copia metadados se lho pedirem
 * (`withMetadata`/`keepExif`), e não se lhe pede. Está provado por teste sobre
 * um ficheiro com GPS lá dentro — ver `__tests__/lib/perfil-fotografia.test.ts`.
 *
 * A única coisa do EXIF que se **usa** é a orientação, e usa-se para a aplicar
 * e deitar fora: sem o `.rotate()`, um retrato tirado ao alto aparece deitado,
 * porque o telemóvel gravou os pixels na horizontal e escreveu «roda-me» ao
 * lado. Aplicar é a maneira de a informação sobreviver sem o ficheiro a levar.
 *
 * **2. O que se guarda tem o tamanho do que se mostra.** Aceitar o ficheiro da
 * câmara tal como vem é servir megabytes para desenhar 32 pixels numa lista.
 * Medido no banco de ensaio (`scratchpad/perfil-ensaio`), com pixels de uma
 * fotografia a sério levados às dimensões que um telemóvel entrega:
 *
 *   entrada                       saída (256², WebP 82)    razão
 *   12 MP, 1 765 894 bytes        ~17 000                  ~104x
 *   48 MP, 4 610 461 bytes        ~17 000                  ~271x
 *
 * A saída não depende da entrada, e é esse o ponto: o custo de servir uma
 * fotografia de perfil passa a ser um número, não o que o telefone de cada um
 * decidiu gravar.
 *
 * ── Porque é que a validação não olha para o nome nem para o Content-Type ───
 *
 * Um ficheiro que uma pessoa carrega e **outra descarrega** é uma superfície de
 * ataque. A extensão e o `Content-Type` de uma parte multipart são texto que o
 * cliente escolheu — mudam-se com uma linha de `curl`. Quem decide é o
 * `tipoRealDosBytes` do `lib/documentos/tipo-real`, que já existe nesta casa e
 * que lê a assinatura nos primeiros bytes; não se escreve aqui um segundo.
 *
 * E a assinatura também não chega sozinha: diz por onde o ficheiro começa, não
 * o que vem a seguir. Por isso a última palavra é do descodificador — se o
 * `sharp` não conseguir abrir a imagem, ou se ela declarar mais pixels do que o
 * tecto, não passa. O que **sai** é sempre WebP escrito por nós, o que quer
 * dizer que um ficheiro com um segundo formato colado atrás não chega ao balde:
 * o que lá fica são os pixels que o descodificador viu, e mais nada.
 */

// A chave de serviço não vive aqui, mas o `sharp` sim — e um `sharp` que
// chegue ao pacote do cliente são megabytes de binário nativo que o browser
// não sabe carregar. A guarda é a mesma de `lib/supabase-admin` e de
// `lib/documentos/selo-publico`: falha alto e cedo, no sítio certo.
if (typeof window !== "undefined") {
  throw new Error(
    "[Perfil] lib/perfil/fotografia.ts corre no servidor (usa sharp e escreve no balde). " +
      "Um componente que precise dos limites importa `lib/perfil/contrato`."
  );
}

import sharp from "sharp";
import { tipoRealDosBytes, BYTES_DE_ASSINATURA } from "@/lib/documentos/tipo-real";
import {
  LADO_AVATAR,
  QUALIDADE_AVATAR,
  MAX_BYTES_AVATAR,
  MAX_PIXELS_AVATAR,
  MIMES_AVATAR,
  FORMATOS_AVATAR,
  MIME_AVATAR_GUARDADO,
  EXTENSAO_AVATAR_GUARDADA,
  type MimeAvatar,
} from "./contrato";

/** O que correu bem: os bytes a guardar e o que se pode dizer sobre eles. */
export interface FotografiaPronta {
  bytes: Buffer;
  /** Sempre `image/webp`. Está aqui para quem escreve no balde não o adivinhar. */
  mime: typeof MIME_AVATAR_GUARDADO;
  extensao: typeof EXTENSAO_AVATAR_GUARDADA;
  /** Para poder medir e registar o que este módulo comprou. */
  bytesOriginais: number;
  /** O que os bytes diziam ser à entrada, já verificado. */
  mimeOriginal: MimeAvatar;
}

/**
 * O que correu mal, com uma frase que se pode mostrar a quem carregou.
 *
 * A frase é deliberadamente pouco específica sobre o **porquê** técnico: quem
 * está a experimentar o que passa não ganha um mapa, e quem escolheu a
 * fotografia errada percebe à mesma. O detalhe vai para o registo do servidor.
 */
export interface FotografiaRecusada {
  erro: string;
  /** Curto e estável, para registar e contar. Nunca chega ao ecrã. */
  motivo:
    | "vazio"
    | "grande-demais"
    | "formato"
    | "ilegivel"
    | "dimensoes"
    | "pixels-demais"
    | "codificacao";
}

export type Veredicto = FotografiaPronta | FotografiaRecusada;

export function foiRecusada(v: Veredicto): v is FotografiaRecusada {
  return "erro" in v;
}

/**
 * Prepara uma fotografia de perfil, ou diz porque não.
 *
 * Nunca lança: um `sharp` que rebente com um ficheiro construído para o
 * rebentar tem de sair daqui como uma recusa e não como um 500 — um 500 é uma
 * pilha de chamadas nos registos e uma página branca para quem só escolheu a
 * fotografia errada.
 *
 * A ordem das verificações é a barata primeiro: o tamanho em bytes não abre o
 * ficheiro, a assinatura lê doze bytes, e só depois é que se paga um
 * descodificador. Ao contrário, um ficheiro de oito megabytes de lixo era
 * descodificado antes de alguém reparar que não é uma imagem.
 */
export async function prepararFotografia(entrada: ArrayBuffer | Buffer): Promise<Veredicto> {
  const original = Buffer.isBuffer(entrada) ? entrada : Buffer.from(entrada);

  if (original.length === 0) {
    return { erro: "O ficheiro está vazio.", motivo: "vazio" };
  }

  if (original.length > MAX_BYTES_AVATAR) {
    const mb = Math.floor(MAX_BYTES_AVATAR / (1024 * 1024));
    return { erro: `A fotografia é demasiado grande. Máximo ${mb} MB.`, motivo: "grande-demais" };
  }

  // Os bytes, e não a extensão nem o que o cliente declarou.
  const real = tipoRealDosBytes(original.subarray(0, BYTES_DE_ASSINATURA));
  if (real === null || !(MIMES_AVATAR as readonly string[]).includes(real)) {
    return { erro: `Formato não aceite. Use ${FORMATOS_AVATAR}.`, motivo: "formato" };
  }

  // A assinatura diz por onde começa; quem confirma que é mesmo uma imagem é
  // quem a consegue abrir.
  let largura: number | undefined;
  let altura: number | undefined;
  try {
    const meta = await sharp(original, { limitInputPixels: MAX_PIXELS_AVATAR }).metadata();
    largura = meta.width;
    altura = meta.height;
  } catch {
    return { erro: "Não foi possível ler a fotografia.", motivo: "ilegivel" };
  }

  if (!largura || !altura) {
    return { erro: "Não foi possível ler a fotografia.", motivo: "dimensoes" };
  }

  /* O tecto de bytes lá em cima não apanha uma bomba de descompressão: alguns
     kilobytes de PNG podem declarar uma imagem de gigabytes. O `sharp` já leva
     o `limitInputPixels`, mas a conta faz-se também aqui para a recusa ter uma
     frase própria em vez de cair no `catch` genérico do descodificador. */
  if (largura * altura > MAX_PIXELS_AVATAR) {
    return { erro: "A fotografia tem dimensões demasiado grandes.", motivo: "pixels-demais" };
  }

  try {
    const bytes = await sharp(original, { limitInputPixels: MAX_PIXELS_AVATAR })
      /* Aplica a orientação do EXIF **e deita-a fora com o resto**. Sem isto um
         retrato tirado ao alto sai deitado; com `withMetadata()` a seguir, o
         GPS voltava. Não há `withMetadata` nesta cadeia, e é de propósito. */
      .rotate()
      /* Quadrado, porque é assim que uma fotografia de perfil é sempre
         mostrada — e recortar aqui é o que faz o peso ser um número em vez de
         depender da proporção do telefone de cada um. `attention` escolhe a
         janela pela região de maior contraste, que numa fotografia de pessoa é
         quase sempre a cara; o centro geométrico corta cabeças em retratos com
         margem em baixo. */
      .resize(LADO_AVATAR, LADO_AVATAR, { fit: "cover", position: "attention" })
      .webp({ quality: QUALIDADE_AVATAR })
      .toBuffer();

    return {
      bytes,
      mime: MIME_AVATAR_GUARDADO,
      extensao: EXTENSAO_AVATAR_GUARDADA,
      bytesOriginais: original.length,
      mimeOriginal: real as MimeAvatar,
    };
  } catch {
    // Uma imagem que abre para `metadata()` e rebenta a descodificar por
    // inteiro existe — ficheiros truncados, por exemplo.
    return { erro: "Não foi possível processar a fotografia.", motivo: "codificacao" };
  }
}
