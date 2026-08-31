"use client";

import { X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import Seleccao from "@/components/ui/Seleccao";

interface Evento {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  tipo: string;
  data_inicio: string;
  data_fim?: string;
  localizacao: string;
  regiao?: string;
  preco_entrada?: string;
  imagem_capa?: string;
  destaque: boolean;
  status: string;
  views_count: number;
}

interface EventFormData {
  titulo: string;
  slug: string;
  descricao: string;
  descricao_completa: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  localizacao: string;
  regiao: string;
  organizador: string;
  website: string;
  preco_entrada: string;
  imagem_capa: string;
  destaque: boolean;
}

const tiposEvento = [
  { value: "feira", label: "Feira", color: "bg-amber-100 text-amber-800" },
  { value: "competicao", label: "Competição", color: "bg-blue-100 text-blue-800" },
  { value: "leilao", label: "Leilão", color: "bg-green-100 text-green-800" },
  { value: "exposicao", label: "Exposição", color: "bg-purple-100 text-purple-800" },
  { value: "workshop", label: "Workshop", color: "bg-pink-100 text-pink-800" },
];

interface EventFormProps {
  show: boolean;
  editingEvento: Evento | null;
  formData: EventFormData;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<EventFormData>) => void;
  onTitleChange: (title: string, slug: string) => void;
}

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function EventForm({
  show,
  editingEvento,
  formData,
  onClose,
  onSubmit,
  onChange,
  onTitleChange,
}: EventFormProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full p-8 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {editingEvento ? "Editar Evento" : "Novo Evento"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => {
                  const titulo = e.target.value;
                  onTitleChange(titulo, generateSlug(titulo));
                }}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <Seleccao
                value={formData.tipo}
                onChange={(e) => onChange({ tipo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {tiposEvento.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </Seleccao>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Entrada</label>
              <input
                type="text"
                value={formData.preco_entrada}
                onChange={(e) => onChange({ preco_entrada: e.target.value })}
                placeholder="Ex: 15€ ou Gratuito"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
              <input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => onChange({ data_inicio: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={formData.data_fim}
                onChange={(e) => onChange({ data_fim: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localização *</label>
              <input
                type="text"
                value={formData.localizacao}
                onChange={(e) => onChange({ localizacao: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Região</label>
              <input
                type="text"
                value={formData.regiao}
                onChange={(e) => onChange({ regiao: e.target.value })}
                placeholder="Ex: Ribatejo"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => onChange({ descricao: e.target.value })}
                required
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Imagem de Capa</label>
              <ImageUpload
                currentImage={formData.imagem_capa}
                onUpload={(url) => onChange({ imagem_capa: url })}
                folder="eventos"
                aspectRatio="video"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="destaque"
                checked={formData.destaque}
                onChange={(e) => onChange({ destaque: e.target.checked })}
                className="w-4 h-4 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="destaque" className="text-gray-700">
                Evento em destaque
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
              {editingEvento ? "Guardar Alterações" : "Criar Evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
