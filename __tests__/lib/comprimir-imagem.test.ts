import { describe, it, expect, vi } from "vitest";
import {
  medidaQueCabe,
  valeAPenaEncolher,
  nomeComExtensao,
  comprimirImagem,
  comprimirVarias,
  BYTES_QUE_NAO_VALE_A_PENA,
  type Ferramentas,
} from "@/lib/comprimir-imagem";

/**
 * O que aqui se prova, e a razão de haver ferramentas injectáveis: sem elas
 * só se conseguia testar a aritmética das medidas. O que interessa mesmo é o
 * comportamento em falha — **uma fotografia nunca se perde**.
 */

function ficheiroFalso(nome: string, bytes: number, tipo = "image/jpeg"): File {
  const f = new File([new Uint8Array(1)], nome, { type: tipo });
  // O `size` de um File é só de leitura; para os testes finge-se o tamanho sem
  // ter de alocar dez megabytes de verdade em memória.
  Object.defineProperty(f, "size", { value: bytes });
  return f;
}

const GRANDE = BYTES_QUE_NAO_VALE_A_PENA * 10;

function ferramentasQueDevolvem(bytesDoBlob: number, medida = { width: 4000, height: 3000 }) {
  // O Blob real teria o tamanho do array; forja-se o `size` para se poder
  // testar o caso «saiu maior do que o original» sem alocar nada.
  const desenhar = vi.fn<Ferramentas["desenhar"]>(async () => {
    const b = new Blob([new Uint8Array(1)]);
    Object.defineProperty(b, "size", { value: bytesDoBlob });
    return b;
  });
  const ferramentas: Ferramentas = {
    descodificar: vi.fn(async () => ({ ...medida, close: vi.fn() })),
    desenhar,
  };
  return { ferramentas, desenhar };
}

describe("medidaQueCabe", () => {
  it("encolhe pelo maior lado e mantém a proporção", () => {
    expect(medidaQueCabe(4000, 3000, 2000)).toEqual({ largura: 2000, altura: 1500 });
    expect(medidaQueCabe(3000, 4000, 2000)).toEqual({ largura: 1500, altura: 2000 });
  });

  it("nunca aumenta uma fotografia que já cabe", () => {
    // Esticar não acrescenta informação: dá um ficheiro maior com a mesma
    // imagem, que é o contrário do que este módulo existe para fazer.
    expect(medidaQueCabe(800, 600, 2000)).toEqual({ largura: 800, altura: 600 });
    expect(medidaQueCabe(2000, 1000, 2000)).toEqual({ largura: 2000, altura: 1000 });
  });

  it("não deixa um lado chegar a zero num panorama muito estreito", () => {
    // Uma tela com um lado a zero não desenha nada e o `toBlob` sairia vazio.
    const m = medidaQueCabe(20000, 3, 2000);
    expect(m.altura).toBeGreaterThanOrEqual(1);
  });

  it("aguenta uma medida de zero sem rebentar", () => {
    expect(medidaQueCabe(0, 0, 2000)).toEqual({ largura: 0, altura: 0 });
  });
});

describe("valeAPenaEncolher", () => {
  it("deixa em paz o que já é pequeno", () => {
    expect(valeAPenaEncolher({ size: 100 * 1024, type: "image/jpeg" })).toBe(false);
  });

  it("mexe no que é grande", () => {
    expect(valeAPenaEncolher({ size: GRANDE, type: "image/jpeg" })).toBe(true);
  });

  it("não toca num GIF, que pode ser animado", () => {
    // Redesenhar numa tela deixa só o primeiro quadro: perder a animação é
    // perder informação, e isso não é encolher.
    expect(valeAPenaEncolher({ size: GRANDE, type: "image/gif" })).toBe(false);
  });

  it("não toca no que não é imagem", () => {
    expect(valeAPenaEncolher({ size: GRANDE, type: "application/pdf" })).toBe(false);
  });
});

describe("nomeComExtensao", () => {
  it("troca a extensão", () => {
    expect(nomeComExtensao("IMG_0421.HEIC", "jpg")).toBe("IMG_0421.jpg");
    expect(nomeComExtensao("égua no picadeiro.png", "jpg")).toBe("égua no picadeiro.jpg");
  });

  it("não se engana com um ponto no meio do nome", () => {
    expect(nomeComExtensao("cavalo.v2.final.png", "jpg")).toBe("cavalo.v2.final.jpg");
  });

  it("dá um nome a um ficheiro que só tem extensão", () => {
    expect(nomeComExtensao(".jpeg", "jpg")).toBe("fotografia.jpg");
  });
});

