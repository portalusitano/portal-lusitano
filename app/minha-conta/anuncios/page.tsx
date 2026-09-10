import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import MeusAnunciosContent from "@/components/minha-conta/MeusAnunciosContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Os meus anúncios — Portal Lusitano",
  description: "Faça a gestão dos seus anúncios de cavalos Lusitanos no Portal Lusitano.",
  robots: { index: false, follow: false },
};

export default async function MeusAnunciosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <MeusAnunciosContent />;
}
