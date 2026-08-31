import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Financeiro - Admin Portal Lusitano",
  description: "Gestão completa de receitas e transações do Portal Lusitano",
  robots: "noindex, nofollow",
};

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
