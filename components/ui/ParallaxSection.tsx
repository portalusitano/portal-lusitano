"use client";

import { useRef, useEffect, type ReactNode } from "react";

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: "up" | "down";
}

export default function ParallaxSection({
  children,
  className = "",
  speed = 0.3,
  direction = "up",
}: ParallaxSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  useEffect(() => {
    // Respect reduced motion preference + skip on touch devices (avoids scroll jitter)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const multiplier = direction === "up" ? -1 : 1;

    const update = () => {
      const rect = container.getBoundingClientRect();
      const wh = window.innerHeight;

      if (rect.top < wh && rect.bottom > 0) {
        const progress = (wh - rect.top) / (wh + rect.height);
        inner.style.transform = `translate3d(0, ${progress * speed * 100 * multiplier}px, 0)`;
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [speed, direction]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
