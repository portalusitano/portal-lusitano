import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestão de Coudelarias - Admin Portal Lusitano",
  description: "Gestão completa de coudelarias, planos e aprovações",
  robots: "noindex, nofollow",
};

export default function CoudelariasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
