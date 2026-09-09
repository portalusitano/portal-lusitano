/**
 * Ler perfis de outras pessoas, do lado do servidor.
 *
 * ── Porque é que isto lê com a chave de serviço ─────────────────────────────
 *
 * A RLS de `user_profiles` deixa cada pessoa ler **a sua linha e mais nenhuma**,
 * e é para ficar assim: uma política que deixasse um autenticado ler o perfil
 * de outro transformava a tabela num directório de toda a gente que tem conta
 * no site, ao alcance de uma consulta.
 *
 * Quem tem direito a ver o nome e a fotografia de alguém não é «qualquer pessoa
 * com sessão», é **a outra parte de uma conversa** — e essa condição não se
 * exprime numa política de `user_profiles`, porque vive em
 * `marketplace_conversas`. Quem já a verifica são as rotas do chat: nenhuma
 * delas carrega uma conversa sem confirmar que quem pergunta é um dos dois
 * participantes. Este módulo é chamado **depois** dessa verificação, e por isso
 * a lista de ids que recebe já é a lista de pessoas a quem quem pergunta tem
 * direito.
 *
 * A defesa contra o que sai continua a ser a forma: devolve-se `PerfilOutraParte`,
 * que são duas chaves construídas à mão. O `id`, o email, o `stripe_customer_id`
 * e o estado da assinatura estão na mesma linha e nenhum deles tem por onde
 * escapar.
 *
 * ── E porque é que é uma pergunta e não trinta ──────────────────────────────
 *
 * A caixa de entrada mostra trinta conversas. Trinta leituras de perfil por
 * abertura seriam trinta idas à base para escrever trinta linhas de lista — o
 * mesmo defeito que a própria rota `/api/conversas` já corrigiu uma vez, quando
 * trazia todas as mensagens de todas as conversas para ficar com a última de
 * cada uma.
 *
 * Medido contra o PostgreSQL local com 5 000 contas, em A/B **intercalado** —
 * os dois braços alternados na mesma sessão, na mesma corrida e na mesma
 * máquina, porque «a ordem das medições é a medição». O guião está em
 * `scratchpad/perfil-ensaio/medir-caixa-entrada.mjs`.
 *
 *   uma pergunta por conversa (30 idas)  3,23 – 3,40 ms de mediana
 *   uma pergunta para as trinta (1 ida)  0,26 – 0,29 ms de mediana
 *
 * São **11 a 13 vezes**, e a pergunta única ganha em **30 de 30 pares**, nas
 * três corridas — o que importa mais do que a razão: uma mediana melhor com
 * metade dos pares a perder seria ruído, e esta não é.
 *
 * O intervalo está escrito como intervalo de propósito. Três corridas deram
 * 13,0x, 11,3x e 12,0x, e escrever «13x» a partir da primeira seria repetir o
 * erro que o `CLAUDE.md` conta a propósito dos discos «1»: a variância entre
 * corridas é maior do que a precisão que um número único aparenta.
 *
 * E o ensaio mede o **piso** da diferença, não o valor dela: aqui a base está
 * no mesmo computador, por um socket de ficheiro. Em produção está do outro
 * lado de uma rede, onde é a ida e volta que custa — e são trinta contra uma.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "[Perfil] lib/perfil/carregar.ts lê com a chave de serviço e só corre no servidor."
  );
}

import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { vistaPerfil, COLUNAS_PERFIL, type LinhaPerfil, type PerfilOutraParte } from "./contrato";

/**
 * Quantos ids vão numa pergunta.
 *
 * O `in.(…)` do PostgREST viaja **dentro do URL**, e um URL não é infinito: a
 * cem UUIDs são cerca de 3 700 caracteres, que já é território de proxies com
 * opinião. Cem chega para três caixas de entrada cheias e mantém a promessa —
 * uma caixa de trinta continua a custar uma pergunta.
 */
const POR_PERGUNTA = 100;

/**
 * Os perfis de um conjunto de pessoas, numa pergunta.
 *
 * Nunca lança e nunca devolve parcialmente em silêncio de forma que engane: se
 * a leitura falhar, devolve-se um mapa vazio e regista-se. Uma caixa de entrada
 * que não abre porque a fotografia de alguém não carregou é pior do que uma
 * caixa de entrada sem fotografias — o nome da outra parte já vem da conversa,
 * e o ecrã sabe desenhar a ausência.
 */
export async function perfisPorId(ids: readonly string[]): Promise<Map<string, PerfilOutraParte>> {
  const mapa = new Map<string, PerfilOutraParte>();

  const unicos = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
  if (unicos.length === 0) return mapa;

  for (let i = 0; i < unicos.length; i += POR_PERGUNTA) {
    const lote = unicos.slice(i, i + POR_PERGUNTA);

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select(COLUNAS_PERFIL)
      .in("id", lote);

    if (error) {
      logger.error("[perfil/carregar] Falhou a ler perfis:", error);
      continue;
    }

    for (const linha of (data || []) as LinhaPerfil[]) {
      mapa.set(linha.id, vistaPerfil(linha));
    }
  }

  return mapa;
}

/** O perfil de uma pessoa só. Mesma promessa: nunca lança. */
export async function perfilDe(id: string): Promise<PerfilOutraParte | null> {
  const mapa = await perfisPorId([id]);
  return mapa.get(id) ?? null;
}
