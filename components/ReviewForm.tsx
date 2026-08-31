"use client";

import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Seleccao from "@/components/ui/Seleccao";

function tr3(lang: string, pt: string, en: string, es: string) {
  return lang === "pt" ? pt : lang === "es" ? es : en;
}

interface ReviewFormProps {
  coudelariaId: string;
  coudelariaNome: string;
  onSuccess?: () => void;
}

export default function ReviewForm({ coudelariaId, coudelariaNome, onSuccess }: ReviewFormProps) {
  const { language } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    autor_nome: "",
    autor_email: "",
    autor_localizacao: "",
    titulo: "",
    comentario: "",
    data_visita: "",
    tipo_visita: "visita",
    recomenda: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError(
        tr3(
          language,
          "Por favor selecione uma avaliação",
          "Please select a rating",
          "Por favor seleccione una valoración"
        )
      );
      return;
    }

    if (!formData.autor_nome || !formData.comentario) {
      setError(
        tr3(
          language,
          "Nome e comentário são obrigatórios",
          "Name and comment are required",
          "Nombre y comentario son obligatorios"
        )
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coudelaria_id: coudelariaId,
          avaliacao: rating,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            tr3(
              language,
              "Erro ao submeter avaliação",
              "Error submitting review",
              "Error al enviar la valoración"
            )
        );
      }

      setIsSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tr3(language, "Erro ao submeter", "Error submitting", "Error al enviar")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = {
    1: tr3(language, "Fraco", "Poor", "Malo"),
    2: tr3(language, "Razoável", "Fair", "Regular"),
    3: tr3(language, "Bom", "Good", "Bueno"),
    4: tr3(language, "Muito Bom", "Very Good", "Muy Bueno"),
    5: tr3(language, "Excelente", "Excellent", "Excelente"),
  } as Record<number, string>;

  if (isSubmitted) {
    return (
      <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" />
        </div>
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
          {tr3(
            language,
            "Obrigado pela sua avaliação!",
            "Thank you for your review!",
            "¡Gracias por su valoración!"
          )}
        </h3>
        <p className="text-green-600 dark:text-green-400 text-sm">
          {tr3(
            language,
            "A sua review foi submetida e será publicada após aprovação.",
            "Your review has been submitted and will be published after approval.",
            "Su valoración ha sido enviada y será publicada tras su aprobación."
          )}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      aria-label={tr3(
        language,
        `Avaliar ${coudelariaNome}`,
        `Review ${coudelariaNome}`,
        `Valorar ${coudelariaNome}`
      )}
    >
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          {tr3(
            language,
            `A sua avaliação de ${coudelariaNome}`,
            `Your review of ${coudelariaNome}`,
            `Su valoración de ${coudelariaNome}`
          )}
        </label>
        <div
          className="flex gap-1"
          role="radiogroup"
          aria-label={tr3(language, "Avaliação", "Rating", "Valoración")}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${star} ${tr3(language, star > 1 ? "estrelas" : "estrela", star > 1 ? "stars" : "star", star > 1 ? "estrellas" : "estrella")}`}
              aria-pressed={rating === star}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoverRating || rating)
                    ? "text-yellow-400"
                    : "text-[var(--foreground-muted)]"
                }`}
                fill={star <= (hoverRating || rating) ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-[var(--foreground-muted)] mt-1">{ratingLabels[rating]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            {tr3(language, "Nome *", "Name *", "Nombre *")}
          </label>
          <input
            type="text"
            value={formData.autor_nome}
            onChange={(e) => setFormData({ ...formData, autor_nome: e.target.value })}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder={tr3(language, "O seu nome", "Your name", "Su nombre")}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            {tr3(language, "Email (opcional)", "Email (optional)", "Email (opcional)")}
          </label>
          <input
            type="email"
            value={formData.autor_email}
            onChange={(e) => setFormData({ ...formData, autor_email: e.target.value })}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="email@exemplo.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            {tr3(language, "Localização (opcional)", "Location (optional)", "Ubicación (opcional)")}
          </label>
          <input
            type="text"
            value={formData.autor_localizacao}
            onChange={(e) => setFormData({ ...formData, autor_localizacao: e.target.value })}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder={tr3(
              language,
              "Ex: Lisboa, Portugal",
              "e.g. Lisbon, Portugal",
              "Ej: Lisboa, Portugal"
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            {tr3(
              language,
              "Data da visita (opcional)",
              "Visit date (optional)",
              "Fecha de visita (opcional)"
            )}
          </label>
          <input
            type="date"
            value={formData.data_visita}
            onChange={(e) => setFormData({ ...formData, data_visita: e.target.value })}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          {tr3(language, "Tipo de interação", "Type of interaction", "Tipo de interacción")}
        </label>
        <Seleccao
          value={formData.tipo_visita}
          onChange={(e) => setFormData({ ...formData, tipo_visita: e.target.value })}
          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="visita">
            {tr3(language, "Visita presencial", "In-person visit", "Visita presencial")}
          </option>
          <option value="compra">
            {tr3(language, "Compra de cavalo", "Horse purchase", "Compra de caballo")}
          </option>
          <option value="servico">
            {tr3(language, "Serviço/Treino", "Service/Training", "Servicio/Entrenamiento")}
          </option>
          <option value="evento">{tr3(language, "Evento", "Event", "Evento")}</option>
          <option value="outro">{tr3(language, "Outro", "Other", "Otro")}</option>
        </Seleccao>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          {tr3(
            language,
            "Título da avaliação (opcional)",
            "Review title (optional)",
            "Título de la valoración (opcional)"
          )}
        </label>
        <input
          type="text"
          value={formData.titulo}
          onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder={tr3(
            language,
            "Resuma a sua experiência",
            "Summarize your experience",
            "Resuma su experiencia"
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          {tr3(language, "A sua experiência *", "Your experience *", "Su experiencia *")}
        </label>
        <textarea
          value={formData.comentario}
          onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
          placeholder={tr3(
            language,
            "Conte-nos sobre a sua experiência com esta coudelaria...",
            "Tell us about your experience with this stud farm...",
            "Cuéntenos sobre su experiencia con esta ganadería..."
          )}
          required
          aria-required="true"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="recomenda"
          checked={formData.recomenda}
          onChange={(e) => setFormData({ ...formData, recomenda: e.target.checked })}
          className="w-4 h-4 text-amber-600 border-[var(--border)] rounded focus:ring-amber-500"
        />
        <label htmlFor="recomenda" className="text-sm text-[var(--foreground)]">
          {tr3(
            language,
            "Recomendo esta coudelaria",
            "I recommend this stud farm",
            "Recomiendo esta ganadería"
          )}
        </label>
      </div>

      <div role="alert" aria-live="assertive">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {tr3(language, "A submeter...", "Submitting...", "Enviando...")}
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            {tr3(language, "Submeter Avaliação", "Submit Review", "Enviar Valoración")}
          </>
        )}
      </button>
    </form>
  );
}
