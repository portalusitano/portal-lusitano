/**
 * NOTA: Este rate limiter usa LRUCache em memória e reseta em cada cold start
 * (Vercel serverless). É um limite de melhor-esforço, NOT o primary limiter.
 *
 * A protecção principal é feita no middleware.ts via Upstash Redis
 * (sliding window, persistente entre cold starts) e cobre todas as routes /api/*.
 *
 * Este limiter apenas adiciona limites mais estritos por route específica,
 * como complemento — não como substituto — do middleware Upstash.
 */
import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  interval: number;
  uniqueTokenPerInterval: number;
};

export default function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (limit: number, token: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        if (isRateLimited) {
          reject(
            new Error(
              `Rate limit exceeded. Maximum ${limit} requests per ${options.interval / 1000} seconds.`
            )
          );
        } else {
          resolve();
        }
      }),
  };
}

/**
 * ── `uniqueTokenPerInterval` é a capacidade do cache, não um limite ─────────
 *
 * O nome engana, e enganou: é o `max` de um `LRUCache`, ou seja **quantas
 * chaves diferentes caibam ao mesmo tempo**. Passada a capacidade, o LRU deita
 * fora a entrada menos usada — e a entrada que se deita fora é a contagem de
 * alguém. Quem a perde volta ao orçamento inteiro.
 *
 * Os três limitadores são um cache cada, **partilhado por todas as rotas que os
 * importam**, e as chaves são por rota e por conta ou IP. O `strictLimiter`
 * estava a 100, e reproduzido em teste: gasto o orçamento de conversas novas de
 * uma conta (5 de 5, a 6.ª recusada), bastam **100 chaves diferentes a passar
 * pelo mesmo cache** para essa conta voltar a ter as cinco. Não é preciso
 * atacante nenhum — cem chaves por minuto é um site com cem pessoas a usá-lo, e
 * a defesa que o `MAX_CONVERSAS_NOVAS_POR_MINUTO` descreve desaparece
 * justamente quando o site cresce.
 *
 * O `authLimiter` estava pior em proporção: 50 chaves para um limite de
 * tentativas de entrada que dura 15 minutos. Cinquenta IPs distintos num quarto
 * de hora — tráfego normal — e a contagem de quem está a tentar adivinhar uma
 * palavra-passe é esquecida.
 *
 * A capacidade sobe para um número que cobre o tráfego destas rotas com folga.
 * O custo é memória e é de brincar: cada entrada é um array de um número, e
 * 5 000 entradas não chegam a umas centenas de kilobytes num processo que já
 * carrega o Next inteiro. A rede durável continua a ser a do `middleware.ts`
 * (Upstash), como o comentário no topo deste ficheiro diz — o que isto corrige
 * é o limitador de memória deixar de se apagar a si próprio.
 */
const CAPACIDADE = 5000;

// Pre-configured rate limiters
export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: CAPACIDADE,
});

export const strictLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: CAPACIDADE,
});

export const authLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: CAPACIDADE,
});
