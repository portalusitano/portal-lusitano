import { useEffect, useRef, type RefObject } from "react";

/**
 * Traps keyboard focus within a container element when active.
 * Handles Tab, Shift+Tab, and Escape key.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  onEscape?: () => void
) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save the previously focused element
    previousFocus.current = document.activeElement as HTMLElement;

    const container = containerRef.current;

    /**
     * O foco vai para o **painel**, não para o primeiro comando lá dentro.
     *
     * Focava o primeiro elemento focável, e no pedido de cookies esse é a
     * ligação «Política de Privacidade», a meio de uma frase: quem abria o site
     * via um anel de foco desenhado à volta de duas palavras de texto corrido,
     * sem ter carregado em nada. A regra global de foco tem `outline: 2px` com
     * `8px` de canto, e à volta de uma ligação em linha isso é uma pastilha.
     *
     * Focar o painel é também o que serve quem não vê o ecrã: o leitor anuncia
     * o nome do diálogo e lê-o do princípio, em vez de aterrar a meio, numa
     * ligação, sem saber o que a rodeia. A partir dali o Tab vai para o
     * primeiro comando pela ordem natural.
     *
     * Quem precisa de focar um campo próprio — a caixa de pesquisa, para se
     * poder escrever de imediato — fá-lo por sua conta, e continua a poder.
     */
    const focarPainel = () => {
      if (container.tabIndex < 0 && !container.hasAttribute("tabindex")) {
        container.tabIndex = -1;
      }
      // Marca-se o que se focou. É o CSS que precisa de saber qual é: um painel
      // focado por código não desenha anel, porque ninguém lá chega com o Tab e
      // um rectângulo em volta de tudo o que se está a ler não assinala nada.
      // Marcar aqui é dizê-lo no único sítio que sabe qual foi.
      container.setAttribute("data-painel-focado", "");
      container.focus();
    };

    // Um quadro de espera, para o painel já estar no DOM.
    const timer = requestAnimationFrame(focarPainel);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeAttribute("data-painel-focado");
      cancelAnimationFrame(timer);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus when modal closes
      if (previousFocus.current && previousFocus.current.focus) {
        previousFocus.current.focus();
      }
    };
  }, [isActive, containerRef, onEscape]);
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
  );
}
