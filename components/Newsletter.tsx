"use client";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

const nl = {
  title: {
    pt: "Inscreva-se na",
    en: "Subscribe to",
    es: "Suscríbase a",
  },
  subtitle: {
    pt: "Receba análises de linhagens e oportunidades de investimento por e-mail.",
    en: "Receive lineage analysis and investment opportunities by email.",
    es: "Reciba análisis de linaje y oportunidades de inversión por correo electrónico.",
  },
  success: {
    pt: "Bem-vindo à elite. A sua subscrição foi confirmada.",
    en: "Welcome to the elite. Your subscription is confirmed.",
    es: "Bienvenido a la élite. Su suscripción ha sido confirmada.",
  },
  emailLabel: {
    pt: "O seu e-mail",
    en: "Your email",
    es: "Su correo electrónico",
  },
  placeholder: {
    pt: "O seu melhor e-mail",
    en: "Your best email",
    es: "Su mejor correo electrónico",
  },
  buttonLoading: {
    pt: "A processar...",
    en: "Processing...",
    es: "Procesando...",
  },
  button: {
    pt: "Subscrever",
    en: "Subscribe",
    es: "Suscribirse",
  },
  ariaForm: {
    pt: "Subscrição da newsletter",
    en: "Newsletter subscription",
    es: "Suscripción al boletín",
  },
  ariaLoading: {
    pt: "A processar subscrição",
    en: "Processing subscription",
    es: "Procesando suscripción",
  },
  ariaSubmit: {
    pt: "Subscrever newsletter",
    en: "Subscribe to newsletter",
    es: "Suscribirse al boletín",
  },
  error: {
    pt: "Ocorreu um erro. Tente novamente.",
    en: "An error occurred. Please try again.",
    es: "Ocurrió un error. Inténtelo de nuevo.",
  },
};

type Lang = "pt" | "en" | "es";

function tx(obj: Record<Lang, string>, lang: string): string {
  return obj[(lang as Lang) in obj ? (lang as Lang) : "en"] ?? obj.en;
}

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="bg-[var(--background-secondary)] border-y border-[var(--border)] py-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl text-[var(--foreground)] mb-4">
          {tx(nl.title, language)} <span className="text-[var(--gold)]">Gazeta Lusitana</span>
        </h2>
        <p className="text-[var(--foreground-muted)] mb-8 uppercase tracking-wider text-xs">
          {tx(nl.subtitle, language)}
        </p>

        {status === "error" && (
          <p className="text-red-400 text-sm mb-4" role="alert" aria-live="assertive">
            {tx(nl.error, language)}
          </p>
        )}

        {status === "success" ? (
          <p className="text-[var(--gold)] font-bold" role="status" aria-live="polite">
            {tx(nl.success, language)}
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-4 justify-center"
            aria-label={tx(nl.ariaForm, language)}
          >
            <label htmlFor="newsletter-email" className="sr-only">
              {tx(nl.emailLabel, language)}
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder={tx(nl.placeholder, language)}
              className="bg-[var(--background)] border border-[var(--border)] px-6 py-4 text-[var(--foreground)] w-full md:w-96 focus:border-[var(--gold)] outline-none transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-[var(--gold)] text-black px-10 py-4 font-bold uppercase text-xs tracking-wider hover:bg-white transition"
              aria-label={
                status === "loading" ? tx(nl.ariaLoading, language) : tx(nl.ariaSubmit, language)
              }
            >
              {status === "loading" ? tx(nl.buttonLoading, language) : tx(nl.button, language)}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
