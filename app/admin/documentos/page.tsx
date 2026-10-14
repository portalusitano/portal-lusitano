/**
 * A fila de revisão de documentos.
 *
 * É um componente de servidor que só faz uma coisa: exigir a sessão antes de
 * mandar seja o que for para o browser. O `middleware.ts` já redirecciona quem
 * chega a `/admin/*` sem cookie — isto não o substitui, do mesmo modo que as
 * rotas da API não substituem o guarda do middleware. As duas verificações
 * custam um `jwtVerify` cada e cobrem a falha uma da outra.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import Fila from "./Fila";

export const metadata: Metadata = {
  title: "Documentos por rever",
  robots: { index: false, follow: false },
};

/**
 * Nada nesta página se pode pré-renderizar: depende de um cookie e de uma fila
 * que muda a cada decisão.
 */
export const dynamic = "force-dynamic";

export default async function PaginaDosDocumentos() {
  const email = await verifySession();
  if (!email) redirect("/admin/login");

  return <Fila />;
}
