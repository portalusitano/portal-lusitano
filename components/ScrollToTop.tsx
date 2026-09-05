"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const rafId = useRef(0);
  const lastVisible = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const shouldShow = window.scrollY > 400;
        // Only trigger re-render when state actually changes
        if (shouldShow !== lastVisible.current) {
          lastVisible.current = shouldShow;
          setIsVisible(shouldShow);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-[calc(2.5rem+72px)] lg:bottom-10 right-6 lg:right-10 z-[60] group flex flex-col items-center gap-2 transition-all duration-300 hover:scale-110 active:scale-95 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5 pointer-events-none"
      }`}
      aria-label="Voltar ao topo"
    >
      {/* O Circulo do Botao */}
      <div className="w-12 h-12 bg-[var(--background-card)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--foreground)] transition-all duration-500 group-hover:border-[var(--foreground-strong)] group-hover:bg-[var(--foreground-strong)] group-hover:text-black shadow-2xl">
        <ChevronUp
          size={20}
          className="group-hover:-translate-y-1 transition-transform duration-300"
        />
      </div>

      {/* Texto Lateral/Inferior Subtil */}
      <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 font-bold">
        Topo
      </span>
    </button>
  );
}
