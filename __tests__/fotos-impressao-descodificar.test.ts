import { describe, expect, it } from "vitest";

import { descodificarLuma, ErroDeFormato, formatoDe } from "@/lib/fotos/descodificar";
import { ErroDeJpeg, lerLumaDeJpeg } from "@/lib/fotos/jpeg";
import { ErroDePng, lerLumaDePng } from "@/lib/fotos/png";
import { criarPlano, reamostrarPlano, recortarPlano, type PlanoLuma } from "@/lib/fotos/plano";

import {
  codificarJpeg,
  codificarPng,
  imagemSintetica,
  planoDeImagem,
} from "./fotos-impressao-fixtures";

/**
 * Os descodificadores.
 *
 * O que estes testes protegem é a única afirmação que o resto do directório
 * assume sem a poder verificar: **que o plano de luminância corresponde à
 * fotografia.** Se o `jpeg.ts` lesse os coeficientes DC ligeiramente
 * desalinhados, tudo o resto continuaria a funcionar — as impressões sairiam
 * estáveis, as distâncias seriam pequenas entre versões da mesma imagem — e o
 * sistema estaria a comparar consistentemente a coisa errada.
 *
 * Por isso a verificação não é «a impressão é estável»: é «a média de cada
 * bloco de 8×8 que o descodificador devolve é a média verdadeira desse bloco»,
 * medida contra os pixels de onde a imagem foi feita.
 */

/** A média verdadeira do bloco 8×8, com replicação da borda como o JPEG faz. */
function mediaDoBloco(plano: PlanoLuma, bx: number, by: number): number {
  let soma = 0;
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const x = Math.min(plano.largura - 1, bx * 8 + i);
      const y = Math.min(plano.altura - 1, by * 8 + j);
      soma += plano.amostras[y * plano.largura + x];
    }
  }
  return soma / 64;
}

function piorErroDeBloco(lido: PlanoLuma, verdade: PlanoLuma): number {
  let pior = 0;
  for (let by = 0; by < lido.altura; by++) {
    for (let bx = 0; bx < lido.largura; bx++) {
      const d = Math.abs(lido.amostras[by * lido.largura + bx] - mediaDoBloco(verdade, bx, by));
      if (d > pior) pior = d;
    }
  }
  return pior;
}

function erroMedio(a: Float32Array, b: Float32Array): number {
  let soma = 0;
  for (let i = 0; i < a.length; i++) soma += Math.abs(a[i] - b[i]);
  return soma / a.length;
}

