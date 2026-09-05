import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sucesso",
  description: "A sua opera\u00e7\u00e3o foi conclu\u00edda com sucesso no Portal Lusitano.",
  keywords: [],
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
