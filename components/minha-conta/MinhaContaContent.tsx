"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import LocalizedLink from "@/components/LocalizedLink";
import {
  Crown,
  Loader2,
  ExternalLink,
  Mail,
  LogOut,
  Calculator,
  GitCompare,
  Heart,
  ShoppingBag,
  BookOpen,
  Building2,
  Calendar,
  Trophy,
  GitBranch,
  Store,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  Package,
  Lock,
  Tag,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { logout } from "@/app/minha-conta/actions";
import "../pro-section.css";

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  createdAt?: string;
  orders: {
    edges: {
      node: {
        id: string;
        orderNumber: string;
        processedAt: string;
        financialStatus: string;
        totalPrice: { amount: string; currencyCode: string };
        lineItems: {
          edges: {
            node: {
              title: string;
              variant?: { image?: { url: string } };
            };
          }[];
        };
      };
    }[];
  };
}

interface Favorito {
  id: string;
  item_id: string;
  item_type: "cavalo" | "coudelaria";
  created_at: string;
  cavalos_venda?: { nome: string; foto_principal?: string; slug?: string } | null;
  coudelarias?: { nome: string; foto_capa?: string } | null;
}

// ── Shared subscription hook ─────────────────────────────────────────────────
function useSubscriptionStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from("user_profiles")
          .select("tools_subscription_status")
          .eq("id", user.id)
          .single();
        setStatus(data?.tools_subscription_status || "inactive");
      } catch {
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return { status, loading, isActive: status === "active" };
}

