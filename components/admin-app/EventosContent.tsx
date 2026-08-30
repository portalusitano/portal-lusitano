"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Plus, Edit, Trash2, Eye, Star, MapPin, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

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

const tiposEvento = [
  { value: "feira", label: "Feira", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  {
    value: "competicao",
    label: "Competição",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  { value: "leilao", label: "Leilão", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  {
    value: "exposicao",
    label: "Exposição",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    value: "workshop",
    label: "Workshop",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  },
];

export default function EventosContent() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    slug: "",
    descricao: "",
    descricao_completa: "",
    tipo: "feira",
    data_inicio: "",
    data_fim: "",
    localizacao: "",
    regiao: "",
    organizador: "",
    website: "",
    preco_entrada: "",
    imagem_capa: "",
    destaque: false,
  });

  useEffect(() => {
    fetchEventos();
  }, []);

  async function fetchEventos() {
    try {
      const res = await fetch("/api/admin/eventos");
      if (res.ok) {
        const data = await res.json();
        setEventos(data.eventos || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[EventosContent]", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingEvento ? `/api/admin/eventos/${editingEvento.id}` : "/api/admin/eventos";
      const method = editingEvento ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchEventos();
        resetForm();
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[EventosContent]", error);
    }
  }

  async function deleteEvento(id: string) {
    if (!confirm("Tem a certeza que deseja eliminar este evento?")) return;

    try {
      const res = await fetch(`/api/admin/eventos/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchEventos();
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[EventosContent]", error);
    }
  }

  function startEdit(evento: Evento) {
    setEditingEvento(evento);
    setFormData({
      titulo: evento.titulo,
      slug: evento.slug,
      descricao: evento.descricao,
      descricao_completa: "",
      tipo: evento.tipo,
      data_inicio: evento.data_inicio,
      data_fim: evento.data_fim || "",
      localizacao: evento.localizacao,
      regiao: evento.regiao || "",
      organizador: "",
      website: "",
      preco_entrada: evento.preco_entrada || "",
      imagem_capa: evento.imagem_capa || "",
      destaque: evento.destaque,
    });
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingEvento(null);
    setFormData({
      titulo: "",
      slug: "",
      descricao: "",
      descricao_completa: "",
      tipo: "feira",
      data_inicio: "",
      data_fim: "",
      localizacao: "",
      regiao: "",
      organizador: "",
      website: "",
      preco_entrada: "",
      imagem_capa: "",
      destaque: false,
    });
  }

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-[var(--gold)]" />
            Gestão de Eventos
          </h1>
          <p className="text-gray-400 text-sm mt-1">Criar, editar e gerir eventos equestres</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[var(--gold)] text-black px-4 py-2 rounded-lg hover:bg-[var(--gold-hover)] transition flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Evento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--background-secondary)] border border-white/10 p-4 rounded-lg">
          <p className="text-3xl font-bold text-white">{eventos.length}</p>
          <p className="text-gray-400">Total de Eventos</p>
        </div>
        <div className="bg-[var(--background-secondary)] border border-white/10 p-4 rounded-lg">
          <p className="text-3xl font-bold text-[var(--gold)]">
            {eventos.filter((e) => e.destaque).length}
          </p>
          <p className="text-gray-400">Em Destaque</p>
        </div>
        <div className="bg-[var(--background-secondary)] border border-white/10 p-4 rounded-lg">
          <p className="text-3xl font-bold text-green-500">
            {eventos.filter((e) => new Date(e.data_inicio) > new Date()).length}
          </p>
          <p className="text-gray-400">Futuros</p>
        </div>
        <div className="bg-[var(--background-secondary)] border border-white/10 p-4 rounded-lg">
          <p className="text-3xl font-bold text-blue-500">
            {eventos.reduce((acc, e) => acc + (e.views_count || 0), 0)}
          </p>
          <p className="text-gray-400">Total Views</p>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)] mx-auto" />
        </div>
      ) : (
        <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--background)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Evento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Local
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {eventos.map((evento) => (
                <tr key={evento.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {evento.destaque && (
                        <Star size={16} className="text-[var(--gold)] fill-[var(--gold)]" />
                      )}
                      <span className="font-medium text-white">{evento.titulo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs border ${
                        tiposEvento.find((t) => t.value === evento.tipo)?.color ||
                        "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }`}
                    >
                      {tiposEvento.find((t) => t.value === evento.tipo)?.label || evento.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(evento.data_inicio).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {evento.localizacao}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{evento.views_count || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/eventos/${evento.slug}`}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded"
                        target="_blank"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        onClick={() => startEdit(evento)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => deleteEvento(evento.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded"
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
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={resetForm}
        >
          <div
            className="bg-[var(--background-secondary)] border border-white/10 rounded-lg max-w-2xl w-full p-8 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingEvento ? "Editar Evento" : "Novo Evento"}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Título *</label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        titulo: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                    required
                    className="w-full bg-[var(--background)] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full bg-[var(--background)] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  >
                    {tiposEvento.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Preço Entrada
                  </label>
                  <input
                    type="text"
                    value={formData.preco_entrada}
                    onChange={(e) => setFormData({ ...formData, preco_entrada: e.target.value })}
                    placeholder="Ex: 15€ ou Gratuito"
                    className="w-full bg-[var(--background)] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                    className="w-full bg-[var(--background)] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    className="w-full bg-[var(--background)] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Localização *
                  </label>
                  <input
                    type="text"
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    required
                    className="w-full bg-[var(--background)] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Região</label>
                  <input
                    type="text"
                    value={formData.regiao}
                    onChange={(e) => setFormData({ ...formData, regiao: e.target.value })}
                    placeholder="Ex: Ribatejo"
                    className="w-full bg-[var(--background)] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descrição *
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                    rows={3}
                    className="w-full bg-[var(--background)] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Imagem de Capa
                  </label>
                  <ImageUpload
                    currentImage={formData.imagem_capa}
                    onUpload={(url) => setFormData({ ...formData, imagem_capa: url })}
                    folder="eventos"
                    aspectRatio="video"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="destaque"
                    checked={formData.destaque}
                    onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                    className="w-4 h-4 text-[var(--gold)] focus:ring-[var(--gold)] bg-[var(--background)] border-white/10"
                  />
                  <label htmlFor="destaque" className="text-gray-300">
                    Evento em destaque
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-white/10 text-gray-300 py-3 rounded-lg hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[var(--gold)] text-black py-3 rounded-lg hover:bg-[var(--gold-hover)] transition font-medium"
                >
                  {editingEvento ? "Guardar Alterações" : "Criar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