describe("comprimirImagem", () => {
  it("encolhe uma fotografia grande e diz quanto poupou", async () => {
    const { ferramentas } = ferramentasQueDevolvem(300 * 1024);
    const r = await comprimirImagem(ficheiroFalso("a.jpg", GRANDE), { ferramentas });

    expect(r.mudou).toBe(true);
    expect(r.bytesDepois).toBe(300 * 1024);
    expect(r.bytesDepois).toBeLessThan(r.bytesAntes);
    expect(r.ficheiro.type).toBe("image/jpeg");
    expect(r.ficheiro.name).toBe("a.jpg");
  });

  it("pede ao browser para aplicar a rotação do EXIF antes de desenhar", async () => {
    // Sem isto, uma fotografia tirada de lado — que é como saem quase todas —
    // ficava deitada para sempre, porque a tela não copia o EXIF.
    const { ferramentas } = ferramentasQueDevolvem(300 * 1024);
    await comprimirImagem(ficheiroFalso("a.jpg", GRANDE), { ferramentas });
    expect(ferramentas.descodificar).toHaveBeenCalledOnce();
  });

  it("devolve o original quando o resultado sairia maior", async () => {
    // Um WebP já bem comprimido pode crescer em JPEG. Fingir um ganho seria
    // mentir, e guardar o maior seria pior do que não fazer nada.
    const original = ficheiroFalso("a.webp", GRANDE, "image/webp");
    const { ferramentas } = ferramentasQueDevolvem(GRANDE + 1);
    const r = await comprimirImagem(original, { ferramentas });

    expect(r.mudou).toBe(false);
    expect(r.ficheiro).toBe(original);
  });

  it("devolve o original quando a descodificação falha", async () => {
    const original = ficheiroFalso("partida.jpg", GRANDE);
    const r = await comprimirImagem(original, {
      ferramentas: {
        descodificar: async () => {
          throw new Error("imagem ilegível");
        },
        desenhar: async () => null,
      },
    });

    expect(r.mudou).toBe(false);
    expect(r.ficheiro).toBe(original);
  });

  it("devolve o original quando não há tela", async () => {
    // `getContext("2d")` a devolver null acontece a sério: memória esgotada,
    // demasiadas telas vivas. Uma fotografia que não encolheu ainda se
    // publica; uma que se perdeu é um anúncio que não se faz.
    const original = ficheiroFalso("a.jpg", GRANDE);
    const r = await comprimirImagem(original, {
      ferramentas: {
        descodificar: async () => ({ width: 4000, height: 3000 }),
        desenhar: async () => null,
      },
    });

    expect(r.mudou).toBe(false);
    expect(r.ficheiro).toBe(original);
  });

  it("nem sequer descodifica uma fotografia que já é pequena", async () => {
    const { ferramentas } = ferramentasQueDevolvem(10);
    const r = await comprimirImagem(ficheiroFalso("mini.jpg", 50 * 1024), { ferramentas });

    expect(r.mudou).toBe(false);
    expect(ferramentas.descodificar).not.toHaveBeenCalled();
  });
});

describe("comprimirVarias", () => {
  it("trata as fotografias uma de cada vez e vai dizendo em qual vai", async () => {
    // Em paralelo, seis fotografias de doze megapixels são seis telas vivas ao
    // mesmo tempo — num telemóvel o separador morre.
    const passos: number[] = [];
    const { ferramentas } = ferramentasQueDevolvem(200 * 1024);

    const r = await comprimirVarias(
      [
        ficheiroFalso("1.jpg", GRANDE),
        ficheiroFalso("2.jpg", GRANDE),
        ficheiroFalso("3.jpg", GRANDE),
      ],
      { ferramentas, aoProgredir: (feitas) => passos.push(feitas) }
    );

    expect(r).toHaveLength(3);
    expect(passos).toEqual([1, 2, 3]);
    expect(r.every((x) => x.mudou)).toBe(true);
  });

  it("uma falha a meio não leva as outras atrás", async () => {
    let vez = 0;
    const r = await comprimirVarias(
      [ficheiroFalso("1.jpg", GRANDE), ficheiroFalso("2.jpg", GRANDE)],
      {
        ferramentas: {
          descodificar: async () => {
            vez += 1;
            if (vez === 1) throw new Error("a primeira falha");
            return { width: 4000, height: 3000 };
          },
          desenhar: async () => {
            const b = new Blob([new Uint8Array(1)]);
            Object.defineProperty(b, "size", { value: 100 * 1024 });
            return b;
          },
        },
      }
    );

    expect(r[0].mudou).toBe(false);
    expect(r[1].mudou).toBe(true);
  });
});
