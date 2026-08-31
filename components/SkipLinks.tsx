// Server Component — no browser APIs, no hooks. Safe to render on the server
// which avoids shipping the tiny component to the client bundle.
export default function SkipLinks() {
  return (
    <div className="skip-links">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10001] focus:bg-[var(--foreground-strong)] focus:text-black focus:px-6 focus:py-3 focus:text-sm focus:font-bold focus:uppercase focus:tracking-wider"
      >
        Saltar para o conteúdo principal
      </a>
      <a
        href="#main-navigation"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-[280px] focus:z-[10001] focus:bg-[var(--foreground-strong)] focus:text-black focus:px-6 focus:py-3 focus:text-sm focus:font-bold focus:uppercase focus:tracking-wider"
      >
        Saltar para a navegação
      </a>
    </div>
  );
}
