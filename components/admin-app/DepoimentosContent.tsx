"use client";

import { useEffect, useState } from "react";
import { Star, Check, X } from "lucide-react";

interface Depoimento {
  id: string;
  mensagem: string;
  autor_nome: string;
  autor_cargo: string;
  status: string;
  created_at: string;
  cavalos_venda?: {
    nome: string;
  };
}

export default function DepoimentosContent() {
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDepoimentos();
  }, []);

  const fetchDepoimentos = async () => {
    try {
      const res = await fetch("/api/admin/depoimentos");
      if (!res.ok) throw new Error("Failed to fetch depoimentos");

      const data = await res.json();
      setDepoimentos(data.pendentes || []);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[DepoimentosContent]", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: "aprovado" | "rejeitado") => {
    try {
      const res = await fetch(`/api/admin/depoimentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      // Remover da lista local
      setDepoimentos((prev) => prev.filter((dep) => dep.id !== id));
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[DepoimentosContent]", error);
      alert("Erro ao atualizar depoimento");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5A059]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Star className="text-[#C5A059]" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-white">Curadoria de Testemunhos</h1>
              <p className="text-gray-400">Aprovar ou rejeitar depoimentos sobre cavalos</p>
            </div>
          </div>
        </div>

        {/* Lista de Depoimentos */}
        {depoimentos.length === 0 ? (
          <div className="text-center py-20">
            <Star className="text-zinc-700 mx-auto mb-4" size={60} />
            <p className="text-gray-500">Nenhum depoimento pendente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {depoimentos.map((dep) => (
              <div
                key={dep.id}
                className="bg-white/5 border border-white/10 p-8 rounded-lg flex justify-between items-start hover:border-white/20 transition-all"
              >
                <div className="max-w-2xl flex-1">
                  {dep.cavalos_venda?.nome && (
                    <p className="text-[#C5A059] text-xs uppercase font-bold mb-2 tracking-wider">
                      Sobre: {dep.cavalos_venda.nome}
                    </p>
                  )}
                  <p className="text-xl font-normal text-gray-300 mb-4">
                    {`\u201C${dep.mensagem}\u201D`}
                  </p>
                  <p className="text-xs uppercase tracking-tight text-gray-500">
                    {dep.autor_nome} — {dep.autor_cargo}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    {new Date(dep.created_at).toLocaleDateString("pt-PT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex gap-4 ml-6">
                  <button
                    onClick={() => updateStatus(dep.id, "aprovado")}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-bold uppercase transition-colors"
                  >
                    <Check size={14} />
                    Aprovar
                  </button>
                  <button
                    onClick={() => updateStatus(dep.id, "rejeitado")}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold uppercase transition-colors"
                  >
                    <X size={14} />
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
