"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import LocalizedLink from "@/components/LocalizedLink";
import { AlertTriangle, ArrowLeft, ImageIcon, Loader2, MessagesSquare, Send } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useMensagensPorLer } from "@/context/MensagensContext";
import { MAX_MENSAGEM, type ChatConversa, type ChatMensagem } from "@/lib/marketplace-chat";

interface ConversaAberta {
  id: string;
  cavaloId: string;
  papel: "comprador" | "vendedor";
  outraParte: string;
  cavaloNome: string;
  cavaloFoto: string | null;
  cavaloPreco: number | null;
  cavaloStatus: string | null;
}

function formatarData(iso: string): string {
  const data = new Date(iso);
  const agora = new Date();
  const mesmoDia = data.toDateString() === agora.toDateString();

  return mesmoDia
    ? data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
    : data.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

export default function MensagensContent() {
  const { showToast } = useToast();
  const { recarregar: recarregarPorLer } = useMensagensPorLer();
  const [conversas, setConversas] = useState<ChatConversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [aberta, setAberta] = useState<ConversaAberta | null>(null);
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([]);
  const [aCarregarFio, setACarregarFio] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const fimDoFio = useRef<HTMLDivElement>(null);

  const carregarConversas = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/conversas");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar mensagens");
      setConversas(data.conversas || []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  // Keep the newest message in view when a thread opens or grows.
  useEffect(() => {
    fimDoFio.current?.scrollIntoView({ block: "end" });
  }, [mensagens]);

  const abrir = async (conversaId: string) => {
    setACarregarFio(true);
    try {
      const res = await fetch(`/api/conversas/${conversaId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao abrir conversa");

      setAberta(data.conversa);
      setMensagens(data.mensagens || []);
      // Opening the thread marked them read server-side; clear the badge here too.
      setConversas((prev) => prev.map((c) => (c.id === conversaId ? { ...c, porLer: 0 } : c)));
      // E o distintivo da navegação, que de outra forma só acertaria no
      // próximo minuto e daria a ideia de haver mensagens que já foram lidas.
      recarregarPorLer();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao abrir conversa");
    } finally {
      setACarregarFio(false);
    }
  };

  const enviar = async () => {
    const corpo = rascunho.trim();
    if (!corpo || !aberta) return;

    setAEnviar(true);
    try {
      const res = await fetch(`/api/conversas/${aberta.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: corpo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar mensagem");

      setMensagens((prev) => [...prev, data.mensagem]);
      setRascunho("");
      setConversas((prev) =>
        prev.map((c) =>
          c.id === aberta.id
            ? { ...c, ultimaMensagem: corpo, ultimaMensagemAt: data.mensagem.createdAt }
            : c
        )
      );
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao enviar mensagem");
    } finally {
      setAEnviar(false);
    }
  };

  // ── Thread view ───────────────────────────────────────────────────────────
  if (aberta) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 sm:px-8 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => {
              setAberta(null);
              setMensagens([]);
            }}
            className="inline-flex items-center gap-2 rotulo hover:text-[var(--foreground-strong)] transition-colors mb-8"
          >
            <ArrowLeft size={12} />
            Todas as mensagens
          </button>

          <header
            data-revelar=""
            suppressHydrationWarning
            className="flex items-center gap-4 pb-6 border-b border-[var(--border)]"
          >
            <div className="relative w-14 h-14 shrink-0 bg-[var(--background-secondary)]/30">
              {aberta.cavaloFoto ? (
                <Image
                  src={aberta.cavaloFoto}
                  alt={aberta.cavaloNome}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={14} className="text-[var(--foreground-muted)]" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-normal text-[var(--foreground)] truncate">
                {aberta.outraParte}
              </p>
              <LocalizedLink
                href={`/comprar/${aberta.cavaloId}`}
                className="text-[11px] text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)] transition-colors truncate block"
              >
                {aberta.cavaloNome} →
              </LocalizedLink>
            </div>
            <span className="shrink-0 rotulo">
              {aberta.papel === "comprador" ? "Compra" : "Venda"}
            </span>
          </header>

          <div className="py-6 space-y-4 min-h-[40vh]">
            {aCarregarFio ? (
              <div className="flex justify-center py-12 text-[var(--foreground-muted)]">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : (
              mensagens.map((m) => (
                <div key={m.id} className={`flex ${m.minha ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-4 py-3 ${
                      m.minha
                        ? "bg-[var(--elevate-1)] border border-[var(--border-soft)]"
                        : "bg-[var(--background-secondary)]/40 border border-[var(--border)]"
                    }`}
                  >
                    <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap break-words">
                      {m.corpo}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-[var(--foreground-muted)] mt-2 text-right">
                      {formatarData(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={fimDoFio} />
          </div>

          <div className="border-t border-[var(--border)] pt-5 space-y-3">
            <textarea
              rows={3}
              value={rascunho}
              maxLength={MAX_MENSAGEM}
              placeholder="Escreva a sua mensagem…"
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter makes a new line.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--border-hover)] focus:outline-none resize-y"
            />
            <button
              onClick={enviar}
              disabled={aEnviar || rascunho.trim().length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border-soft)] rotulo-forte hover:bg-[var(--elevate-1)] transition-colors disabled:opacity-40"
            >
              {aEnviar ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Enviar
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 sm:px-8 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto">
        <LocalizedLink
          href="/minha-conta"
          className="inline-flex items-center gap-2 rotulo hover:text-[var(--foreground-strong)] transition-colors mb-10"
        >
          <ArrowLeft size={12} />A minha conta
        </LocalizedLink>

        <header data-revelar="" suppressHydrationWarning className="mb-12">
          <h1 className="titulo-gradiente text-[1.75rem] md:text-[2.5rem] font-normal leading-[120%] tracking-tighter">
            As minhas mensagens
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-3 max-w-xl">
            Conversas com compradores e vendedores, dentro do portal.
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-24 text-[var(--foreground-muted)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!loading && erro && (
          <div className="border border-red-400/30 p-8 text-center">
            <AlertTriangle size={18} className="mx-auto text-red-400/70 mb-3" />
            <p className="text-sm text-[var(--foreground-muted)]">{erro}</p>
            <button
              onClick={carregarConversas}
              className="mt-5 rotulo-forte hover:text-[var(--foreground-strong)]/70 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !erro && conversas.length === 0 && (
          <div className="cartao p-10 text-center">
            <MessagesSquare size={22} className="mx-auto text-[var(--foreground-muted)] mb-4" />
            <p className="text-sm text-[var(--foreground)]">Ainda não tem mensagens.</p>
            <p className="text-xs text-[var(--foreground-muted)] mt-2 max-w-sm mx-auto">
              Quando contactar um vendedor, ou alguém se interessar por um anúncio seu, a conversa
              aparece aqui.
            </p>
            <LocalizedLink
              href="/comprar"
              className="inline-block mt-7 px-6 py-3 border border-[var(--border-soft)] rotulo-forte hover:bg-[var(--elevate-1)] transition-colors"
            >
              Ver cavalos à venda
            </LocalizedLink>
          </div>
        )}

        {!loading && !erro && conversas.length > 0 && (
          <div className="space-y-px bg-[var(--elevate-1)]">
            {conversas.map((c) => (
              <button
                key={c.id}
                onClick={() => abrir(c.id)}
                className="w-full bg-[var(--background)] p-5 flex items-center gap-4 text-left hover:bg-[var(--elevate-1)] transition-colors"
              >
                <div className="relative w-14 h-14 shrink-0 bg-[var(--background-secondary)]/30">
                  {c.cavaloFoto ? (
                    <Image
                      src={c.cavaloFoto}
                      alt={c.cavaloNome}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={14} className="text-[var(--foreground-muted)]" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-[var(--foreground)] truncate">{c.outraParte}</p>
                    <span className="shrink-0 text-[11px] uppercase tracking-wider text-[var(--foreground-muted)]">
                      {formatarData(c.ultimaMensagemAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)] truncate mt-0.5">
                    {c.cavaloNome}
                  </p>
                  {c.ultimaMensagem && (
                    <p className="text-xs text-[var(--foreground-muted)] truncate mt-1">
                      {c.ultimaMensagem}
                    </p>
                  )}
                </div>

                {c.porLer > 0 && (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-[var(--foreground-strong)] text-black text-[10px] font-bold rounded-full">
                    {c.porLer}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
