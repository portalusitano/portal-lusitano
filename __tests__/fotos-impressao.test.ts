import { describe, expect, it } from "vitest";

import { descodificarLuma } from "@/lib/fotos/descodificar";
import {
  ahashDePlano,
  compararImpressoes,
  dentroDoLimiar,
  dhashDePlano,
  distanciaDeHamming,
  impressaoDeFotografia,
  impressaoValida,
  LIMIAR_PHASH,
  phashDePlano,
  type ImpressaoDeFotografia,
} from "@/lib/fotos/impressao";
import { criarPlano } from "@/lib/fotos/plano";

import {
  ajustarBrilho,
  codificarJpeg,
  codificarPng,
  imagemSintetica,
  passarPorJpeg,
  recortar,
  redimensionar,
  type ImagemRgb,
} from "./fotos-impressao-fixtures";

/**
 * A impressão perceptual, e o limiar.
 *
 * **É este ficheiro que produz os números do comentário do `impressao.ts`.**
 * Não os confere contra uma tabela escrita à mão: mede-os outra vez, a cada
 * corrida, e falha se a separação de que o limiar depende deixar de existir.
 *
 * As imagens são todas geradas em código, com semente fixa — não entra no
 * repositório uma única imagem vinda de fora. E cada medição atravessa o
 * codificador e o descodificador de JPEG a sério: o que se mede é o sistema
 * inteiro, não a aritmética da DCT isolada.
 *
 * A pergunta que os testes fazem é sempre a mesma e é dupla, porque os dois
 * erros são simétricos e custam os dois: **a mesma fotografia transformada
 * continua perto?** e **duas fotografias diferentes continuam longe?**
 */

const LARGURA = 640;
const ALTURA = 480;

/**
 * Doze imagens: seis independentes e três pares que partilham o cenário de
 * fundo e diferem no primeiro plano.
 *
 * Os pares com o mesmo fundo são o caso difícil de verdade, e são a terceira
 * explicação inocente da lista do `sinais.ts` — a coudelaria que anuncia dois
 * cavalos com o mesmo picadeiro atrás. Sem eles, medir «duas imagens
 * diferentes» com ruído independente dava uma separação bonita e falsa.
 */
function construirBases(): ImagemRgb[] {
  const bases: ImagemRgb[] = [];
  for (let i = 0; i < 6; i++) {
    bases.push(imagemSintetica({ largura: LARGURA, altura: ALTURA, semente: 1000 + i * 37 }));
  }
  for (const fundo of [77, 88, 99]) {
    bases.push(
      imagemSintetica({ largura: LARGURA, altura: ALTURA, semente: fundo * 7 + 1, fundo })
    );
    bases.push(
      imagemSintetica({ largura: LARGURA, altura: ALTURA, semente: fundo * 7 + 2, fundo })
    );
  }
  return bases;
}

const BASES = construirBases();

/** Como cada fotografia foi publicada da primeira vez. */
const PUBLICADAS: ImpressaoDeFotografia[] = BASES.map((b) =>
  impressaoDeFotografia(codificarJpeg(b, { qualidade: 90, subamostragem: [2, 2] }))
);

/**
 * A imagem tal como sai de um descodificador. É daqui que partem as
 * transformações, para que a recompressão medida seja **dupla** — dois erros de
 * quantização acumulados, como acontece a quem descarrega e volta a guardar.
 */
const DESCARREGADAS = BASES.map((b) => passarPorJpeg(b, 90));

function distancias(transformar: (imagem: ImagemRgb) => Uint8Array): number[] {
  return DESCARREGADAS.map(
    (imagem, i) =>
      compararImpressoes(PUBLICADAS[i], impressaoDeFotografia(transformar(imagem))).distanciaPhash
  );
}

function maximo(valores: number[]): number {
  return valores.reduce((a, b) => Math.max(a, b), 0);
}

