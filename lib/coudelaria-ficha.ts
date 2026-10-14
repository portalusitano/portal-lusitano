/**
 * Lógica da ficha de coudelaria (`/directorio/[slug]`).
 *
 * Tudo o que aqui está é puro e testado: formatação de contactos, dados
 * estruturados e a ficha técnica. A regra que atravessa o ficheiro é uma só —
 * **não se afirma o que os dados não provam**. Se um campo vem vazio, a linha
 * não aparece; não se inventa um valor por omissão nem um distintivo.
 */

import { desembrulharJson, lerCavalosDestaque } from "./cavalos-destaque";

export interface CoudelariaFicha {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  historia?: string | null;
  localizacao?: string | null;
  regiao?: string | null;
  telefone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  num_cavalos?: number | null;
  ano_fundacao?: number | null;
  especialidades?: string[] | null;
  linhagens?: string[] | null;
  premios?: string[] | null;
  servicos?: string[] | null;
  tags?: string[] | null;
  horario?: string | null;
  coordenadas_lat?: number | null;
  coordenadas_lng?: number | null;
  foto_capa?: string | null;
  galeria?: string[] | null;
  video_url?: string | null;
  cavalos_destaque?: CavaloDestaque[] | null;
  testemunhos?: Testemunho[] | null;
  is_pro?: boolean | null;
  destaque?: boolean | null;
  views_count?: number | null;
}

export interface CavaloDestaque {
  nome: string;
  ano?: number;
  pelagem?: string;
  aptidao?: string;
  preco?: number;
  vendido?: boolean;
}

export interface Testemunho {
  autor: string;
  texto: string;
  data?: string;
}

// ─── A fronteira ─────────────────────────────────────────────────────────────

/**
 * A linha **como ela vem da base**, que não é como o tipo promete.
 *
 * `cavalos_destaque` é `jsonb` e onze das vinte e nove linhas trazem lá uma
 * string com JSON dentro. Isso foi encontrado e corrigido depois de a
 * construção do site morrer em produção — mas foi corrigido **só nessa
 * coluna**, e a coluna não tem nada de especial: há sete outras lidas com o
 * mesmo `.length ? … .map(…)`, e uma string também tem `length`. O mesmo
 * acidente de importação noutra coluna dá o mesmo apagão.
 *
 * Por isso o tipo de entrada diz a verdade — estas colunas são `unknown` — e
 * há **um** sítio onde se passa de `unknown` para o tipo declarado. Daqui
 * para dentro o tipo é verdade; daqui para fora não se acredita em nada.
 */
export type ColunaDeLista =
  | "especialidades"
  | "linhagens"
  | "premios"
  | "servicos"
  | "tags"
  | "galeria"
  | "cavalos_destaque"
  | "testemunhos";

export type CoudelariaBruta = Omit<CoudelariaFicha, ColunaDeLista> &
  Partial<Record<ColunaDeLista, unknown>>;

/**
 * Uma coluna de texto em lista: `especialidades`, `linhagens`, `premios`,
 * `servicos`, `tags`, `galeria`.
 *
 * Aceita o array (a forma boa), a string com JSON dentro, e a string simples
 * — que conta como um elemento só. Deita fora o que não é texto e o que é
 * espaço em branco, e não repete.
 */
export function lerListaDeTexto(valor: unknown): string[] {
  const bruto = desembrulharJson(valor);
  if (!Array.isArray(bruto)) return [];
  const saida: string[] = [];
  for (const item of bruto) {
    if (typeof item !== "string") continue;
    const texto = item.trim();
    if (!texto || saida.includes(texto)) continue;
    saida.push(texto);
  }
  return saida;
}

/**
 * A coluna `testemunhos`. Sem autor **e** sem texto não há citação: uma aspa
 * a abrir um bloco vazio lê-se como um erro da página, não como um dado que
 * falta.
 */
