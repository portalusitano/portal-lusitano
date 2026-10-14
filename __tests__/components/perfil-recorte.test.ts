import { describe, expect, it } from "vitest";
import {
  deslocar,
  ladoDeSaida,
  ladoVisivel,
  limitarEnquadramento,
  recorteQuadrado,
  ZOOM_MAX,
  ZOOM_MIN,
  ENQUADRAMENTO_INICIAL,
} from "@/components/perfil/recorte";

/**
 * A invariante deste módulo é uma só, e vale a pena escrevê-la por palavras
 * antes de a afirmar em código: **o quadrado que se corta está sempre inteiro
 * dentro da fotografia**. Um recorte que saia da imagem devolve uma faixa
 * transparente na borda do retrato — e é a borda que se vê num disco.
 *
 * É a mesma forma dos seiscentos quadros dos testes das manchas do globo: uma
 * função total, sem um ramo que devolva o impossível.
 */
describe("recorteQuadrado", () => {
  it("uma fotografia quadrada a zoom 1 corta-se inteira", () => {
    const r = recorteQuadrado({ largura: 1000, altura: 1000 }, ENQUADRAMENTO_INICIAL);
    expect(r).toEqual({ sx: 0, sy: 0, lado: 1000 });
  });

  it("uma paisagem a zoom 1 corta o quadrado do meio", () => {
    const r = recorteQuadrado({ largura: 4032, altura: 3024 }, ENQUADRAMENTO_INICIAL);
    expect(r.lado).toBe(3024);
    expect(r.sy).toBe(0);
    expect(r.sx).toBeCloseTo((4032 - 3024) / 2, 6);
  });

  it("o eixo sem folga não desliza, por mais que se peça", () => {
    // Numa paisagem a zoom 1 a altura está cheia: pedir o centro em y=0
    // não pode subir o recorte para fora da fotografia.
    const r = recorteQuadrado({ largura: 4032, altura: 3024 }, { zoom: 1, centro: { x: 0, y: 0 } });
    expect(r.sy).toBe(0);
    expect(r.sx).toBe(0);
  });

  it("o zoom prende-se aos limites", () => {
    const fonte = { largura: 800, altura: 600 };
    expect(limitarEnquadramento(fonte, { zoom: 99, centro: { x: 0.5, y: 0.5 } }).zoom).toBe(
      ZOOM_MAX
    );
    expect(limitarEnquadramento(fonte, { zoom: 0.1, centro: { x: 0.5, y: 0.5 } }).zoom).toBe(
      ZOOM_MIN
    );
  });

  it("uma fonte degenerada devolve um recorte vazio em vez de NaN", () => {
    expect(recorteQuadrado({ largura: 0, altura: 0 }, ENQUADRAMENTO_INICIAL)).toEqual({
      sx: 0,
      sy: 0,
      lado: 0,
    });
    expect(recorteQuadrado({ largura: -5, altura: 10 }, ENQUADRAMENTO_INICIAL).lado).toBe(0);
  });

  it("valores não-numéricos não escapam", () => {
    const r = recorteQuadrado(
      { largura: 1000, altura: 800 },
      { zoom: Number.NaN, centro: { x: Number.NaN, y: Infinity } }
    );
    expect(Number.isFinite(r.sx)).toBe(true);
    expect(Number.isFinite(r.sy)).toBe(true);
    expect(Number.isFinite(r.lado)).toBe(true);
  });

  /**
   * Mil enquadramentos ao acaso, incluindo os degenerados: fotografias de 1px
   * de lado, panorâmicas de 1:60, zoom no tecto, centros fora do intervalo.
   */
  it("mil enquadramentos ao acaso: o quadrado nunca sai da fotografia", () => {
    let semente = 20260909;
    const aleatorio = () => {
      semente = (semente * 1103515245 + 12345) % 2147483648;
      return semente / 2147483648;
    };

    const casos: { largura: number; altura: number }[] = [
      { largura: 1, altura: 1 },
      { largura: 1, altura: 60 },
      { largura: 6000, altura: 100 },
      { largura: 4032, altura: 3024 },
      { largura: 64, altura: 64 },
    ];
    for (let i = 0; i < 40; i++) {
      casos.push({
        largura: 1 + Math.floor(aleatorio() * 6000),
        altura: 1 + Math.floor(aleatorio() * 6000),
      });
    }

    let contados = 0;
    for (const fonte of casos) {
      for (let i = 0; i < 25; i++) {
        const pedido = {
          zoom: aleatorio() * 9 - 1, // inclui abaixo de 1 e acima do tecto
          centro: { x: aleatorio() * 2 - 0.5, y: aleatorio() * 2 - 0.5 },
        };
        const r = recorteQuadrado(fonte, pedido);
        contados++;

        expect(r.lado).toBeGreaterThan(0);
        expect(r.sx).toBeGreaterThanOrEqual(0);
        expect(r.sy).toBeGreaterThanOrEqual(0);
        // A tolerância é de um milionésimo de pixel: é vírgula flutuante, não
        // folga de desenho.
        expect(r.sx + r.lado).toBeLessThanOrEqual(fonte.largura + 1e-6);
        expect(r.sy + r.lado).toBeLessThanOrEqual(fonte.altura + 1e-6);
        // E é mesmo um quadrado que cabe no lado menor.
        expect(r.lado).toBeLessThanOrEqual(Math.min(fonte.largura, fonte.altura) + 1e-6);
      }
    }
    expect(contados).toBe(casos.length * 25);
  });
});

