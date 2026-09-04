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
  map_studs: string;
  map_studs_desc: string;
}

/**
 * O que este menu oferece: encontrar um cavalo, publicar um, e ver onde ficam
 * as coudelarias.
 *
 * **As coudelarias não estão aqui**, e é de propósito: já são uma entrada da
 * barra de navegação, ao lado de «Início». Repetir o mesmo destino a dois
 * cliques de distância um do outro não dá duas maneiras de lá chegar — dá a
 * dúvida sobre se são o mesmo sítio.
 *
 * O mapa fica, porque esse **não** está na barra, e é o único caminho para
 * ele. E chama-se «Mapa de coudelarias» e não «Mapa»: sem o cabeçalho que
 * este menu tinha por cima, «Mapa» sozinho não diz mapa de quê.
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
      href: "/mapa",
      icon: MapPin,
      label: nav.map_studs,
      desc: nav.map_studs_desc,
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
