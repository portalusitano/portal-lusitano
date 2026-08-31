import type { LucideIcon } from "lucide-react";
import { ShoppingCart, Euro, Crown, MapPin, Home } from "lucide-react";

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
 * Só os campos que a navegação do marketplace usa.
 *
 * As chaves são obrigatórias. Eram opcionais, com um literal português à
 * frente de cada `||` para o caso de faltarem — e esse literal era exactamente
 * o que se lia em inglês e em espanhol sempre que uma chave falhasse. Agora a
 * paridade das três línguas é garantida por teste (`__tests__/i18n/`), que é
 * onde uma chave em falta deve rebentar: na compilação, não no ecrã de quem
 * está a ler o site noutra língua.
 */
interface NavTranslations {
  buy_horse: string;
  buy_horse_desc: string;
  sell_horse: string;
  sell_horse_desc: string;
  studs: string;
  studs_desc: string;
  map: string;
  map_desc: string;
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
      label: nav.buy_horse,
      desc: nav.buy_horse_desc,
    },
    {
      href: "/vender-cavalo",
      icon: Euro,
      label: nav.sell_horse,
      desc: nav.sell_horse_desc,
      iconClass: "text-green-500",
    },
    {
      href: "/directorio",
      icon: Crown,
      label: nav.studs,
      desc: nav.studs_desc,
    },
    {
      href: "/mapa",
      icon: MapPin,
      label: nav.map,
      desc: nav.map_desc,
    },
  ];
}

export function getMobileDbItems(nav: NavTranslations): MobileNavItem[] {
  return [
    { href: "/comprar", icon: ShoppingCart, label: nav.buy_horse },
    { href: "/vender-cavalo", icon: Euro, label: nav.sell_horse, highlight: true },
    { href: "/directorio", icon: Crown, label: nav.studs },
    { href: "/mapa", icon: MapPin, label: nav.map },
  ];
}

export const MAIN_NAV_ITEMS = [{ nameKey: "home" as const, href: "/" }];

export const MOBILE_MAIN_NAV_ITEMS = [{ nameKey: "home" as const, href: "/", icon: Home }];