// ── PRO Subscription card ─────────────────────────────────────────────────────
function SubscriptionSection() {
  const { loading, isActive } = useSubscriptionStatus();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManagePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/tools/customer-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPortalLoading(false);
    } catch {
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/tools/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPortalLoading(false);
    } catch {
      setPortalLoading(false);
    }
  };

  if (loading)
    return (
      <div className="border border-[var(--border)] p-6 flex items-center justify-center h-24">
        <Loader2 size={16} className="animate-spin text-[var(--gold)]/40" />
      </div>
    );

  return (
    <div
      className={`relative overflow-hidden ${isActive ? "pro-border-active" : "border border-[var(--border)]"} bg-[var(--background-secondary)]/20 p-6`}
    >
      {isActive && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--gold)]/5 to-transparent animate-[proShimmerSweep_8s_ease-in-out_infinite]" />
        </div>
      )}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[9px] uppercase tracking-[0.35em] text-[var(--foreground-muted)] flex items-center gap-2">
            <Crown size={11} className="text-[var(--gold)]" />
            Ferramentas PRO
          </h3>
          {isActive && (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Activa
            </span>
          )}
        </div>
        {isActive ? (
          <>
            <p className="text-[11px] text-[var(--foreground-muted)] mb-4 leading-relaxed">
              9,99 EUR/mes — Acesso ilimitado a todas as ferramentas.
            </p>
            <button
              onClick={handleManagePortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--gold)] hover:text-[#D4AF6A] transition-colors disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ExternalLink size={12} />
              )}
              Gerir subscricao
            </button>
          </>
        ) : (
          <>
            <p className="text-[11px] text-[var(--foreground-secondary)] mb-4 leading-relaxed">
              Desbloqueie todas as ferramentas por{" "}
              <span className="text-[var(--gold)] font-semibold">9,99 EUR/mes</span>.
            </p>
            <button
              onClick={handleSubscribe}
              disabled={portalLoading}
              className="shimmer-gold inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C5A059] to-[#B8956F] text-black text-[10px] uppercase tracking-widest font-bold hover:from-[#D4AF6A] hover:to-[#C5A059] transition-all disabled:opacity-50"
            >
              {portalLoading ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
              Subscrever PRO
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Recent Favorites section ─────────────────────────────────────────────────
function RecentFavorites({ delay }: { delay: number }) {
  const [items, setItems] = useState<Favorito[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetch("/api/favoritos")
      .then((r) => r.json())
      .then((data) => setItems((data.favoritos || []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section
      className="opacity-0 translate-y-5 transition-all duration-700"
      style={{ animationDelay: `${delay}ms`, transitionDelay: `${delay}ms` }}
      data-animate
    >
      <h2 className="text-[9px] uppercase tracking-[0.4em] text-[var(--foreground-muted)] mb-4 flex items-center gap-3">
        Os meus Favoritos
        <span className="h-[1px] flex-1 bg-[var(--border)]" />
        <LocalizedLink
          href="/favoritos"
          className="text-[var(--gold)]/60 hover:text-[var(--gold)] transition-colors normal-case tracking-normal text-[10px]"
        >
          Ver todos →
        </LocalizedLink>
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-[var(--gold)]/8 gap-px">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--background)] h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-[var(--gold)]/8 gap-px">
          {items.map((fav) => {
            const nome =
              fav.item_type === "cavalo" ? fav.cavalos_venda?.nome : fav.coudelarias?.nome;
            const foto =
              fav.item_type === "cavalo"
                ? fav.cavalos_venda?.foto_principal
                : fav.coudelarias?.foto_capa;
            const href =
              fav.item_type === "cavalo"
                ? `/marketplace/${fav.cavalos_venda?.slug || fav.item_id}`
                : `/coudelarias`;

            return (
              <LocalizedLink
                key={fav.id}
                href={href}
                className="relative overflow-hidden bg-[var(--background)] aspect-square group hover:-translate-y-0.5 transition-transform duration-200"
              >
                {foto ? (
                  <>
                    <Image
                      src={foto}
                      alt={nome || ""}
                      fill
                      sizes="(max-width:640px) 50vw, 25vw"
                      className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300 scale-100 group-hover:scale-[1.03] transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--background-secondary)]/30">
                    <Heart size={14} className="text-[var(--gold)]/20" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/80 truncate">
                    {nome}
                  </p>
                  <p className="text-[8px] text-[var(--gold)]/60 uppercase tracking-widest mt-0.5">
                    {fav.item_type === "cavalo" ? "Cavalo" : "Coudelaria"}
                  </p>
                </div>
                <div className="absolute top-2 right-2">
                  <Heart size={10} className="text-[var(--gold)]/70 fill-[var(--gold)]/40" />
                </div>
              </LocalizedLink>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MinhaContaContent({ customer }: { customer: Customer }) {
  const { t, language } = useLanguage();
  const locale = language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT";
  const { isActive } = useSubscriptionStatus();
  const [visible, setVisible] = useState(false);

  // Trigger staggered entrance
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Apply visible class to all [data-animate] elements
  useEffect(() => {
    if (!visible) return;
    const els = document.querySelectorAll<HTMLElement>("[data-animate]");
    els.forEach((el) => {
      el.classList.remove("opacity-0", "translate-y-5");
    });
  }, [visible]);

  const initials =
    [customer.firstName?.[0], customer.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "M";
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Membro";
  const memberSince = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString(locale, { month: "long", year: "numeric" })
    : "—";

  const formatPrice = (amount: string, currency: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));

  // Tools — first is free, rest PRO-locked for non-subscribers
  const tools = [
    { href: "/ferramentas/calculadora", icon: Calculator, label: "Calculadora", pro: false },
    { href: "/ferramentas/comparador", icon: GitCompare, label: "Comparador", pro: true },
    { href: "/ferramentas/verificador", icon: ShieldCheck, label: "Verificador", pro: true },
    { href: "/ferramentas/analise", icon: Sparkles, label: "Analise", pro: true },
  ];

  const explore = [
    { href: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
    { href: "/favoritos", icon: Heart, label: "Favoritos" },
    { href: "/jornal", icon: BookOpen, label: "Jornal" },
    { href: "/coudelarias", icon: Building2, label: "Coudelarias" },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/cavalos-famosos", icon: Trophy, label: "Lusitanos Notaveis" },
    { href: "/linhagens", icon: GitBranch, label: "Linhagens" },
    { href: "/loja", icon: Store, label: "Loja" },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24 selection:bg-[var(--gold)] selection:text-black">
      {/* ── HERO ─────────────────────────────────────── */}
      <div className="relative overflow-hidden pt-20 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6">
        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "200px 200px",
          }}
        />

        {/* Gradient orbs */}
        <div className="gradient-orb w-[600px] h-[600px] bg-[#C5A059] top-[-240px] left-[-120px] opacity-[0.07]" />
        <div className="gradient-orb w-[400px] h-[400px] bg-purple-700 top-[-180px] right-[-60px] opacity-[0.04]" />

        {/* Fine top rule */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)]/30 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div
            className="opacity-0 translate-y-5 transition-all duration-700"
            style={{ transitionDelay: "0ms" }}
            data-animate
          >
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              {/* Avatar + name */}
              <div className="flex items-end gap-5 sm:gap-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#C5A059] to-[#7A5A20] flex items-center justify-center shadow-[0_0_50px_rgba(197,160,89,0.3)]">
                    <span className="text-xl sm:text-2xl font-serif font-bold text-black tracking-wider select-none">
                      {initials}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--background)] flex items-center justify-center ring-1 ring-[var(--gold)]/40">
                      <Crown size={10} className="text-[var(--gold)]" />
                    </div>
                  )}
                </div>

                {/* Name + editorial accent */}
                <div className="relative pl-4">
                  {/* Vertical gold line */}
                  <div className="absolute left-0 top-[4px] bottom-[4px] w-[2px] bg-gradient-to-b from-transparent via-[var(--gold)]/50 to-transparent" />

                  <span className="block text-[9px] uppercase tracking-[0.4em] text-[var(--gold)] mb-2">
                    {t.account.private_area}
                  </span>

                  {/* Greeting with animated underline */}
                  <div className="relative inline-block">
                    <h1 className="text-2xl sm:text-4xl font-serif italic text-[var(--foreground)] leading-none">
                      {t.account.hello}, {customer.firstName || "Membro"}
                    </h1>
                    <span
                      className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-[var(--gold)]/60 to-transparent"
                      style={{
                        width: visible ? "100%" : "0%",
                        transition: "width 1s ease-out 0.4s",
                      }}
                    />
                  </div>

                  <p className="text-[11px] text-[var(--foreground-muted)] mt-1.5 font-light">
                    Membro desde <span className="capitalize">{memberSince}</span>
                  </p>
                </div>
              </div>

              {/* Logout */}
              <form action={logout}>
                <button className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] hover:text-red-400 border border-[var(--border)] hover:border-red-900/60 px-5 py-2.5 transition-colors hover:bg-red-900/10">
                  <LogOut size={12} />
                  {t.account.logout}
                </button>
              </form>
            </div>
          </div>

          {/* Stats bar */}
          <div
            className="opacity-0 translate-y-5 transition-all duration-700 mt-8 sm:mt-10 grid grid-cols-3 bg-[var(--gold)]/8 divide-x divide-[var(--gold)]/10 border border-[var(--gold)]/10"
            style={{ transitionDelay: "120ms" }}
            data-animate
          >
            <div className="px-4 sm:px-7 py-3.5 sm:py-5 group hover:bg-[var(--gold)]/5 transition-colors">
              <p className="text-[8px] uppercase tracking-[0.35em] text-[var(--foreground-muted)] mb-1">
                Plano
              </p>
              <p
                className={`text-sm font-semibold ${isActive ? "text-[var(--gold)]" : "text-[var(--foreground-secondary)]"}`}
              >
                {isActive ? "PRO" : "Basico"}
              </p>
            </div>
            <div className="px-4 sm:px-7 py-3.5 sm:py-5 hover:bg-[var(--gold)]/5 transition-colors">
              <p className="text-[8px] uppercase tracking-[0.35em] text-[var(--foreground-muted)] mb-1">
                Email
              </p>
              <p className="text-sm text-[var(--foreground)] truncate font-light">
                {customer.email}
              </p>
            </div>
            <div className="px-4 sm:px-7 py-3.5 sm:py-5 hover:bg-[var(--gold)]/5 transition-colors">
              <p className="text-[8px] uppercase tracking-[0.35em] text-[var(--foreground-muted)] mb-1">
                Membro desde
              </p>
              <p className="text-sm text-[var(--foreground)] font-light capitalize">
                {memberSince}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* ── SIDEBAR ──────────────────────────────── */}
          <div
            className="opacity-0 translate-y-5 transition-all duration-700 space-y-4"
            style={{ transitionDelay: "200ms" }}
            data-animate
          >
            {/* Profile card */}
            <div className="border border-[var(--border)] bg-[var(--background-secondary)]/20 p-6 hover:border-[var(--gold)]/20 transition-colors">
              <h3 className="text-[9px] uppercase tracking-[0.35em] text-[var(--foreground-muted)] mb-5">
                {t.account.profile}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail size={12} className="text-[var(--gold)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] mb-0.5">
                      {t.account.email}
                    </p>
                    <p className="text-sm text-[var(--foreground)] font-light truncate">
                      {customer.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle size={12} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] mb-0.5">
                      {t.account.name}
                    </p>
                    <p className="text-sm text-[var(--foreground)] font-light">{fullName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* PRO subscription card */}
            <SubscriptionSection />

            {/* Os meus anúncios shortcut */}
            <LocalizedLink
              href="/minha-conta/anuncios"
              className="glow-pulse flex items-center justify-between border border-[var(--border)] bg-[var(--background-secondary)]/10 px-5 py-4 hover:border-[var(--gold)]/30 hover:bg-[var(--gold)]/5 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(197,160,89,0.1)] transition-all duration-200 group"
            >
              <span className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[var(--foreground-secondary)] group-hover:text-[var(--foreground)]">
                <Tag size={13} className="text-[var(--gold)]" />
                Os meus Anúncios
              </span>
              <span className="text-[var(--gold)]/40 group-hover:text-[var(--gold)] transition-colors text-sm">
                →
              </span>
            </LocalizedLink>

            {/* Favoritos shortcut */}
            <LocalizedLink
              href="/favoritos"
              className="glow-pulse flex items-center justify-between border border-[var(--border)] bg-[var(--background-secondary)]/10 px-5 py-4 hover:border-[var(--gold)]/30 hover:bg-[var(--gold)]/5 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(197,160,89,0.1)] transition-all duration-200 group"
            >
              <span className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[var(--foreground-secondary)] group-hover:text-[var(--foreground)]">
                <Heart size={13} className="text-[var(--gold)]" />
                Os meus Favoritos
              </span>
              <span className="text-[var(--gold)]/40 group-hover:text-[var(--gold)] transition-colors text-sm">
                →
              </span>
            </LocalizedLink>
          </div>

          {/* ── MAIN CONTENT ─────────────────────────── */}
          <div className="space-y-8">
            {/* Tools grid */}
            <section
              className="opacity-0 translate-y-5 transition-all duration-700"
              style={{ transitionDelay: "280ms" }}
              data-animate
            >
              <h2 className="text-[9px] uppercase tracking-[0.4em] text-[var(--foreground-muted)] mb-4 flex items-center gap-3">
                As suas Ferramentas
                <span className="h-[1px] flex-1 bg-[var(--border)]" />
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 bg-[var(--gold)]/8 gap-px">
                {tools.map(({ href, icon: Icon, label, pro }) => {
                  const locked = pro && !isActive;
                  return (
                    <div key={href} className="relative group">
                      <LocalizedLink
                        href={locked ? "/ferramentas" : href}
                        className={`glow-pulse flex flex-col items-center justify-center gap-2.5 py-7 bg-[var(--background)] hover:bg-[var(--gold)]/5 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(197,160,89,0.1)] transition-all duration-200 ${locked ? "opacity-40 pointer-events-none" : ""}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-[var(--gold)]/10 flex items-center justify-center group-hover:bg-[var(--gold)]/20 transition-colors">
                          <Icon size={15} className="text-[var(--gold)]" />
                        </div>
                        <span className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] group-hover:text-[var(--foreground-secondary)] transition-colors text-center">
                          {label}
                        </span>
                      </LocalizedLink>

                      {/* Lock overlay for PRO tools */}
                      {locked && (
                        <LocalizedLink
                          href="/ferramentas"
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[var(--background)]/60 backdrop-blur-[2px] hover:bg-[var(--gold)]/5 transition-colors cursor-pointer"
                        >
                          <Lock size={13} className="text-[var(--gold)]/50" />
                          <span className="text-[8px] uppercase tracking-widest text-[var(--gold)]/50">
                            PRO
                          </span>
                        </LocalizedLink>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recent Favorites */}
            <RecentFavorites delay={360} />

            {/* Explore grid */}
            <section
              className="opacity-0 translate-y-5 transition-all duration-700"
              style={{ transitionDelay: "440ms" }}
              data-animate
            >
              <h2 className="text-[9px] uppercase tracking-[0.4em] text-[var(--foreground-muted)] mb-4 flex items-center gap-3">
                Explorar Portal
                <span className="h-[1px] flex-1 bg-[var(--border)]" />
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 bg-[var(--gold)]/8 gap-px">
                {explore.map(({ href, icon: Icon, label }) => (
                  <LocalizedLink
                    key={href}
                    href={href}
                    className="shimmer-gold flex items-center gap-2.5 px-4 py-4 bg-[var(--background)] hover:bg-[var(--gold)]/5 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(197,160,89,0.08)] transition-all duration-200 group"
                  >
                    <Icon
                      size={13}
                      className="text-[var(--gold)]/60 group-hover:text-[var(--gold)] transition-colors flex-shrink-0"
                    />
                    <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] group-hover:text-[var(--foreground-secondary)] transition-colors">
                      {label}
                    </span>
                  </LocalizedLink>
                ))}
              </div>
            </section>

            {/* Orders */}
            <section
              className="opacity-0 translate-y-5 transition-all duration-700"
              style={{ transitionDelay: "520ms" }}
              data-animate
            >
              <h2 className="text-[9px] uppercase tracking-[0.4em] text-[var(--foreground-muted)] mb-4 flex items-center gap-3">
                {t.account.history}
                <span className="h-[1px] flex-1 bg-[var(--border)]" />
              </h2>

              {customer.orders.edges.length > 0 ? (
                <div className="space-y-3">
                  {customer.orders.edges.map(({ node: order }) => (
                    <div
                      key={order.id}
                      className="border border-[var(--border)] p-5 hover:border-[var(--gold)]/30 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(197,160,89,0.08)] transition-all duration-200 group bg-[var(--background-secondary)]/10"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[var(--gold)] font-mono text-xs">
                            {t.account.order} #{order.orderNumber}
                          </p>
                          <p className="text-[var(--foreground-muted)] text-[10px] mt-0.5">
                            {new Date(order.processedAt).toLocaleDateString(locale)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[var(--foreground)] font-mono text-sm">
                            {formatPrice(order.totalPrice.amount, order.totalPrice.currencyCode)}
                          </p>
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-[var(--background-card)] text-[8px] uppercase tracking-widest text-[var(--foreground-muted)]">
                            {order.financialStatus}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pt-4 border-t border-[var(--border)]">
                        {order.lineItems.edges.map(({ node: item }) => (
                          <div
                            key={item.title}
                            className="w-10 h-14 bg-[var(--background-card)] flex-shrink-0 relative overflow-hidden"
                          >
                            {item.variant?.image?.url ? (
                              <Image
                                src={item.variant.image.url}
                                alt={item.title}
                                fill
                                sizes="40px"
                                className="object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={12} className="text-[var(--foreground-muted)]/40" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative overflow-hidden border border-dashed border-[var(--border)] py-16 px-6 text-center bg-[var(--background-secondary)]/5">
                  <div className="gradient-orb w-48 h-48 bg-[#C5A059] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-full bg-[var(--gold)]/10 flex items-center justify-center mx-auto mb-5">
                      <ShoppingBag size={18} className="text-[var(--gold)]/60" />
                    </div>
                    <p className="font-serif italic text-[var(--foreground-muted)] mb-1 text-base">
                      {t.account.no_orders}
                    </p>
                    <p className="text-[10px] text-[var(--foreground-muted)]/60 mb-6">
                      Descubra a nossa colecao exclusiva.
                    </p>
                    <LocalizedLink
                      href="/loja"
                      className="shimmer-gold inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--gold)]/40 text-[var(--gold)] text-[10px] uppercase tracking-widest hover:bg-[var(--gold)]/10 hover:border-[var(--gold)]/60 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(197,160,89,0.15)] transition-all duration-200"
                    >
                      {t.account.explore} →
                    </LocalizedLink>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
