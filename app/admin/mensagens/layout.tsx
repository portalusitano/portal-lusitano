import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mensagens - Admin | Portal Lusitano",
  description: "Gestão centralizada de contactos e mensagens",
  robots: "noindex, nofollow",
};

export default function MensagensLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
