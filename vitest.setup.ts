import { vi } from "vitest";

/**
 * Tudo o que este ficheiro faz só existe num browser.
 *
 * Corria à cabeça, sem condição, e por isso **nenhum teste podia pedir o
 * ambiente `node`**: o `Object.defineProperty(window, …)` da linha seguinte
 * rebentava com «window is not defined» antes de o teste chegar a correr.
 *
 * E há código que só se testa em `node`: o `lib/documentos/selo-publico` lê
 * documentos com a chave de serviço e tem uma guarda que lança de propósito se
 * encontrar um `window` — a guarda existe justamente para o módulo nunca
 * chegar ao browser. Em jsdom, essa guarda dispara e o ficheiro de teste morre
 * inteiro.
 *
 * Por isso o setup pergunta primeiro em que ambiente está. Um ficheiro com
 * `// @vitest-environment node` passa por aqui e não recebe nada — que é
 * exactamente o que precisa.
 */
if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom/vitest");

  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }

  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: MockIntersectionObserver,
  });

  // Mock ResizeObserver
  class MockResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: MockResizeObserver,
  });
}
