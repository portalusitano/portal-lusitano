import Link from "next/link";
import { MapPin, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <MapPin className="text-[var(--gold)]" size={80} />
            <div className="absolute -bottom-2 -right-2 bg-[var(--background-secondary)] rounded-full p-2">
              <Search className="text-[var(--foreground-muted)]" size={24} />
            </div>
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl text-[var(--gold)] mb-4">404</h1>

        {/* Message */}
        <h2 className="text-3xl text-[var(--foreground)] mb-4">Coudelaria não encontrada</h2>
        <p className="text-[var(--foreground-secondary)] text-lg mb-8 max-w-md mx-auto">
          A coudelaria que procura não existe ou foi removida do nosso diretório.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/directorio"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--gold)] text-black font-bold uppercase text-sm tracking-wide hover:bg-[var(--gold-hover)] transition-all"
          >
            <ArrowLeft size={18} />
            Ver Diretório
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--background-secondary)] border border-[var(--gold)]/30 text-[var(--gold)] font-bold uppercase text-sm tracking-wide hover:bg-[var(--gold)] hover:text-black transition-all"
          >
            Página Inicial
          </Link>
        </div>

        {/* Suggestion */}
        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <p className="text-[var(--foreground-muted)] text-sm mb-4">Sugestões:</p>
          <ul className="text-[var(--foreground-secondary)] text-sm space-y-2">
            <li>• Verifique se o endereço está correto</li>
            <li>• Explore o nosso diretório completo de coudelarias</li>
            <li>• Use a pesquisa para encontrar coudelarias específicas</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
