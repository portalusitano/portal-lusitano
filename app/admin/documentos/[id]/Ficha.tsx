"use client";

/**
 * A ficha de revisão: o documento de um lado, o que o vendedor escreveu do
 * outro.
 *
 * **É essa comparação que é o trabalho.** Tudo o resto nesta página existe para
 * a servir — o aviso de duplicado por cima porque é o que faz parar antes de
 * decidir, os dois botões por baixo porque é onde a decisão se toma, e o texto
 * lido lá ao fundo porque é uma ajuda de busca e não uma prova.
 *
 * A página não valida documentos. Não sabe se um Livro Azul é autêntico, não
 * confere números contra registo nenhum, e não tem como saber se a fotografia
 * de um passaporte é de um passaporte que existe. O que faz é pôr as duas
 * coisas à frente uma da outra e registar o que uma pessoa decidiu. É por isso
 * que nenhum texto desta página diz «confirmado» a respeito de coisa nenhuma
 * que ela não tenha feito.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import type { EstadoDeDocumento } from "@/lib/documentos/contrato";
import { ROTULO_DO_ESTADO, ROTULO_DO_TIPO, type FichaDeDocumento } from "../tipos";

/** Lê o erro de qualquer das duas convenções em jogo — a da API e a do middleware. */
function mensagemDeErro(corpo: unknown, alternativa: string): string {
  const c = corpo as { erro?: unknown; error?: unknown } | null;
  if (typeof c?.erro === "string") return c.erro;
  if (typeof c?.error === "string") return c.error;
  return alternativa;
}

