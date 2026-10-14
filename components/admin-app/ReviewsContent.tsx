"use client";

import { useState, useEffect } from "react";
import { Star, Check, X, Eye, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Review } from "@/types/review";

export default function ReviewsContent() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function fetchReviews() {
    try {
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[ReviewsContent]", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateReviewStatus(reviewId: string, status: string) {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchReviews();
        setSelectedReview(null);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[ReviewsContent]", error);
    }
  }

  const pendingCount = reviews.filter((r) => r.status === "pending").length;
  const approvedCount = reviews.filter((r) => r.status === "approved").length;
  const rejectedCount = reviews.filter((r) => r.status === "rejected").length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-[var(--gold)]" />
            Gestão de Reviews
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Aprovar ou rejeitar avaliações de coudelarias e ferramentas
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setStatusFilter("pending")}
          className={`p-4 rounded-lg border-2 transition ${
            statusFilter === "pending"
              ? "bg-[var(--gold)]/20 border-[var(--gold)]"
              : "bg-[var(--background-secondary)] border-white/10 hover:border-[var(--gold)]/50"
          }`}
        >
          <p className="text-3xl font-bold text-[var(--gold)]">{pendingCount}</p>
          <p className="text-gray-400">Pendentes</p>
        </button>
        <button
          onClick={() => setStatusFilter("approved")}
          className={`p-4 rounded-lg border-2 transition ${
            statusFilter === "approved"
              ? "bg-green-500/20 border-green-500"
              : "bg-[var(--background-secondary)] border-white/10 hover:border-green-500/50"
          }`}
        >
          <p className="text-3xl font-bold text-green-500">{approvedCount}</p>
          <p className="text-gray-400">Aprovadas</p>
        </button>
        <button
          onClick={() => setStatusFilter("rejected")}
          className={`p-4 rounded-lg border-2 transition ${
            statusFilter === "rejected"
              ? "bg-red-500/20 border-red-500"
              : "bg-[var(--background-secondary)] border-white/10 hover:border-red-500/50"
          }`}
        >
          <p className="text-3xl font-bold text-red-500">{rejectedCount}</p>
          <p className="text-gray-400">Rejeitadas</p>
        </button>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)] mx-auto" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-[var(--background-secondary)] border border-white/10 rounded-lg">
          <MessageSquare className="mx-auto text-gray-500 mb-4" size={48} />
          <p className="text-gray-400">Nenhuma review {statusFilter}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews
            .filter((r) => r.status === statusFilter)
            .map((review) => (
              <div
                key={review.id}
                className="bg-[var(--background-secondary)] border border-white/10 rounded-lg p-6 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-white">{review.autor_nome}</span>
                      {review.autor_localizacao && (
                        <span className="text-gray-400 text-sm">de {review.autor_localizacao}</span>
                      )}
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={
                              star <= review.avaliacao
                                ? "text-[var(--gold)] fill-[var(--gold)]"
                                : "text-gray-600"
                            }
                          />
                        ))}
                      </div>
                      {review.recomenda ? (
                        <ThumbsUp size={16} className="text-green-500" />
                      ) : (
                        <ThumbsDown size={16} className="text-red-500" />
                      )}
                    </div>

                    {review.titulo && (
                      <h3 className="font-medium text-gray-300 mb-1">{review.titulo}</h3>
                    )}
                    <p className="text-gray-400 mb-3">{review.comentario}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {review.coudelarias && <span>Coudelaria: {review.coudelarias.nome}</span>}
                      {review.ferramenta_slug && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                          Ferramenta: {review.ferramenta_slug}
                        </span>
                      )}
                      {review.tipo_visita && <span>Tipo: {review.tipo_visita}</span>}
                      <span>{new Date(review.created_at).toLocaleDateString("pt-PT")}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setSelectedReview(review)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition"
                      title="Ver detalhes"
                    >
                      <Eye size={20} />
                    </button>
                    {review.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateReviewStatus(review.id, "approved")}
                          className="p-2 text-green-500 hover:bg-green-500/10 rounded transition"
                          title="Aprovar"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          onClick={() => updateReviewStatus(review.id, "rejected")}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded transition"
                          title="Rejeitar"
                        >
                          <X size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {selectedReview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="bg-[var(--background-secondary)] border border-white/10 rounded-lg max-w-2xl w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-white">Detalhes da Review</h2>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Autor</label>
                  <p className="font-medium text-white">{selectedReview.autor_nome}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="text-gray-300">{selectedReview.autor_email || "Não fornecido"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Localização</label>
                  <p className="text-gray-300">
                    {selectedReview.autor_localizacao || "Não fornecida"}
                  </p>
                </div>
                {selectedReview.ferramenta_slug && (
                  <div>
                    <label className="text-sm text-gray-500">Ferramenta</label>
                    <p className="text-blue-400">{selectedReview.ferramenta_slug}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">Avaliação</label>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        className={
                          star <= selectedReview.avaliacao
                            ? "text-[var(--gold)] fill-[var(--gold)]"
                            : "text-gray-600"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">Comentário</label>
                <p className="bg-[var(--background)] border border-white/10 p-4 rounded-lg mt-1 text-gray-300">
                  {selectedReview.comentario}
                </p>
              </div>

              {selectedReview.status === "pending" && (
                <div className="flex gap-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => updateReviewStatus(selectedReview.id, "approved")}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Aprovar Review
                  </button>
                  <button
                    onClick={() => updateReviewStatus(selectedReview.id, "rejected")}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <X size={20} />
                    Rejeitar Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
