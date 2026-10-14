/**
 * Encolher uma fotografia no browser, antes de ela subir.
 *
 * ## Porque é que isto tem de existir
 *
 * O formulário exige **três fotografias no mínimo** (`MIN_IMAGES`), e o
 * `handleSubmit` mete-as todas num `FormData` só e manda-o numa volta:
 *
 * ```ts
 * imagens.forEach((img) => uploadFormData.append("images", img));
 * ```
 *
 * O site corre em funções serverless da Vercel, e essas têm um tecto de
 * **4,5 MB para o corpo do pedido** — passado esse tecto a plataforma responde
 * 413 `FUNCTION_PAYLOAD_TOO_LARGE` e o pedido nunca chega ao nosso código.
 *
 * Um telemóvel de hoje tira fotografias de 3 a 8 MB. **O mínimo exigido pelo
 * formulário já não passa**: três fotografias são nove a vinte e quatro
 * megabytes. Quem vende um cavalo preenche vinte e tal campos, anexa o Livro
 * Azul, escolhe o plano, e ao carregar em publicar apanha um erro que não é
 * nosso, com uma mensagem que não escrevemos, no último passo. O erro não
 * aparece nos nossos registos, porque o pedido morre antes de lá chegar.
 *
 * Não é um risco a vigiar: é o caminho normal do produto.
 *
 * ## O que se ganha além de caber
 *
 * 1. **Sobe depressa numa rede de telemóvel.** Quem anuncia um cavalo faz-o na
 *    cavalariça, com a rede que houver. Vinte megabytes numa rede fraca são
 *    minutos e uma barra parada; um megabyte e meio é uma espera.
 * 2. **Deixa de se publicar a morada da cavalariça.** Uma fotografia de
 *    telemóvel traz EXIF, e o EXIF traz as coordenadas de GPS de onde foi
 *    tirada. Hoje os bytes sobem tal e qual e ficam num balde de leitura
 *    pública: qualquer pessoa que descarregue a fotografia de um anúncio sabe
 *    onde o cavalo dorme. Redesenhar a imagem numa tela **não copia o EXIF** —
 *    o que sai é só pixels. É o efeito secundário mais valioso deste módulo.
 * 3. **Uma fotografia de anúncio não precisa de 4000 pixels.** O maior sítio
 *    onde ela aparece é a galeria da ficha. Guardar o original é pagar
 *    armazenamento e largura de banda para servir detalhe que ninguém vê.
 *
 * ## O que este módulo não faz
 *
 * **Não recusa nada e não perde nada.** Se a imagem não se conseguir
 * descodificar, se a tela não existir, se o resultado sair maior do que o
 * original — devolve-se o ficheiro como veio. Uma fotografia que não encolheu
 * ainda pode ser publicada; uma fotografia que se perdeu no caminho é um
 * anúncio que não se faz. Em caso de dúvida, o original.
 *
 * **Não recorta nem endireita.** Só escala, e mantém a proporção.
 */

/** O maior lado, em pixels, de uma fotografia já encolhida. */
export const LADO_MAXIMO = 2000;

/**
 * A qualidade do JPEG à saída. 0,82 é o joelho da curva: acima disto o
 * ficheiro cresce depressa e o olho não acompanha; abaixo começam a ver-se os
 * blocos nas zonas lisas, que numa fotografia de cavalo é o céu e o pêlo.
 */
export const QUALIDADE = 0.82;

/**
 * Abaixo disto não se mexe. Uma fotografia que já é pequena não ganha nada em
 * ser redesenhada — e perdia o EXIF de orientação sem que a tela o
 * compensasse, se o caminho da tela falhasse a meio.
 */
export const BYTES_QUE_NAO_VALE_A_PENA = 400 * 1024;

export interface Encolhida {
  ficheiro: File;
  /** O tamanho de origem, para se poder dizer quanto se poupou. */
  bytesAntes: number;
  bytesDepois: number;
  /** Falso quando se devolveu o original — por não valer a pena ou por falha. */
  mudou: boolean;
}

/**
 * A medida que cabe num quadrado de `maximo`, mantendo a proporção.
 *
 * **Nunca aumenta.** Esticar uma fotografia pequena não lhe acrescenta
 * informação nenhuma: dá um ficheiro maior com a mesma imagem, que é o
 * contrário do que aqui se quer.
 */
export function medidaQueCabe(
  largura: number,
  altura: number,
  maximo: number = LADO_MAXIMO
): { largura: number; altura: number } {
  const maiorLado = Math.max(largura, altura);
  if (maiorLado <= maximo || maiorLado === 0) return { largura, altura };

  const factor = maximo / maiorLado;
  return {
    // Arredonda-se para cima para não sair um zero num lado muito estreito:
    // uma tela de largura zero não desenha nada e o `toBlob` devolveria vazio.
    largura: Math.max(1, Math.round(largura * factor)),
    altura: Math.max(1, Math.round(altura * factor)),
  };
}

