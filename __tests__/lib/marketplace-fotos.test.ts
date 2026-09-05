import { describe, it, expect } from "vitest";
import {
  MAX_FOTOS,
  fotosDaLinha,
  urlDeArmazenamento,
  validarFotos,
  definirPrincipal,
} from "@/lib/marketplace-fotos";

const SUPABASE = "https://projecto.supabase.co";
const guardada = (nome: string) =>
  `${SUPABASE}/storage/v1/object/public/cavalos-imagens/pending/${nome}.jpg`;

describe("fotosDaLinha", () => {
  it("põe a principal à cabeça mesmo quando está a meio da lista", () => {
    expect(fotosDaLinha({ foto_principal: "b.jpg", fotos: ["a.jpg", "b.jpg", "c.jpg"] })).toEqual([
      "b.jpg",
      "a.jpg",
      "c.jpg",
    ]);
  });

  it("inclui a principal quando não está na lista", () => {
    expect(fotosDaLinha({ foto_principal: "p.jpg", fotos: ["a.jpg"] })).toEqual(["p.jpg", "a.jpg"]);
  });

  it("aceita os nomes antigos das colunas", () => {
    expect(fotosDaLinha({ image_url: "p.jpg", image_urls: ["a.jpg"] })).toEqual(["p.jpg", "a.jpg"]);
  });

  it("aceita listas guardadas como texto separado por vírgulas", () => {
    expect(fotosDaLinha({ fotos: "a.jpg, b.jpg ,, c.jpg" })).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });

  it("não repete a mesma fotografia", () => {
    expect(fotosDaLinha({ foto_principal: "a.jpg", fotos: ["a.jpg", "a.jpg"] })).toEqual(["a.jpg"]);
  });

  it("devolve lista vazia para um anúncio sem fotografias", () => {
    expect(fotosDaLinha({})).toEqual([]);
    expect(fotosDaLinha({ fotos: null, foto_principal: "" })).toEqual([]);
  });
});

describe("urlDeArmazenamento", () => {
  it("aceita ficheiros do bucket do projecto", () => {
    expect(urlDeArmazenamento(guardada("x"), SUPABASE)).toBe(true);
  });

  it("recusa outro domínio, mesmo com o caminho certo", () => {
    expect(
      urlDeArmazenamento(
        "https://outro.example.com/storage/v1/object/public/cavalos-imagens/x.jpg",
        SUPABASE
      )
    ).toBe(false);
  });

  it("recusa outro bucket do mesmo projecto", () => {
    expect(
      urlDeArmazenamento(`${SUPABASE}/storage/v1/object/public/documentos/x.jpg`, SUPABASE)
    ).toBe(false);
  });

  it("recusa http e endereços ilegíveis", () => {
    expect(
      urlDeArmazenamento(
        "http://projecto.supabase.co/storage/v1/object/public/cavalos-imagens/x.jpg",
        SUPABASE
      )
    ).toBe(false);
    expect(urlDeArmazenamento("nao-e-um-url", SUPABASE)).toBe(false);
  });

  it("recusa tudo quando não se sabe qual é o armazenamento", () => {
    expect(urlDeArmazenamento(guardada("x"), null)).toBe(false);
    expect(urlDeArmazenamento(guardada("x"), "")).toBe(false);
  });
});

describe("validarFotos", () => {
  it("aceita fotografias carregadas no portal", () => {
    const r = validarFotos([guardada("a"), guardada("b")], [], SUPABASE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fotos).toHaveLength(2);
      expect(r.principal).toBe(guardada("a"));
    }
  });

  it("deixa manter fotografias antigas que já estavam no anúncio", () => {
    const legado = "https://images.unsplash.com/foto.jpg";
    const r = validarFotos([legado], [legado], SUPABASE);
    expect(r.ok).toBe(true);
  });

  it("recusa endereços externos que não estavam no anúncio", () => {
    const r = validarFotos(["https://exemplo.com/foto.jpg"], [], SUPABASE);
    expect(r).toEqual({
      ok: false,
      erro: "Só é possível usar fotografias carregadas no portal.",
    });
  });

  it("recusa deixar o anúncio sem fotografias", () => {
    expect(validarFotos([], [], SUPABASE).ok).toBe(false);
    expect(validarFotos(["  "], [], SUPABASE).ok).toBe(false);
  });

  it("recusa mais fotografias do que o limite", () => {
    const muitas = Array.from({ length: MAX_FOTOS + 1 }, (_, i) => guardada(`f${i}`));
    const r = validarFotos(muitas, [], SUPABASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain(String(MAX_FOTOS));
  });

  it("recusa o que não é uma lista de textos", () => {
    expect(validarFotos("uma-foto", [], SUPABASE).ok).toBe(false);
    expect(validarFotos([1, 2], [], SUPABASE).ok).toBe(false);
    expect(validarFotos(null, [], SUPABASE).ok).toBe(false);
  });

  it("recusa endereços demasiado longos para a coluna", () => {
    const longa = `${SUPABASE}/storage/v1/object/public/cavalos-imagens/${"a".repeat(600)}.jpg`;
    const r = validarFotos([longa], [], SUPABASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("longo");
  });

  it("elimina repetições mantendo a primeira posição", () => {
    const r = validarFotos([guardada("a"), guardada("b"), guardada("a")], [], SUPABASE);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.fotos).toEqual([guardada("a"), guardada("b")]);
  });
});

describe("definirPrincipal", () => {
  it("traz a fotografia escolhida para a frente", () => {
    expect(definirPrincipal(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
  });

  it("não mexe em nada quando a fotografia não é do anúncio", () => {
    expect(definirPrincipal(["a", "b"], "z")).toEqual(["a", "b"]);
  });
});
