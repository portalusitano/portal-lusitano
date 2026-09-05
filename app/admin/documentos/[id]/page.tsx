/**
 * A ficha de revisão de um documento.
 *
 * Guarda de servidor, como a fila: o middleware já barra `/admin/*` sem cookie,
 * e esta é a segunda fechadura na mesma porta.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import Ficha from "./Ficha";

export const metadata: Metadata = {
  title: "Rever documento",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PaginaDaFicha({ params }: { params: Promise<{ id: string }> }) {
  const email = await verifySession();
  if (!email) redirect("/admin/login");

  const { id } = await params;
  return <Ficha id={id} />;
}
