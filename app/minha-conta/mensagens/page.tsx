import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import MensagensContent from "@/components/minha-conta/MensagensContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "As minhas mensagens — Portal Lusitano",
  description: "Converse com compradores e vendedores no Portal Lusitano.",
  robots: { index: false, follow: false },
};

export default async function MensagensPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <MensagensContent />;
}
