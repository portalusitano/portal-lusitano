import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export default async function AdminDepoimentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sParams = await searchParams;
  if (sParams?.dev !== "true") return null;

  const { data: pendentes } = await supabase
    .from("depoimentos_cavalos")
    .select("*, cavalos_venda(nome)")
    .eq("status", "pendente");

  return (
    <>
      <main className="min-h-screen bg-black text-white pt-48 px-10">
        <header className="mb-16 border-b border-zinc-900 pb-8">
          <h1 className="text-4xl font-normal">
            Curadoria de <span className="text-[var(--foreground-muted)]">Testemunhos</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {pendentes?.map((dep) => (
            <div
              key={dep.id}
              className="bg-zinc-950 border border-zinc-900 p-8 flex justify-between items-center"
            >
              <div className="max-w-2xl">
                <p className="text-[var(--foreground-muted)] text-[11px] uppercase font-bold mb-2 tracking-wider">
                  Sobre: {dep.cavalos_venda?.nome}
                </p>
                <p className="text-xl font-normal text-zinc-300 mb-4">
                  &ldquo;{dep.mensagem}&rdquo;
                </p>
                <p className="text-xs uppercase tracking-tighter text-zinc-500">
                  {dep.autor_nome} — {dep.autor_cargo}
                </p>
              </div>
              <div className="flex gap-6">
                <button className="text-green-500 text-[10px] font-bold uppercase hover:underline">
                  Aprovar
                </button>
                <button className="text-red-500 text-[10px] font-bold uppercase hover:underline">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
