import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendário de Follow-ups - Admin Portal Lusitano",
  description: "Gestão de tarefas e lembretes de clientes",
  robots: "noindex, nofollow",
};

export default function CalendarioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
