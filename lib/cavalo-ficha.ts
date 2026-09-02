/**
 * Os nomes das colunas da base traduzidos para os que a ficha do cavalo lê.
 *
 * `app/comprar/[id]` faz `select("*")` e trata a linha por nomes que não são
 * todos os da base. Um `select("*")` nunca dá erro por isso: a chave que não
 * existe lê-se como `undefined`, o `&&` do JSX apaga o bloco, e a página fica
 * a faltar um pedaço sem que nada se queixe. É o mesmo defeito do
 * `formData.linhagem` contra `linhagemPrincipal`, que deixou a linhagem vazia
 * em todos os anúncios publicados — dois nomes plausíveis e nenhum erro.
 *
 * Estavam traduzidos dois (`nome_cavalo` e `image_url`) e faltavam quatro.
 * O que faltava saía caro: `contacto_nome`, `contacto_email` e
 * `contacto_telefone` **não existem em `cavalos_venda`** — as colunas chamam-se
 * `vendedor_nome`, `vendedor_email` e `vendedor_telefone` —, o que apagava da
 * ficha o nome do vendedor, o botão de telefone e o de WhatsApp, e mandava o
 * `mailto:` para o endereço genérico do site. Num classificados, pôr o
 * comprador em contacto com o vendedor é a única coisa que esta página tem de
 * fazer.
 *
 * A ordem de cada par é sempre a mesma: primeiro o nome que a página usa —
 * porque `lib/database.types.ts` ainda o declara e uma base futura pode voltar
 * a tê-lo —, depois o nome que a base tem hoje.
 *
 * `pontuacao_apsl` não aparece aqui de propósito: não tem coluna nenhuma na
 * base, e não há de onde a traduzir. Inventar um valor era pior do que a linha
 * não aparecer — a regra de `lib/coudelaria-ficha.ts` de não afirmar o que os
 * dados não provam vale aqui do mesmo modo.
 */

/** Pares `nome que a página lê` → `nomes a tentar, por ordem`. */
export const NOMES_DA_FICHA: Record<string, [string, string]> = {
  nome_cavalo: ["nome_cavalo", "nome"],
  image_url: ["image_url", "foto_principal"],
  pelagem: ["pelagem", "cor"],
  nivel: ["nivel", "nivel_treino"],
  contacto_nome: ["contacto_nome", "vendedor_nome"],
  contacto_email: ["contacto_email", "vendedor_email"],
  contacto_telefone: ["contacto_telefone", "vendedor_telefone"],
};

/** Os nomes que a ficha lê, depois de traduzidos. Todos são colunas de texto. */
export type NomesDaFicha = Record<keyof typeof NOMES_DA_FICHA, string | null>;

/**
 * Acrescenta à linha os nomes que a ficha lê, sem tirar nada do que lá está.
 * Um valor vazio ou ausente no primeiro nome cai para o segundo; se nenhum dos
 * dois tiver valor, a chave fica `null` e o bloco correspondente não se
 * desenha, que é o comportamento certo — a ficha não afirma o que os dados não
 * provam.
 */
export function normalizarLinhaDoCavalo<T extends Record<string, unknown>>(
  linha: T
): Omit<T, keyof NomesDaFicha> & NomesDaFicha {
  const saida: Record<string, unknown> = { ...linha };
  for (const [destino, nomes] of Object.entries(NOMES_DA_FICHA)) {
    let valor: string | null = null;
    for (const nome of nomes) {
      const candidato = linha[nome];
      if (typeof candidato === "string" && candidato.trim() !== "") {
        valor = candidato;
        break;
      }
      // Um número numa coluna de texto é um valor na mesma — não se deita fora.
      if (typeof candidato === "number" && Number.isFinite(candidato)) {
        valor = String(candidato);
        break;
      }
    }
    saida[destino] = valor;
  }
  return saida as Omit<T, keyof NomesDaFicha> & NomesDaFicha;
}