/** Vale a pena mexer neste ficheiro? */
export function valeAPenaEncolher(ficheiro: { size: number; type: string }): boolean {
  if (!ficheiro.type.startsWith("image/")) return false;
  // Um GIF pode ser animado, e redesenhá-lo numa tela deixa só o primeiro
  // quadro. Perder a animação é perder informação, e isso não é encolher.
  if (ficheiro.type === "image/gif") return false;
  return ficheiro.size > BYTES_QUE_NAO_VALE_A_PENA;
}

/** O nome, com a extensão trocada para a do formato que sai. */
export function nomeComExtensao(nome: string, extensao: string): string {
  const semExtensao = nome.replace(/\.[^./\\]+$/, "");
  return `${semExtensao || "fotografia"}.${extensao}`;
}

/**
 * As peças do browser de que isto depende, injectáveis para os testes.
 *
 * Não é cerimónia: sem elas, tudo o que se conseguia testar era a aritmética.
 * Com elas testa-se o que interessa mesmo — que uma falha devolve o original
 * em vez de deixar cair a fotografia.
 */
export interface Ferramentas {
  descodificar: (f: File) => Promise<{ width: number; height: number; close?: () => void }>;
  desenhar: (
    bitmap: { width: number; height: number },
    largura: number,
    altura: number,
    qualidade: number
  ) => Promise<Blob | null>;
}

const ferramentasDoBrowser: Ferramentas = {
  descodificar: (f) =>
    // `from-image` faz o browser aplicar a rotação que o EXIF pede **antes** de
    // nos entregar os pixels. Sem isto, uma fotografia tirada de lado — que é
    // como saem quase todas — seria redesenhada deitada, e como a tela não
    // copia o EXIF, ficava deitada para sempre.
    createImageBitmap(f, { imageOrientation: "from-image" }),

  desenhar: (bitmap, largura, altura, qualidade) => {
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;

    const pincel = tela.getContext("2d");
    if (!pincel) return Promise.resolve(null);

    // O `imageSmoothingQuality` alto importa quando se reduz muito: em
    // "low" (a omissão de alguns browsers) as crinas e as grades ganham
    // serrilha.
    pincel.imageSmoothingEnabled = true;
    pincel.imageSmoothingQuality = "high";
    pincel.drawImage(bitmap as CanvasImageSource, 0, 0, largura, altura);

    return new Promise((resolve) => tela.toBlob(resolve, "image/jpeg", qualidade));
  },
};

/**
 * Encolhe uma fotografia. **Nunca lança e nunca devolve menos do que recebeu:**
 * em qualquer falha o original volta para trás.
 */
export async function comprimirImagem(
  ficheiro: File,
  opcoes: { ladoMaximo?: number; qualidade?: number; ferramentas?: Ferramentas } = {}
): Promise<Encolhida> {
  const original: Encolhida = {
    ficheiro,
    bytesAntes: ficheiro.size,
    bytesDepois: ficheiro.size,
    mudou: false,
  };

  if (!valeAPenaEncolher(ficheiro)) return original;

  const ladoMaximo = opcoes.ladoMaximo ?? LADO_MAXIMO;
  const qualidade = opcoes.qualidade ?? QUALIDADE;
  const ferramentas = opcoes.ferramentas ?? ferramentasDoBrowser;

  try {
    const bitmap = await ferramentas.descodificar(ficheiro);
    const { largura, altura } = medidaQueCabe(bitmap.width, bitmap.height, ladoMaximo);

    const blob = await ferramentas.desenhar(bitmap, largura, altura, qualidade);
    bitmap.close?.();

    if (!blob || blob.size === 0) return original;

    // Uma fotografia já optimizada — um WebP bem comprimido, por exemplo —
    // pode sair maior em JPEG. Nesse caso o original é a melhor resposta, e
    // devolvê-lo é mais honesto do que fingir que se ganhou alguma coisa.
    if (blob.size >= ficheiro.size) return original;

    return {
      ficheiro: new File([blob], nomeComExtensao(ficheiro.name, "jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
      bytesAntes: ficheiro.size,
      bytesDepois: blob.size,
      mudou: true,
    };
  } catch {
    // Descodificação falhada, tela indisponível, memória esgotada num ficheiro
    // enorme. Nenhuma destas é razão para perder a fotografia.
    return original;
  }
}

/**
 * Várias, **uma de cada vez**.
 *
 * Em paralelo seria mais rápido no papel e pior na prática: descodificar seis
 * fotografias de doze megapixels ao mesmo tempo põe em memória seis telas de
 * quarenta e oito megabytes, e num telemóvel — que é onde isto corre — o
 * separador morre. Uma de cada vez, com o `close()` a libertar a anterior.
 *
 * O `aoProgredir` existe para o ecrã poder dizer em qual vai, porque encolher
 * seis fotografias grandes leva segundos e uma barra parada lê-se como avaria.
 */
export async function comprimirVarias(
  ficheiros: File[],
  opcoes: {
    ladoMaximo?: number;
    qualidade?: number;
    ferramentas?: Ferramentas;
    aoProgredir?: (feitas: number, total: number) => void;
  } = {}
): Promise<Encolhida[]> {
  const feitas: Encolhida[] = [];
  for (const ficheiro of ficheiros) {
    feitas.push(await comprimirImagem(ficheiro, opcoes));
    opcoes.aoProgredir?.(feitas.length, ficheiros.length);
  }
  return feitas;
}
