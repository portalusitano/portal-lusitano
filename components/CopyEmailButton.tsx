"use client";

import { useState } from "react";

export default function CopyEmailButton() {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText("portal.lusitano2023@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={copyEmail} className="rotulo hover:text-[var(--gold)] transition-colors">
      {copied ? "Copiado \u2713" : "Copiar email"}
    </button>
  );
}
