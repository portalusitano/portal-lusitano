import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cavalos Favoritos",
  description: "Os seus cavalos Lusitanos favoritos guardados no Portal Lusitano.",
  keywords: [],
  robots: {
    index: false,
    follow: true,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
