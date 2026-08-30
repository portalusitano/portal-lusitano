import type { Metadata } from "next";
import Link from "next/link";
import "./auth.css";

export const metadata: Metadata = {
  title: "Autenticação",
  description:
    "Aceda à sua conta no Portal Lusitano — o maior portal de cavalos Lusitanos em Portugal.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col lg:flex-row">
      {/* ── Left branding panel (desktop only) ────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden"
        aria-hidden="true"
      >
        {/* Layered background */}
        <div className="absolute inset-0 bg-[var(--background-card)]" />

        {/* Animated radial gold glow */}
        <div
          className="absolute inset-0 opacity-25 animate-auth-gradient"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 30% 40%, #C5A059 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 70% 70%, #B8956F 0%, transparent 60%)",
            backgroundSize: "200% 200%",
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#C5A059 1px, transparent 1px), linear-gradient(90deg, #C5A059 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Decorative diagonal lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #C5A059 0px, #C5A059 1px, transparent 1px, transparent 40px)",
          }}
        />

        {/* Floating decorative orbs */}
        <div className="absolute top-[15%] right-[15%] w-32 h-32 rounded-full bg-[var(--gold)]/5 blur-2xl animate-auth-float" />
        <div
          className="absolute bottom-[20%] left-[10%] w-24 h-24 rounded-full bg-[var(--gold)]/8 blur-xl animate-auth-float"
          style={{ animationDelay: "2s" }}
        />

        {/* Logo */}
        <Link href="/" className="relative z-10 inline-flex flex-col gap-1 group w-fit">
          <span className="text-2xl font-serif text-[var(--foreground)] tracking-wider group-hover:text-[var(--gold)] transition-colors duration-300">
            PORTAL LUSITANO
          </span>
          <div className="flex items-center gap-3">
            <span className="rotulo">EST. 2023</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/30 to-transparent" />
          </div>
        </Link>

        {/* Central visual: horse icon + tagline */}
        <div className="relative z-10 flex-1 flex flex-col items-start justify-center gap-8 py-12">
          {/* Decorative horse silhouette mark — larger */}
          <div
            className="w-20 h-20 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-[var(--gold)]/5 animate-auth-float"
            style={{ animationDuration: "5s" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="40"
              height="40"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 17c0 0 1-5 4-7s6-2 8-4c1-0.8 1.5-2 1-3" />
              <path d="M4 17c1 1 3 2 5 1.5" />
              <path d="M8 18.5V21" />
              <path d="M11 19v2" />
              <path d="M15 6c0.5 1 0.3 2.5-1 3.5" />
              <circle cx="16" cy="4" r="1" fill="var(--gold)" stroke="none" />
            </svg>
          </div>

          <div>
            <h2 className="text-3xl xl:text-4xl font-serif text-[var(--foreground)] leading-snug mb-3">
              A referência do
              <br />
              <span className="text-[var(--gold)]">cavalo Lusitano</span>
              <br />
              em Portugal
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed max-w-xs">
              Ferramentas exclusivas, análise de perfil e o maior mercado de cavalos Lusitanos
              online.
            </p>
          </div>

          {/* Trust indicators with icons */}
          <div className="flex flex-col gap-3 mt-2 w-full max-w-xs">
            {[
              {
                icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z",
                label: "Gestão dos seus anúncios",
              },
              {
                icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
                label: "Mensagens com os compradores",
              },
              {
                icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
                label: "Alertas quando aparece o cavalo certo",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 group/item">
                <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/8 border border-[var(--gold)]/15 flex items-center justify-center shrink-0 group-hover/item:bg-[var(--gold)]/15 transition-colors">
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={item.icon} />
                  </svg>
                </div>
                <span className="text-xs text-[var(--foreground-secondary)] leading-snug">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Social proof stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--border)]/30 w-full max-w-xs">
            {[
              { value: "500+", label: "Membros" },
              { value: "10K+", label: "Cavalos Analisados" },
              { value: "100%", label: "Gratuito" },
            ].map((stat) => (
              <div key={stat.label} className="text-center flex-1">
                <div className="text-lg font-bold text-[var(--gold)] leading-none mb-1">
                  {stat.value}
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <blockquote className="relative z-10 border-l-2 border-[var(--gold)]/40 pl-4">
          <p className="text-xs text-[var(--foreground-muted)] italic leading-relaxed">
            &ldquo;A equitação é a arte de esconder a arte.&rdquo;
          </p>
          <footer className="text-[10px] text-[var(--foreground-muted)]/60 mt-1 tracking-wider uppercase">
            Mestre Nuno Oliveira
          </footer>
        </blockquote>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-8 lg:px-12 xl:px-16 min-h-screen lg:min-h-0">
        {/* Mobile-only logo */}
        <Link href="/" className="flex flex-col items-center mb-8 lg:hidden group" tabIndex={0}>
          <span className="text-xl font-serif text-[var(--foreground)] tracking-wide group-hover:text-[var(--gold)] transition-colors">
            PORTAL LUSITANO
          </span>
          <span className="rotulo mt-1">EST. 2023</span>
        </Link>

        {/* Form card — glass-morphism */}
        <div className="w-full max-w-md bg-[var(--background-secondary)]/80 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-8 shadow-2xl shadow-black/40 animate-auth-fadeInUp">
          {children}
        </div>

        <Link
          href="/"
          className="mt-6 text-sm text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors animate-auth-fadeInUp auth-stagger-7"
        >
          ← Voltar ao Portal
        </Link>
      </div>
    </div>
  );
}
