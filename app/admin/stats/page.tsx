import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sParams = await searchParams;
  if (sParams?.dev !== "true") return null;

  // BUSCA DE DADOS DE ENGENHARIA
  const { data: todosCavalos } = await supabase.from("cavalos_venda").select("*");

  // Lógica de Negócio
  const aprovados = todosCavalos?.filter((c) => c.status === "active") || [];
  const pendentes = todosCavalos?.filter((c) => c.status === "pendente") || [];

  // Cálculo do valor total do mercado aprovado usando LaTeX para formalismo
  // $$ \text{Market Value} = \sum \text{preço de cada exemplar aprovado} $$
  const valorTotal = aprovados.reduce((acc, curr) => acc + Number(curr.preco || 0), 0);

  return (
    <>
      <main className="min-h-screen bg-black text-white pt-48 px-10 pb-20">
        <header className="mb-20 border-b border-[#C5A059]/30 pb-10">
          <p className="text-[#C5A059] rotulo font-bold mb-4 italic">Performance Portal Lusitano</p>
          <h1 className="text-6xl font-normal">Business Analytics</h1>
        </header>

        {/* CARTÕES DE MÉTRICAS DE LUXO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20">
          <div className="bg-zinc-950 border border-zinc-900 p-10 group hover:border-[#C5A059]/50 transition-all duration-700">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
              Valor em Carteira
            </span>
            <p className="text-5xl text-[#C5A059] mt-6 italic">
              {valorTotal.toLocaleString("pt-PT")} €
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-10 group hover:border-green-500/30 transition-all duration-700">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
              Exemplares Ativos
            </span>
            <p className="text-5xl text-white mt-6 italic">{aprovados.length}</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-10 group hover:border-blue-500/30 transition-all duration-700">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
              Aguardam Curadoria
            </span>
            <p className="text-5xl text-white mt-6 italic">{pendentes.length}</p>
          </div>
        </div>

        {/* FEED RECENTE */}
        <div className="bg-zinc-950/50 border border-zinc-900 p-10">
          <h3 className="font-normal text-2xl mb-8">Últimas Submissões</h3>
          <div className="space-y-6">
            {pendentes.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center border-b border-zinc-900 pb-4"
              >
                <div>
                  <p className="text-xl italic">{c.nome_cavalo}</p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-tighter">
                    {c.linhagem}
                  </p>
                </div>
                <p className="text-[#C5A059]">{Number(c.preco).toLocaleString("pt-PT")} €</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
