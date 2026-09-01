import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export default async function AdminVendasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sParams = await searchParams;
  if (sParams?.dev !== "true") return null;

  // FUNÇÃO DE ENGENHARIA: Server Action para atualizar o estado
  async function updateStatus(id: string, newStatus: string) {
    "use server";
    await supabase.from("cavalos_venda").update({ status: newStatus }).eq("id", id);

    // Atualiza a página para mostrar a mudança
    revalidatePath("/admin/vendas");
  }

  // Vai buscar todos os cavalos (pendentes, aprovados e rejeitados)
  const { data: cavalos } = await supabase
    .from("cavalos_venda")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="min-h-screen bg-black text-white pt-48 px-10 pb-20">
        <header className="mb-16 border-b border-[var(--border-soft)] pb-8 flex justify-between items-end">
          <div>
            <p className="text-[var(--foreground-muted)] rotulo font-bold mb-2 italic">
              Curadoria de Elite
            </p>
            <h1 className="text-5xl font-normal text-white">
              Gestão de Anúncios <span className="text-[var(--foreground-muted)]">Marketplace</span>
            </h1>
          </div>
          <div className="text-right">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">
              Total de Pedidos: {cavalos?.length || 0}
            </span>
          </div>
        </header>

        <div className="overflow-x-auto border border-zinc-900 bg-zinc-950/20 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[var(--foreground-muted)] rotulo font-bold border-b border-zinc-800">
                <th className="py-6 px-6">Data</th>
                <th className="py-6 px-6">Exemplar</th>
                <th className="py-6 px-6">Linhagem</th>
                <th className="py-6 px-6">Preço</th>
                <th className="py-6 px-6">Estado</th>
                <th className="py-6 px-6 text-right">Decisão Master</th>
              </tr>
            </thead>
            <tbody className="text-sm font-normal">
              {cavalos?.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-900/50 hover:bg-white/[0.02] transition-all duration-500 group"
                >
                  <td className="py-8 px-6 text-zinc-500 italic">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-PT") : "—"}
                  </td>
                  <td className="py-8 px-6">
                    <span className="text-xl text-white group-hover:text-[var(--foreground-strong)] transition-colors">
                      {c.nome_cavalo}
                    </span>
                    <span className="block text-[11px] text-zinc-600 uppercase mt-1">
                      ID: {c.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="py-8 px-6 text-zinc-400 font-normal">{c.linhagem}</td>
                  <td className="py-8 px-6 text-[var(--foreground-muted)] text-lg">
                    {Number(c.preco).toLocaleString("pt-PT")} €
                  </td>
                  <td className="py-8 px-6">
                    <span
                      className={`px-4 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${
                        c.status === "aprovado"
                          ? "border-green-500/50 text-green-500 bg-green-500/5"
                          : c.status === "rejeitado"
                            ? "border-red-500/50 text-red-500 bg-red-500/5"
                            : "border-zinc-700 text-zinc-500 bg-zinc-900"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-8 px-6 text-right">
                    <div className="flex justify-end gap-6">
                      <form
                        action={async () => {
                          "use server";
                          await updateStatus(c.id, "aprovado");
                        }}
                      >
                        <button
                          type="submit"
                          className="text-zinc-500 hover:text-green-500 text-[11px] uppercase font-bold tracking-wider transition-all"
                        >
                          Aprovar
                        </button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await updateStatus(c.id, "rejeitado");
                        }}
                      >
                        <button
                          type="submit"
                          className="text-zinc-500 hover:text-red-500 text-[11px] uppercase font-bold tracking-wider transition-all"
                        >
                          Rejeitar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
