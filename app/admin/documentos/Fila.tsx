"use client";

/**
 * A fila, e o que dela se lê de relance.
 *
 * Quem revê precisa de saber quatro coisas antes de abrir seja o que for: que
 * documento é, de que cavalo, há quanto tempo espera, e se há algum motivo para
 * lhe dar atenção já. Tudo o resto é da ficha.
 *
 * Não leva `<Revelar>`. A entrada ao entrar no ecrã é para páginas que se vêem
 * uma vez; esta abre-se dez vezes por dia e uma cascata de um segundo por
 * abertura é tempo a olhar para blocos a compor-se em vez de para a fila.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Copy, FileText, Inbox, Loader2, RefreshCw } from "lucide-react";
import type { EstadoDeDocumento } from "@/lib/documentos/contrato";
import { ROTULO_DO_ESTADO, ROTULO_DO_TIPO, type LinhaDaFila, type RespostaDaFila } from "./tipos";

/** Os filtros, pela ordem em que se trabalha: o que espera primeiro. */
const FILTROS: { id: EstadoDeDocumento | "todos"; rotulo: string }[] = [
  { id: "por_verificar", rotulo: "Por verificar" },
  { id: "em_revisao", rotulo: "Em revisão" },
  { id: "verificado", rotulo: "Verificados" },
  { id: "recusado", rotulo: "Recusados" },
  { id: "todos", rotulo: "Todos" },
];

/**
 * Há quanto tempo espera, em palavras.
 *
 * Uma data absoluta obriga a fazer a conta de cabeça a cada linha; o que se
 * quer saber ao correr a fila é quem espera há mais tempo. A data exacta fica
 * no `title`, para quem precisar dela.
 */
function haQuantoTempo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const minutos = Math.floor(ms / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** O distintivo do estado. Branco para o que está escolhido, nunca dourado. */
function SeloDoEstado({ estado }: { estado: EstadoDeDocumento }) {
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

export default function Fila() {
  const [filtro, setFiltro] = useState<EstadoDeDocumento | "todos">("por_verificar");
  const [dados, setDados] = useState<RespostaDaFila | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setACarregar(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/admin/documentos?estado=${filtro}`);
      const corpo = await resposta.json();
      if (!resposta.ok) {
        // O `erro` é o desta API; o `error` é o do guarda de `/api/admin/*` no
        // middleware, que responde antes de a rota correr. São dois módulos
        // diferentes com duas convenções, e quem lê a resposta tem de saber.
        throw new Error(corpo.erro || corpo.error || "Erro ao carregar a fila");
      }
      setDados(corpo as RespostaDaFila);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar a fila");
      setDados(null);
    } finally {
      setACarregar(false);
    }
  }, [filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const documentos = dados?.documentos ?? [];

  return (
    <div className="p-6 sm:p-10">
      <header className="mb-8">
        <h1 className="titulo-pagina flex items-center gap-3">
          <FileText size={20} className="text-[var(--foreground-muted)]" aria-hidden />
          Documentos por rever
        </h1>
        <p className="meta mt-2 max-w-2xl">
          Por ordem de chegada. Um documento com contradições ou com o mesmo ficheiro noutro anúncio
          sobe na fila. Nenhum documento fica verificado sem passar por aqui.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          const conta = f.id === "todos" ? null : dados?.contagens?.[f.id];
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              aria-pressed={activo}
              className={`chip ${activo ? "chip-activo" : ""}`}
            >
              {f.rotulo}
              {typeof conta === "number" && (
                <span className="font-mono tabular-nums opacity-70">{conta}</span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={carregar}
          disabled={aCarregar}
          className="btn btn-subtil btn-sm ml-auto"
        >
          <RefreshCw size={13} className={aCarregar ? "animate-spin" : ""} aria-hidden />
          Actualizar
        </button>
      </div>

      {aCarregar && !dados && (
        <div className="flex justify-center py-20 text-[var(--foreground-muted)]">
          <Loader2 size={18} className="animate-spin" aria-hidden />
          <span className="sr-only">A carregar a fila</span>
        </div>
      )}

      {erro && (
        <div role="alert" className="cartao p-6 text-center" style={{ borderColor: "var(--erro)" }}>
          <AlertTriangle
            size={18}
            className="mx-auto mb-3"
            style={{ color: "var(--erro)" }}
            aria-hidden
          />
          <p className="text-sm text-[var(--foreground-secondary)]">{erro}</p>
        </div>
      )}

      {!aCarregar && !erro && documentos.length === 0 && (
        <div className="cartao p-10 text-center">
          <Inbox size={22} className="mx-auto mb-4 text-[var(--foreground-muted)]/30" aria-hidden />
          <p className="text-sm text-[var(--foreground)]">Nada nesta fila.</p>
        </div>
      )}

      {documentos.length > 0 && (
        <ul className="space-y-px bg-[var(--elevate-1)]">
          {documentos.map((d) => (
            <li key={d.id}>
              <LinhaDeDocumento documento={d} />
            </li>
          ))}
        </ul>
      )}

      {dados?.truncada && (
        <p className="meta mt-6">
          A fila está cortada nos primeiros 200. Filtre por estado para ver o resto.
        </p>
      )}
    </div>
  );
}

function LinhaDeDocumento({ documento: d }: { documento: LinhaDaFila }) {
  const temAviso = d.conflitos.length > 0 || d.duplicadoNoutras > 0;

  return (
    <Link
      href={`/admin/documentos/${d.id}`}
      className="block bg-[var(--background)] p-5 transition-colors hover:bg-[var(--elevate-1)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-base text-[var(--foreground-strong)]">
            {ROTULO_DO_TIPO[d.tipo]}
            <span className="text-[var(--foreground-muted)]"> · </span>
            <span className="text-[var(--foreground-secondary)]">
              {d.cavaloNome ?? "Anúncio ainda não pago"}
            </span>
          </p>
          <p className="meta mt-1 font-mono">
            {d.nomeOriginal || "sem nome"} · {tamanho(d.bytes)}
            {!d.cavaloId && ` · ref ${d.referencia.slice(0, 8)}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SeloDoEstado estado={d.estado} />
          <span className="meta tabular-nums" title={new Date(d.criadoEm).toLocaleString("pt-PT")}>
            {haQuantoTempo(d.criadoEm)}
          </span>
        </div>
      </div>

      {temAviso && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {d.duplicadoNoutras > 0 && (
            <span
              className="rotulo-forte inline-flex items-center gap-1.5"
              style={{ color: "var(--erro)" }}
            >
              <Copy size={12} aria-hidden />
              {d.duplicadoNoutras === 1
                ? "Este ficheiro está noutro anúncio"
                : `Este ficheiro está em ${d.duplicadoNoutras} outros anúncios`}
            </span>
          )}
          {d.conflitos.length > 0 && (
            <span className="rotulo-forte inline-flex items-center gap-1.5">
              <AlertTriangle size={12} aria-hidden />
              {d.conflitos.length === 1
                ? "1 campo não bate certo"
                : `${d.conflitos.length} campos não batem certo`}
            </span>
          )}
        </div>
      )}

      {d.estado === "recusado" && d.motivoRecusa && (
        <p className="meta mt-3 border-l border-[var(--border)] pl-3">{d.motivoRecusa}</p>
      )}

      {d.estado === "verificado" && d.verificadoPor && (
        <p className="meta mt-3">
          Verificado por {d.verificadoPor}
          {d.verificadoEm && ` · ${new Date(d.verificadoEm).toLocaleString("pt-PT")}`}
        </p>
      )}
    </Link>
  );
}
