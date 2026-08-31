// Server Component — Breadcrumb itself has no hooks or browser APIs.
// It imports LocalizedLink (a Client Component), but that is fine:
// Server Components can import and render Client Components — the client
// boundary starts at LocalizedLink, not here.
// Removing "use client" means the nav skeleton renders in the SSR payload
// instead of being deferred to client hydration.
import LocalizedLink from "@/components/LocalizedLink";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://portallusitano.com";

export default function Breadcrumb({ items }: BreadcrumbProps) {
  // BreadcrumbList JSON-LD for Google rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
      .filter((item) => item.href || items.indexOf(item) === items.length - 1)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
      })),
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex flex-wrap items-center gap-1.5 text-xs uppercase tracking-wider">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-[var(--foreground-muted)] select-none" aria-hidden="true">
                  /
                </span>
              )}

              {item.href && !isLast ? (
                <LocalizedLink
                  href={item.href}
                  className="text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
                >
                  {item.label}
                </LocalizedLink>
              ) : (
                <span
                  className="text-[var(--foreground)] truncate max-w-[200px] sm:max-w-[300px] md:max-w-none"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
