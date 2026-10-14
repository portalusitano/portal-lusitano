/**
 * Qual das três línguas o browser prefere, lido do `Accept-Language`.
 *
 * O que estava antes era `acceptLang.match(/\b(en|es)\b/)`: procurava «en» ou
 * «es» em **qualquer parte** do cabeçalho e ficava com o primeiro que
 * encontrasse. Só que quase todos os browsers portugueses mandam o inglês
 * como recurso —
 *
 *     Accept-Language: pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7
 *
 * — e nesse cabeçalho o «en» existe. Resultado: um visitante português, numa
 * rota portuguesa, apanhava o site em inglês. Era esta a origem da «mistura
 * de línguas» que aparecia no `/mapa` e no `/directorio`: não era o cromado
 * nem as páginas, era o cookie a ser escrito com a língua errada logo à
 * entrada.
 *
 * A regra do protocolo (RFC 9110 §12.5.4) é outra: cada entrada traz um peso
 * `q` entre 0 e 1, por omissão 1, e vale a de maior peso. Empates resolvem-se
 * pela ordem em que vêm. Um `q=0` é uma recusa explícita e não conta.
 */
export const LINGUAS = ["pt", "en", "es"] as const;
export type Lingua = (typeof LINGUAS)[number];

export function linguaDoPedido(cabecalho: string | null | undefined): Lingua {
  if (!cabecalho) return "pt";

  const candidatos = cabecalho
    .split(",")
    .map((parte, ordem) => {
      const [etiqueta, ...parametros] = parte.trim().split(";");
      const q = parametros
        .map((p) => p.trim())
        .filter((p) => p.startsWith("q="))
        .map((p) => Number.parseFloat(p.slice(2)))
        .find((n) => Number.isFinite(n));
      return {
        // Só a parte primária: «pt-BR» e «pt-PT» são ambos português.
        base: etiqueta.trim().toLowerCase().split("-")[0],
        peso: q === undefined ? 1 : q,
        ordem,
      };
    })
    // `q=0` quer dizer «esta não»; não é um empate com peso baixo.
    .filter((c) => c.peso > 0)
    // Maior peso primeiro; em caso de empate, quem vinha antes no cabeçalho.
    .sort((a, b) => b.peso - a.peso || a.ordem - b.ordem);

  for (const { base } of candidatos) {
    // `*` é «qualquer uma»; quem não escolhe fica com a língua da casa.
    if (base === "*") return "pt";
    if ((LINGUAS as readonly string[]).includes(base)) return base as Lingua;
  }
  return "pt";
}