describe("a impressão sobrevive ao que se faz a uma fotografia roubada", () => {
  it("recompressão: a imagem volta a ser guardada com menos qualidade", () => {
    for (const qualidade of [70, 45]) {
      const ds = distancias((im) => codificarJpeg(im, { qualidade, subamostragem: [2, 2] }));
      expect(maximo(ds)).toBeLessThanOrEqual(LIMIAR_PHASH);
      // A recompressão é o caso mais fácil e tem de continuar a sê-lo: se este
      // número subir, alguma coisa se partiu no descodificador.
      expect(maximo(ds)).toBeLessThanOrEqual(2);
    }
  });

  it("redimensionamento: a imagem é encolhida para caber no limite de tamanho", () => {
    for (const escala of [0.6, 0.35]) {
      const ds = distancias((im) =>
        codificarJpeg(
          redimensionar(im, Math.round(LARGURA * escala), Math.round(ALTURA * escala)),
          {
            qualidade: 80,
            subamostragem: [2, 2],
          }
        )
      );
      expect(maximo(ds)).toBeLessThanOrEqual(LIMIAR_PHASH + 2);
    }
  });

  it("recorte de 5% de margem: é o que tira a marca de água do canto", () => {
    const ds = distancias((im) =>
      codificarJpeg(recortar(im, 0.05), { qualidade: 80, subamostragem: [2, 2] })
    );
    // É este o caso que obrigou a guardar dois enquadramentos. Com um só, o
    // mínimo medido era 10 — acima do limiar, e portanto perdido por completo.
    expect(maximo(ds)).toBeLessThanOrEqual(LIMIAR_PHASH);
  });

  it("brilho e contraste mexidos", () => {
    const ds = distancias((im) =>
      codificarJpeg(ajustarBrilho(im, 1.3, -22), { qualidade: 85, subamostragem: [2, 2] })
    );
    expect(maximo(ds)).toBeLessThanOrEqual(LIMIAR_PHASH);
  });

  it("guardada noutro formato", () => {
    const ds = distancias((im) => codificarPng(im, 2));
    expect(maximo(ds)).toBeLessThanOrEqual(2);
  });

  it("a mesma fotografia sem lhe tocar dá exactamente a mesma impressão", () => {
    // Determinismo: sem isto, duas leituras do mesmo ficheiro podiam dar
    // impressões diferentes e nada no sistema daria por isso.
    const bytes = codificarJpeg(BASES[0], { qualidade: 90, subamostragem: [2, 2] });
    expect(impressaoDeFotografia(bytes)).toEqual(impressaoDeFotografia(bytes));
  });
});

describe("a tabela que está no comentário do impressao.ts", () => {
  it("imprime-se aqui, para que os números do comentário sejam conferíveis", () => {
    // O comentário do `lib/fotos/impressao.ts` cita uma tabela. Esta é a
    // corrida que a produz: quem quiser verificá-la corre este ficheiro e lê a
    // saída, em vez de acreditar num número escrito à mão que ninguém sabe de
    // onde veio.
    const linha = (nome: string, ds: number[]) => {
      const o = [...ds].sort((a, b) => a - b);
      const mediana =
        o.length % 2 ? o[o.length >> 1] : (o[(o.length >> 1) - 1] + o[o.length >> 1]) / 2;
      console.log(
        `${nome.padEnd(34)} n=${String(o.length).padStart(3)}  mín=${String(o[0]).padStart(2)}  mediana=${String(mediana).padStart(4)}  máx=${String(o[o.length - 1]).padStart(2)}`
      );
    };

    const recompressao = [70, 45].flatMap((qualidade) =>
      distancias((im) => codificarJpeg(im, { qualidade, subamostragem: [2, 2] }))
    );
    const redimensionada = [0.6, 0.35].flatMap((escala) =>
      distancias((im) =>
        codificarJpeg(
          redimensionar(im, Math.round(LARGURA * escala), Math.round(ALTURA * escala)),
          {
            qualidade: 80,
            subamostragem: [2, 2],
          }
        )
      )
    );
    const corte = (f: number) =>
      distancias((im) => codificarJpeg(recortar(im, f), { qualidade: 80, subamostragem: [2, 2] }));

    console.log(`\n--- a mesma fotografia, transformada (${LARGURA}×${ALTURA}) ---`);
    linha("recomprimida (q90 → q70, q45)", recompressao);
    linha("redimensionada (×0,6 e ×0,35)", redimensionada);
    linha("recortada 3% de margem", corte(0.03));
    linha("recortada 5% de margem", corte(0.05));
    linha("recortada 8% de margem", corte(0.08));
    linha(
      "brilho ×1,3 −22",
      distancias((im) =>
        codificarJpeg(ajustarBrilho(im, 1.3, -22), { qualidade: 85, subamostragem: [2, 2] })
      )
    );
    linha(
      "JPEG → PNG",
      distancias((im) => codificarPng(im, 2))
    );

    const diferentes: number[] = [];
    for (let i = 0; i < PUBLICADAS.length; i++) {
      for (let j = i + 1; j < PUBLICADAS.length; j++) {
        diferentes.push(compararImpressoes(PUBLICADAS[i], PUBLICADAS[j]).distanciaPhash);
      }
    }
    linha("duas fotografias diferentes", diferentes);
    console.log(
      "cauda baixa das diferentes:",
      [...diferentes]
        .sort((a, b) => a - b)
        .slice(0, 8)
        .join(", ")
    );
    expect(diferentes.length).toBeGreaterThan(0);
  });
});

