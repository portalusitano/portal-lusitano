"use client";

import Link from "next/link";
import { Edit, Trash2, Eye, Star, MapPin } from "lucide-react";
import { CavaloAdmin } from "@/types/cavalo";

const sexoOptions = [
  { value: "macho", label: "Garanhão" },
  { value: "femea", label: "Égua" },
  { value: "castrado", label: "Castrado" },
];

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  vendido: "bg-gray-100 text-gray-800",
  reservado: "bg-amber-100 text-amber-800",
  inativo: "bg-red-100 text-red-800",
};

interface HorseTableProps {
  cavalos: CavaloAdmin[];
  loading: boolean;
  onEdit: (cavalo: CavaloAdmin) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

function formatPrice(cavalo: CavaloAdmin) {
  if (cavalo.preco_sob_consulta) return "Sob consulta";
  if (!cavalo.preco) return "A definir";
  return `€${cavalo.preco.toLocaleString("pt-PT")}`;
}

export default function HorseTable({
  cavalos,
  loading,
  onEdit,
  onDelete,
  onUpdateStatus,
}: HorseTableProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cavalo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Detalhes
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Preço
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Views
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {cavalos.map((cavalo) => (
            <tr key={cavalo.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {cavalo.destaque && <Star size={16} className="text-amber-500 fill-amber-500" />}
                  <div>
                    <p className="font-medium text-gray-900">{cavalo.nome}</p>
                    {cavalo.linhagem && (
                      <p className="text-sm text-amber-600">Linhagem {cavalo.linhagem}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-gray-600 text-sm">
                  {sexoOptions.find((s) => s.value === cavalo.sexo)?.label} • {cavalo.idade} anos •{" "}
                  {cavalo.cor}
                </p>
                <p className="text-gray-500 text-sm flex items-center gap-1">
                  <MapPin size={12} />
                  {cavalo.localizacao}
                </p>
              </td>
              <td className="px-6 py-4">
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  {formatPrice(cavalo)}
                </span>
              </td>
              <td className="px-6 py-4">
                <select
                  value={cavalo.status}
                  onChange={(e) => onUpdateStatus(cavalo.id, e.target.value)}
                  className={`px-2 py-1 rounded text-xs font-medium ${statusColors[cavalo.status] || "bg-gray-100"}`}
                >
                  <option value="active">Ativo</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                  <option value="inativo">Inativo</option>
                </select>
              </td>
              <td className="px-6 py-4 text-gray-600">{cavalo.views_count || 0}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/comprar/${cavalo.id}`}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    target="_blank"
                  >
                    <Eye size={18} />
                  </Link>
                  <button
                    onClick={() => onEdit(cavalo)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(cavalo.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
