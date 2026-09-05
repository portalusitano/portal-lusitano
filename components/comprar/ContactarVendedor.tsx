"use client";

import { useState } from "react";
import { MessagesSquare, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { MAX_MENSAGEM } from "@/lib/marketplace-chat";

interface Props {
  cavaloId: string;
  cavaloNome: string;
}

/**
 * In-portal contact for a listing.
 *
 * Rendered only when the listing is linked to a seller account, so the caller
 * decides whether portal messaging is possible at all; when it is not, the page
 * keeps showing the published phone and email instead.
 */
export default function ContactarVendedor({ cavaloId, cavaloNome }: Props) {
  const { showToast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState(
    `Bom dia, tenho interesse no cavalo "${cavaloNome}". Ainda está disponível?`
  );
  const [aEnviar, setAEnviar] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const enviar = async () => {
    const corpo = mensagem.trim();
    if (!corpo) {
      showToast("error", "Escreva uma mensagem antes de enviar");
      return;
    }

    setAEnviar(true);
    try {
      const res = await fetch("/api/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cavaloId, mensagem: corpo }),
      });

      if (res.status === 401) {
        // Come back to this listing after signing in.
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar mensagem");

      setEnviada(true);
      showToast("success", "Mensagem enviada ao vendedor");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao enviar mensagem");
    } finally {
      setAEnviar(false);
    }
  };

  if (enviada) {
    return (
      <div className="border border-[var(--border-soft)] bg-[var(--elevate-1)] px-4 py-4 text-center">
        <Check
          size={18}
          className="mx-auto mb-2"
          style={{ color: "var(--ok)" }}
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--foreground)]">Mensagem enviada</p>
        <a href="/minha-conta/mensagens" className="inline-block mt-3 rotulo-forte hover:underline">
          Ver as minhas mensagens →
        </a>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="btn btn-primario w-full gap-3 rounded-full py-4"
      >
        <MessagesSquare size={16} aria-hidden="true" />
        Mensagem no portal
      </button>
    );
  }

  return (
    <div className="border border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="rotulo">Mensagem ao vendedor</span>
        <button
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <textarea
        rows={4}
        value={mensagem}
        maxLength={MAX_MENSAGEM}
        onChange={(e) => setMensagem(e.target.value)}
        className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--border-hover)] focus:outline-none resize-y"
      />

      <button
        onClick={enviar}
        disabled={aEnviar}
        className="btn btn-primario w-full gap-2 rounded-full py-3"
      >
        {aEnviar ? <Loader2 size={14} className="animate-spin" /> : <MessagesSquare size={14} />}
        Enviar
      </button>

      <p className="rotulo text-center">
        A conversa fica no portal · O seu contacto não é partilhado
      </p>
    </div>
  );
}