describe("duas fotografias diferentes ficam longe", () => {
  /** As distâncias de todos os pares de imagens diferentes. */
  const diferentes: number[] = [];
  for (let i = 0; i < PUBLICADAS.length; i++) {
    for (let j = i + 1; j < PUBLICADAS.length; j++) {
      diferentes.push(compararImpressoes(PUBLICADAS[i], PUBLICADAS[j]).distanciaPhash);
    }
  }
  const ordenadas = [...diferentes].sort((a, b) => a - b);

  it("a cauda baixa é o que interessa, e está onde o comentário diz", () => {
    // Há um par abaixo do limiar, e é conhecido: duas imagens do mesmo cenário
    // com sujeitos diferentes. Está aqui escrito de propósito — é a prova de
    // que **não existe limiar que separe «a mesma fotografia» de «duas
    // fotografias do mesmo sítio»**, e é a razão de a saída do `sinais.ts` ser
    // uma lista de factos e não um veredicto.
    const abaixoDoLimiar = ordenadas.filter((d) => d <= LIMIAR_PHASH);
    expect(abaixoDoLimiar.length).toBeLessThanOrEqual(1);

    // Tirando esse, o par mais próximo está a uma folga confortável do limiar.
    expect(ordenadas[1]).toBeGreaterThanOrEqual(LIMIAR_PHASH + 4);
  });

  it("a mediana das diferentes fica perto de metade dos bits", () => {
    // Metade de 64 é o que se espera de duas impressões sem relação nenhuma, e
    // é o sinal de que a impressão está a usar os 64 bits que tem em vez de os
    // desperdiçar em bits que dizem sempre o mesmo.
    const mediana = ordenadas[ordenadas.length >> 1];
    expect(mediana).toBeGreaterThan(22);
  });

  it("nenhuma imagem diferente entra pelo enquadramento do centro", () => {
    // O segundo enquadramento é uma terceira oportunidade de coincidir por
    // acaso. Mede-se que ela não se materializa: as diferentes têm de continuar
    // longe **depois** de as três comparações terem sido tentadas todas.
    expect(ordenadas.filter((d) => d <= LIMIAR_PHASH).length).toBeLessThanOrEqual(1);
  });
});

