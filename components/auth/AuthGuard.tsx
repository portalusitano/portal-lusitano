"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?returnUrl=" + encodeURIComponent(window.location.pathname));
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--border-soft)] border-t-[var(--gold)] rounded-full animate-spin" />
        </div>
      )
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
