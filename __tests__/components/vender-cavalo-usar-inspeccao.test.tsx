import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useInspeccao } from "@/components/vender-cavalo/usar-inspeccao";
import type { MensagensInspeccao } from "@/components/vender-cavalo/inspeccao";
import { initialFormData } from "@/components/vender-cavalo/data";
import type { FormData } from "@/components/vender-cavalo/types";

const m = new Proxy({} as MensagensInspeccao, {
  get: (_alvo, chave) => {
    const nome = String(chave);
    return (arg?: unknown) => (arg === undefined ? nome : `${nome}:${String(arg)}`);
  },
}) as unknown as MensagensInspeccao;

const forma = (parcial: Partial<FormData>): FormData => ({ ...initialFormData, ...parcial });

/**
 * O que se exercita aqui é **quando** um campo fala, que é a parte que a
 * `inspeccao.ts` de propósito não sabe. As duas regras são estas: nunca marcar
 * quem ainda está a escrever, e não esperar pelo botão de Continuar.
 */
describe("quando é que um campo pode falar", () => {
  it("um campo onde ainda ninguém entrou cala-se, mesmo tendo o que dizer", () => {
    const { result } = renderHook(() => useInspeccao(forma({ altura: "193" }), m));
    // A inspecção já o encontrou…
    expect(result.current.todos).toHaveLength(1);
    // …mas ninguém saiu do campo, e por isso não se vê nada.
    expect(result.current.visiveis).toEqual({});
  });

  it("ao sair do campo, o apontamento aparece", () => {
    const { result } = renderHook(() => useInspeccao(forma({ altura: "193" }), m));
    act(() => result.current.aoSair("altura"));
    expect(result.current.visiveis.altura).toHaveLength(1);
    expect(result.current.visiveis.altura[0].nivel).toBe("aviso");
  });

  it("voltar ao campo e escrever cala-o outra vez", () => {
    const { result, rerender } = renderHook(
      ({ dados }: { dados: FormData }) => useInspeccao(dados, m),
      { initialProps: { dados: forma({ altura: "193" }) } }
    );
    act(() => result.current.aoSair("altura"));
    expect(result.current.visiveis.altura).toHaveLength(1);

    // Entrar de novo e mexer: enquanto se corrige, o campo não repete a queixa
    // a cada tecla.
    act(() => result.current.aoFocar("altura", "193"));
    act(() => result.current.aoEscrever("altura", "19"));
    rerender({ dados: forma({ altura: "19" }) });
    expect(result.current.visiveis.altura).toBeUndefined();

    // E ao sair, volta a falar — agora sobre o valor novo.
    act(() => result.current.aoSair("altura"));
    expect(result.current.visiveis.altura).toHaveLength(1);
  });

  it("entrar num campo e sair sem lhe tocar não apaga o que ele já dizia", () => {
    const { result } = renderHook(() => useInspeccao(forma({ altura: "193" }), m));
    act(() => result.current.aoSair("altura"));
    act(() => result.current.aoFocar("altura", "193"));
    act(() => result.current.aoEscrever("altura", "193"));
    expect(result.current.visiveis.altura).toHaveLength(1);
  });

  it("uma escolha numa lista fala logo, sem esperar pelo `blur`", () => {
    // Escolher uma opção é um acto acabado: não há meia escolha, e um
    // `<Seleccao>` não tem um `blur` de que se possa depender.
    const { result } = renderHook(() =>
      useInspeccao(forma({ data_nascimento: "2024-04-12", nivel_treino: "Alta Escola" }), m)
    );
    expect(result.current.visiveis).toEqual({});
    act(() => result.current.marcarTocado("nivel_treino"));
    expect(result.current.visiveis.nivel_treino).toHaveLength(1);
  });

  it("os erros nunca passam por aqui — vão pelo caminho que trava o passo", () => {
    const { result } = renderHook(() => useInspeccao(forma({ microchip: "62009810012" }), m));
    act(() => result.current.aoSair("microchip"));
    // O `visiveis` só leva avisos e sugestões; o erro sai pelo `erroDe`, e é
    // esse que a página põe no resumo e que impede o avanço.
    expect(result.current.visiveis).toEqual({});
    expect(result.current.erroDe("microchip")?.nivel).toBe("erro");
  });

  it("um campo sem nada a dizer continua sem nada a dizer depois de tocado", () => {
    const { result } = renderHook(() => useInspeccao(forma({ altura: "163" }), m));
    act(() => result.current.aoSair("altura"));
    expect(result.current.visiveis).toEqual({});
    expect(result.current.erroDe("altura")).toBeUndefined();
  });

  it("o duplicado do registo entra pelo contexto e respeita a mesma espera", () => {
    const { result } = renderHook(() =>
      useInspeccao(forma({ numero_registo: "PSL-2019-4471" }), m, { registoDuplicado: true })
    );
    expect(result.current.visiveis).toEqual({});
    act(() => result.current.aoSair("numero_registo"));
    expect(result.current.visiveis.numero_registo?.[0].nivel).toBe("aviso");
  });
});
