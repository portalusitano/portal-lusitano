/**
 * As fotografias de uma coudelaria, para a ficha.
 *
 * A **capa** é escolhida pelo `lib/directorio-capas`, que é o mesmo módulo que
 * o cartão da listagem usa — a fotografia que abre a ficha tem de ser a mesma
 * que se viu no cartão que lá levou. Aqui acrescenta-se só o que a listagem
 * não precisa: a **galeria**, que na ficha é uma secção e no cartão não
 * existe.
 *
 * A regra é a de sempre: ou a fotografia é da coudelaria, ou não há
 * fotografia. Nunca stock. A versão anterior desta página pedia `capa.webp` —
 * que não existe em nenhuma pasta —, apanhava o 404 e caía numa lista fixa de
 * cavalos do Unsplash apresentados como sendo daquela coudelaria.
 */
import fs from "node:fs";
import path from "node:path";
import {
  PASTA_CAPAS,
  apontaParaFicheiroQueTemos,
  capaDoCartao,
  eDeBancoDeImagens,
  escolherCapa,
} from "./directorio-capas";

export interface FotosCoudelaria {
  /** Fotografia de capa, ou `null` quando não existe nenhuma. */
  capa: string | null;
  /** Restantes fotografias, já sem a capa repetida lá dentro. */
  galeria: string[];
}

const EXTENSOES = /\.(webp|jpe?g|png|avif)$/i;

/**
 * Junta o que a base de dados tem com o que está em disco e devolve capa e
 * galeria. Função pura — é aqui que a decisão se testa.
 *
 * O que a coudelaria carregou manda; os ficheiros do repositório entram a
 * seguir, para preencher.
 */
export function montarFotos(entrada: {
  slug: string;
  capaDb?: string | null;
  galeriaDb?: string[] | null;
  /** Nomes de ficheiro dentro de `public/images/coudelarias/<slug>/`. */
  ficheirosLocais?: readonly string[];
}): FotosCoudelaria {
  const locais = entrada.ficheirosLocais || [];
  // Duas maneiras de uma fotografia não ser fotografia daquela casa: não
  // existir, e ser emprestada de um banco de imagens. A segunda é julgada
  // dentro do `capaDoCartao`, que é por onde a capa passa em todo o site; aqui
  // acrescenta-se a primeira, que só se pode julgar onde há o varrimento do
  // disco — ou seja, só aqui.
  const serve = (caminho: string) =>
    apontaParaFicheiroQueTemos(caminho, entrada.slug, locais) && !eDeBancoDeImagens(caminho);
  const capaLocal = escolherCapa(entrada.slug, locais);

  // Uma capa que a base aponta para um ficheiro que não temos não é uma capa:
  // é um herói preto no topo da ficha. Tratada como ausente, a reserva do
  // disco entra — e é a fotografia certa daquela casa, não uma emprestada.
  const capaDb = (entrada.capaDb ?? "").trim();
  const capa = capaDoCartao(
    capaDb && apontaParaFicheiroQueTemos(capaDb, entrada.slug, locais) ? capaDb : null,
    entrada.slug,
    capaLocal ? { [entrada.slug]: capaLocal } : {}
  );

  const daBase = (entrada.galeriaDb || [])
    .map((f) => (f || "").trim())
    .filter(Boolean)
    // Os caminhos da base entram antes dos do disco, de propósito: o que a
    // coudelaria carregou manda. Mas entrar primeiro sendo inexistente era o
    // pior dos dois mundos — numa casa que só tem `capa.jpg`, a capa saía por
    // repetida e sobrava uma galeria feita só de imagens mortas.
    .filter(serve);
  const doDisco = ordenar(locais.filter((f) => EXTENSOES.test(f))).map(
    (f) => `/${PASTA_CAPAS}/${entrada.slug}/${f}`
  );

  const galeria: string[] = [];
  for (const foto of [...daBase, ...doDisco]) {
    if (foto === capa || galeria.includes(foto)) continue;
    galeria.push(foto);
  }
  return { capa, galeria };
}

/** `galeria-2` antes de `galeria-10`: a ordem alfabética punha-a depois. */
function ordenar(ficheiros: readonly string[]): string[] {
  const numero = (f: string) => {
    const m = f.match(/galeria-(\d+)/i);
    return m ? Number(m[1]) : 0;
  };
  return [...ficheiros].sort((a, b) => {
    const capaA = /^capa\./i.test(a) ? 0 : 1;
    const capaB = /^capa\./i.test(b) ? 0 : 1;
    if (capaA !== capaB) return capaA - capaB;
    return numero(a) - numero(b) || a.localeCompare(b);
  });
}

/** Cache do varrimento: as 29 fichas são geradas no mesmo processo de build. */
const cache = new Map<string, string[]>();

/**
 * Lê `public/images/coudelarias/<slug>/`. Corre no servidor, em construção ou
 * em revalidação; se a pasta não existir devolve uma lista vazia e a ficha
 * desenha-se sem fotografias, que é um estado previsto e não um erro.
 */
export function ficheirosLocais(slug: string): string[] {
  if (!/^[a-z0-9-]+$/i.test(slug)) return [];
  const emCache = cache.get(slug);
  if (emCache) return emCache;
  let saida: string[] = [];
  try {
    saida = fs.readdirSync(path.join(process.cwd(), "public", PASTA_CAPAS, slug));
  } catch {
    saida = [];
  }
  cache.set(slug, saida);
  return saida;
}

/** O conjunto pronto a passar ao componente. */
export function fotosDaCoudelaria(entrada: {
  slug: string;
  capaDb?: string | null;
  galeriaDb?: string[] | null;
}): FotosCoudelaria {
  return montarFotos({ ...entrada, ficheirosLocais: ficheirosLocais(entrada.slug) });
}
