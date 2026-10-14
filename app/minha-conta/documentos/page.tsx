import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DocumentosContent from "@/components/minha-conta/DocumentosContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Os meus documentos — Portal Lusitano",
  description: "O estado dos documentos que enviou com os seus anúncios no Portal Lusitano.",
  // A mesma regra do resto da conta: nada disto vai para um motor de busca.
  robots: { index: false, follow: false },
};

/**
 * A sessão confere-se aqui **e** em cada rota da API que esta página chama.
 *
 * Não é zelo repetido: esta verificação decide o que se desenha, e a da API
 * decide o que se entrega. Uma página protegida com uma API aberta é uma API
 * aberta, e o que está do outro lado destas são documentos de identificação.
 */
export default async function MeusDocumentosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <DocumentosContent />;
}
