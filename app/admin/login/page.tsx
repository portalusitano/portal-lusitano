"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminLogin } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[var(--gold)] text-black font-bold uppercase text-xs tracking-wide py-4 hover:bg-white hover:shadow-[0_0_20px_rgb(var(--gold-rgb) / 0.3)] transition-all duration-500 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "A entrar..." : "Entrar"}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useActionState(adminLogin, null);

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center relative overflow-hidden px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--gold)] opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-20 w-full max-w-md bg-[var(--background-secondary)]/40 backdrop-blur-md border border-[var(--border)] p-10 md:p-14 shadow-2xl">
        <div className="text-center mb-12">
          <span className="text-[var(--gold)] rotulo font-bold block mb-4">Acesso Restrito</span>
          <h1 className="text-4xl text-[var(--foreground)] tracking-tight">Administração</h1>
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent mx-auto mt-6"></div>
        </div>

        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-900/20 border border-red-500/50 p-3 text-center">
              <p className="text-red-400 text-[10px] uppercase tracking-wider font-bold">
                {state.error}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] font-bold">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full bg-[var(--background)]/60 border border-[var(--border)] text-[var(--foreground)] px-4 py-3 text-sm focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all placeholder-[var(--foreground-muted)]"
              placeholder="admin@portal-lusitano.pt"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] font-bold">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full bg-[var(--background)]/60 border border-[var(--border)] text-[var(--foreground)] px-4 py-3 text-sm focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all placeholder-[var(--foreground-muted)]"
              placeholder="••••••••"
            />
          </div>

          <SubmitButton />
        </form>

        <p className="text-[var(--foreground-muted)] text-[10px] text-center mt-8">
          Portal Lusitano &copy; {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