function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Ficha({ id }: { id: string }) {
  const [ficha, setFicha] = useState<FichaDeDocumento | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [aRecusar, setARecusar] = useState(false);

  /**
   * Fui eu que reclamei este documento?
   *
   * Só quem reclamou o larga. Sem isto, abrir a ficha de um documento que outra
   * pessoa está a rever e fechá-la libertava a reclamação dela — que é
   * exactamente o contrário do que o estado `em_revisao` existe para fazer.
   */
  const reclamadoPorMim = useRef(false);

  const carregar = useCallback(async () => {
    setACarregar(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/admin/documentos/${id}`);
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(mensagemDeErro(corpo, "Erro ao carregar o documento"));
      setFicha(corpo.documento as FichaDeDocumento);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar o documento");
    } finally {
      setACarregar(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── A reclamação ──────────────────────────────────────────────────────────
  //
  // Abrir a ficha é dizer «estou a olhar para este», e é a única coisa que
  // acontece sozinha nesta página. Não é uma promoção: `em_revisao` não é
  // `verificado`, não escreve autor nenhum, e o público não o vê. A regra
  // continua inteira — só um clique numa pessoa põe `verificado`.
  //
  // Quem chega em segundo apanha 409 e vê-o escrito, em vez de rever às cegas
  // um documento que outra pessoa está a rever ao mesmo tempo.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const resposta = await fetch(`/api/admin/documentos/${id}/reclamar`, { method: "POST" });
      if (!vivo) return;
      if (resposta.ok) {
        reclamadoPorMim.current = true;
        setFicha((f) => (f ? { ...f, estado: "em_revisao" } : f));
        return;
      }
      if (resposta.status === 409) {
        const corpo = await resposta.json().catch(() => null);
        setAviso(mensagemDeErro(corpo, "Este documento já não está por rever."));
      }
      // Um 500 aqui não impede ninguém de rever: a reclamação é uma cortesia
      // entre administradores, não uma fechadura. Cala-se, e os botões
      // continuam a funcionar.
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  // Largar ao sair. `keepalive` para que o pedido sobreviva ao fecho do
  // separador — sem ele, o browser cancela o que estiver a meio e o documento
  // ficava marcado como em revisão até alguém ir à base.
  useEffect(() => {
    const largar = () => {
      if (!reclamadoPorMim.current) return;
      reclamadoPorMim.current = false;
      fetch(`/api/admin/documentos/${id}/reclamar`, { method: "DELETE", keepalive: true }).catch(
        () => {}
      );
    };
    window.addEventListener("pagehide", largar);
    return () => {
      window.removeEventListener("pagehide", largar);
      largar();
    };
  }, [id]);

  const decidir = useCallback(
    async (accao: "verificar" | "recusar") => {
      setOcupado(true);
      setErro(null);
      try {
        const resposta = await fetch(`/api/admin/documentos/${id}/${accao}`, {
          method: "POST",
          headers: accao === "recusar" ? { "Content-Type": "application/json" } : undefined,
          body: accao === "recusar" ? JSON.stringify({ motivo }) : undefined,
        });
        const corpo = await resposta.json();
        if (!resposta.ok) throw new Error(mensagemDeErro(corpo, "Não foi possível registar."));
        // A decisão é terminal: já não há nada para largar.
        reclamadoPorMim.current = false;
        setARecusar(false);
        setMotivo("");
        setAviso(null);
        await carregar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível registar.");
      } finally {
        setOcupado(false);
      }
    },
    [id, motivo, carregar]
  );

  if (aCarregar && !ficha) {
    return (
      <div className="flex justify-center p-20 text-[var(--foreground-muted)]">
        <Loader2 size={18} className="animate-spin" aria-hidden />
        <span className="sr-only">A carregar o documento</span>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="p-6 sm:p-10">
        <Voltar />
        <div role="alert" className="cartao mt-6 p-8 text-center">
          <AlertTriangle
            size={18}
            className="mx-auto mb-3"
            style={{ color: "var(--erro)" }}
            aria-hidden
          />
          <p className="text-sm text-[var(--foreground-secondary)]">
            {erro ?? "Documento não encontrado."}
          </p>
        </div>
      </div>
    );
  }

  const decidido = ficha.estado === "verificado" || ficha.estado === "recusado";
  const ehImagem = ficha.mime.startsWith("image/");
  const endereco = `/api/admin/documentos/${ficha.id}/ficheiro`;

  return (
    <div className="p-6 sm:p-10">
      <Voltar />

      <header className="mt-6 mb-8">
        <h1 className="titulo-pagina">
          {ROTULO_DO_TIPO[ficha.tipo]}
          <span className="text-[var(--foreground-muted)]"> · </span>
          <span className="text-[var(--foreground-secondary)]">
            {ficha.cavaloNome ?? "Anúncio ainda não pago"}
          </span>
        </h1>
        <p className="meta mt-2 font-mono">
          {ficha.nomeOriginal} · {tamanho(ficha.bytes)} · sha {ficha.sha256Curto} · chegou{" "}
          {new Date(ficha.criadoEm).toLocaleString("pt-PT")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <EstadoActual estado={ficha.estado} />
          {ficha.cavaloSlug && (
            <a
              href={`/comprar/${ficha.cavaloSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="meta inline-flex items-center gap-1.5 hover:text-[var(--foreground)]"
            >
              Ver o anúncio <ExternalLink size={11} aria-hidden />
            </a>
          )}
        </div>
      </header>

      {aviso && (
        <p
          role="status"
          className="cartao mb-6 px-4 py-3 text-sm text-[var(--foreground-secondary)]"
        >
          {aviso}
        </p>
      )}

      {/* ── O duplicado ────────────────────────────────────────────────────
          Em cima, a toda a largura, antes de tudo o resto. O mesmo ficheiro em
          dois anúncios é o sinal de fraude mais forte que este sistema tem — o
          mesmo Livro Azul a servir duas vendas — e um aviso desses ao lado da
          terceira coluna é um aviso que se lê depois de a decisão estar
          tomada. */}
      {ficha.duplicados.length > 0 && (
        <section
          role="alert"
          className="cartao mb-8 p-5"
          style={{ borderColor: "var(--erro)", background: "rgb(var(--erro-rgb) / 0.06)" }}
        >
          <h2 className="titulo-seccao flex items-center gap-2" style={{ color: "var(--erro)" }}>
            <Copy size={15} aria-hidden />
            Este ficheiro já está noutra submissão
          </h2>
          <p className="meta mt-2 max-w-2xl">
            Byte a byte, é o mesmo ficheiro. Pode ser o vendedor a reenviar o mesmo documento por
            engano — ou o mesmo Livro Azul a servir dois anúncios. Confirme de quem é o cavalo antes
            de decidir.
          </p>
          <ul className="mt-4 space-y-2">
            {ficha.duplicados.map((v) => (
              <li key={v.id} className="text-sm">
                <Link
                  href={`/admin/documentos/${v.id}`}
                  className="text-[var(--foreground-strong)] underline underline-offset-4 hover:text-[var(--foreground)]"
                >
                  {v.cavaloNome ?? `Submissão ${v.referencia.slice(0, 8)}`}
                </Link>
                <span className="meta">
                  {" "}
                  · {ROTULO_DO_TIPO[v.tipo]} · {ROTULO_DO_ESTADO[v.estado]} ·{" "}
                  {new Date(v.criadoEm).toLocaleDateString("pt-PT")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        {/* ── O documento ─────────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="rotulo-forte">O documento</h2>
            <a
              href={endereco}
              target="_blank"
              rel="noopener noreferrer"
              className="meta inline-flex items-center gap-1.5 hover:text-[var(--foreground)]"
            >
              Abrir em separador <ExternalLink size={11} aria-hidden />
            </a>
          </div>

          <div className="cartao overflow-hidden bg-[var(--background-elevated)]">
            {ehImagem ? (
              /* eslint-disable-next-line @next/next/no-img-element -- O
                 `next/image` faria passar um documento privado pelo optimizador,
                 que grava o resultado em disco e o serve de um endereço
                 `/_next/image` sem sessão nenhuma. Um passaporte equino no
                 cache do optimizador é exactamente a fuga que o balde privado
                 existe para impedir. Aqui não há optimização a fazer: é uma
                 imagem, vista uma vez, por um administrador. */
              <img
                src={endereco}
                alt={`${ROTULO_DO_TIPO[ficha.tipo]} — ${ficha.nomeOriginal}`}
                className="max-h-[80vh] w-full object-contain"
              />
            ) : (
              <iframe
                src={endereco}
                title={`${ROTULO_DO_TIPO[ficha.tipo]} — ${ficha.nomeOriginal}`}
                className="h-[80vh] w-full border-0"
              />
            )}
          </div>

          <p className="meta mt-2 flex items-start gap-1.5">
            <Lock size={11} className="mt-0.5 shrink-0" aria-hidden />O ficheiro é servido pelo
            servidor a cada pedido e o endereço não abre nada sem esta sessão. Não há aqui nenhum
            endereço do balde que se possa copiar para fora.
          </p>
        </section>

        {/* ── O que o vendedor escreveu ───────────────────────────────────── */}
        <section>
          <h2 className="rotulo-forte mb-3">O que o vendedor escreveu</h2>

          {!ficha.cavaloId && (
            <p className="meta mb-4">
              O anúncio ainda não existe — o documento sobe antes do pagamento. Só se mostra o que
              ficou guardado no registo das contradições.
            </p>
          )}

          <dl className="cartao divide-y divide-[var(--border-soft)]">
            {ficha.campos.map((c) => (
              <div key={c.campo} className="grid grid-cols-[1fr_1fr] gap-x-4 p-4">
                <dt className="rotulo col-span-2 mb-2 flex items-center gap-1.5">
                  {c.rotulo}
                  {c.emConflito && (
                    <span
                      className="inline-flex items-center gap-1"
                      style={{ color: "var(--erro)" }}
                    >
                      <AlertTriangle size={11} aria-hidden />
                      não bate certo
                    </span>
                  )}
                </dt>
                <dd className="min-w-0">
                  <span className="rotulo block">No formulário</span>
                  <span className="mt-1 block break-words font-mono text-sm text-[var(--foreground-strong)]">
                    {c.noFormulario ?? "—"}
                  </span>
                  {c.origemDoFormulario === "conflito" && (
                    <span className="meta mt-1 block">do registo da contradição</span>
                  )}
                </dd>
                <dd className="min-w-0">
                  <span className="rotulo block">Lido do documento</span>
                  <span
                    className="mt-1 block break-words font-mono text-sm"
                    style={{
                      color: c.emConflito ? "var(--erro)" : "var(--foreground-secondary)",
                    }}
                  >
                    {c.noDocumento ?? "não se leu"}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <p className="meta mt-3">
            A coluna da direita é uma leitura automática do ficheiro, e engana-se — um algarismo mal
            lido não é uma contradição. Quem lê o documento é quem está a rever.
            {ficha.origemDaLeitura === "nenhuma" &&
              " Neste ficheiro não se conseguiu extrair texto nenhum."}
            {ficha.origemDaLeitura === null && " Este ficheiro não chegou a ser lido."}
          </p>

          {(ficha.vendedorNome || ficha.vendedorEmail) && (
            <p className="meta mt-4">
              Vendedor: {ficha.vendedorNome ?? "—"}
              {ficha.vendedorEmail && ` · ${ficha.vendedorEmail}`}
            </p>
          )}

          {/* ── A decisão ─────────────────────────────────────────────────── */}
          <div className="mt-8 border-t border-[var(--border)] pt-6">
            {decidido ? (
              <div>
                <p className="text-sm text-[var(--foreground-strong)]">
                  {ficha.estado === "verificado"
                    ? `Verificado por ${ficha.verificadoPor ?? "—"}`
                    : `Recusado por ${ficha.verificadoPor ?? "—"}`}
                  {ficha.verificadoEm &&
                    ` · ${new Date(ficha.verificadoEm).toLocaleString("pt-PT")}`}
                </p>
                {ficha.motivoRecusa && (
                  <p className="meta mt-2 border-l border-[var(--border)] pl-3">
                    {ficha.motivoRecusa}
                  </p>
                )}
                <p className="meta mt-4">
                  Uma decisão registada não se desfaz por aqui. Se estiver errada, o vendedor
                  reenvia o documento e o novo entra na fila.
                </p>
              </div>
            ) : (
              <>
                <p className="meta mb-4 max-w-prose">
                  Verificar quer dizer que{" "}
                  <strong className="text-[var(--foreground)]">você</strong> olhou para este
                  documento e que ele corresponde a este cavalo. O site não confere nada contra
                  registo nenhum: o que sustenta a palavra «verificado» no anúncio é este clique,
                  com o seu nome e a hora.
                </p>

                {!aRecusar ? (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => decidir("verificar")}
                      disabled={ocupado}
                      className="btn btn-primario"
                    >
                      {ocupado ? (
                        <Loader2 size={13} className="animate-spin" aria-hidden />
                      ) : (
                        <Check size={13} aria-hidden />
                      )}
                      Verificar
                    </button>
                    <button
                      type="button"
                      onClick={() => setARecusar(true)}
                      disabled={ocupado}
                      className="btn btn-secundario"
                    >
                      <X size={13} aria-hidden />
                      Recusar
                    </button>
                  </div>
                ) : (
                  <div className="anim-crescer">
                    <label htmlFor="motivo" className="rotulo-forte mb-2 block">
                      Porque é que não serve?
                    </label>
                    <p className="meta mb-2">
                      O vendedor vai ler este texto para saber o que reenviar. «Não serve» não lhe
                      diz nada.
                    </p>
                    <textarea
                      id="motivo"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      autoFocus
                      className="campo w-full resize-y"
                      placeholder="Falta a página com o número do microchip."
                    />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => decidir("recusar")}
                        disabled={ocupado || motivo.trim() === ""}
                        className="btn btn-secundario"
                        style={{ borderColor: "var(--erro)", color: "var(--erro)" }}
                      >
                        {ocupado ? (
                          <Loader2 size={13} className="animate-spin" aria-hidden />
                        ) : (
                          <X size={13} aria-hidden />
                        )}
                        Recusar com este motivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setARecusar(false)}
                        disabled={ocupado}
                        className="btn btn-subtil"
                      >
                        Cancelar
                      </button>
                    </div>
                    {motivo.trim() === "" && (
                      <p className="meta mt-2">Sem motivo escrito não se recusa.</p>
                    )}
                  </div>
                )}
              </>
            )}

            {erro && (
              <p role="alert" className="meta mt-4" style={{ color: "var(--erro)" }}>
                {erro}
              </p>
            )}
          </div>
        </section>
      </div>

      {ficha.textoLido && (
        <section className="mt-10">
          <h2 className="rotulo-forte mb-3">Texto extraído do ficheiro</h2>
          <p className="meta mb-3">
            Serve para procurar sem abrir o documento. Não é o documento, e o que aqui falta pode
            muito bem lá estar.
          </p>
          <pre className="cartao max-h-72 overflow-auto p-4 font-mono text-xs whitespace-pre-wrap text-[var(--foreground-secondary)]">
            {ficha.textoLido}
          </pre>
        </section>
      )}
    </div>
  );
}

function Voltar() {
  return (
    <Link
      href="/admin/documentos"
      className="meta inline-flex items-center gap-2 hover:text-[var(--foreground)]"
    >
      <ArrowLeft size={13} aria-hidden />
      Voltar à fila
    </Link>
  );
}

function EstadoActual({ estado }: { estado: EstadoDeDocumento }) {
  if (estado === "verificado") {
    return <span className="selo selo-forte">{ROTULO_DO_ESTADO[estado]}</span>;
  }
  if (estado === "recusado") {
    return (
      <span className="selo" style={{ background: "var(--erro)", color: "#000" }}>
        {ROTULO_DO_ESTADO[estado]}
      </span>
    );
  }
  return (
    <span className="selo selo-neutro border border-[var(--border-soft)]">
      {ROTULO_DO_ESTADO[estado]}
    </span>
  );
}
