import type { LucideIcon } from "lucide-react";
import { ShoppingCart, Euro, Crown, MapPin, Home, HelpCircle } from "lucide-react";

export interface NavDropdownItem {
  href: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  iconClass?: string;
}

export interface MobileNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  highlight?: boolean;
}

/**
 * Only the fields the marketplace navigation still uses.
 *
 * The keys are optional because the translation files carry the wider set from
 * before the site was narrowed to the marketplace, and a missing label should
 * fall back rather than render "undefined".
 */
interface NavTranslations {
  buy_horse?: string;
  buy_horse_desc?: string;
  sell_horse?: string;
  sell_horse_desc?: string;
  studs?: string;
  studs_desc?: string;
  map?: string;
  map_desc?: string;
  events?: string;
  events_desc?: string;
}

/**
 * The marketplace itself: buying, selling, and the two directories that give a
 * listing its context — which stud the horse comes from, and where people meet.
 */
export function getDbItems(nav: NavTranslations): NavDropdownItem[] {
  return [
    {
      href: "/comprar",
      icon: ShoppingCart,
      label: nav.buy_horse || "Comprar cavalo",
      desc: nav.buy_horse_desc || "Cavalos Lusitanos à venda em todo o país",
    },
    {
      href: "/vender-cavalo",
      icon: Euro,
      label: nav.sell_horse || "Vender cavalo",
      desc: nav.sell_horse_desc || "Publique o seu anúncio em minutos",
      iconClass: "text-green-500",
    },
    {
      href: "/directorio",
      icon: Crown,
      label: nav.studs || "Coudelarias",
      desc: nav.studs_desc || "Criadores de Puro-Sangue Lusitano",
    },
    {
      href: "/mapa",
      icon: MapPin,
      label: nav.map || "Mapa",
      desc: nav.map_desc || "Coudelarias por região",
    },
  ];
}

export function getMobileDbItems(nav: NavTranslations): MobileNavItem[] {
  return [
    { href: "/comprar", icon: ShoppingCart, label: nav.buy_horse || "Comprar cavalo" },
    {
      href: "/vender-cavalo",
      icon: Euro,
      label: nav.sell_horse || "Vender cavalo",
      highlight: true,
    },
    { href: "/directorio", icon: Crown, label: nav.studs || "Coudelarias" },
    { href: "/mapa", icon: MapPin, label: nav.map || "Mapa" },
  ];
}

export const MAIN_NAV_ITEMS = [
  { nameKey: "home" as const, href: "/" },
  { nameKey: "about" as const, href: "/sobre" },
];

export const MOBILE_MAIN_NAV_ITEMS = [
  { nameKey: "home" as const, href: "/", icon: Home },
  { nameKey: "about" as const, href: "/sobre", icon: HelpCircle },
];
