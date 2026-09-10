import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AlertasContent from "@/components/minha-conta/AlertasContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Os meus alertas — Portal Lusitano",
  description: "Seja avisado quando aparecer um cavalo Lusitano com as suas características.",
  robots: { index: false, follow: false },
};

export default async function AlertasPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <AlertasContent />;
}
