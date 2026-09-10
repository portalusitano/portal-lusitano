/**
 * A gralha no domínio do email.
 *
 * O que este módulo faz é **sugerir**, nunca recusar. A razão está escrita em
 * `components/vender-cavalo/validacao.ts` e vale aqui inteira: a única prova
 * de que um email existe é lá chegar um email, e um domínio raro é legítimo.
 * Quem escreve `maria@quinta-do-vale.pt` tem razão e o computador não tem
 * nada a dizer; quem escreve `maria@gmial.com` perde o anúncio, porque a
 * confirmação da compra nunca lhe chega e ele não sabe porquê.
 *
 * A distância que se mede é a de **Damerau-Levenshtein** — inserção,
 * remoção, substituição e **troca de duas letras vizinhas**. A troca conta
 * como um passo só de propósito: `gmial` é `gmail` com o `a` e o `i`
 * trocados, que é o erro mais comum de quem escreve depressa, e a distância
 * de Levenshtein simples dá-lhe 2, o mesmo que dá a `gmXil` — que é outra
 * coisa. Com a troca a valer 1, o caso mais comum passa a ser também o mais
 * próximo.
 */

/** Distância de Damerau-Levenshtein (com adjacência restrita). */
export function distanciaEdicao(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  // Três linhas bastam: a anterior à anterior é o que a troca precisa de ver.
  let anterior2: number[] = [];
  let anterior: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  let actual: number[] = [];

  for (let i = 1; i <= a.length; i++) {
    actual = new Array(b.length + 1);
    actual[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let valor = Math.min(actual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        valor = Math.min(valor, anterior2[j - 2] + 1);
      }
      actual[j] = valor;
    }
    anterior2 = anterior;
    anterior = actual;
  }
  return anterior[b.length];
}

/**
 * Os domínios que se propõem. São os que aparecem na esmagadora maioria dos
 * contactos portugueses — os quatro grandes internacionais e os que ficaram
 * dos fornecedores de acesso cá dentro.
 */
export const DOMINIOS_COMUNS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "sapo.pt",
  "iol.pt",
  "live.com",
  "yahoo.com",
  "icloud.com",
] as const;

/**
 * Os domínios que **nunca** se corrigem, mesmo estando a um passo de um da
 * lista acima. São reais, e sugerir a alguém que `hotmail.es` devia ser
 * `hotmail.com` é o computador a corrigir quem está certo. Sem esta lista, a
 * sugestão dispararia contra as variantes regionais de todos os grandes.
 */
const DOMINIOS_LEGITIMOS = new Set<string>([
  ...DOMINIOS_COMUNS,
  "hotmail.es",
  "hotmail.fr",
  "hotmail.it",
  "hotmail.co.uk",
  "hotmail.pt",
  "outlook.pt",
  "outlook.es",
  "outlook.fr",
  "yahoo.es",
  "yahoo.fr",
  "yahoo.co.uk",
  "yahoo.com.br",
  "live.com.pt",
  "live.co.uk",
  "gmail.com.br",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "aeiou.pt",
  "clix.pt",
  "netcabo.pt",
  "mail.telepac.pt",
  "meo.pt",
  "nos.pt",
  "vodafone.pt",
  "mail.pt",
  "portugalmail.pt",
]);

/**
 * A distância 2 só se aceita em domínios longos. Num domínio de seis letras,
 * dois passos são um terço da palavra: já não é uma gralha, é outro domínio.
 */
const COMPRIMENTO_MINIMO_PARA_DISTANCIA_2 = 8;

export interface SugestaoDominio {
  /** O domínio que a pessoa escreveu, em minúsculas. */
  escrito: string;
  /** O que se propõe no lugar dele. */
  sugerido: string;
  /** O endereço completo já corrigido — é o que o botão de aceitar escreve. */
  emailCorrigido: string;
}

/**
 * Devolve uma sugestão, ou `null` quando não há nada a dizer — que é o caso
 * normal e tem de continuar a ser.
 */
export function sugerirDominioEmail(email: string): SugestaoDominio | null {
  const limpo = email.trim().toLowerCase();
  const arroba = limpo.lastIndexOf("@");
  if (arroba <= 0 || arroba === limpo.length - 1) return null;

  const parte = limpo.slice(0, arroba);
  const dominio = limpo.slice(arroba + 1);
  if (!dominio.includes(".")) return null;
  if (DOMINIOS_LEGITIMOS.has(dominio)) return null;

  let melhor: { dominio: string; distancia: number } | null = null;
  for (const candidato of DOMINIOS_COMUNS) {
    const distancia = distanciaEdicao(dominio, candidato);
    if (distancia === 0) return null;
    const limite = candidato.length >= COMPRIMENTO_MINIMO_PARA_DISTANCIA_2 ? 2 : 1;
    if (distancia <= limite && (melhor === null || distancia < melhor.distancia)) {
      melhor = { dominio: candidato, distancia };
    }
  }

  if (!melhor) return null;
  return {
    escrito: dominio,
    sugerido: melhor.dominio,
    emailCorrigido: `${parte}@${melhor.dominio}`,
  };
}
