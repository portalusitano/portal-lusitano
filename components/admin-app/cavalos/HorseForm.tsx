"use client";

import { X } from "lucide-react";
import { CavaloAdmin } from "@/types/cavalo";
import Seleccao from "@/components/ui/Seleccao";

const sexoOptions = [
  { value: "macho", label: "Garanhão" },
  { value: "femea", label: "Égua" },
  { value: "castrado", label: "Castrado" },
];

const nivelOptions = [
  { value: "desbastado", label: "Desbastado" },
  { value: "iniciado", label: "Iniciado" },
  { value: "avancado", label: "Avançado" },
  { value: "competicao", label: "Competição" },
];

interface HorseFormData {
  nome: string;
  slug: string;
  descricao: string;
  sexo: string;
  idade: string;
  cor: string;
  altura: string;
  linhagem: string;
  pai: string;
  mae: string;
  nivel_treino: string;
  disciplinas: string[];
  preco: string;
  preco_negociavel: boolean;
  preco_sob_consulta: boolean;
  vendedor_nome: string;
  vendedor_telefone: string;
  vendedor_email: string;
  localizacao: string;
  regiao: string;
  destaque: boolean;
}

interface HorseFormProps {
  show: boolean;
  editingCavalo: CavaloAdmin | null;
  formData: HorseFormData;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<HorseFormData>) => void;
  onNameChange: (name: string, slug: string) => void;
}

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function HorseForm({
  show,
  editingCavalo,
  formData,
  onClose,
  onSubmit,
  onChange,
  onNameChange,
}: HorseFormProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-3xl w-full p-8 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {editingCavalo ? "Editar Anúncio" : "Novo Anúncio"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Cavalo *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  onNameChange(nome, generateSlug(nome));
                }}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexo *</label>
              <Seleccao
                value={formData.sexo}
                onChange={(e) => onChange({ sexo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {sexoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Seleccao>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idade (anos)</label>
              <input
                type="number"
                value={formData.idade}
                onChange={(e) => onChange({ idade: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
              <input
                type="text"
                value={formData.cor}
                onChange={(e) => onChange({ cor: e.target.value })}
                placeholder="Ex: Ruço, Castanho, Preto"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Altura (metros)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.altura}
                onChange={(e) => onChange({ altura: e.target.value })}
                placeholder="Ex: 1.65"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linhagem</label>
              <input
                type="text"
                value={formData.linhagem}
                onChange={(e) => onChange({ linhagem: e.target.value })}
                placeholder="Ex: Veiga, Andrade, Alter Real"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível de Treino
              </label>
              <Seleccao
                value={formData.nivel_treino}
                onChange={(e) => onChange({ nivel_treino: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {nivelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Seleccao>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (€)</label>
              <input
                type="number"
                value={formData.preco}
                onChange={(e) => onChange({ preco: e.target.value })}
                disabled={formData.preco_sob_consulta}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.preco_sob_consulta}
                  onChange={(e) => onChange({ preco_sob_consulta: e.target.checked })}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-gray-700">Preço sob consulta</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
              <input
                type="text"
                value={formData.localizacao}
                onChange={(e) => onChange({ localizacao: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Região</label>
              <input
                type="text"
                value={formData.regiao}
                onChange={(e) => onChange({ regiao: e.target.value })}
                placeholder="Ex: Ribatejo, Alentejo"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => onChange({ descricao: e.target.value })}
                required
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.destaque}
                  onChange={(e) => onChange({ destaque: e.target.checked })}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-gray-700">Anúncio em destaque</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.preco_negociavel}
                  onChange={(e) => onChange({ preco_negociavel: e.target.checked })}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-gray-700">Preço negociável</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition"
            >
              {editingCavalo ? "Guardar Alterações" : "Criar Anúncio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
