"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { AlertTriangle, ArrowLeft, Check, FileText, Loader2, Lock, Upload } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { MAX_BYTES_DOCUMENTO } from "@/lib/documentos/contrato";
import {
  PALAVRAS_DO_ESTADO,
  type AnuncioComDocumentos,
  type DocumentoDoVendedor,
  type TomDoEstado,
} from "@/lib/documentos-do-vendedor";

/**
 * O estado dos documentos, para quem os enviou.
 *
 * Do lado de quem administra o circuito estava fechado; deste lado não havia
 * nada. Um vendedor enviava o Livro Azul, pagava, e depois não sabia se o
 * documento tinha chegado, se alguém lhe tinha pegado, nem — se fosse recusado
 * — porquê.
 *
 * ## As duas regras que este ecrã não pode quebrar
 *
 * 1. **Nunca dizer mais do que aconteceu.** Foi um visto verde a afirmar uma
 *    verificação inexistente que motivou este trabalho todo, e um documento
 *    recebido pintado de verde é o mesmo erro com outra cor. Só o `verificado`
 *    leva marca positiva; o que chegou e ainda não foi visto é neutro, porque
 *    ainda não é nada.
 * 2. **Nenhum prazo.** Não há fila com prazo nem nada que a percorra sozinha.
 *    Escrever «em 24 horas» seria inventar um compromisso que ninguém cumpre.
 *
 * As frases de cada estado não vivem aqui: vivem em `PALAVRAS_DO_ESTADO`, ao
 * lado da API que as serve, para que não haja duas ideias de «verificado» no
 * mesmo site.
 */

interface Resposta {
  anuncios: AnuncioComDocumentos[];
}

/** O ponto que assinala o estado. `--ok` só no que foi mesmo verificado. */
const COR_DO_TOM: Readonly<Record<TomDoEstado, string>> = {
  neutro: "var(--foreground-muted)",
  bom: "var(--ok)",
  mau: "var(--erro)",
};

/* Escrito a partir do contrato e não à mão: um ecrã que diga «10 MB» enquanto
   o limite é outro é um ecrã que mente a quem está a tentar enviar. */
const TECTO_POR_EXTENSO = `${Math.round(MAX_BYTES_DOCUMENTO / (1024 * 1024))} MB`;

