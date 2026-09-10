/**
 * Os defeitos de dados das coudelarias que se podem apanhar sem sair do
 * processo.
 *
 * A auditoria de conteúdo — `docs/auditoria-coudelarias.md` — foi feita à mão
 * uma vez, e à mão encontrou 49 afirmações contraditas em 35 fichas. O que
 * este módulo faz é a parte dessa auditoria que **uma máquina consegue
 * repetir**, para a lista não voltar a crescer sem se dar por isso.
 *
 * A fronteira é deliberada e vale a pena escrevê-la: aqui não se verifica se
 * um facto é verdadeiro. Nenhuma função deste ficheiro sabe se a Coudelaria de
 * Alter foi mesmo fundada em 1748. O que se apanha são **defeitos de forma e
 * de coerência interna** — um telefone que é um espaço reservado, uma
 * coordenada que é o centro de uma povoação, um caminho de imagem que não
 * existe em disco, um ano escrito na prosa e ausente da coluna. Isso apanha-se
 * sem fonte nenhuma, e foi metade dos achados.
 *
 * Todas as funções são puras e recebem os dados por argumento: quem quiser
 * apontá-las à base de produção passa-lhe as linhas, e quem quiser testá-las
 * passa-lhe três de mentira.
 */

/** O mínimo que uma verificação precisa de saber de uma coudelaria. */
export interface LinhaAuditavel {
  slug: string;
  localizacao?: string | null;
  codigo_postal?: string | null;
  telefone?: string | null;
  website?: string | null;
  ano_fundacao?: number | null;
  descricao?: string | null;
  historia?: string | null;
  foto_capa?: string | null;
  galeria?: readonly string[] | null;
  coordenadas_lat?: number | null;
  coordenadas_lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Um defeito encontrado, com a linha a que pertence e o porquê. */
export interface Defeito {
  slug: string;
  campo: string;
  /** Porque é que isto é um defeito, em português, para ir direito ao ecrã. */
  razao: string;
}

// ---------------------------------------------------------------------------
// Forma
// ---------------------------------------------------------------------------

/** Código postal português: quatro dígitos, hífen, três dígitos. */
export const FORMA_CODIGO_POSTAL = /^\d{4}-\d{3}$/;

export function codigoPostalValido(cp: string | null | undefined): boolean {
  return typeof cp === "string" && FORMA_CODIGO_POSTAL.test(cp.trim());
}

/**
 * O código postal escondido dentro da morada.
 *
 * Oito das trinta e cinco linhas têm o código postal escrito dentro do campo
 * `localizacao` — «Herdade da Agolada de Baixo, 2100-047 Coruche» — enquanto a
 * coluna `codigo_postal` está vazia nas trinta e cinco. O dado existe; está no
 * sítio errado. Esta função é o que permite passá-lo para o sítio certo sem
 * inventar nada: só se move o que já lá está escrito.
 */
export function codigoPostalNaLocalizacao(loc: string | null | undefined): string | null {
  const achado = (loc ?? "").match(/\b(\d{4}-\d{3})\b/);
  return achado ? achado[1] : null;
}

/**
 * Um telefone que não é um telefone.
 *
 * Não se valida o número — validar prefixos portugueses dava falsos positivos
 * em quem tem número estrangeiro, e isso seria pior do que não verificar. O
 * que se apanha é o **espaço reservado**: `+351 243 558 XXX` esteve em
 * produção, e não é um número mal formatado, é um número por preencher.
 */
export function telefoneEspacoReservado(tel: string | null | undefined): boolean {
  const t = (tel ?? "").trim();
  if (!t) return false;
  if (/x{2,}/i.test(t)) return true;
  if (/\b0{6,}\b|\b1234\s?5678\b/.test(t)) return true;
  // Menos de nove algarismos não chega para um número português.
  return (t.match(/\d/g) ?? []).length < 9;
}

/** Um `website` que aponta para o directório de outra pessoa, não para a casa. */
const DIRECTORIOS_DE_TERCEIROS = [
  "lusitanohorsefinder.com",
  "ehorses.com",
  "horsequest.co.uk",
  "equinenow.com",
];

export function websiteDeTerceiros(url: string | null | undefined): boolean {
  const u = (url ?? "").toLowerCase();
  return DIRECTORIOS_DE_TERCEIROS.some((d) => u.includes(d));
}

// ---------------------------------------------------------------------------
// Coordenadas
// ---------------------------------------------------------------------------

/**
 * Uma coordenada que é conversão de graus e minutos, e portanto o centro de
 * uma povoação.
 *
 * `39.1167` é `39° 07'`. Um valor cuja parte decimal cai, ao milésimo, num
 * minuto inteiro não foi lido de um GPS em cima de uma herdade: foi convertido
 * de uma referência de povoação, e traz consigo cerca de **900 metros** de
 * incerteza. Numa página que promete mostrar onde fica a coudelaria, isso é
 * informação falsa com aspecto de precisa.
 *
 * Exige-se que **os dois** eixos sejam minutos inteiros: um só acontece por
 * acaso uma vez em cada quatro coordenadas honestas, os dois quase nunca.
 */
export function coordenadaDeCentroDePovoacao(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  const minutoInteiro = (v: number | null | undefined) => {
    if (v == null || !Number.isFinite(v)) return false;
    const minutos = (Math.abs(v) % 1) * 60;
    return Math.abs(minutos - Math.round(minutos)) < 0.01;
  };
  return minutoInteiro(lat) && minutoInteiro(lng);
}

/** Distância em quilómetros entre dois pontos, pela fórmula do semiverseno. */
export function distanciaKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * As duas colunas de coordenadas da mesma linha a discordar.
 *
 * A tabela tem `coordenadas_lat`/`lng` **e** `latitude`/`longitude`. As
 * páginas lêem as primeiras; as segundas ficaram para trás. Em seis linhas
 * discordam, e numa delas por **17,8 km**. Enquanto as duas viverem lado a
 * lado, qualquer código novo pode escolher a errada — e nada no esquema diz
 * qual é a boa.
 *
 * O limiar é de um quilómetro: abaixo disso é arredondamento, acima é uma das
 * duas estar noutro sítio.
 */
export function colunasDeCoordenadasEmConflito(linha: LinhaAuditavel, limiarKm = 1): number | null {
  const { coordenadas_lat: a1, coordenadas_lng: b1, latitude: a2, longitude: b2 } = linha;
  if (a1 == null || b1 == null || a2 == null || b2 == null) return null;
  const d = distanciaKm([a1, b1], [a2, b2]);
  return d > limiarKm ? d : null;
}

// ---------------------------------------------------------------------------
// Coerência entre campos
// ---------------------------------------------------------------------------

/**
 * Um ano de fundação escrito na prosa e ausente da coluna.
 *
 * A `descricao` do `luis-bastos` diz «Fundada em 2006», a `historia` repete-o,
 * e `ano_fundacao` é `NULL` — numa listagem que se pode ordenar por
 * antiguidade. Cinco linhas estão assim. O ano existe, está escrito duas vezes
 * e não está na coluna que o site lê.
 *
 * Só se olha para «fundada em AAAA» e irmãs: uma data qualquer no meio de um
 * texto histórico não é o ano de fundação, e apanhar o 1193 da doação de D.
 * Sancho I seria pior do que não apanhar nada.
 */
const FUNDACAO_NA_PROSA =
  /\b(?:fundad[ao]|criad[ao]|constituíd[ao]|iniciad[ao]|nasceu)\s+(?:formalmente\s+)?(?:em|no ano de)\s+(1[6-9]\d{2}|20[0-2]\d)\b/i;

export function anoDeFundacaoSoNaProsa(linha: LinhaAuditavel): number | null {
  if (linha.ano_fundacao != null) return null;
  for (const texto of [linha.descricao, linha.historia]) {
    const achado = (texto ?? "").match(FUNDACAO_NA_PROSA);
    if (achado) return Number(achado[1]);
  }
  return null;
}

/**
 * Uma idade escrita por diferença em vez de por ano.
 *
 * «Há 25 anos no Alentejo», «fundada há mais de 220 anos», «mais de 25 anos de
 * experiência». Uma idade relativa numa base de dados estática fica mais
 * errada a cada ano que passa, e quando a coluna do ano está vazia não há
 * sequer maneira de saber a partir de quando se conta. A Vila Viçosa diz
 * «mais de 25 anos» com fundação em 1995: em 2026 são trinta e um.
 */
export function idadeRelativaSemAncora(linha: LinhaAuditavel): string | null {
  const padrao = /\b(?:há|com)\s+(?:mais de\s+|cerca de\s+)?(\d{2,3})\s+anos\b/i;
  for (const texto of [linha.descricao, linha.historia]) {
    const achado = (texto ?? "").match(padrao);
    if (achado) return achado[0];
  }
  return null;
}

/**
 * Frases inteiras partilhadas por mais do que uma coudelaria.
 *
 * Se duas histórias partilham um parágrafo, alguém as gerou a partir de um
 * molde. Foi medido nas trinta e cinco e **não há uma única frase repetida** —
 * o que é o resultado bom, e é por isso que este verificador existe: para que
 * continue a ser verdade.
 *
 * Só contam frases com pelo menos `minimo` caracteres. Abaixo disso apanham-se
 * fragmentos («Puro Sangue Lusitano.») que são vocabulário do domínio e não
 * cópia.
 */
export function frasesPartilhadas(
  linhas: readonly LinhaAuditavel[],
  minimo = 40
): { frase: string; slugs: string[] }[] {
  const onde = new Map<string, Set<string>>();
  for (const linha of linhas) {
    for (const campo of [linha.descricao, linha.historia]) {
      for (const bruta of (campo ?? "").split(/(?<=[.!?])\s+|\n+/)) {
        const frase = bruta.replace(/\s+/g, " ").trim();
        if (frase.length < minimo) continue;
        if (!onde.has(frase)) onde.set(frase, new Set());
        onde.get(frase)!.add(linha.slug);
      }
    }
  }
  return [...onde.entries()]
    .filter(([, slugs]) => slugs.size > 1)
    .map(([frase, slugs]) => ({ frase, slugs: [...slugs].sort() }))
    .sort((a, b) => b.slugs.length - a.slugs.length || a.frase.localeCompare(b.frase, "pt"));
}

// ---------------------------------------------------------------------------
// Imagens
// ---------------------------------------------------------------------------

/** Bancos de imagens: uma fotografia genérica a fazer de fotografia da casa. */
const BANCOS_DE_IMAGENS = [
  "images.unsplash.com",
  "unsplash.com",
  "pexels.com",
  "istockphoto.com",
  "shutterstock.com",
  "gettyimages.",
];

export function imagemDeBancoDeImagens(url: string | null | undefined): boolean {
  const u = (url ?? "").toLowerCase();
  return BANCOS_DE_IMAGENS.some((b) => u.includes(b));
}

/**
 * Ligações de imagem que apontam para ficheiros que não existem.
 *
 * Medido uma vez: **85 das 166 ligações da base**, 51%, e vinte coudelarias
 * com a galeria inteiramente morta. A causa foi só uma — a base guarda
 * `imagem-02.webp … imagem-09.webp` e não existe um único `.webp` em
 * `public/images/coudelarias/`. Alguém gravou o nome que os ficheiros teriam
 * depois de convertidos, e a conversão nunca aconteceu.
 *
 * Isto importa mais do que parece por causa do `montarFotos`: a galeria põe os
 * caminhos **da base primeiro** e os do disco a seguir. Numa coudelaria que só
 * tenha `capa.jpg` em disco, a capa é retirada por repetida e o que sobra na
 * galeria são exclusivamente os caminhos mortos.
 *
 * `existe` recebe o caminho tal como está guardado (`/images/…`) e diz se o
 * ficheiro lá está; quem chama decide se pergunta ao disco ou a um conjunto.
 */
export function imagensEmFalta(
  linhas: readonly LinhaAuditavel[],
  existe: (caminho: string) => boolean
): Defeito[] {
  const defeitos: Defeito[] = [];
  for (const linha of linhas) {
    const candidatas: [string, string][] = [];
    if (linha.foto_capa) candidatas.push(["foto_capa", linha.foto_capa]);
    for (const g of linha.galeria ?? []) if (g) candidatas.push(["galeria", g]);
    for (const [campo, caminho] of candidatas) {
      if (/^https?:/i.test(caminho)) continue; // as de fora têm regra própria
      if (existe(caminho)) continue;
      defeitos.push({ slug: linha.slug, campo, razao: `não existe em disco: ${caminho}` });
    }
  }
  return defeitos;
}

// ---------------------------------------------------------------------------
// A passagem completa
// ---------------------------------------------------------------------------

/**
 * Corre tudo o que não precisa de disco e devolve a lista de defeitos.
 *
 * As imagens ficam de fora porque precisam de saber o que há em disco, e isso
 * é do chamador. Tudo o resto sai daqui.
 */
export function auditar(linhas: readonly LinhaAuditavel[]): Defeito[] {
  const defeitos: Defeito[] = [];
  const juntar = (slug: string, campo: string, razao: string) =>
    defeitos.push({ slug, campo, razao });

  for (const l of linhas) {
    if (l.codigo_postal != null && !codigoPostalValido(l.codigo_postal))
      juntar(l.slug, "codigo_postal", `forma inválida: «${l.codigo_postal}» (esperado NNNN-NNN)`);

    const escondido = codigoPostalNaLocalizacao(l.localizacao);
    if (escondido && !l.codigo_postal)
      juntar(l.slug, "codigo_postal", `vazio, com «${escondido}» escrito na localizacao`);

    if (telefoneEspacoReservado(l.telefone))
      juntar(l.slug, "telefone", `não é um número: «${l.telefone}»`);

    if (websiteDeTerceiros(l.website))
      juntar(l.slug, "website", `aponta para um directório de terceiros: ${l.website}`);

    if (imagemDeBancoDeImagens(l.foto_capa))
      juntar(l.slug, "foto_capa", "fotografia de banco de imagens a fazer de fotografia da casa");

    if (coordenadaDeCentroDePovoacao(l.coordenadas_lat, l.coordenadas_lng))
      juntar(
        l.slug,
        "coordenadas",
        "conversão de graus e minutos — é o centro da povoação, não a morada"
      );

    const conflito = colunasDeCoordenadasEmConflito(l);
    if (conflito != null)
      juntar(l.slug, "coordenadas", `as duas colunas discordam em ${conflito.toFixed(1)} km`);

    const ano = anoDeFundacaoSoNaProsa(l);
    if (ano != null) juntar(l.slug, "ano_fundacao", `vazio, com «${ano}» escrito no texto`);

    const idade = idadeRelativaSemAncora(l);
    if (idade && l.ano_fundacao == null)
      juntar(l.slug, "historia", `idade relativa sem ano de fundação: «${idade}»`);
  }

  for (const { frase, slugs } of frasesPartilhadas(linhas))
    juntar(slugs.join(", "), "historia", `frase partilhada por ${slugs.length}: «${frase}»`);

  return defeitos;
}