export function lerTestemunhos(valor: unknown): Testemunho[] {
  const bruto = desembrulharJson(valor);
  if (!Array.isArray(bruto)) return [];
  const saida: Testemunho[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const autor = typeof o.autor === "string" ? o.autor.trim() : "";
    const texto = typeof o.texto === "string" ? o.texto.trim() : "";
    if (!autor || !texto) continue;
    const data = typeof o.data === "string" && o.data.trim() ? o.data.trim() : undefined;
    saida.push(data ? { autor, texto, data } : { autor, texto });
  }
  return saida;
}

/** O único sítio onde uma linha da base passa a ser uma `CoudelariaFicha`. */
export function normalizarCoudelaria(linha: CoudelariaBruta): CoudelariaFicha {
  return {
    ...linha,
    especialidades: lerListaDeTexto(linha.especialidades),
    linhagens: lerListaDeTexto(linha.linhagens),
    premios: lerListaDeTexto(linha.premios),
    servicos: lerListaDeTexto(linha.servicos),
    tags: lerListaDeTexto(linha.tags),
    galeria: lerListaDeTexto(linha.galeria),
    cavalos_destaque: lerCavalosDestaque(linha.cavalos_destaque),
    testemunhos: lerTestemunhos(linha.testemunhos),
  };
}

// ─── Contactos ───────────────────────────────────────────────────────────────

/**
 * `href` de um telefone. O `tel:` não tolera espaços nem parênteses, e um
 * número guardado como «245 000 000» tem de sair como `tel:+351245000000` —
 * de outro modo o telemóvel abre o marcador com o número truncado.
 *
 * Um número nacional de nove dígitos sem indicativo leva o `+351`: é a única
 * hipótese num directório de coudelarias portuguesas, e sem ele quem liga do
 * estrangeiro não chega lá.
 */
export function hrefTelefone(bruto?: string | null): string | null {
  if (!bruto) return null;
  const limpo = bruto.replace(/[^\d+]/g, "");
  if (!limpo) return null;
  if (limpo.startsWith("+")) {
    return limpo.length >= 8 ? `tel:${limpo}` : null;
  }
  if (limpo.startsWith("00")) {
    const semZeros = limpo.slice(2);
    return semZeros.length >= 8 ? `tel:+${semZeros}` : null;
  }
  if (limpo.length === 9) return `tel:+351${limpo}`;
  return limpo.length >= 8 ? `tel:${limpo}` : null;
}

/**
 * Telefone como se lê em voz alta. Nove dígitos portugueses agrupam-se em
 * 3-3-3, que é como estão impressos nos cartões; o resto devolve-se limpo de
 * espaços a mais, sem inventar um agrupamento que possa estar errado.
 */
export function telefoneLegivel(bruto?: string | null): string | null {
  if (!bruto) return null;
  const texto = bruto.trim().replace(/\s+/g, " ");
  if (!texto) return null;
  const digitos = texto.replace(/[^\d+]/g, "");
  const nacional = digitos.startsWith("+351")
    ? digitos.slice(4)
    : digitos.startsWith("00351")
      ? digitos.slice(5)
      : /^\d{9}$/.test(digitos)
        ? digitos
        : null;
  if (nacional && /^\d{9}$/.test(nacional)) {
    return `+351 ${nacional.slice(0, 3)} ${nacional.slice(3, 6)} ${nacional.slice(6)}`;
  }
  return texto;
}

/** `mailto:` de um email, ou nada se o que lá está não é um email. */
export function hrefEmail(bruto?: string | null): string | null {
  if (!bruto) return null;
  const texto = bruto.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto)) return null;
  return `mailto:${texto}`;
}

/**
 * URL absoluto de um website. Muitas fichas trazem «exemplo.pt» sem
 * protocolo — e um `href` assim é resolvido como caminho relativo, o que
 * atirava a pessoa para `/directorio/exemplo.pt`.
 */