function tamanho(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function data(iso: string): string {
  const quando = new Date(iso);
  if (Number.isNaN(quando.getTime())) return "";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(quando);
}

export default function DocumentosContent() {
  const { showToast } = useToast();
  const [anuncios, setAnuncios] = useState<AnuncioComDocumentos[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  /** Id do documento com um envio a decorrer, para só os botões dele fecharem. */
  const [ocupado, setOcupado] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/meus-anuncios/documentos");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const dados = (await res.json()) as Resposta & { error?: string };
      if (!res.ok) throw new Error(dados.error || "Erro ao carregar os documentos");
      setAnuncios(dados.anuncios || []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar os documentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const substituir = async (documentoId: string, ficheiro: File) => {
    setOcupado(documentoId);
    try {
      const corpo = new FormData();
      corpo.append("ficheiro", ficheiro);

      const res = await fetch(`/api/meus-anuncios/documentos/${documentoId}/substituir`, {
        method: "POST",
        body: corpo,
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error || "Erro ao enviar o documento");

      // O que se afirma no aviso é o que aconteceu, e mais nada.
      showToast("success", "Documento recebido. Ainda não foi revisto.");
      // A lista volta a ser lida em vez de remendada à mão: o envio cria uma
      // linha nova e muda o estado da antiga para «substituída», e é a API que
      // sabe compor as duas coisas.
      await carregar();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao enviar o documento");
    } finally {
      setOcupado(null);
    }
  };

  const total = anuncios.reduce((soma, a) => soma + a.documentos.length, 0);

  return (
    <div className="min-h-screen bg-[var(--background)] px-5 sm:px-8 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto">
        <LocalizedLink
          href="/minha-conta"
          className="inline-flex items-center gap-2 rotulo hover:text-[var(--foreground-strong)] transition-colors mb-10"
        >
          <ArrowLeft size={12} />A minha conta
        </LocalizedLink>

        <header data-revelar="" suppressHydrationWarning className="mb-10">
          <h1 className="titulo-gradiente text-[1.75rem] md:text-[2.5rem] font-normal leading-[120%] tracking-tighter">
            Os documentos que enviou
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-3 max-w-xl">
            Para cada anúncio, o que recebemos e em que ponto está. Um documento só fica verificado
            depois de uma pessoa da equipa o abrir e o confirmar.
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-24 text-[var(--foreground-muted)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!loading && erro && (
          <div className="cartao p-8 text-center">
            <AlertTriangle
              size={18}
              className="mx-auto mb-3 text-[var(--erro)]"
              aria-hidden="true"
            />
            <p className="text-sm text-[var(--foreground-muted)]">{erro}</p>
            <button
              onClick={carregar}
              className="mt-5 rotulo-forte hover:text-[var(--foreground)] transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !erro && anuncios.length === 0 && (
          <div className="cartao p-10 text-center">
            <FileText size={22} className="mx-auto text-[var(--foreground-muted)] mb-4" />
            <p className="text-sm text-[var(--foreground)]">Ainda não tem anúncios.</p>
            <p className="meta mt-2 max-w-sm mx-auto">
              Os documentos aparecem aqui depois de publicar um cavalo.
            </p>
          </div>
        )}

        {!loading && !erro && anuncios.length > 0 && (
          <div className="space-y-10">
            {anuncios.map((anuncio) => (
              <section key={anuncio.id}>
                <h2 className="titulo-seccao mb-1">{anuncio.nome}</h2>
                <p className="meta mb-4">
                  {anuncio.documentos.length === 0
                    ? "Nenhum documento recebido"
                    : `${anuncio.documentos.length} ${
                        anuncio.documentos.length === 1 ? "documento" : "documentos"
                      }`}
                </p>

                {anuncio.documentos.length === 0 ? (
                  <div className="cartao p-6">
                    <p className="text-sm text-[var(--foreground)]">
                      Não recebemos nenhum documento para este anúncio.
                    </p>
                    <p className="meta mt-2">
                      Se anexou o Livro Azul e ele não aparece aqui, é porque não chegou até nós.
                      Fale connosco e resolvemos.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-px bg-[var(--elevate-1)]">
                    {anuncio.documentos.map((documento) => (
                      <li key={documento.id} className="bg-[var(--background)] p-5 sm:p-6">
                        <LinhaDeDocumento
                          documento={documento}
                          ocupado={ocupado === documento.id}
                          bloqueado={ocupado !== null}
                          registarInput={(el) => {
                            inputs.current[documento.id] = el;
                          }}
                          escolher={() => inputs.current[documento.id]?.click()}
                          enviar={(ficheiro) => substituir(documento.id, ficheiro)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        {!loading && !erro && total > 0 && (
          <p className="meta mt-10 flex items-start gap-2 max-w-xl">
            <Lock size={11} className="mt-0.5 shrink-0" aria-hidden="true" />
            Os documentos ficam num arquivo privado. Só os abre quem tem sessão iniciada nesta conta
            e quem os revê — nunca ficam num endereço que se possa partilhar.
          </p>
        )}
      </div>
    </div>
  );
}

interface LinhaProps {
  documento: DocumentoDoVendedor;
  ocupado: boolean;
  bloqueado: boolean;
  registarInput: (el: HTMLInputElement | null) => void;
  escolher: () => void;
  enviar: (ficheiro: File) => void;
}

function LinhaDeDocumento({
  documento,
  ocupado,
  bloqueado,
  registarInput,
  escolher,
  enviar,
}: LinhaProps) {
  const palavras = PALAVRAS_DO_ESTADO[documento.estado];
  const recebido = data(documento.criadoEm);
  const decidido = documento.decididoEm ? data(documento.decididoEm) : null;
  const peso = tamanho(documento.bytes);
  // O convite para enviar outro só aparece na recusa mais recente de cada
  // tipo. Repeti-lo debaixo de três recusas antigas é pedir três vezes uma
  // coisa que já foi feita uma.
  const podeSubstituir = documento.estado === "recusado" && !documento.substituido;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="rotulo-forte">{documento.nomeDoTipo}</p>
          <p className="text-sm text-[var(--foreground)] mt-2 flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-[0.4rem] size-1.5 rounded-full shrink-0"
              style={{ background: COR_DO_TOM[palavras.tom] }}
            />
            {palavras.titulo}
          </p>
          <p className="meta mt-1.5 pl-[0.875rem]">{palavras.explicacao}</p>
        </div>

        {documento.estado === "verificado" && (
          <span className="selo selo-novo shrink-0">
            <Check size={10} aria-hidden="true" />
            Verificado
          </span>
        )}
      </div>

      <p className="meta mt-4">
        <span className="font-mono">{documento.nomeOriginal}</span>
        {peso && ` · ${peso}`}
        {recebido && ` · recebido a ${recebido}`}
        {decidido && documento.estado !== "por_verificar" && ` · decidido a ${decidido}`}
      </p>

      {documento.substituido && (
        <p className="meta mt-2">Já enviou outro ficheiro para este documento depois deste.</p>
      )}

      {documento.motivoRecusa && (
        <div className="mt-4 border-l-2 border-[var(--erro)] pl-4">
          <p className="rotulo mb-1.5">Motivo da recusa</p>
          {/* Tal como quem reviu o escreveu. Resumi-lo aqui era tirar ao
              vendedor a única coisa que lhe diz o que reenviar. */}
          <p className="text-sm text-[var(--foreground)] whitespace-pre-line">
            {documento.motivoRecusa}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-5">
        <a
          href={`/api/meus-anuncios/documentos/${documento.id}/ficheiro`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secundario btn-sm"
        >
          Ver o ficheiro
        </a>

        {podeSubstituir && (
          <>
            <input
              ref={registarInput}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const ficheiro = e.target.files?.[0];
                // O valor limpa-se sempre, mesmo quando há ficheiro: sem isto,
                // escolher o mesmo ficheiro outra vez depois de uma falha não
                // dispara `change` nenhum e o botão parece morto.
                e.target.value = "";
                if (ficheiro) enviar(ficheiro);
              }}
            />
            <button
              type="button"
              onClick={escolher}
              disabled={bloqueado}
              className="btn btn-primario btn-sm"
            >
              {ocupado ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : (
                <Upload size={12} aria-hidden="true" />
              )}
              Enviar outro ficheiro
            </button>
            <span className="meta">{`PDF, JPEG, PNG ou WebP, até ${TECTO_POR_EXTENSO}.`}</span>
          </>
        )}
      </div>
    </div>
  );
}
