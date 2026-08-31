import { describe, it, expect } from "vitest";
import pt from "@/locales/pt.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

/**
 * O directório, do lado do dicionário.
 *
 * A paridade das chaves e as traduções vazias ficam em
 * `paridade-locales.test.ts`, que varre o dicionário inteiro nos dois
 * sentidos; aqui fica só o que é próprio desta página e que aquele teste não
 * pode saber:
 *
 * 1. **As chaves que a listagem lê, uma a uma.** O tipo `Translations` é
 *    `typeof pt.json`, por isso uma chave que só exista em português passa a
 *    compilação e só se vê no ecrã de quem lê noutra língua.
 * 2. **O marcador `{n}`** nas frases que contam coisas. Perdê-lo numa
 *    tradução dá «coudelarias» sem número à frente.
 * 3. **Nenhum número nem superlativo que os dados não sustentem.** O painel
 *    do topo dizia «1000+ cavalos», escrito à mão, e a faixa de registo
 *    prometia «o maior diretório equestre de Portugal». Um número inventado
 *    numa página pública não é um pormenor de desenho.
 */

const DICIONARIOS = { pt, en, es } as const;
type Lingua = keyof typeof DICIONARIOS;
const LINGUAS = Object.keys(DICIONARIOS) as Lingua[];

const bloco = (l: Lingua) => DICIONARIOS[l].directorio as unknown as Record<string, string>;

/** As chaves que o `DirectorioContent.tsx` lê. Escritas à mão, como as do cromado. */
const CHAVES_DA_LISTAGEM = [
  "badge",
  "title",
  "subtitle",
  "hero_aria",
  "stat_coudelarias",
  "stat_regioes",
  "stat_mais_antiga",
  "search_placeholder",
  "search_clear",
  "sort_label",
  "sort_recomendadas",
  "sort_nome",
  "sort_antiguidade",
  "sort_cavalos",
  "filter_region",
  "filter_specialty",
  "region_all",
  "filters_active_one",
  "filters_active_many",
  "results_count_one",
  "results_count_many",
  "results_aria",
  "clear_filters",
  "map_show",
  "map_hide",
  "map_full",
  "map_label",
  "since",
  "horses_one",
  "horses_many",
  "lineages_short",
  "no_photo",
  "view_stud",
  "no_results",
  "no_results_hint",
  "empty_try_region",
  "empty_register",
  "has_stud",
  "register_cta",
  "register_btn",
] as const;

describe("directório — o dicionário tem tudo o que a listagem lê", () => {
  for (const lingua of LINGUAS) {
    it(`${lingua}.json tem as ${CHAVES_DA_LISTAGEM.length} chaves da listagem`, () => {
      const d = bloco(lingua);
      const emFalta = CHAVES_DA_LISTAGEM.filter(
        (c) => typeof d[c] !== "string" || d[c].trim() === ""
      );
      expect(emFalta, `em falta em ${lingua}.json: ${emFalta.join(", ")}`).toEqual([]);
    });
  }

  it("nenhuma chave da listagem ficou por traduzir para inglês", () => {
    const porTraduzir = CHAVES_DA_LISTAGEM.filter((c) => bloco("pt")[c] === bloco("en")[c]);
    expect(porTraduzir, `iguais a pt: ${porTraduzir.join(", ")}`).toEqual([]);
  });

  /**
   * «Ordenar», «Recomendadas», «Todas», «Desde», «Ocultar mapa» e «Mapa de
   * Portugal» escrevem-se da mesma maneira nas duas línguas. Tudo o resto que
   * apareça igual em pt e es é uma linha copiada e esquecida.
   */
  const IGUAIS_DE_PROPOSITO = new Set([
    "sort_label",
    "sort_recomendadas",
    "region_all",
    "since",
    "map_full",
    "map_hide",
    "filters_active_one",
    "filters_active_many",
  ]);

  it("nenhuma chave da listagem ficou por traduzir para espanhol", () => {
    const porTraduzir = CHAVES_DA_LISTAGEM.filter(
      (c) => !IGUAIS_DE_PROPOSITO.has(c) && bloco("pt")[c] === bloco("es")[c]
    );
    expect(porTraduzir, `iguais a pt: ${porTraduzir.join(", ")}`).toEqual([]);
  });
});

describe("directório — o que se afirma tem de ser contável", () => {
  const COM_CONTAGEM = [
    "filters_active_many",
    "results_count_many",
    "horses_many",
    "num_horses_count",
  ] as const;

  it("as frases que contam coisas mantêm o marcador {n}", () => {
    for (const lingua of LINGUAS) {
      const d = bloco(lingua);
      for (const chave of COM_CONTAGEM) {
        expect(d[chave], `${lingua}.directorio.${chave}`).toContain("{n}");
      }
    }
  });

  it("não promete números nem títulos que a página não sustenta", () => {
    // «1000+ cavalos» estava escrito à mão num site com vinte cavalos, e o
    // subtítulo prometia «criadores verificados» sem nada que os verificasse.
    const proibido = /\b1000\+|maior diret[óo]rio|largest .*director|mayor directorio/i;
    for (const lingua of LINGUAS) {
      for (const [chave, valor] of Object.entries(bloco(lingua))) {
        expect(String(valor), `${lingua}.directorio.${chave}`).not.toMatch(proibido);
      }
    }
  });
});