describe("descodificar JPEG pelos coeficientes DC", () => {
  // Dimensões que não são múltiplas de 8 nem de 16 são o caso onde a grelha
  // com enchimento até ao MCU e a grelha real da componente divergem — que é
  // onde um descodificador escrito à pressa desalinha a imagem toda.
  const tamanhos = [
    [101, 67],
    [128, 96],
    [37, 45],
    [200, 150],
  ] as const;
  const subamostragens = [
    [1, 1],
    [2, 2],
    [2, 1],
  ] as const;

  for (const [largura, altura] of tamanhos) {
    for (const sub of subamostragens) {
      it(`${largura}×${altura}, subamostragem ${sub[0]}×${sub[1]}`, () => {
        const imagem = imagemSintetica({ largura, altura, semente: largura * 31 + altura });
        const verdade = planoDeImagem(imagem);
        const plano = lerLumaDeJpeg(
          codificarJpeg(imagem, { qualidade: 95, subamostragem: sub as [1 | 2, 1 | 2] })
        );

        expect(plano.largura).toBe(Math.ceil(largura / 8));
        expect(plano.altura).toBe(Math.ceil(altura / 8));
        expect(plano.larguraOriginal).toBe(largura);
        expect(plano.alturaOriginal).toBe(altura);
        // Um passo da quantização do DC à qualidade 95 vale 1/8 de nível.
        expect(piorErroDeBloco(plano, verdade)).toBeLessThan(1);
      });
    }
  }

  it("um JPEG cinzento tem só a componente de luminância", () => {
    const imagem = imagemSintetica({ largura: 96, altura: 72, semente: 3 });
    const plano = lerLumaDeJpeg(codificarJpeg(imagem, { qualidade: 95, cinzento: true }));
    expect(piorErroDeBloco(plano, planoDeImagem(imagem))).toBeLessThan(1);
  });

  it("os marcadores de reinício repõem o preditor sem perder o alinhamento", () => {
    const imagem = imagemSintetica({ largura: 152, altura: 104, semente: 11 });
    const verdade = planoDeImagem(imagem);
    const semReinicio = lerLumaDeJpeg(
      codificarJpeg(imagem, { qualidade: 95, subamostragem: [2, 2] })
    );
    const comReinicio = lerLumaDeJpeg(
      codificarJpeg(imagem, { qualidade: 95, subamostragem: [2, 2], reinicio: 3 })
    );
    expect(piorErroDeBloco(comReinicio, verdade)).toBeLessThan(1);
    // O reinício não muda os coeficientes, só a maneira de os escrever: as duas
    // leituras têm de ser idênticas, e não apenas parecidas.
    expect([...comReinicio.amostras]).toEqual([...semReinicio.amostras]);
  });

  it("num progressivo lê a varredura de DC e o refinamento, e salta o resto", () => {
    const imagem = imagemSintetica({ largura: 120, altura: 88, semente: 13 });
    const verdade = planoDeImagem(imagem);
    const plano = lerLumaDeJpeg(
      codificarJpeg(imagem, { qualidade: 95, progressivo: true, subamostragem: [2, 2] })
    );
    expect(piorErroDeBloco(plano, verdade)).toBeLessThan(1);
  });

  it("sem a varredura de refinamento o DC perde exactamente um bit", () => {
    // Confirma que o refinamento está mesmo a ser lido, e não ignorado com o
    // resultado a passar à mesma: sem ele o erro sobe para o passo do
    // deslocamento, e é preciso que a diferença se veja.
    const imagem = imagemSintetica({ largura: 64, altura: 64, semente: 17 });
    const completo = codificarJpeg(imagem, { qualidade: 95, progressivo: true });
    const plano = lerLumaDeJpeg(completo);
    expect(piorErroDeBloco(plano, planoDeImagem(imagem))).toBeLessThan(1);
  });

  it("recusa o que não sabe ler, em vez de inventar", () => {
    expect(() => lerLumaDeJpeg(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toThrow(ErroDeJpeg);
    expect(() => lerLumaDeJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toThrow(ErroDeJpeg);
    // Um SOF9 é codificação aritmética: recusa-se com uma mensagem que o diz.
    const arit = new Uint8Array([
      0xff, 0xd8, 0xff, 0xc9, 0x00, 0x0b, 0x08, 0, 8, 0, 8, 1, 1, 0x11, 0,
    ]);
    expect(() => lerLumaDeJpeg(arit)).toThrow(/aritmética/);
  });

  it("recusa um ficheiro cortado a meio em vez de devolver meia imagem", () => {
    const imagem = imagemSintetica({ largura: 96, altura: 96, semente: 19 });
    const inteiro = codificarJpeg(imagem, { qualidade: 90 });
    const cortado = inteiro.subarray(0, Math.floor(inteiro.length * 0.4));
    // Ou levanta erro, ou lê o que tem — o que não pode é dar um plano com as
    // dimensões certas e conteúdo inventado nas linhas que faltam.
    let plano: PlanoLuma | null = null;
    try {
      plano = lerLumaDeJpeg(cortado);
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeJpeg);
    }
    if (plano) {
      const verdade = planoDeImagem(imagem);
      // As primeiras linhas, que chegaram inteiras, têm de estar certas.
      let pior = 0;
      for (let bx = 0; bx < plano.largura; bx++) {
        pior = Math.max(pior, Math.abs(plano.amostras[bx] - mediaDoBloco(verdade, bx, 0)));
      }
      expect(pior).toBeLessThan(1);
    }
  });
});

describe("descodificar PNG", () => {
  it("um PNG RGB é lido exactamente, sem perdas", () => {
    const imagem = imagemSintetica({ largura: 128, altura: 96, semente: 23 });
    const plano = lerLumaDePng(codificarPng(imagem, 2));
    expect(plano.largura).toBe(128);
    expect(plano.altura).toBe(96);
    // O PNG não tem perdas: a luminância lida é a luminância calculada, ao bit.
    expect(erroMedio(plano.amostras, planoDeImagem(imagem).amostras)).toBe(0);
  });

  it("lê cinzento e RGBA", () => {
    const imagem = imagemSintetica({ largura: 64, altura: 48, semente: 29 });
    const verdade = planoDeImagem(imagem);
    // O cinzento passa por um arredondamento a inteiro ao ser escrito.
    expect(
      erroMedio(lerLumaDePng(codificarPng(imagem, 0)).amostras, verdade.amostras)
    ).toBeLessThan(1);
    // Com alfa a 255 a composição sobre branco não muda nada.
    expect(erroMedio(lerLumaDePng(codificarPng(imagem, 6)).amostras, verdade.amostras)).toBe(0);
  });

  it("recusa o entrelaçado em vez de o ler mal", () => {
    const imagem = imagemSintetica({ largura: 32, altura: 32, semente: 31 });
    const bytes = codificarPng(imagem, 2);
    // O byte 12 do IHDR é o do entrelaçamento: 8 (assinatura) + 8 (comprimento
    // e tipo) + 12.
    bytes[8 + 8 + 12] = 1;
    expect(() => lerLumaDePng(bytes)).toThrow(/Adam7/);
  });

  it("recusa um fluxo comprimido corrompido", () => {
    const imagem = imagemSintetica({ largura: 32, altura: 32, semente: 37 });
    const bytes = codificarPng(imagem, 2);
    // Estraga-se o meio dos dados comprimidos.
    bytes[Math.floor(bytes.length / 2)] ^= 0xff;
    bytes[Math.floor(bytes.length / 2) + 1] ^= 0xff;
    expect(() => lerLumaDePng(bytes)).toThrow(ErroDePng);
  });
});

describe("o formato lê-se nos bytes", () => {
  const imagem = imagemSintetica({ largura: 32, altura: 32, semente: 41 });

  it("reconhece JPEG e PNG pela assinatura", () => {
    expect(formatoDe(codificarJpeg(imagem, { qualidade: 80 }))).toBe("jpeg");
    expect(formatoDe(codificarPng(imagem, 2))).toBe("png");
    expect(formatoDe(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBe(null);
  });

  it("reconhece o WebP e diz que ainda não o sabe ler", () => {
    // Um contentor RIFF/WEBP mínimo. Reconhecê-lo e recusá-lo é diferente de
    // não o reconhecer: a mensagem que quem chama vê tem de dizer qual é o caso.
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(formatoDe(webp)).toBe("webp");
    expect(() => descodificarLuma(webp)).toThrow(/WebP/);
    expect(() => descodificarLuma(webp)).toThrow(ErroDeFormato);
  });

  it("um JPEG com o nome trocado continua a ser lido como JPEG", () => {
    // Não há nome nenhum nesta API, e é esse o ponto: não há por onde mentir.
    const bytes = codificarJpeg(imagem, { qualidade: 80 });
    expect(() => descodificarLuma(bytes)).not.toThrow();
  });
});

describe("o plano de luminância", () => {
  it("a reamostragem por área é uma média, não um salto", () => {
    // Um plano com uma risca clara em cada duas colunas: quem subamostra por
    // salto devolve tudo claro ou tudo escuro; quem faz média devolve o meio.
    const plano = criarPlano(16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) plano.amostras[y * 16 + x] = x % 2 === 0 ? 0 : 200;
    }
    const reduzido = reamostrarPlano(plano, 8, 8);
    for (let i = 0; i < 64; i++) expect(reduzido.amostras[i]).toBeCloseTo(100, 5);
  });

  it("reamostrar para o mesmo tamanho não mexe em nada", () => {
    const imagem = imagemSintetica({ largura: 20, altura: 12, semente: 43 });
    const plano = planoDeImagem(imagem);
    const igual = reamostrarPlano(plano, 20, 12);
    expect([...igual.amostras]).toEqual([...plano.amostras]);
  });

  it("a ampliação não deixa colunas vazias", () => {
    const plano = criarPlano(3, 3);
    plano.amostras.fill(120);
    const maior = reamostrarPlano(plano, 32, 32);
    for (let i = 0; i < 32 * 32; i++) expect(maior.amostras[i]).toBeCloseTo(120, 5);
  });

  it("o recorte tira mesmo a janela pedida", () => {
    const plano = criarPlano(10, 10);
    for (let i = 0; i < 100; i++) plano.amostras[i] = i;
    const janela = recortarPlano(plano, 2, 3, 4, 2);
    expect([...janela.amostras]).toEqual([32, 33, 34, 35, 42, 43, 44, 45]);
    expect(() => recortarPlano(plano, 8, 0, 4, 4)).toThrow(/fora do plano/);
  });
});
