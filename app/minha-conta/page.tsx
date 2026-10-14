import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import MinhaContaContent from "@/components/minha-conta/MinhaContaContent";

export const dynamic = "force-dynamic";

export default async function MinhaContaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Construir objecto compatível com MinhaContaContent a partir dos dados Supabase
  const nameParts = (user.user_metadata?.full_name || "").trim().split(" ");
  const customer = {
    firstName: nameParts[0] || user.email?.split("@")[0] || "Membro",
    lastName: nameParts.slice(1).join(" ") || "",
    email: user.email || "",
    createdAt: user.created_at || "",
    orders: { edges: [] },
  };

  return (
    <MinhaContaContent
      customer={customer as unknown as Parameters<typeof MinhaContaContent>[0]["customer"]}
    />
  );
}
