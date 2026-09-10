import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics Completo - Admin Portal Lusitano",
  description: "Dashboard de analytics com tráfego, conversões e ROI por canal",
  robots: "noindex, nofollow",
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
