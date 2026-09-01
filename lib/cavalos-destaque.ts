import type { CavaloDestaque } from "@/lib/coudelaria-ficha";

/**
 * Lê a coluna `cavalos_destaque` seja qual for a forma em que ela venha.
 *
 * A coluna é `jsonb`, e o tipo em TypeScript dizia `CavaloDestaque[] | null`.
 * Na base a sério não é: das vinte e nove linhas, quinze trazem um array,
 * **onze trazem uma string** com um array JSON lá dentro (ficou codificado
 * duas vezes em alguma importação), e três trazem nulo. Uma delas ainda por
 * cima tem um array de texto simples em vez de objectos.
 *
 * Isto partiu a construção do site: o componente fazia
 * `cavalos_destaque?.length ? … .map(…)`, e uma string **também tem
 * `length`** — por isso a guarda deixava passar, e o `.map` rebentava com
 * «a.cavalos_destaque.map is not a function». O `next build` morria a
 * prerenderizar `/directorio/herdade-do-azinhal`.
 *
 * A lição não é «arranjar os dados»: é que uma página pública não pode ir
 * abaixo porque uma linha veio com outra forma. Os dados de fora validam-se
 * na fronteira, e o tipo passa a ser verdade a partir daqui.
 */
export function lerCavalosDestaque(valor: unknown): CavaloDestaque[] {
  const bruto = desembrulhar(valor);
  if (!Array.isArray(bruto)) return [];
  return bruto.map(comoCavalo).filter((c): c is CavaloDestaque => c !== null);
}

/** Uma string que contenha JSON conta como o JSON que contém. */
function desembrulhar(valor: unknown): unknown {
  if (typeof valor !== "string") return valor;
  const texto = valor.trim();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    // Uma string que não é JSON é um nome de cavalo, e não um erro.
    return [texto];
  }
}

function comoCavalo(entrada: unknown): CavaloDestaque | null {
  // Há uma coudelaria cujas entradas são texto simples, não objectos.
  if (typeof entrada === "string") {
    const nome = entrada.trim();
    return nome ? { nome } : null;
  }
  if (!entrada || typeof entrada !== "object") return null;

  const o = entrada as Record<string, unknown>;
  const nome = typeof o.nome === "string" ? o.nome.trim() : "";
  // Sem nome não há cartão: é o nome que o encabeça e que serve de chave.
  if (!nome) return null;

  const cavalo: CavaloDestaque = { nome };
  const ano = Number(o.ano);
  if (Number.isFinite(ano) && ano > 0) cavalo.ano = ano;
  if (typeof o.pelagem === "string" && o.pelagem.trim()) cavalo.pelagem = o.pelagem.trim();
  if (typeof o.aptidao === "string" && o.aptidao.trim()) cavalo.aptidao = o.aptidao.trim();
  const preco = Number(o.preco);
  if (Number.isFinite(preco) && preco > 0) cavalo.preco = preco;
  if (o.vendido === true) cavalo.vendido = true;
  return cavalo;
}
