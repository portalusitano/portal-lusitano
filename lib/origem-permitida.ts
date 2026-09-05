/**
 * Verificação da origem de um pedido que muda estado.
 *
 * A comparação é **por anfitrião**, nunca por prefixo de texto. Um
 * `origin.startsWith("https://portal-lusitano.pt")` dá verdadeiro para
 *
 *   https://portal-lusitano.pt.exemplo.com
 *
 * porque o domínio permitido é, letra por letra, o princípio de um domínio que
 * um atacante regista em cinco minutos — e também para
 * `https://portal-lusitano.pt.evil.com`, `https://portal-lusitano.ptx.io` e
 * qualquer outro que continue a partir dali. O `middleware.ts` já compara o
 * anfitrião; isto põe as rotas a fazer o mesmo, que é o que faz da verificação
 * uma defesa em profundidade a sério em vez de duas verificações com forças
 * diferentes.
 *
 * O que se compara é `URL.host` (anfitrião mais porta), e não `hostname`, para
 * que `localhost:3000` em desenvolvimento não passe a valer para qualquer porta.
 */

/** Extrai o `host` de uma origem, ou `null` se não for um URL absoluto. */
function anfitriao(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Constrói a lista de anfitriões aceites a partir dos URLs configurados.
 *
 * Recebe URLs (e não anfitriões) porque é assim que as variáveis de ambiente
 * estão escritas; entradas vazias ou mal formadas são deitadas fora em vez de
 * alargarem a lista por engano.
 */
export function anfitrioesPermitidos(urls: Array<string | undefined | null>): string[] {
  const hosts = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    const host = anfitriao(url);
    if (host) hosts.add(host);
  }
  return [...hosts];
}

/**
 * Diz se a origem de um pedido é um dos anfitriões permitidos.
 *
 * Uma origem em falta é recusada: quem chama isto são rotas que só existem para
 * servir o formulário do site, e um pedido sem `Origin` nessas rotas não é um
 * browser nosso.
 */
export function origemPermitida(origin: string | null, hostsPermitidos: string[]): boolean {
  if (!origin) return false;
  const host = anfitriao(origin);
  if (!host) return false;
  return hostsPermitidos.includes(host);
}
