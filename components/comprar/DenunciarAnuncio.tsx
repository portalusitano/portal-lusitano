"use client";

import { useState } from "react";
import { Flag, Loader2, Check } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { MOTIVOS_DENUNCIA, MAX_DETALHE } from "@/lib/denuncias";

/**
 * Discreet report control for a listing.
 *
 * Deliberately understated: it has to be findable when something is wrong,
 * without competing with the seller's contact buttons on an honest advert.
 */
export default function DenunciarAnuncio({ cavaloId }: { cavaloId: string }) {
  const { showToast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [detalhe, setDetalhe] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const enviar = async () => {
    if (!motivo) {
      showToast("error", "Escolha um motivo");
      return;
    }

    setAEnviar(true);
    try {
      const res = await fetch(`/api/cavalos/${cavaloId}/denuncia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo, detalhe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar denúncia");

      setEnviada(true);
      showToast(
        "success",
        data.jaDenunciado ? "Já tinha denunciado este anúncio" : "Denúncia enviada"
      );
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao enviar denúncia");
    } finally {
      setAEnviar(false);
    }
  };

  if (enviada) {
    return (
      <p className="rotulo flex items-center justify-center gap-2 pt-2">
        <Check size={11} style={{ color: "var(--ok)" }} aria-hidden="true" />
        Denúncia registada. Obrigado.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rotulo flex w-full items-center justify-center gap-2 pt-2 transition-colors hover:text-[var(--foreground-strong)]"
      >
        <Flag size={11} />
        Denunciar anúncio
      </button>
    );
  }

  return (
    <div className="border border-[var(--border)] p-4 space-y-3 mt-2">
      <p className="rotulo">Denunciar anúncio</p>

      <div className="space-y-1.5">
        {MOTIVOS_DENUNCIA.map((m) => (
          <label key={m.id} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="motivo-denuncia"
              value={m.id}
              checked={motivo === m.id}
              onChange={(e) => setMotivo(e.target.value)}
              className="accent-[var(--foreground-strong)]"
            />
            <span className="text-xs text-[var(--foreground-secondary)]">{m.label}</span>
          </label>
        ))}
      </div>

      <textarea
        rows={3}
        value={detalhe}
        maxLength={MAX_DETALHE}
        placeholder="Detalhes (opcional)"
        onChange={(e) => setDetalhe(e.target.value)}
        className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--border-hover)] focus:outline-none resize-y"
      />

      <div className="flex gap-2">
        <button
          onClick={enviar}
          disabled={aEnviar}
          className="inline-flex items-center gap-2 px-4 py-2 border border-red-400/40 rotulo text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          {aEnviar ? <Loader2 size={11} className="animate-spin" /> : <Flag size={11} />}
          Enviar
        </button>
        <button
          onClick={() => setAberto(false)}
          className="px-4 py-2 border border-[var(--border)] rotulo hover:text-[var(--foreground)] transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
