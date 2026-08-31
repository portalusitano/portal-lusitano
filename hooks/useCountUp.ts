"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hook para contadores animados que contam de 0 até ao valor alvo.
 * Usa requestAnimationFrame — zero dependências, GPU-friendly.
 */
export function useCountUp(target: number, inView: boolean, duration = 1500): number {
  const [value, setValue] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!inView || hasRun.current) return;
    hasRun.current = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return value;
}
