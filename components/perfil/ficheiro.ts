/**
 * O que se aceita como fotografia de perfil, e o que se diz a quem trouxe
 * outra coisa.
 *
 * ── Erros que dizem o que fazer a seguir ──────────────────────────────────
 *
 * Cada recusa tem um **código**, e cada código tem uma frase nas três línguas
 * que diz o passo seguinte — «guarde como JPEG ou PNG e tente outra vez», e
 * não «erro». Um código e não uma frase porque este módulo é puro e não sabe
 * em que língua está a página; quem traduz é o ecrã.
 *
 * ── Os números, e de onde vêm ─────────────────────────────────────────────
 *
 * O tecto de entrada é **20 MiB**. Não é o tamanho do que se guarda — o que se
 * guarda são os 512×512 que saem do recorte, e esses medem dezenas de KiB —,
 * é o tecto do que se deixa **descodificar**. E é isso que custa: uma
 * fotografia de telemóvel de 12MP ocupa `4032 × 3024 × 4 = 48,8 MB` de
 * memória depois de descodificada, venha ela num ficheiro de 4 MB ou de 400
 * KB. Um tecto em bytes de ficheiro é um mau substituto para um tecto em
 * pixéis, e por isso há os dois: este, barato, antes de se ler o ficheiro, e o
 * dos pixéis, dentro do `recorte`, depois de se saber as dimensões.
 *
 * Os formatos são os que **um browser sabe desenhar num canvas**. O HEIC dos
 * iPhones não está na lista de propósito: o Safari mostra-o, mas
 * `createImageBitmap` só o aceita onde o sistema o descodifica, e o resultado
 * seria uma falha silenciosa a meio do recorte em vez de uma frase à entrada.
 * Quem traz um HEIC recebe a frase que lhe diz o que fazer.
 */

/** Os tipos que se aceitam, e que o `<input accept>` também anuncia. */
export const TIPOS_ACEITES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/** O que o `accept` do `<input type="file">` leva. */
export const ACEITA = TIPOS_ACEITES.join(",");

/** O tecto do ficheiro que entra, em bytes. */
export const MAX_BYTES = 20 * 1024 * 1024;

/** O lado do quadrado que sai do recorte. */
export const LADO_FINAL = 512;

/**
 * O tecto de pixéis do que se descodifica.
 *
 * 50 megapíxeis: cabe lá dentro tudo o que um telemóvel tira (12MP, 48MP em
 * modo cru são 48) e fica de fora um panorama de 200MP, que descodificado
 * seriam 800 MB de memória e a página fechada pelo sistema.
 */
export const MAX_PIXEIS = 50_000_000;

export type CodigoDeRecusa =
  | "tipo"
  | "grande-demais"
  | "vazio"
  | "pixeis-demais"
  | "ilegivel"
  | "pequena-demais";

/** O mínimo do lado menor. Abaixo disto, o quadrado sai borratado. */
export const LADO_MINIMO = 64;

export type Veredicto =
  | { ok: true; ficheiro: File }
  | { ok: false; codigo: CodigoDeRecusa; detalhe?: string };

/**
 * O que se pode saber sobre o ficheiro **antes** de o ler.
 *
 * Corre no instante em que a pessoa escolhe, e é por isso que é barato: não
 * abre o ficheiro, não descodifica nada, e responde antes de a barra de
 * progresso ter razão de existir.
 */
export function validarFicheiro(
  ficheiro: Pick<File, "type" | "size" | "name">,
  limites: { maxBytes?: number; tipos?: readonly string[] } = {}
): Veredicto {
  const maxBytes = limites.maxBytes ?? MAX_BYTES;
  const tipos = limites.tipos ?? TIPOS_ACEITES;

  if (ficheiro.size === 0) return { ok: false, codigo: "vazio" };

  /* Pelo tipo declarado e não pela extensão: uma `.jpg` que seja um PDF
     renomeado tem `type: "application/pdf"`, e o browser é quem sabe. */
  if (!tipos.includes(ficheiro.type)) {
    return { ok: false, codigo: "tipo", detalhe: ficheiro.type || ficheiro.name };
  }

  if (ficheiro.size > maxBytes) {
    return { ok: false, codigo: "grande-demais", detalhe: formatarBytes(ficheiro.size) };
  }

  return { ok: true, ficheiro: ficheiro as File };
}

/**
 * O que só se pode saber **depois** de o browser dizer as dimensões.
 *
 * Separado do de cima de propósito: são dois momentos diferentes na vida de
 * quem está a esperar, e juntá-los obrigaria a descodificar antes de poder
 * recusar um PDF.
 */
export function validarDimensoes(largura: number, altura: number): Veredicto | { ok: true } {
  if (!Number.isFinite(largura) || !Number.isFinite(altura) || largura <= 0 || altura <= 0) {
    return { ok: false, codigo: "ilegivel" };
  }
  if (largura * altura > MAX_PIXEIS) {
    return {
      ok: false,
      codigo: "pixeis-demais",
      detalhe: `${largura}×${altura}`,
    };
  }
  if (Math.min(largura, altura) < LADO_MINIMO) {
    return { ok: false, codigo: "pequena-demais", detalhe: `${largura}×${altura}` };
  }
  return { ok: true };
}

/** «4,9 MB» — para a frase que diz o que estava errado. */
export function formatarBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
