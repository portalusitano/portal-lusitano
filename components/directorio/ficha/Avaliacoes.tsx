"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Send, Star, ThumbsUp } from "lucide-react";
import Seleccao from "@/components/ui/Seleccao";
import Estrelas from "./Estrelas";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { analytics } from "@/lib/analytics-events";

export interface Avaliacao {
  id: string;
  autor_nome: string;
  autor_localizacao?: string;
  avaliacao: number;
  titulo?: string;
  comentario: string;
  data_visita?: string;
  tipo_visita?: string;
  recomenda: boolean;
  created_at: string;
}

/**
 * Avaliações da coudelaria e o formulário para deixar uma.
 *
 * O que muda em relação à versão anterior: os campos passam pelo `.campo` do
 * sistema em vez de repetirem sete classes de Tailwind cada um, as estrelas
 * distinguem-se, e as mensagens de sucesso e de erro vêm do dicionário — não
 * de literais em português sem acentos no meio de uma página que pode estar
 * em inglês.
 */
export default function Avaliacoes({
  coudelariaId,
  nome,
  avaliacoesIniciais,
  estatisticasIniciais,
}: {
  coudelariaId: string;
  nome: string;
  avaliacoesIniciais: Avaliacao[];
  estatisticasIniciais: { total: number; media: number };
}) {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const locale = language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT";

  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>(avaliacoesIniciais);
  const [estatisticas, setEstatisticas] = useState(estatisticasIniciais);
  const [aberto, setAberto] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [formulario, setFormulario] = useState({
    autor_nome: "",
    autor_email: "",
    autor_localizacao: "",
    avaliacao: 5,
    titulo: "",
    comentario: "",
    tipo_visita: "visita",
    recomenda: true,
  });

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coudelariaId) return;
    setAEnviar(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formulario, coudelaria_id: coudelariaId }),
      });
      if (res.ok) {
        analytics.submitReview({ id: coudelariaId, nome, rating: formulario.avaliacao });
        setAberto(false);
        setFormulario({
          autor_nome: "",
          autor_email: "",
          autor_localizacao: "",
          avaliacao: 5,
          titulo: "",
          comentario: "",
          tipo_visita: "visita",
          recomenda: true,
        });
        showToast("success", t.directorio.ficha.avaliacao_enviada);
        const lista = await fetch(`/api/reviews?coudelaria_id=${coudelariaId}`);
        if (lista.ok) {
          const dados = await lista.json();
          setAvaliacoes(dados.reviews || []);
          setEstatisticas(dados.stats || { total: 0, media: 0 });
        }
      } else {
        const erro = await res.json().catch(() => null);
        showToast("error", erro?.message || t.directorio.ficha.avaliacao_erro);
      }
    } catch (erro) {
      if (process.env.NODE_ENV === "development") console.error("[ficha-coudelaria]", erro);
      showToast("error", t.directorio.ficha.avaliacao_erro_rede);
    } finally {
      setAEnviar(false);
    }
  };

  const palavraAvaliacoes =
    estatisticas.total === 1
      ? t.directorio.ficha.avaliacao_singular
      : t.directorio.ficha.avaliacao_plural;

  /**
   * O tipo de visita é escrito na base pelo formulário aqui em baixo, e o que
   * lá fica é o identificador — `visita`, `compra`, `aulas`, `eventos`. A
   * lista escrevia-o tal e qual: em minúsculas, e em português mesmo numa
   * página inglesa, ao lado de tudo o resto traduzido. O `<option>` já
   * conhece o nome de cada um; é o mesmo dicionário que a linha usa. Um
   * identificador que não esteja na lista mostra-se como veio, em vez de
   * desaparecer — apagar um dado que existe é pior do que escrevê-lo mal.
   */
  const nomeDaVisita = (tipo: string): string =>
    ({
      visita: t.directorio.ficha.visita_visita,
      compra: t.directorio.ficha.visita_compra,
      aulas: t.directorio.ficha.visita_aulas,
      eventos: t.directorio.ficha.visita_eventos,
    })[tipo] ?? tipo;

  return (
    <section aria-labelledby="titulo-avaliacoes">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-avaliacoes" className="titulo-pagina flex items-center gap-2.5">
          <MessageSquare size={20} className="text-[var(--foreground-muted)]" aria-hidden="true" />
          {t.directorio.reviews}
        </h2>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="formulario-avaliacao"
          className="btn btn-secundario"
        >
          <Star size={15} aria-hidden="true" />
          {t.directorio.rate_stud}
        </button>
      </div>

      {estatisticas.total > 0 && (
        <div className="mb-5 flex items-center gap-4 rounded-[var(--raio)] border border-[var(--border-soft)] bg-[var(--background-card)] p-4">
          <span className="font-mono text-3xl tabular-nums text-[var(--foreground-strong)]">
            {estatisticas.media.toLocaleString(locale, { minimumFractionDigits: 1 })}
          </span>
          <span className="flex flex-col gap-1">
            <Estrelas valor={estatisticas.media} tamanho={15} />
            <span className="meta">
              {estatisticas.total} {palavraAvaliacoes}
            </span>
          </span>
        </div>
      )}

      {aberto && (
        <form
          id="formulario-avaliacao"
          onSubmit={submeter}
          className="anim-crescer mb-6 rounded-[var(--raio-lg)] border border-[var(--border-soft)] bg-[var(--background-card)] p-4 sm:p-6"
          aria-label={t.directorio.share_experience}
        >
          <h3 className="titulo-seccao mb-4">{t.directorio.share_experience}</h3>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              className="campo"
              placeholder={t.directorio.your_name}
              value={formulario.autor_nome}
              onChange={(e) => setFormulario({ ...formulario, autor_nome: e.target.value })}
              required
            />
            <input
              type="email"
              className="campo"
              placeholder={t.directorio.email_optional}
              value={formulario.autor_email}
              onChange={(e) => setFormulario({ ...formulario, autor_email: e.target.value })}
            />
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              className="campo"
              placeholder={t.directorio.location_optional}
              value={formulario.autor_localizacao}
              onChange={(e) => setFormulario({ ...formulario, autor_localizacao: e.target.value })}
            />
            <Seleccao
              className="campo"
              value={formulario.tipo_visita}
              onChange={(e) => setFormulario({ ...formulario, tipo_visita: e.target.value })}
              aria-label={t.directorio.visit_type}
            >
              <option value="visita">{t.directorio.visit}</option>
              <option value="compra">{t.directorio.purchase}</option>
              <option value="aulas">{t.directorio.lessons}</option>
              <option value="eventos">{t.directorio.event}</option>
            </Seleccao>
          </div>

          <fieldset className="mb-3 border-0 p-0">
            <legend className="rotulo mb-2">{t.directorio.rating_label}</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFormulario({ ...formulario, avaliacao: n })}
                  aria-label={t.directorio.ficha.estrelas.replace("{n}", String(n))}
                  aria-pressed={n === formulario.avaliacao}
                  className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                >
                  <Star
                    size={26}
                    aria-hidden="true"
                    className={
                      n <= formulario.avaliacao
                        ? "text-[var(--foreground-strong)]"
                        : "text-[var(--foreground-muted)]"
                    }
                    fill={n <= formulario.avaliacao ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <input
            type="text"
            className="campo mb-3"
            placeholder={t.directorio.review_title_optional}
            value={formulario.titulo}
            onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })}
          />
          <textarea
            className="campo mb-3 resize-none"
            rows={4}
            placeholder={t.directorio.review_comment}
            value={formulario.comentario}
            onChange={(e) => setFormulario({ ...formulario, comentario: e.target.value })}
            required
          />

          <label className="mb-5 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={formulario.recomenda}
              onChange={(e) => setFormulario({ ...formulario, recomenda: e.target.checked })}
              className="h-4 w-4 accent-[var(--foreground-strong)]"
            />
            <span className="text-sm text-[var(--foreground-secondary)]">
              {t.directorio.recommend}
            </span>
          </label>

          <button type="submit" disabled={aEnviar} className="btn btn-primario">
            {aEnviar ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={15} aria-hidden="true" />
            )}
            {aEnviar ? t.directorio.submitting : t.directorio.submit_review}
          </button>
        </form>
      )}

      {avaliacoes.length > 0 ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {avaliacoes.map((avaliacao) => (
            <li key={avaliacao.id}>
              <article className="rounded-[var(--raio)] border border-[var(--border-soft)] bg-[var(--background-card)] p-4 sm:p-5">
                <header className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm text-[var(--foreground-strong)]">
                      <span className="truncate">{avaliacao.autor_nome}</span>
                      {avaliacao.recomenda && (
                        <ThumbsUp
                          size={13}
                          className="flex-shrink-0 text-[var(--ok)]"
                          aria-label={t.directorio.ficha.recomenda}
                        />
                      )}
                    </p>
                    <p className="meta flex flex-wrap items-center gap-x-2">
                      {avaliacao.autor_localizacao && <span>{avaliacao.autor_localizacao}</span>}
                      {avaliacao.tipo_visita && (
                        <span>· {nomeDaVisita(avaliacao.tipo_visita)}</span>
                      )}
                    </p>
                  </div>
                  <Estrelas valor={avaliacao.avaliacao} tamanho={13} />
                </header>
                {avaliacao.titulo && (
                  <h3 className="mb-1 text-sm text-[var(--foreground-strong)]">
                    {avaliacao.titulo}
                  </h3>
                )}
                <p className="text-sm leading-relaxed text-[var(--foreground-secondary)]">
                  {avaliacao.comentario}
                </p>
                <footer className="meta mt-2">
                  <time dateTime={avaliacao.created_at}>
                    {new Date(avaliacao.created_at).toLocaleDateString(locale)}
                  </time>
                </footer>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p className="meta rounded-[var(--raio)] border border-dashed border-[var(--border-soft)] px-4 py-8 text-center">
          {t.directorio.no_reviews}
        </p>
      )}
    </section>
  );
}
