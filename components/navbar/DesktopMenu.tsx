import LocalizedLink from "@/components/LocalizedLink";
import { memo, useMemo } from "react";
import { usePathname } from "next/navigation";
import { LusitanoDropdown } from "./LusitanoDropdown";

interface DesktopMenuProps {
  t: {
    nav: {
      home: string;
      buy_horse: string;
      studs: string;
    };
  };
}

export const DesktopMenu = memo(function DesktopMenu({ t }: DesktopMenuProps) {
  const pathname = usePathname();

  // Memoized so the array reference stays stable when t hasn't changed,
  // preventing the map from producing new Link elements unnecessarily.
  const navItems = useMemo(
    () => [
      { name: t.nav.home, href: "/" },
      { name: t.nav.buy_horse, href: "/comprar" },
      { name: t.nav.studs, href: "/directorio" },
    ],
    [t.nav.home, t.nav.buy_horse, t.nav.studs]
  );

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="grupo-nav hidden lg:flex items-center gap-4 xl:gap-6 ml-8 lg:ml-12">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <LocalizedLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`ligacao-nav rotulo relative group py-2 ${
              active
                ? "text-[var(--foreground-muted)]"
                : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.name}
            <span
              className={`absolute -bottom-1 left-0 h-[1px] bg-[var(--gold)] transition-[width] duration-500 ease-out ${
                active ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </LocalizedLink>
        );
      })}

      {/* Lusitano Dropdown */}
      <LusitanoDropdown />
    </div>
  );
});