describe("deslocar", () => {
  it("o mesmo arrasto move o mesmo tanto no ecrã, seja qual for o zoom", () => {
    // Sem a conversão pelo zoom, arrastar 10px afastava o dobro a zoom 2 — um
    // comando que muda de sensibilidade sozinho.
    //
    // A fonte é larga de propósito: num quadrado a zoom 1 não há folga
    // nenhuma no eixo x — o centro está preso a 0,5 e o arrasto **não deve**
    // mexer em nada. Esse caso é o do teste «o eixo sem folga não desliza»; o
    // que aqui se mede é a sensibilidade onde há por onde deslizar.
    const fonte = { largura: 4000, altura: 2000 };
    const palco = 260;

    for (const zoom of [1, 2, 4]) {
      const antes = limitarEnquadramento(fonte, { zoom, centro: { x: 0.5, y: 0.5 } });
      const depois = deslocar(fonte, antes, 20, 0, palco);
      const lado = ladoVisivel(fonte, zoom);
      // Deslocamento em pixéis da fotografia, reconvertido para pixéis de ecrã.
      const emEcra = ((antes.centro.x - depois.centro.x) * fonte.largura) / (lado / palco);
      expect(emEcra).toBeCloseTo(20, 6);
    }
  });

  it("um palco de lado zero não mexe em nada", () => {
    const fonte = { largura: 100, altura: 100 };
    const e = { zoom: 2, centro: { x: 0.5, y: 0.5 } };
    expect(deslocar(fonte, e, 10, 10, 0)).toEqual(e);
  });
});

describe("ladoDeSaida", () => {
  it("não amplia uma fotografia pequena para o tamanho de saída", () => {
    // Ampliar 512 a partir de 200 não acrescenta um detalhe e triplica os bytes.
    expect(ladoDeSaida({ sx: 0, sy: 0, lado: 200 }, 512)).toBe(200);
  });

  it("e corta uma grande ao tamanho de saída", () => {
    expect(ladoDeSaida({ sx: 0, sy: 0, lado: 3024 }, 512)).toBe(512);
  });

  it("nunca devolve zero", () => {
    expect(ladoDeSaida({ sx: 0, sy: 0, lado: 0 }, 512)).toBe(1);
  });
});
