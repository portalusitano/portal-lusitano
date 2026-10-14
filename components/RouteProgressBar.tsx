"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * RouteProgressBar — gold 2px progress bar at the top during route transitions.
 *
 * Works with Next.js App Router by:
 * 1. Intercepting internal <a> clicks to detect navigation START
 * 2. Watching usePathname() changes to detect navigation END
 */
export default function RouteProgressBar() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "completing">("idle");
  const [progress, setProgress] = useState(0);
  const prevPath = useRef(pathname);
  const pathRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Mantém `pathRef` em dia para o listener de cliques, que é registado uma
  // vez só e por isso não pode fechar sobre o `pathname`. A sincronização é
  // feita num efeito e não durante o render: escrever num ref enquanto se
  // renderiza é o tipo de coisa que passa despercebida até o React repetir um
  // render e o valor deixar de corresponder ao que está no ecrã.
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // Navegação terminada — fechar a barra.
  //
  // As actualizações de estado são agendadas em vez de aplicadas no corpo do
  // efeito: encadeá-las a partir daqui provoca renders em cascata, e o React
  // avisa disso com razão. Um temporizador a zero chega para as tirar do
  // caminho do render que as originou.
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    if (state !== "loading") return;

    const aFechar = setTimeout(() => {
      setProgress(100);
      setState("completing");
    }, 0);
    timerRef.current = setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 300);

    return () => clearTimeout(aFechar);
  }, [pathname, state]);

  // Intercept link clicks to start progress — stable callback using ref
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      // Skip external, hash, mailto, tel links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank"
      )
        return;
      // Skip same page
      if (href === pathRef.current) return;

      // Start progress
      setState("loading");
      setProgress(20);

      if (timerRef.current) clearTimeout(timerRef.current);

      // Simulate incremental progress
      setTimeout(() => setProgress((p) => Math.max(p, 40)), 150);
      setTimeout(() => setProgress((p) => Math.max(p, 60)), 400);
      setTimeout(() => setProgress((p) => Math.max(p, 78)), 800);
    };

    document.addEventListener("click", handleClick, { passive: true });
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (state === "idle") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 2,
        zIndex: 99990,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--gold, #c6a15b)",
          transition:
            state === "completing"
              ? "width 0.2s ease-out, opacity 0.3s ease 0.1s"
              : "width 0.4s ease-out",
          opacity: state === "completing" ? 0 : 1,
          boxShadow: "0 0 10px rgb(var(--gold-rgb) / 0.5)",
        }}
      />
    </div>
  );
}
