/**
 * O número de registo no Livro Genealógico do Cavalo Puro Sangue Lusitano.
 *
 * ## O que aqui não está, e porquê
 *
 * **Não há verificação contra o Livro Azul.** Não é um esquecimento nem uma
 * escolha de desenho: é o estado do que se consegue saber hoje.
 *
 * 1. A tabela `cavalos_venda` tem zero linhas — não há um único anúncio
 *    publicado de onde inferir que forma tem um número de registo real.
 * 2. `registro_apsl` é um `VARCHAR(100)` sem restrição nenhuma, e não há um
 *    único exemplo real em todo o repositório.
 * 3. O sítio da APSL não é alcançável a partir do ambiente onde este código
 *    foi escrito, e portanto o stud-book não pôde ser consultado.
 *
 * Com estas três, escrever uma expressão regular para o formato seria
 * inventá-lo. E uma expressão regular inventada não é neutra: recusa números
 * verdadeiros que não se pareçam com o palpite de quem a escreveu, e cada
 * recusa dessas é um anúncio que não se publica. **Aceitar um número
 * improvável sai sempre mais barato do que recusar um número válido** — é o
 * mesmo princípio que está escrito para o email em `validacao.ts`.
 *
 * ## O que aqui está
 *
 * Três coisas, e as três defensáveis sem saber o formato:
 *
 * - **Normalizar** — espaços a mais e maiúsculas, para que dois anúncios com
 *   o mesmo número o escrevam da mesma maneira e o duplicado se veja.
 * - **Recusar o que é claramente outra coisa** — vazio, um caractere
 *   repetido, o nome do próprio cavalo copiado para a caixa errada. Nenhuma
 *   destas depende de saber o formato: dependem só de saber que aquilo *não é
 *   um número de registo*.
 * - **Perguntar à nossa própria base** se já existe um anúncio com o mesmo
 *   número. É a única verificação de existência possível hoje, e apanha
 *   exactamente os dois casos que dão problema: o duplicado e o engano.
 *
 * ## Onde entra o stud-book quando for possível
 *
 * `verificarRegisto()` é assíncrona por isso mesmo. A consulta à APSL entra
 * dentro dela, ao lado da consulta à nossa base, e o resto do formulário não
 * muda uma linha: já sabe esperar por uma resposta e já sabe mostrar um
 * estado de «a verificar». O que falta para lá chegar é (a) acesso de rede ao
 * stud-book, (b) um ponto de consulta — API ou página estável — e (c) uma
 * decisão do dono sobre o que fazer com um número que a APSL não conhece:
 * travar a publicação ou marcar o anúncio como por confirmar. Enquanto (c)
 * não estiver decidido, não se trava nada.
 */

/**
 * Espaços a mais e maiúsculas. Nada mais — cada caractere que se tirasse aqui
 * seria um palpite sobre o formato, e o formato não se conhece. Os traços, os
 * pontos e as barras ficam onde a pessoa os pôs.
 */
export function normalizarRegistoApsl(valor: string): string {
  return valor.trim().replace(/\s+/g, " ").toUpperCase();
}

/** A forma canónica para comparar dois números: sem nada que não seja letra ou algarismo. */
export function chaveRegistoApsl(valor: string): string {
  return normalizarRegistoApsl(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export type ProblemaRegisto =
  /** Menos de três caracteres úteis. Nenhum identificador cabe em dois. */
  | "curto"
  /** «AAAA», «0000», «----»: uma tecla presa, não um número. */
  | "repetido"
  /** O nome do cavalo copiado para a caixa do registo. */
  | "e-o-nome"
  /** Nem um algarismo em todo o campo. */
  | "sem-algarismos";

export interface LeituraRegisto {
  normalizado: string;
  chave: string;
  /** `undefined` quando não há nada a apontar. */
  problema?: ProblemaRegisto;
}

/**
 * Lê o campo. `nomeCavalo` entra porque o engano mais comum de todos é
 * escrever o nome do cavalo nas duas caixas seguidas.
 */
export function lerRegistoApsl(valor: string, nomeCavalo = ""): LeituraRegisto {
  const normalizado = normalizarRegistoApsl(valor);
  const chave = chaveRegistoApsl(valor);

  if (!chave) return { normalizado, chave, problema: "curto" };

  const nome = chaveRegistoApsl(nomeCavalo);
  if (nome.length >= 3 && chave === nome) {
    return { normalizado, chave, problema: "e-o-nome" };
  }
  if (chave.length < 3) return { normalizado, chave, problema: "curto" };
  if (/^(.)\1*$/.test(chave)) return { normalizado, chave, problema: "repetido" };
  if (!/\d/.test(chave)) return { normalizado, chave, problema: "sem-algarismos" };

  return { normalizado, chave };
}

// ---------------------------------------------------------------------------
// A verificação que hoje é possível
// ---------------------------------------------------------------------------

export type EstadoVerificacao =
  /** Não existe outro anúncio com este número. */
  | "livre"
  /** Já há um anúncio com este número. */
  | "duplicado"
  /** Não se conseguiu perguntar — rede em baixo, resposta estranha. */
  | "indisponivel";

export interface ResultadoVerificacao {
  estado: EstadoVerificacao;
  /** O número tal como foi perguntado, para quem chama saber se a resposta ainda serve. */
  numero: string;
}

/** O caminho da consulta. Fica numa constante para o teste não o repetir à mão. */
export const CAMINHO_VERIFICACAO = "/api/vender-cavalo/registo";

/**
 * Pergunta se este número já está noutro anúncio.
 *
 * Uma falha de rede devolve `indisponivel`, nunca uma excepção e nunca
 * `duplicado`: a rede estar em baixo não é motivo para dizer a alguém que o
 * seu cavalo já está anunciado, e muito menos para o impedir de publicar.
 */
export async function verificarRegisto(
  numero: string,
  opcoes: { fetch?: typeof fetch; signal?: AbortSignal } = {}
): Promise<ResultadoVerificacao> {
  const chave = chaveRegistoApsl(numero);
  if (!chave) return { estado: "indisponivel", numero };

  const buscar = opcoes.fetch ?? (typeof fetch === "function" ? fetch : undefined);
  if (!buscar) return { estado: "indisponivel", numero };

  try {
    const resposta = await buscar(`${CAMINHO_VERIFICACAO}?numero=${encodeURIComponent(numero)}`, {
      signal: opcoes.signal,
    });
    if (!resposta.ok) return { estado: "indisponivel", numero };
    const corpo: unknown = await resposta.json();
    const existe =
      typeof corpo === "object" &&
      corpo !== null &&
      (corpo as { existe?: unknown }).existe === true;
    return { estado: existe ? "duplicado" : "livre", numero };
  } catch {
    return { estado: "indisponivel", numero };
  }
}
