"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LocalizedLink from "@/components/LocalizedLink";
import { AlertTriangle, ArrowLeft, BellRing, Loader2, Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
  FREQUENCIAS,
  descreverAlerta,
  type Alerta,
  type CriteriosAlerta,
} from "@/lib/marketplace-alertas";

const SEXOS = ["", "macho", "femea", "castrado"];
const REGIOES = [
  "",
  "Alentejo",
  "Algarve",
  "Centro",
  "Lisboa",
  "Norte",
  "Ribatejo",
  "Santarém",
  "Madeira",
  "Açores",
];

interface Formulario {
  nome: string;
  sexo: string;
  regiao: string;
  precoMin: string;
  precoMax: string;
  idadeMin: string;
  idadeMax: string;
  termo: string;
  frequencia: string;
}

const FORM_VAZIO: Formulario = {
  nome: "",
  sexo: "",
  regiao: "",
  precoMin: "",
  precoMax: "",
  idadeMin: "",
  idadeMax: "",
  termo: "",
  frequencia: "diaria",
};

export default function AlertasContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [maximo, setMaximo] = useState(10);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // Chegar aqui a partir de "Guardar esta pesquisa" traz os critérios no URL:
  // reescrevê-los à mão seria pedir à pessoa o trabalho que ela acabou de fazer.
  const filtrosDoUrl = useMemo(() => {
    const ler = (k: string) => searchParams.get(k) || "";
    return {
      ...FORM_VAZIO,
      sexo: ler("sexo"),
      regiao: ler("regiao"),
      precoMin: ler("precoMin"),
      precoMax: ler("precoMax"),
      idadeMin: ler("idadeMin"),
      idadeMax: ler("idadeMax"),
      termo: ler("search"),
    };
  }, [searchParams]);

  const veioDeUmaPesquisa = useMemo(
    () => Object.entries(filtrosDoUrl).some(([k, v]) => k !== "frequencia" && v !== ""),
    [filtrosDoUrl]
  );

  const [aCriar, setACriar] = useState(veioDeUmaPesquisa);
  const [form, setForm] = useState<Formulario>(filtrosDoUrl);
  const [aGuardar, setAGuardar] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/alertas");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar alertas");
      setAlertas(data.alertas || []);
      setMaximo(data.maximo || 10);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criar = async () => {
    setAGuardar(true);
    try {
      const res = await fetch("/api/alertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar alerta");

      setAlertas((prev) => [data.alerta, ...prev]);
      setForm(FORM_VAZIO);
      setACriar(false);

      // Telling the user how many match today is what reveals criteria that are
      // too narrow to ever fire.
      showToast(
        "success",
        data.correspondencias === 0
          ? "Alerta criado. Nenhum cavalo corresponde hoje — avisamos quando aparecer."
          : `Alerta criado. ${data.correspondencias} ${
              data.correspondencias === 1 ? "cavalo corresponde" : "cavalos correspondem"
            } hoje.`
      );
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao criar alerta");
    } finally {
      setAGuardar(false);
    }
  };

  const alternar = async (alerta: Alerta) => {
    setOcupado(alerta.id);
    try {
      const res = await fetch(`/api/alertas/${alerta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !alerta.ativo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao actualizar");
      setAlertas((prev) => prev.map((a) => (a.id === alerta.id ? data.alerta : a)));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao actualizar");
    } finally {
      setOcupado(null);
    }
  };

  const apagar = async (id: string) => {
    setOcupado(id);
    try {
      const res = await fetch(`/api/alertas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao apagar");
      setAlertas((prev) => prev.filter((a) => a.id !== id));
      showToast("success", "Alerta apagado");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao apagar");
    } finally {
      setOcupado(null);
    }
  };

  const campo = (chave: keyof Formulario, rotulo: string, tipo = "text") => (
    <label className="block">
      <span className="rotulo">{rotulo}</span>
      <input
        type={tipo}
        value={form[chave]}
        onChange={(e) => setForm({ ...form, [chave]: e.target.value })}
        className="mt-2 w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none"
      />
    </label>
  );

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 sm:px-8 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto">
        <LocalizedLink
          href="/minha-conta"
          className="inline-flex items-center gap-2 rotulo hover:text-[var(--gold)] transition-colors mb-10"
        >
          <ArrowLeft size={12} />A minha conta
        </LocalizedLink>

        <header className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-[var(--foreground)]">
            Os meus alertas
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-3 max-w-xl">
            Guarde uma pesquisa e avisamos por email quando aparecer um cavalo que lhe corresponda.
            Sem novidades, não enviamos nada.
          </p>
        </header>

        {loading && (
          <div className="flex justify-center py-20 text-[var(--foreground-muted)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!loading && erro && (
          <div className="border border-red-400/30 p-8 text-center">
            <AlertTriangle size={18} className="mx-auto text-red-400/70 mb-3" />
            <p className="text-sm text-[var(--foreground-muted)]">{erro}</p>
            <button onClick={carregar} className="mt-5 rotulo-forte hover:text-[var(--gold)]/70">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !erro && (
          <>
            {aCriar ? (
              <div className="border border-[var(--border)] p-6 space-y-5 mb-10">
                <div className="flex items-center justify-between">
                  <span className="rotulo">Nova pesquisa guardada</span>
                  <button
                    onClick={() => setACriar(false)}
                    aria-label="Fechar"
                    className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                  >
                    <X size={14} />
                  </button>
                </div>

                {campo("nome", "Nome do alerta (opcional)")}

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="rotulo">Sexo</span>
                    <select
                      value={form.sexo}
                      onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                      className="mt-2 w-full bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none"
                    >
                      {SEXOS.map((s) => (
                        <option key={s} value={s}>
                          {s === "" ? "Indiferente" : s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="rotulo">Região</span>
                    <select
                      value={form.regiao}
                      onChange={(e) => setForm({ ...form, regiao: e.target.value })}
                      className="mt-2 w-full bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none"
                    >
                      {REGIOES.map((r) => (
                        <option key={r} value={r}>
                          {r === "" ? "Indiferente" : r}
                        </option>
                      ))}
                    </select>
                  </label>

                  {campo("precoMin", "Preço mínimo (EUR)", "number")}
                  {campo("precoMax", "Preço máximo (EUR)", "number")}
                  {campo("idadeMin", "Idade mínima", "number")}
                  {campo("idadeMax", "Idade máxima", "number")}
                </div>

                {campo("termo", "Palavra-chave (linhagem, nome…)")}

                <label className="block">
                  <span className="rotulo">Frequência</span>
                  <select
                    value={form.frequencia}
                    onChange={(e) => setForm({ ...form, frequencia: e.target.value })}
                    className="mt-2 w-full bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none"
                  >
                    {FREQUENCIAS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={criar}
                  disabled={aGuardar}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--gold)]/40 rotulo-forte hover:bg-[var(--gold)]/10 transition-colors disabled:opacity-40"
                >
                  {aGuardar ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <BellRing size={12} />
                  )}
                  Guardar alerta
                </button>
              </div>
            ) : (
              alertas.length < maximo && (
                <button
                  onClick={() => setACriar(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--gold)]/40 rotulo-forte hover:bg-[var(--gold)]/10 transition-colors mb-10"
                >
                  <Plus size={12} />
                  Novo alerta
                </button>
              )
            )}

            {alertas.length === 0 ? (
              <div className="border border-[var(--border)] p-12 text-center">
                <BellRing size={22} className="mx-auto text-[var(--gold)]/25 mb-4" />
                <p className="text-sm text-[var(--foreground)]">Ainda não tem alertas.</p>
                <p className="text-xs text-[var(--foreground-muted)] mt-2 max-w-sm mx-auto">
                  O cavalo certo raramente está à venda no dia em que procuramos. Guarde a pesquisa
                  e nós avisamos.
                </p>
              </div>
            ) : (
              <div className="space-y-px bg-[var(--gold)]/8">
                {alertas.map((a) => (
                  <article key={a.id} className="bg-[var(--background)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-light text-[var(--foreground)] truncate">
                          {a.nome}
                        </h2>
                        <p className="text-xs text-[var(--foreground-muted)] mt-1">
                          {descreverAlerta(a)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 border px-2.5 py-1 rotulo ${
                          a.ativo
                            ? "text-emerald-400/90 border-emerald-400/30"
                            : "text-[var(--foreground-muted)] border-[var(--border)]"
                        }`}
                      >
                        {a.ativo ? "Activo" : "Pausado"}
                      </span>
                    </div>

                    <p className="rotulo mt-3">
                      {FREQUENCIAS.find((f) => f.id === a.frequencia)?.label || a.frequencia}
                      {a.ultimoEnvioAt
                        ? ` · último aviso em ${new Date(a.ultimoEnvioAt).toLocaleDateString("pt-PT")}`
                        : " · ainda sem avisos"}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[var(--border)]">
                      <button
                        onClick={() => alternar(a)}
                        disabled={ocupado === a.id}
                        className="px-4 py-2 border border-[var(--border)] rotulo hover:text-[var(--gold)] hover:border-[var(--gold)]/40 transition-colors disabled:opacity-40"
                      >
                        {a.ativo ? "Pausar" : "Reactivar"}
                      </button>
                      <button
                        onClick={() => apagar(a.id)}
                        disabled={ocupado === a.id}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rotulo hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-40"
                      >
                        {ocupado === a.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Trash2 size={11} />
                        )}
                        Apagar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