export function urlAbsoluto(bruto?: string | null): string | null {
  if (!bruto) return null;
  const texto = bruto.trim();
  if (!texto) return null;
  const comProtocolo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;
  try {
    const url = new URL(comProtocolo);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** O que se escreve no ecrã em vez de um URL comprido: `exemplo.pt`. */
export function dominioLegivel(bruto?: string | null): string | null {
  const absoluto = urlAbsoluto(bruto);
  if (!absoluto) return null;
  try {
    return new URL(absoluto).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Instagram. O campo tanto traz `@nome` como `nome` como o URL inteiro —
 * `https://instagram.com/@nome` não é um perfil, é um 404.
 */
export function contaInstagram(bruto?: string | null): { url: string; etiqueta: string } | null {
  if (!bruto) return null;
  let texto = bruto.trim();
  if (!texto) return null;
  const comoUrl = texto.match(/instagram\.com\/([^/?#\s]+)/i);
  if (comoUrl) texto = comoUrl[1];
  const utilizador = texto.replace(/^@+/, "").replace(/\/+$/, "");
  if (!utilizador || /[\s/]/.test(utilizador)) return null;
  return { url: `https://www.instagram.com/${utilizador}`, etiqueta: `@${utilizador}` };
}

/** Facebook e YouTube guardam ora um URL ora um nome de página. */
export function urlRedeSocial(bruto: string | null | undefined, base: string): string | null {
  if (!bruto) return null;
  const texto = bruto.trim().replace(/^@+/, "");
  if (!texto) return null;
  if (/^https?:\/\//i.test(texto) || /^[\w-]+\.[\w.]+\//.test(texto)) return urlAbsoluto(texto);
  if (/[\s]/.test(texto)) return null;
  return `${base}/${texto.replace(/^\/+/, "")}`;
}

/** Direcções no Google Maps a partir das coordenadas. */
export function hrefDireccoes(lat?: number | null, lng?: number | null): string | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Há alguma maneira de chegar a esta coudelaria? */
export function temContacto(c: CoudelariaFicha): boolean {
  return Boolean(
    hrefTelefone(c.telefone) ||
    hrefEmail(c.email) ||
    urlAbsoluto(c.website) ||
    contaInstagram(c.instagram) ||
    urlRedeSocial(c.facebook, "https://www.facebook.com") ||
    urlRedeSocial(c.youtube, "https://www.youtube.com")
  );
}

// ─── Texto ───────────────────────────────────────────────────────────────────

/**
 * Resumo para `<meta name="description">`. Corta na fronteira de palavra: um
 * corte a meio de «criaç…» aparece tal e qual no resultado da pesquisa.
 */
export function resumoParaMeta(texto: string | null | undefined, limite = 155): string {
  const limpo = (texto || "").replace(/\s+/g, " ").trim();
  if (!limpo) return "";
  if (limpo.length <= limite) return limpo;
  const cortado = limpo.slice(0, limite - 1);
  const espaco = cortado.lastIndexOf(" ");
  return `${(espaco > limite * 0.5 ? cortado.slice(0, espaco) : cortado).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/**
 * A descrição que a ficha mostra quando a base de dados não tem nenhuma —
 * e é o caso na maioria das coudelarias. Diz **só** o que os dados provam:
 * nome, sítio, e quando muito o ano e o número de cavalos. Nada de «criador
 * de excelência» nem de «linhagens premiadas».
 */
export function descricaoFactual(
  c: Pick<CoudelariaFicha, "nome" | "localizacao" | "regiao" | "ano_fundacao" | "num_cavalos">,
  frases: {
    fundadaEm: string;
    cavalos: string;
    coudelariaEm: string;
  }
): string {
  const sitio = [c.localizacao, c.regiao].filter(Boolean).join(", ");
  const partes: string[] = [sitio ? `${c.nome} — ${frases.coudelariaEm} ${sitio}.` : `${c.nome}.`];
  const detalhes: string[] = [];
  if (c.ano_fundacao) detalhes.push(`${frases.fundadaEm} ${c.ano_fundacao}`);
  if (c.num_cavalos) detalhes.push(`${c.num_cavalos} ${frases.cavalos}`);
  if (detalhes.length) partes.push(`${detalhes.join(" · ")}.`);
  return partes.join(" ");
}

/** Parágrafos de um texto longo, sem linhas vazias pelo meio. */
export function paragrafos(texto?: string | null): string[] {
  if (!texto) return [];
  return texto
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// ─── Ficha técnica ───────────────────────────────────────────────────────────

export interface LinhaFicha {
  chave: string;
  rotulo: string;
  valor: string;
  /** Valores numéricos alinham em coluna com a mono. */
  numerico?: boolean;
}

/**
 * As linhas do painel de identidade — a receita «previews em HTML, nunca
 * capturas». Só entram as linhas que têm dados; um painel com «—» em cinco
 * linhas não é um painel, é um formulário por preencher.
 *
 * As especialidades e o horário ficam de fora de propósito: as primeiras têm
 * a sua fila de pastilhas no corpo, o segundo vive ao lado do telefone, que é
 * onde alguém o procura. Repetidos aqui, o painel e a coluna diziam a mesma
 * coisa duas vezes no mesmo ecrã.
 */
export function fichaTecnica(
  c: CoudelariaFicha,
  rotulos: Record<"localizacao" | "regiao" | "fundacao" | "cavalos" | "linhagens", string>
): LinhaFicha[] {
  const linhas: LinhaFicha[] = [];
  if (c.localizacao)
    linhas.push({ chave: "localizacao", rotulo: rotulos.localizacao, valor: c.localizacao });
  if (c.regiao) linhas.push({ chave: "regiao", rotulo: rotulos.regiao, valor: c.regiao });
  if (c.ano_fundacao)
    linhas.push({
      chave: "fundacao",
      rotulo: rotulos.fundacao,
      valor: String(c.ano_fundacao),
      numerico: true,
    });
  if (c.num_cavalos)
    linhas.push({
      chave: "cavalos",
      rotulo: rotulos.cavalos,
      valor: String(c.num_cavalos),
      numerico: true,
    });
  if (c.linhagens?.length)
    linhas.push({ chave: "linhagens", rotulo: rotulos.linhagens, valor: c.linhagens.join(" · ") });
  return linhas;
}

/**
 * O painel só se desenha se disser alguma coisa que o cabeçalho não diga já.
 *
 * A localização e a região estão logo por baixo do nome, em letra maior; um
 * painel que repita essas duas linhas e mais nada não é informação, é uma
 * caixa a fingir que a ficha está preenchida.
 */
export function painelValeAPena(linhas: LinhaFicha[]): boolean {
  return linhas.some((l) => l.chave !== "localizacao" && l.chave !== "regiao");
}

// ─── Vizinhança ──────────────────────────────────────────────────────────────

/**
 * Quantos quilómetros há entre dois pontos, **em linha recta**.
 *
 * Fórmula do semi-verseno sobre uma esfera de 6371 km. Não é a distância de
 * estrada e nunca se escreve como se fosse: sobre estas latitudes o erro do
 * raio médio é de décimas por cento, mas a estrada entre duas coudelarias do
 * Ribatejo pode ser metade outra vez mais longa do que a recta. Quem escreve
 * o número tem de escrever também que é em linha recta.
 */
export function distanciaKm(
  a: { lat?: number | null; lng?: number | null },
  b: { lat?: number | null; lng?: number | null }
): number | null {
  if (
    typeof a.lat !== "number" ||
    typeof a.lng !== "number" ||
    typeof b.lat !== "number" ||
    typeof b.lng !== "number" ||
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return null;
  }
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface CoudelariaVizinha {
  slug: string;
  nome: string;
  localizacao?: string | null;
  regiao?: string | null;
  coordenadas_lat?: number | null;
  coordenadas_lng?: number | null;
  /** Quilómetros em linha recta até à coudelaria de onde se parte. */
  km: number;
}

/**
 * As coudelarias mais próximas desta.
 *
 * Vale a pena porque os dados o sustentam: das vinte e nove, vinte e seis têm
 * três outras a menos de 72 km, e a mediana da terceira mais próxima é 31 km.
 * Quem está a decidir se contacta uma coudelaria está muitas vezes a decidir
 * se faz a viagem — e três nomes a meia hora dali mudam essa conta.
 *
 * Sem coordenadas de um dos lados o par simplesmente não entra: uma distância
 * a `null` desenhada como «—» seria uma linha a dizer que não sabe.
 */
export function maisPerto<
  T extends {
    slug: string;
    nome: string;
    coordenadas_lat?: number | null;
    coordenadas_lng?: number | null;
  },
>(
  origem: { slug: string; coordenadas_lat?: number | null; coordenadas_lng?: number | null },
  candidatas: readonly T[],
  quantas = 3
): (T & { km: number })[] {
  const daqui = { lat: origem.coordenadas_lat, lng: origem.coordenadas_lng };
  return (
    candidatas
      .filter((c) => c.slug !== origem.slug)
      .map((c) => ({
        ...c,
        km: distanciaKm(daqui, { lat: c.coordenadas_lat, lng: c.coordenadas_lng }),
      }))
      .filter((c): c is T & { km: number } => c.km !== null)
      // Empates pelo nome, para a lista não dançar entre construções.
      .sort((a, b) => a.km - b.km || a.nome.localeCompare(b.nome, "pt"))
      .slice(0, Math.max(0, quantas))
  );
}

/**
 * Quilómetros como se escrevem. Abaixo de dez, uma casa decimal — entre «1 km»
 * e «9 km» cabem duas coudelarias que estão a 1,2 e a 8,7, e arredondar as
 * duas para o mesmo número seria perder o que a linha tem para dizer.
 */
export function kmLegivel(km: number, locale: string): string {
  const casas = km < 10 ? 1 : 0;
  return km.toLocaleString(locale, {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

// ─── Dados estruturados ──────────────────────────────────────────────────────

/**
 * JSON-LD da coudelaria.
 *
 * Três coisas que a versão anterior fazia mal e aqui não se repetem:
 * o `@id` era derivado do **nome** (`coudelaria-de-alter-real`) e não do slug,
 * pelo que apontava para um URL que não existe; o `url` era o site da
 * coudelaria em vez da página; e havia um `priceRange: "€€€"` fixo — uma
 * afirmação sobre preços que ninguém introduziu.
 */
export function dadosEstruturados(
  c: CoudelariaFicha,
  opcoes: {
    urlPagina: string;
    imagem?: string | null;
    avaliacao?: { media: number; total: number } | null;
    descricao: string;
  }
): Record<string, unknown> {
  const sameAs = [
    urlAbsoluto(c.website),
    contaInstagram(c.instagram)?.url,
    urlRedeSocial(c.facebook, "https://www.facebook.com"),
    urlRedeSocial(c.youtube, "https://www.youtube.com"),
  ].filter((v): v is string => Boolean(v));

  const esquema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": opcoes.urlPagina,
    name: c.nome,
    url: opcoes.urlPagina,
    description: opcoes.descricao,
  };

  if (c.localizacao || c.regiao) {
    esquema.address = {
      "@type": "PostalAddress",
      ...(c.localizacao ? { addressLocality: c.localizacao } : {}),
      ...(c.regiao ? { addressRegion: c.regiao } : {}),
      addressCountry: "PT",
    };
  }
  if (typeof c.coordenadas_lat === "number" && typeof c.coordenadas_lng === "number") {
    esquema.geo = {
      "@type": "GeoCoordinates",
      latitude: c.coordenadas_lat,
      longitude: c.coordenadas_lng,
    };
  }
  const telefone = hrefTelefone(c.telefone);
  if (telefone) esquema.telephone = telefone.replace(/^tel:/, "");
  const email = hrefEmail(c.email);
  if (email) esquema.email = email.replace(/^mailto:/, "");
  if (opcoes.imagem) esquema.image = opcoes.imagem;
  if (sameAs.length) esquema.sameAs = sameAs;
  if (c.ano_fundacao) esquema.foundingDate = String(c.ano_fundacao);
  if (opcoes.avaliacao && opcoes.avaliacao.total > 0) {
    esquema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: opcoes.avaliacao.media,
      reviewCount: opcoes.avaliacao.total,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return esquema;
}
