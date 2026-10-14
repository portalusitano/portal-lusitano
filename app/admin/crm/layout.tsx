import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CRM - Pipeline de Vendas - Admin Portal Lusitano",
  description: "Gestão visual de leads e oportunidades de negócio",
  robots: "noindex, nofollow",
};

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return children;
}
