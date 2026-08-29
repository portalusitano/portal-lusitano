"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Flag, Loader2, ShieldCheck, ShieldX } from "lucide-react";

interface Denuncia {
  id: string;
  cavaloId: string;
  cavaloNome: string;
  cavaloStatus: string | null;
  vendedorNome: string | null;
  vendedorEmail: string | null;
  motivo: string;
  motivoLabel: string;
  detalhe: string | null;
  status: string;
  anonima: boolean;
  createdAt: string;
  notaInterna: string | null;
}

const FILTROS = [
  { id: "pendente", label: "Pendentes" },
  { id: "em_analise", label: "Em análise" },
  { id: "procedente", label: "Procedentes" },
  { id: "improcedente", label: "Improcedentes" },
  { id: "todas", label: "Todas" },
];

export default function AdminDenunciasPage() {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [filtro, setFiltro] = useState("pendente");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/denuncias?status=${filtro}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar denúncias");
      setDenuncias(data.denuncias || []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar denúncias");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const decidir = async (id: string, status: string, removerAnuncio = false) => {
    setOcupado(id);
    try {
      const res = await fetch(`/api/admin/denuncias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, removerAnuncio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao actualizar");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao actualizar");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <main className="p-6 sm:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-light tracking-wide text-[var(--foreground)] flex items-center gap-3">
          <Flag size={20} className="text-[var(--gold)]" />
          Denúncias
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          Anúncios reportados por visitantes. Os mais antigos aparecem primeiro.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-8">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-4 py-2 text-[10px] uppercase tracking-[0.25em] border transition-colors ${
              filtro === f.id
                ? "border-[var(--gold)]/50 text-[var(--gold)] bg-[var(--gold)]/5"
                : "border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20 text-[var(--foreground-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}

      {!loading && erro && (
        <div className="border border-red-400/30 p-6 text-center">
          <AlertTriangle size={18} className="mx-auto text-red-400/70 mb-3" />
          <p className="text-sm text-[var(--foreground-muted)]">{erro}</p>
        </div>
      )}

      {!loading && !erro && denuncias.length === 0 && (
        <div className="border border-[var(--border)] p-12 text-center">
          <ShieldCheck size={22} className="mx-auto text-[var(--gold)]/25 mb-4" />
          <p className="text-sm text-[var(--foreground)]">Nada nesta fila.</p>
        </div>
      )}

      <div className="space-y-px bg-[var(--gold)]/8">
        {denuncias.map((d) => (
          <article key={d.id} className="bg-[var(--background)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={`/comprar/${d.cavaloId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-light text-[var(--foreground)] hover:text-[var(--gold)] transition-colors"
                >
                  {d.cavaloNome} ↗
                </a>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                  {d.vendedorNome || "Vendedor desconhecido"}
                  {d.vendedorEmail && ` · ${d.vendedorEmail}`}
                  {d.cavaloStatus && ` · anúncio ${d.cavaloStatus}`}
                </p>
              </div>
              <span className="shrink-0 border border-red-400/30 text-red-400/90 px-2.5 py-1 text-[9px] uppercase tracking-[0.2em]">
                {d.motivoLabel}
              </span>
            </div>

            {d.detalhe && (
              <p className="text-sm text-[var(--foreground-secondary)] mt-4 whitespace-pre-wrap border-l border-[var(--border)] pl-4">
                {d.detalhe}
              </p>
            )}

            <p className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] mt-4">
              {new Date(d.createdAt).toLocaleString("pt-PT")} ·{" "}
              {d.anonima ? "anónima" : "com conta"} · {d.status}
            </p>

            {(d.status === "pendente" || d.status === "em_analise") && (
              <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[var(--border)]">
                {d.status === "pendente" && (
                  <button
                    onClick={() => decidir(d.id, "em_analise")}
                    disabled={ocupado === d.id}
                    className="px-4 py-2 border border-[var(--border)] text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40"
                  >
                    Em análise
                  </button>
                )}
                <button
                  onClick={() => decidir(d.id, "procedente", true)}
                  disabled={ocupado === d.id}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-400/40 text-[10px] uppercase tracking-[0.25em] text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                >
                  {ocupado === d.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <ShieldX size={11} />
                  )}
                  Procedente e despublicar
                </button>
                <button
                  onClick={() => decidir(d.id, "procedente", false)}
                  disabled={ocupado === d.id}
                  className="px-4 py-2 border border-[var(--border)] text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40"
                >
                  Procedente, manter
                </button>
                <button
                  onClick={() => decidir(d.id, "improcedente")}
                  disabled={ocupado === d.id}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] hover:text-emerald-400 hover:border-emerald-400/40 transition-colors disabled:opacity-40"
                >
                  <ShieldCheck size={11} />
                  Improcedente
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
