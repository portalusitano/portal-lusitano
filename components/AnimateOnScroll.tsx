"use client";

import { useRef, useState, type ReactNode } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

interface AnimateOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimateOnScroll({ children, className = "", delay = 0 }: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(ref, "-80px");
  const [prefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={`transition-all ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{
        // 500ms com a curva do sistema, como o `Revelar`. Estava a 700ms com
        // `ease-out`, e a diferença lia-se ao mudar de secção.
        transitionDuration: "500ms",
        transitionTimingFunction: "var(--ease)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