describe("a dHash não serve de segunda condição, e foi medido", () => {
  it("exigir também a dHash não corta falsos positivos — só perde casos certos", () => {
    const legitimos: { p: number; d: number }[] = [];
    for (const escala of [0.6, 0.35]) {
      DESCARREGADAS.forEach((im, i) => {
        const x = impressaoDeFotografia(
          codificarJpeg(
            redimensionar(im, Math.round(LARGURA * escala), Math.round(ALTURA * escala)),
            { qualidade: 80, subamostragem: [2, 2] }
          )
        );
        const c = compararImpressoes(PUBLICADAS[i], x);
        legitimos.push({ p: c.distanciaPhash, d: c.distanciaDhash });
      });
    }
    DESCARREGADAS.forEach((im, i) => {
      const x = impressaoDeFotografia(
        codificarJpeg(recortar(im, 0.05), { qualidade: 80, subamostragem: [2, 2] })
      );
      const c = compararImpressoes(PUBLICADAS[i], x);
      legitimos.push({ p: c.distanciaPhash, d: c.distanciaDhash });
    });

    const diferentes: { p: number; d: number }[] = [];
    for (let i = 0; i < PUBLICADAS.length; i++) {
      for (let j = i + 1; j < PUBLICADAS.length; j++) {
        const c = compararImpressoes(PUBLICADAS[i], PUBLICADAS[j]);
        diferentes.push({ p: c.distanciaPhash, d: c.distanciaDhash });
      }
    }

    const soPhash = (v: { p: number }) => v.p <= LIMIAR_PHASH;
    const comDhash = (v: { p: number; d: number }) => v.p <= LIMIAR_PHASH && v.d <= 14;

    // A condição extra não tira um único falso positivo...
    expect(diferentes.filter(comDhash).length).toBe(diferentes.filter(soPhash).length);
    // ...e não acrescenta nada aos legítimos: só pode tirar.
    expect(legitimos.filter(comDhash).length).toBeLessThanOrEqual(legitimos.filter(soPhash).length);
  });
});

describe("as três impressões, e porque é que a aHash não serve", () => {
  it("a aHash distingue pior duas fotografias diferentes", () => {
    // Onde a aHash cede não é na robustez — comparar contra a própria média
    // torna-a tão invariante ao brilho como as outras, e medido dá o mesmo. É
    // na **discriminação**: oito por oito amostras contra uma média só é pouca
    // informação, e duas fotografias que nada têm a ver ficam mais perto uma da
    // outra do que ficariam na pHash. Num sistema onde um falso positivo custa
    // mais do que uma detecção falhada, é esse o lado que decide.
    const planos = BASES.map((b) =>
      descodificarLuma(codificarJpeg(b, { qualidade: 90, subamostragem: [2, 2] }))
    );
    const pisos: Record<string, number> = {};
    for (const [nome, impressao] of [
      ["pHash", phashDePlano],
      ["dHash", dhashDePlano],
      ["aHash", ahashDePlano],
    ] as const) {
      const hs = planos.map(impressao);
      let piso = 64;
      for (let i = 0; i < hs.length; i++) {
        for (let j = i + 1; j < hs.length; j++) {
          piso = Math.min(piso, distanciaDeHamming(hs[i], hs[j]));
        }
      }
      pisos[nome] = piso;
    }
    // O piso da aHash é o mais baixo dos três: é ela que mais aproxima duas
    // fotografias que não têm nada a ver.
    expect(pisos.aHash).toBeLessThanOrEqual(pisos.pHash);
  });

  it("as três dão impressões bem formadas e com bits dos dois lados", () => {
    const plano = descodificarLuma(
      codificarJpeg(imagemSintetica({ largura: 200, altura: 200, semente: 5 }), { qualidade: 90 })
    );
    for (const h of [phashDePlano(plano), dhashDePlano(plano), ahashDePlano(plano)]) {
      expect(impressaoValida(h)).toBe(true);
      const uns = [...h].reduce(
        (n, c) => n + (parseInt(c, 16).toString(2).match(/1/g)?.length ?? 0),
        0
      );
      // Uma impressão que fosse toda a zeros ou toda a uns não distinguia nada.
      expect(uns).toBeGreaterThan(8);
      expect(uns).toBeLessThan(56);
    }
  });

  it("a pHash de um plano liso não rebenta", () => {
    // Uma fotografia completamente uniforme — uma parede, uma sobre-exposição —
    // tem todos os coeficientes a zero e a mediana também. Não pode dar erro,
    // nem `NaN`, nem uma impressão mal formada.
    const liso = criarPlano(64, 64);
    liso.amostras.fill(200);
    expect(impressaoValida(phashDePlano(liso))).toBe(true);
    expect(impressaoValida(dhashDePlano(liso))).toBe(true);
  });
});

