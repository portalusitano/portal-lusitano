"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Star, Trash2, Check } from "lucide-react";
import { MAX_FOTOS, definirPrincipal } from "@/lib/marketplace-fotos";
import type { SellerListing } from "@/lib/marketplace-listings";
import { useToast } from "@/context/ToastContext";

interface GestorFotosProps {
  anuncioId: string;
  fotos: string[];
  onGuardado: (anuncio: SellerListing) => void;
}

/**
 * Fotografias do anúncio, do lado do vendedor.
 *
 * Até aqui as fotografias ficavam congeladas no momento do pagamento: uma
 * fotografia má, ou o cavalo fotografado noutra estação, ficavam assim para
 * sempre. Num classificados a primeira fotografia é o que decide se alguém
 * chega sequer ao anúncio, por isso ela é escolhida aqui explicitamente.
 */
export default function GestorFotos({ anuncioId, fotos, onGuardado }: GestorFotosProps) {
  const { showToast } = useToast();
  const [lista, setLista] = useState<string[]>(fotos);
  const [aCarregar, setACarregar] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const alterado = lista.length !== fotos.length || lista.some((url, i) => url !== fotos[i]);

  const adicionar = async (ficheiros: FileList | null) => {
    if (!ficheiros || ficheiros.length === 0) return;

    const espaco = MAX_FOTOS - lista.length;
    if (espaco <= 0) {
      showToast("error", `Máximo de ${MAX_FOTOS} fotografias por anúncio.`);
      return;
    }

    const escolhidos = Array.from(ficheiros).slice(0, espaco);
    if (escolhidos.length < ficheiros.length) {
      showToast("info", `Só cabem mais ${espaco} fotografias neste anúncio.`);
    }

    setACarregar(true);
    try {
      const corpo = new FormData();
      escolhidos.forEach((f) => corpo.append("images", f));

      const res = await fetch("/api/vender-cavalo/upload", { method: "POST", body: corpo });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error || "Erro ao carregar fotografias");

      setLista((prev) => [...prev, ...(dados.urls as string[])]);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao carregar fotografias");
    } finally {
      setACarregar(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const guardar = async () => {
    setAGuardar(true);
    try {
      const res = await fetch(`/api/meus-anuncios/${anuncioId}/fotos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotos: lista }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error || "Erro ao guardar fotografias");

      onGuardado(dados.anuncio as SellerListing);
      showToast("success", "Fotografias actualizadas");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao guardar fotografias");
    } finally {
      setAGuardar(false);
    }
  };

  const ocupado = aCarregar || aGuardar;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="rotulo">Fotografias</p>
        <p className="text-[10px] text-[var(--foreground-muted)]">
          {lista.length} de {MAX_FOTOS}
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {lista.map((url, indice) => (
          <div
            key={url}
            className={`relative aspect-square overflow-hidden border ${
              indice === 0 ? "border-[var(--gold)]" : "border-[var(--border)]"
            }`}
          >
            <Image src={url} alt="" fill sizes="120px" className="object-cover" />

            {indice === 0 && <span className="selo selo-destaque absolute top-1 left-1">Capa</span>}

            <div className="absolute bottom-1 right-1 flex gap-1">
              {indice !== 0 && (
                <button
                  type="button"
                  onClick={() => setLista((prev) => definirPrincipal(prev, url))}
                  disabled={ocupado}
                  aria-label="Usar como fotografia de capa"
                  className="p-1.5 bg-black/70 text-white hover:text-[var(--gold)] transition-colors disabled:opacity-40"
                >
                  <Star size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setLista((prev) => prev.filter((f) => f !== url))}
                disabled={ocupado}
                aria-label="Remover fotografia"
                className="p-1.5 bg-black/70 text-white hover:text-red-400 transition-colors disabled:opacity-40"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {lista.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={ocupado}
            className="aspect-square border border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1 text-[var(--foreground-muted)] hover:text-[var(--gold)] hover:border-[var(--gold)]/40 transition-colors disabled:opacity-40"
          >
            {aCarregar ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            <span className="text-[11px] uppercase tracking-wider">Adicionar</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => adicionar(e.target.files)}
      />

      {lista.length === 0 && (
        <p className="text-[11px] text-red-400/80">
          O anúncio tem de ficar com pelo menos uma fotografia.
        </p>
      )}

      {alterado && (
        <button
          type="button"
          onClick={guardar}
          disabled={ocupado || lista.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--gold)]/40 rotulo-forte hover:bg-[var(--gold)]/10 transition-colors disabled:opacity-40"
        >
          {aGuardar ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Guardar fotografias
        </button>
      )}
    </div>
  );
}
