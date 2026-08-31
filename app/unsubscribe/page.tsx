"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const { t } = useLanguage();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleUnsubscribe() {
    if (!email) {
      setStatus("error");
      setMessage(t.unsubscribe_page.email_not_found);
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || t.unsubscribe_page.success_default);
      } else {
        setStatus("error");
        setMessage(data.error || t.unsubscribe_page.error_default);
      }
    } catch {
      setStatus("error");
      setMessage(t.unsubscribe_page.connection_error);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div
        data-revelar=""
        suppressHydrationWarning
        className="cartao max-w-md w-full p-10 text-center"
      >
        <h1 className="text-2xl text-[var(--foreground)] mb-4">{t.unsubscribe_page.title}</h1>

        <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-[var(--border)] to-transparent mx-auto mb-8"></div>

        {status === "idle" && (
          <>
            <p className="text-[var(--foreground-secondary)] mb-6">
              {t.unsubscribe_page.confirm_question}
            </p>
            {email && (
              <p className="text-[var(--foreground-muted)] text-sm mb-6">
                {t.unsubscribe_page.email_label}
                {""}
                <span className="text-[var(--foreground)]">{email}</span>
              </p>
            )}
            <button
              onClick={handleUnsubscribe}
              className="w-full bg-red-600 text-[var(--foreground)] font-bold uppercase text-xs tracking-wide py-4 hover:bg-red-700 transition-all"
            >
              {t.unsubscribe_page.yes_cancel}
            </button>
            <LocalizedLink
              href="/"
              className="block mt-4 text-[var(--foreground-muted)] text-sm hover:text-[var(--foreground-strong)] transition-colors"
            >
              {t.unsubscribe_page.no_continue}
            </LocalizedLink>
          </>
        )}

        {status === "loading" && (
          <div className="py-8">
            <div className="w-8 h-8 border-2 border-[var(--foreground-strong)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-[var(--foreground-secondary)] mt-4">
              {t.unsubscribe_page.processing}
            </p>
          </div>
        )}

        {status === "success" && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-[var(--foreground-secondary)] mb-6">{message}</p>
            <p className="text-[var(--foreground-muted)] text-sm mb-6">
              {t.unsubscribe_page.goodbye}
            </p>
            <LocalizedLink href="/" className="btn btn-primario gap-2 rounded-full">
              {t.unsubscribe_page.back_to_portal}
            </LocalizedLink>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-500 text-5xl mb-4">!</div>
            <p className="text-red-400 mb-6">{message}</p>
            <button
              onClick={() => setStatus("idle")}
              className="inline-block bg-[var(--background-card)] text-[var(--foreground)] font-bold uppercase text-xs tracking-wide py-4 px-8 hover:bg-[var(--surface-hover)] transition-all"
            >
              {t.unsubscribe_page.try_again}
            </button>
          </>
        )}

        <p className="text-[var(--foreground-muted)] text-xs mt-8">
          Portal Lusitano &copy; {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
