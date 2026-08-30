"use client";

import { useState, useEffect } from "react";

export default function Preloader() {
  const [show, setShow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Only show preloader on first visit per session
    if (sessionStorage.getItem("pl-loaded")) return;
    sessionStorage.setItem("pl-loaded", "1");

    queueMicrotask(() => setShow(true));

    // Start fade out quickly - 150ms brand impression
    const timer = setTimeout(() => setFadeOut(true), 150);
    // Remove from DOM after fade animation completes
    const remove = setTimeout(() => setShow(false), 400);
    return () => {
      clearTimeout(timer);
      clearTimeout(remove);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-[var(--background)] flex flex-col items-center justify-center"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.25s ease-out",
        pointerEvents: fadeOut ? "none" : "auto",
      }}
      aria-hidden
    >
      <div className="relative mb-12">
        <h1 className="text-4xl md:text-5xl text-[var(--foreground)] tracking-wide">
          PORTAL LUSITANO
        </h1>
        <div className="absolute -bottom-2 left-0 h-[1px] bg-[var(--gold)] w-full preloader-line" />
      </div>
      <div className="w-48 h-[1px] bg-[var(--background-elevated)] overflow-hidden">
        <div className="h-full w-full bg-[var(--gold)] preloader-bar" />
      </div>
    </div>
  );
}
