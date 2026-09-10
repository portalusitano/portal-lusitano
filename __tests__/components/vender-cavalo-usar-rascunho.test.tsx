import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRascunho, type DadosDoRascunho } from "@/components/vender-cavalo/usar-rascunho";
import { CHAVE_RASCUNHO, limparRascunho } from "@/components/vender-cavalo/rascunho";
import { initialFormData } from "@/components/vender-cavalo/data";
import type { FormData } from "@/components/vender-cavalo/types";

const dados = (formData: Partial<FormData> = {}, extra: Partial<DadosDoRascunho> = {}) => ({
  formData: { ...initialFormData, ...formData },
  passo: 1,
  plano: "standard",
  fotografias: 0,
  documentos: 0,
  ...extra,
});

/**
 * O que se exercita aqui é a **promessa**: o formulário só pode dizer
 * «guardado» depois de estar guardado, e o que estiver por gravar não se pode
 * perder por a página se fechar antes do silêncio acabar.
 *
 * O atraso é a parte que se paga para não escrever 2 227 bytes por tecla; a
 * gravação à saída é a parte que faz com que o atraso não custe nada a quem
 * escreve. Uma sem a outra seria trocar um defeito por outro.
 */
describe("o rascunho guarda-se sozinho, e diz a verdade sobre isso", () => {
  beforeEach(() => {
    limparRascunho();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("um formulário em que ninguém tocou não diz que está a guardar", () => {
    const { result } = renderHook(() => useRascunho(dados(), true));
    expect(result.current.estado).toBe("vazio");
  });

  it("antes de o rascunho existente ser lido não se escreve nada por cima dele", () => {
    // A trava do arranque. Sem ela, a primeira gravação da página escrevia o
    // formulário vazio por cima do que lá estava.
    localStorage.setItem(CHAVE_RASCUNHO, "o-que-la-estava");
    renderHook(() => useRascunho(dados({ nome: "Zíngaro" }), false));
    act(() => void vi.advanceTimersByTime(5000));
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toBe("o-que-la-estava");
  });

  it("enquanto se escreve diz «por guardar», e não «guardado»", () => {
    const { result } = renderHook(() => useRascunho(dados({ nome: "Zíngaro" }), true));
    expect(result.current.estado).toBe("por-guardar");
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
  });

  it("passado o silêncio grava, e só então diz «guardado»", () => {
    const { result } = renderHook(() => useRascunho(dados({ nome: "Zíngaro" }), true));
    act(() => void vi.advanceTimersByTime(800));
    expect(result.current.estado).toBe("guardado");
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toContain("Zíngaro");
  });

  it("uma tecla adia a gravação em vez de a fazer", () => {
    // Era uma gravação por tecla: 38 teclas, 38 `JSON.stringify` de noventa e
    // cinco campos e 38 `setItem` síncronos na linha principal.
    const escritas = vi.spyOn(Storage.prototype, "setItem");
    const { rerender } = renderHook(({ d }) => useRascunho(d, true), {
      initialProps: { d: dados({ nome: "Z" }) },
    });
    for (const nome of ["Zí", "Zín", "Zíng", "Zínga", "Zíngar", "Zíngaro"]) {
      act(() => void vi.advanceTimersByTime(120));
      rerender({ d: dados({ nome }) });
    }
    expect(escritas).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(800));
    expect(escritas).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toContain("Zíngaro");
    escritas.mockRestore();
  });

  it("fechar o separador a meio de uma palavra grava o que faltava", () => {
    // É isto que torna o atraso honesto. Sem esta gravação, esperar por
    // silêncio seria perder as últimas teclas de quem sai a meio.
    renderHook(() => useRascunho(dados({ nome: "Zíngaro" }), true));
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();

    act(() => void window.dispatchEvent(new Event("pagehide")));
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toContain("Zíngaro");
  });

  it("pôr o separador de lado também grava — em telemóvel é o caso normal", () => {
    renderHook(() => useRascunho(dados({ nome: "Zíngaro" }), true));
    const original = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toContain("Zíngaro");
    if (original) Object.defineProperty(Document.prototype, "visibilityState", original);
  });

  it("já gravado, a saída não volta a gravar", () => {
    renderHook(() => useRascunho(dados({ nome: "Zíngaro" }), true));
    act(() => void vi.advanceTimersByTime(800));
    const escritas = vi.spyOn(Storage.prototype, "setItem");
    act(() => void window.dispatchEvent(new Event("pagehide")));
    expect(escritas).not.toHaveBeenCalled();
    escritas.mockRestore();
  });

  it("quando o browser recusa, diz que recusou — e não «guardado»", () => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };
    try {
      const { result } = renderHook(() => useRascunho(dados({ nome: "Zíngaro" }), true));
      act(() => void vi.advanceTimersByTime(800));
      expect(result.current.estado).toBe("recusado");
    } finally {
      Storage.prototype.setItem = real;
    }
  });

  it("escrever outra vez depois de gravado volta a «por guardar»", () => {
    const { result, rerender } = renderHook(({ d }) => useRascunho(d, true), {
      initialProps: { d: dados({ nome: "Zíngaro" }) },
    });
    act(() => void vi.advanceTimersByTime(800));
    expect(result.current.estado).toBe("guardado");

    rerender({ d: dados({ nome: "Zíngaro II" }) });
    expect(result.current.estado).toBe("por-guardar");
  });
});