describe("a distância de Hamming", () => {
  it("conta os bits que discordam", () => {
    expect(distanciaDeHamming("0000000000000000", "0000000000000000")).toBe(0);
    expect(distanciaDeHamming("0000000000000000", "ffffffffffffffff")).toBe(64);
    expect(distanciaDeHamming("0000000000000000", "0000000000000001")).toBe(1);
    // O bit mais alto do bloco de cima: é o que se perde se os 64 bits forem
    // tratados como um só número de 32.
    expect(distanciaDeHamming("0000000000000000", "8000000000000000")).toBe(1);
    expect(distanciaDeHamming("0000000000000000", "0000000080000000")).toBe(1);
    expect(distanciaDeHamming("ffffffff00000000", "00000000ffffffff")).toBe(64);
  });

  it("é simétrica", () => {
    expect(distanciaDeHamming("1a2b3c4d5e6f7890", "0f1e2d3c4b5a6978")).toBe(
      distanciaDeHamming("0f1e2d3c4b5a6978", "1a2b3c4d5e6f7890")
    );
  });

  it("recusa uma impressão mal formada em vez de a tratar como distante", () => {
    // Devolver um número grande faria uma linha corrompida passar por «não é
    // parecida com nada» e desaparecer em silêncio para sempre.
    expect(() => distanciaDeHamming("abc", "0000000000000000")).toThrow();
    expect(() => distanciaDeHamming("ABCDEF0123456789", "0000000000000000")).toThrow();
    expect(impressaoValida("ABCDEF0123456789")).toBe(false);
    expect(impressaoValida("abcdef0123456789")).toBe(true);
    expect(impressaoValida(null)).toBe(false);
  });
});

describe("comparar duas impressões", () => {
  const a = PUBLICADAS[0];

  it("o enquadramento diz de que lado está o recorte", () => {
    const recortada = impressaoDeFotografia(
      codificarJpeg(recortar(DESCARREGADAS[0], 0.05), { qualidade: 85, subamostragem: [2, 2] })
    );
    // A recortada inteira alinha com o centro da publicada.
    expect(compararImpressoes(recortada, a).enquadramento).toBe("inteira-centro");
    // E ao contrário, o campo tem de dizer o contrário.
    expect(compararImpressoes(a, recortada).enquadramento).toBe("centro-inteira");
  });

  it("é simétrica na distância", () => {
    const b = PUBLICADAS[1];
    expect(compararImpressoes(a, b).distanciaPhash).toBe(compararImpressoes(b, a).distanciaPhash);
  });

  it("uma fotografia contra si própria dá zero e o enquadramento inteiro", () => {
    const c = compararImpressoes(a, a);
    expect(c.distanciaPhash).toBe(0);
    expect(c.distanciaDhash).toBe(0);
    expect(c.enquadramento).toBe("inteira-inteira");
    expect(dentroDoLimiar(c)).toBe(true);
  });
});

describe("o que a impressão não aguenta, e é preciso saber", () => {
  it("uma imagem espelhada não é reconhecida — e o teste existe para o dizer", () => {
    // Não é um defeito escondido: é a fuga mais barata que há, está escrita no
    // cabeçalho do `impressao.ts` e no relatório, e mede-se aqui para que
    // ninguém suponha o contrário.
    const espelhadas = BASES.map((b) => {
      const rgb = new Uint8Array(b.rgb.length);
      for (let y = 0; y < ALTURA; y++) {
        for (let x = 0; x < LARGURA; x++) {
          for (let c = 0; c < 3; c++) {
            rgb[(y * LARGURA + x) * 3 + c] = b.rgb[(y * LARGURA + (LARGURA - 1 - x)) * 3 + c];
          }
        }
      }
      return impressaoDeFotografia(
        codificarJpeg({ largura: LARGURA, altura: ALTURA, rgb }, { qualidade: 90 })
      );
    });
    const ds = espelhadas.map((e, i) => compararImpressoes(PUBLICADAS[i], e).distanciaPhash);
    // Todas acima do limiar: nenhuma seria apanhada.
    expect(Math.min(...ds)).toBeGreaterThan(LIMIAR_PHASH);
  });

  it("um recorte agressivo também não", () => {
    const ds = distancias((im) =>
      codificarJpeg(recortar(im, 0.25), { qualidade: 85, subamostragem: [2, 2] })
    );
    expect(Math.min(...ds)).toBeGreaterThan(LIMIAR_PHASH);
  });
});
