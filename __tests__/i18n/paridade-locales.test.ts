import { describe, it, expect } from "vitest";
import pt from "@/locales/pt.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

/**
 * O site falava duas línguas ao mesmo tempo.
 *
 * Em inglês, o rodapé mostrava «Buy Horse» ao lado de «Cavalos favoritos»,
 * e a faixa de vender tinha o título em inglês e o subtítulo em português.
 * A causa era sempre a mesma: texto escrito à mão dentro do componente, ou
 * uma chave que existia numa língua e faltava nas outras — e a que faltava
 * caía num literal português.
 *
 * Estes testes fecham o segundo caso. O primeiro fica em
 * `cromado-sem-literais.test.ts`.
 */

type Objecto = Record<string, unknown>;

/** Todos os caminhos de folha do dicionário: "footer.privacy", etc. */
function caminhos(no: unknown, prefixo = ""): string[] {
  if (no === null || typeof no !== "object" || Array.isArray(no)) return [prefixo];
  return Object.entries(no as Objecto).flatMap(([k, v]) =>
    caminhos(v, prefixo ? `${prefixo}.${k}` : k)
  );
}

function valorEm(raiz: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((no, parte) => {
    if (no === null || typeof no !== "object") return undefined;
    return (no as Objecto)[parte];
  }, raiz);
}

const DICIONARIOS = { pt, en, es } as const;
type Lingua = keyof typeof DICIONARIOS;
const LINGUAS = Object.keys(DICIONARIOS) as Lingua[];

describe("dicionário — as três línguas dizem as mesmas coisas", () => {
  const chaves = Object.fromEntries(
    LINGUAS.map((l) => [l, new Set(caminhos(DICIONARIOS[l]))])
  ) as Record<Lingua, Set<string>>;

  for (const lingua of LINGUAS.filter((l) => l !== "pt")) {
    it(`${lingua}.json não tem chaves a menos do que pt.json`, () => {
      const emFalta = [...chaves.pt].filter((c) => !chaves[lingua].has(c));
      expect(emFalta, `chaves só em pt.json: ${emFalta.slice(0, 20).join(", ")}`).toEqual([]);
    });

    it(`${lingua}.json não tem chaves a mais do que pt.json`, () => {
      const aMais = [...chaves[lingua]].filter((c) => !chaves.pt.has(c));
      expect(aMais, `chaves só em ${lingua}.json: ${aMais.slice(0, 20).join(", ")}`).toEqual([]);
    });
  }

  /**
   * Duas chaves da calculadora estão vazias nas três línguas desde antes
   * deste teste existir. Ficam nomeadas em vez de a regra ser relaxada: uma
   * chave vazia nova falha na mesma, e estas duas continuam à vista de quem
   * mexer na calculadora.
   */
  const VAZIAS_CONHECIDAS = new Set([
    "calculadora.training_foal_fei",
    "calculadora.training_broken_fei",
  ]);

  for (const lingua of LINGUAS) {
    it(`${lingua}.json não tem traduções vazias`, () => {
      const vazias = caminhos(DICIONARIOS[lingua]).filter((c) => {
        if (VAZIAS_CONHECIDAS.has(c)) return false;
        const v = valorEm(DICIONARIOS[lingua], c);
        return typeof v === "string" && v.trim() === "";
      });
      expect(vazias, `vazias: ${vazias.slice(0, 20).join(", ")}`).toEqual([]);
    });
  }
});

/**
 * As chaves que o cromado partilhado lê. Estão aqui uma a uma de propósito:
 * o TypeScript tipa o dicionário por `pt.json`, por isso uma chave só em
 * português passa a compilação e só rebenta no ecrã de quem lê noutra
 * língua. Aqui rebenta antes.
 */
const CHAVES_DO_CROMADO = [
  // Barra de navegação e menu de ecrã inteiro
  "nav.home",
  "nav.buy_horse",
  "nav.buy_horse_desc",
  "nav.sell_horse",
  "nav.sell_horse_desc",
  "nav.studs",
  "nav.studs_desc",
  "nav.map",
  "nav.map_desc",
  "nav.database",
  "nav.my_account",
  "nav.horse_favorites",
  "nav.main_navigation",
  "nav.change_language",
  "nav.menu",
  "nav.open_menu",
  "nav.close_menu",
  "nav.messages",
  "nav.unread",
  "nav.post_listing",
  "nav.directory",
  "nav.all_horses",
  "nav.foals",
  "nav.working_equitation",
  "nav.broodmares",
  "nav.skip_to_content",
  "nav.skip_to_navigation",
  // Rodapé
  "footer.navigation",
  "footer.lusitano",
  "footer.tools",
  "footer.portal",
  "footer.buy_horse",
  "footer.sell_horse",
  "footer.studs",
  "footer.map",
  "footer.contact",
  "footer.returns",
  "footer.rights",
  "footer.privacy",
  "footer.terms",
  "footer.complaints_book",
  "footer.dispute_resolution",
  "footer.favorite_horses",
  "footer.search_alerts",
  "footer.my_listings",
  "footer.my_messages",
  "footer.sell_horse_subtitle",
  "footer.cookie_settings",
  // Barra de cookies
  "cookies.aria_label",
  "cookies.title",
  "cookies.description",
  "cookies.policy",
  "cookies.accept_all",
  "cookies.reject_all",
  "cookies.accept_selected",
  "cookies.customize",
  "cookies.hide_details",
  "cookies.essential",
  "cookies.essential_desc",
  "cookies.analytics",
  "cookies.analytics_desc",
  "cookies.marketing",
  "cookies.marketing_desc",
  "cookies.always_on",
  "cookies.reopen_hint",
  // Pesquisa e comuns
  "search.aria_label",
  "search.placeholder",
  "common.search",
  "common.close",
  "common.back",
] as const;

describe("dicionário — o cromado partilhado tem tudo o que lê", () => {
  for (const lingua of LINGUAS) {
    it(`${lingua}.json tem as ${CHAVES_DO_CROMADO.length} chaves do cromado`, () => {
      const emFalta = CHAVES_DO_CROMADO.filter(
        (c) => typeof valorEm(DICIONARIOS[lingua], c) !== "string"
      );
      expect(emFalta, `em falta em ${lingua}.json: ${emFalta.join(", ")}`).toEqual([]);
    });
  }

  /**
   * «Marketing», «Portal», «Lusitano» e «Mapa» são iguais em duas línguas
   * porque a palavra é a mesma, não porque a tradução ficou por fazer. Tudo
   * o resto que apareça igual em pt e en é uma linha copiada e esquecida.
   */
  const IGUAIS_DE_PROPOSITO = new Set([
    "nav.menu",
    "nav.map",
    "nav.database",
    "footer.lusitano",
    "footer.portal",
    "footer.map",
    "cookies.marketing",
    "search.placeholder",
  ]);

  it("nenhuma chave do cromado ficou por traduzir para inglês", () => {
    const porTraduzir = CHAVES_DO_CROMADO.filter(
      (c) => !IGUAIS_DE_PROPOSITO.has(c) && valorEm(pt, c) === valorEm(en, c)
    );
    expect(porTraduzir, `iguais a pt: ${porTraduzir.join(", ")}`).toEqual([]);
  });
});
