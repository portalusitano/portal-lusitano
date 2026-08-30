"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface AIResult {
  text?: string;
  description?: string;
  subject?: string;
  sentiment?: string;
  score?: number;
  summary?: string;
  day?: string;
  time?: string;
  reason?: string;
  openRatePrediction?: string;
  alternatives?: Array<{ day: string; time: string; openRate: string }>;
  improved?: string;
  changes?: Array<{ type: string; description: string }>;
  suggestions?: string[];
  tips?: string[];
  overall?: string;
  positive?: number;
  neutral?: number;
  negative?: number;
  percentages?: { positive: number; neutral: number; negative: number };
  insights?: string[];
  bestDay?: string;
  bestTime?: string;
  expectedOpenRate?: string;
  avoid?: string[];
  original?: string;
  readabilityScore?: { before: number; after: number; improvement: string };
}

interface AIAssistantProps {
  task:
    | "generate_description"
    | "suggest_subject"
    | "analyze_sentiment"
    | "best_time"
    | "improve_text";
  input: Record<string, unknown>;
  onResult?: (result: AIResult) => void;
  buttonText?: string;
  showInline?: boolean;
}

export default function AIAssistant({
  task,
  input,
  onResult,
  buttonText = "Gerar com IA",
  showInline = false,
}: AIAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const callAI = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, input }),
      });

      if (!response.ok) {
        throw new Error("Erro ao chamar IA");
      }

      const data = await response.json();
      setResult(data);

      if (onResult) {
        onResult(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderResult = () => {
    if (!result) return null;

    switch (task) {
      case "generate_description":
        return (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--gold)]">Descrição Gerada</span>
                <button
                  onClick={() => result.text && copyToClipboard(result.text)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all"
                  disabled={!result.text}
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-white leading-relaxed">{result.text}</p>
            </div>

            {result.suggestions && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-400 mb-2">💡 Sugestões de Melhoria</p>
                <ul className="space-y-1">
                  {result.suggestions.map((suggestion: string, i: number) => (
                    <li key={i} className="text-sm text-gray-300">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case "suggest_subject":
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[var(--gold)]/10 to-[var(--gold-hover)]/10 border border-[var(--gold)]/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--gold)]">
                  📧 Subject Recomendado
                </span>
                <button
                  onClick={() => copyToClipboard(result.subject || "")}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-white text-lg font-semibold">{result.subject}</p>
              <p className="text-sm text-green-400 mt-2">
                📊 Taxa de abertura estimada: {result.openRatePrediction}
              </p>
            </div>

            {result.alternatives && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-sm font-semibold text-white mb-2">Alternativas</p>
                <div className="space-y-2">
                  {result.alternatives.map((alt, i) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(`${alt.day} ${alt.time} (${alt.openRate})`)}
                      className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 text-sm transition-all"
                    >
                      {alt.day} {alt.time} — {alt.openRate}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {result.tips && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-400 mb-2">💡 Dicas</p>
                <ul className="space-y-1">
                  {result.tips.map((tip: string, i: number) => (
                    <li key={i} className="text-sm text-gray-300">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case "analyze_sentiment":
        return (
          <div className="space-y-4">
            <div
              className={`border rounded-lg p-4 ${
                result.overall === "positive"
                  ? "bg-green-500/10 border-green-500/20"
                  : result.overall === "negative"
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-yellow-500/10 border-yellow-500/20"
              }`}
            >
              <p className="text-sm font-semibold text-white mb-3">Análise de Sentimento</p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{result.positive}</p>
                  <p className="text-xs text-gray-400">Positivas</p>
                  <p className="text-sm text-green-400">{result.percentages?.positive}%</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">{result.neutral}</p>
                  <p className="text-xs text-gray-400">Neutras</p>
                  <p className="text-sm text-gray-400">{result.percentages?.neutral}%</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{result.negative}</p>
                  <p className="text-xs text-gray-400">Negativas</p>
                  <p className="text-sm text-red-400">{result.percentages?.negative}%</p>
                </div>
              </div>

              <div className="space-y-2">
                {result.insights?.map((insight: string, i: number) => (
                  <p key={i} className="text-sm text-gray-300">
                    {i === 0 ? "🔍" : "•"} {insight}
                  </p>
                ))}
              </div>
            </div>
          </div>
        );

      case "best_time":
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
              <p className="text-sm font-semibold text-purple-400 mb-3">🕐 Melhor Horário</p>

              <div className="bg-white/5 rounded-lg p-4 mb-3">
                <p className="text-lg font-bold text-white mb-1">
                  {result.bestDay} às {result.bestTime}
                </p>
                <p className="text-sm text-gray-400">{result.reason}</p>
                <p className="text-sm text-green-400 mt-2">
                  📊 Taxa de abertura esperada: {result.expectedOpenRate}
                </p>
              </div>

              {result.alternatives && (
                <div>
                  <p className="text-sm font-semibold text-white mb-2">Alternativas</p>
                  <div className="space-y-2">
                    {result.alternatives.map(
                      (alt: { day: string; time: string; openRate: string }, i: number) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2 text-sm">
                          <span className="text-white">
                            {alt.day} às {alt.time}
                          </span>
                          <span className="text-gray-400 ml-2">({alt.openRate})</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {result.avoid && result.avoid.length > 0 && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-400">⚠️ Evitar: {result.avoid.join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        );

      case "improve_text":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-400 mb-2">Original</p>
                <p className="text-white text-sm">{result.original}</p>
                <div className="mt-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded inline-block">
                  Score: {result.readabilityScore?.before}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-green-400">Melhorado ✨</p>
                  <button
                    onClick={() => copyToClipboard(result.improved || "")}
                    className="p-2 hover:bg-white/5 rounded-lg transition-all"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-white text-sm">{result.improved}</p>
                <div className="mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded inline-block">
                  Score: {result.readabilityScore?.after} ({result.readabilityScore?.improvement})
                </div>
              </div>
            </div>

            {result.changes && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-400 mb-2">📝 Mudanças Aplicadas</p>
                <ul className="space-y-1">
                  {result.changes.map(
                    (change: { type: string; description: string }, i: number) => (
                      <li key={i} className="text-sm text-gray-300">
                        • <span className="text-blue-400">{change.type}:</span> {change.description}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-gray-400">Resultado não disponível</p>;
    }
  };

  if (showInline) {
    return (
      <div className="space-y-4">
        <button
          onClick={callAI}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />A processar...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {buttonText}
            </>
          )}
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Resultado da IA
              </p>
              <button
                onClick={callAI}
                className="p-2 hover:bg-white/5 rounded-lg transition-all"
                title="Gerar novamente"
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {renderResult()}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={callAI}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />A processar...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          {buttonText}
        </>
      )}
    </button>
  );
}
