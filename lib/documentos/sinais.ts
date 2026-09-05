/**
 * Os sinais que se conseguem calcular sobre os documentos de um cavalo.
 *
 * ## O que isto é, e sobretudo o que não é
 *
 * Um sinal aqui é **um facto contado**: «este sha256 aparece em dois anúncios,
 * e os ids são estes». Não é uma acusação, não é uma pontuação de confiança, e
 * não é uma decisão. Quem decide é uma pessoa, no painel de revisão, com os
 * dois anúncios abertos à frente.
 *
 * A fronteira está desenhada assim por causa da terceira regra do
 * `contrato.ts`: `verificado` quer dizer que uma pessoa olhou. Um classificados
 * que recusasse um anúncio porque duas linhas de uma tabela coincidem estaria a
 * fazer exactamente aquilo que este módulo existe para evitar — afirmar mais do
 * que sabe. **Nada aqui escreve na base, nada aqui apaga, e nada aqui promove
 * um documento a verificado.** São funções puras sobre linhas já lidas.
 *
 * O erro que se evita é o caro, e os dois não custam o mesmo. Recusar um
 * anúncio verdadeiro custa um vendedor honesto e a reputação de quem o recusou;
 * mandar uma coincidência para revisão humana custa três minutos a quem revê.
 * Por isso a saída é uma fila com contexto, e não um veredicto.
 *
 * ## Porque é que estes sinais e não outros
 *
 * Só entram perguntas cuja resposta está inteira na base, sem depender de
 * nenhum serviço que não temos. Não há consulta ao stud-book — o
 * `components/vender-cavalo/registo-apsl.ts` explica porquê —, e por isso não
 * se pergunta «este número de registo existe?». Pergunta-se «este número de
 * registo aparece em anúncios de dois vendedores diferentes?», que é uma
 * pergunta que a tabela sabe responder sozinha.
 *
 * Os quatro:
 *
 * 1. **O mesmo ficheiro em dois anúncios.** O `sha256` é o hash do conteúdo:
 *    dois ficheiros com o mesmo hash são o mesmo ficheiro, byte a byte. Um
 *    Livro Azul a servir dois cavalos é o sinal mais forte que este sistema
 *    tem, e o único que não depende de o vendedor ter escrito seja o que for.
 * 2. **O mesmo microchip em dois anúncios em pé.** O transponder é único por
 *    animal — é isso que a ISO 11784 fixa. Dois anúncios activos com o mesmo
 *    número são, ou o mesmo cavalo anunciado duas vezes, ou uma cópia.
 * 3. **O mesmo UELN em dois anúncios em pé.** Pela mesma razão, e com a mesma
 *    limpeza dos separadores que o passaporte traz impressos.
 * 4. **O mesmo número de registo em vendedores diferentes.** Um cavalo muda de
 *    dono e é revendido — isso é legítimo e acontece —, mas os dois anúncios
 *    estarem **em pé ao mesmo tempo** por contas diferentes não é.
 *
 * E um quinto que não calcula nada de novo, só junta: as contradições que a
 * leitura do documento já tinha guardado no `conflitos`. Está aqui para que o
 * painel tenha um sítio só onde perguntar «o que há para rever».
 *
 * ## O que fica de fora, de propósito
 *
 * - **O formato do microchip.** Um transponder ISO tem quinze algarismos, mas
 *   há cavalos mais velhos com chips anteriores à norma e passaportes com o
 *   número copiado à mão. Levantar a mão por causa do comprimento encheria a
 *   fila de cavalos velhos honestos, que é o público que menos se pode dar ao
 *   luxo de perder.
 * - **Repetições dentro do mesmo anúncio.** O mesmo Livro Azul enviado duas
 *   vezes para o mesmo cavalo é uma substituição, não uma fraude — a migração
 *   que cria a tabela diz o mesmo ao não pôr um `unique` no `sha256`.
 * - **Contas anónimas tratadas como uma só.** Dois anúncios sem `user_id` não
 *   são «o mesmo vendedor»: são dois vendedores que não sabemos quem são. Ver
 *   `registoEmVendedoresDiferentes`.
 */

import { normalizarMicrochip } from "@/lib/microchip-iso";

import {
  type Conflito,
  type DocumentoGuardado,
  type EstadoDeDocumento,
  type TipoDeDocumento,
  temDocumentacaoVerificada,
} from "./contrato";

// ─── O que cada sinal precisa de receber ─────────────────────────────────────

/**
 * Uma linha de `documentos_cavalo`, reduzida ao que os sinais lêem.
 *
 * É um subconjunto de `DocumentoGuardado` e não um tipo à parte: assim uma
 * linha vinda da base entra aqui sem conversão nenhuma, e no dia em que o
 * contrato mudar um destes campos esta assinatura muda com ele em vez de ficar
 * a mentir em silêncio.
 */
export type DocumentoParaSinais = Pick<
  DocumentoGuardado,
  "id" | "cavalo_id" | "referencia" | "tipo" | "sha256" | "estado"
> &
  Partial<Pick<DocumentoGuardado, "conflitos" | "nome_original" | "criado_em">>;

/**
 * Um anúncio, reduzido ao que os sinais lêem.
 *
 * Os nomes são os das colunas de `cavalos_venda`: `passaporte_equino` é onde o
 * UELN assenta, e `registro_apsl` — com o `r` a mais — é o nome que a coluna
 * tem mesmo. Copiá-los tal e qual poupa uma tradução que só existiria para
 * ficar bonita, e que seria mais um sítio onde alguém se engana.
 */
export interface AnuncioParaSinais {
  id: string;
  /** A conta do vendedor. `null` num anúncio que nunca foi reclamado. */
  user_id: string | null;
  status: string | null;
  microchip: string | null;
  /** O número do passaporte equino, que é onde o UELN vem escrito. */
  passaporte_equino: string | null;
  registro_apsl: string | null;
}

/**
 * Os anúncios que contam para os sinais de repetição.
 *
 * Um anúncio vendido, pausado ou removido pode legitimamente partilhar o
 * microchip com o anúncio que lhe sucedeu — é o mesmo cavalo, revendido. O que
 * não tem explicação inocente é dois **em pé ao mesmo tempo**.
 */
export const ESTADOS_ACTIVOS = ["active", "reservado"] as const;

export function anuncioEstaEmPe(anuncio: Pick<AnuncioParaSinais, "status">): boolean {
  return (ESTADOS_ACTIVOS as readonly string[]).includes(anuncio.status ?? "");
}

// ─── Normalização ────────────────────────────────────────────────────────────

/**
 * A forma comparável de um identificador escrito à mão.
 *
 * Um UELN vem impresso com espaços — `620 015 004471234` —, um microchip vem
 * com pontos, e o número de registo vem com e sem barras conforme quem o
 * copiou. Comparar as strings cruas perdia metade das repetições reais, que é o
 * pior desfecho possível para um sinal de fraude: parecer que não há nada.
 *
 * Devolve `null` quando não sobra nada, e é esse `null` que impede o erro
 * simétrico — juntar num grupo todos os anúncios que deixaram o campo em branco
 * e anunciar que trinta cavalos partilham o mesmo microchip.
 */
export function chaveComparavel(valor: string | null | undefined): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return limpo.length === 0 ? null : limpo;
}

// ─── O que um sinal é ────────────────────────────────────────────────────────

export const TIPOS_DE_SINAL = [
  "documento_repetido",
  "microchip_repetido",
  "ueln_repetido",
  "registo_em_vendedores_diferentes",
  "contradicao_por_rever",
] as const;
export type TipoDeSinal = (typeof TIPOS_DE_SINAL)[number];

/** Um anúncio tal como o sinal o nomeia para quem revê. */
export interface AnuncioNoSinal {
  cavaloId: string;
  /** A conta do vendedor, ou `null` num anúncio sem conta associada. */
  vendedor: string | null;
  /** O valor **como está guardado**, antes da limpeza. */
  valor: string | null;
}

/** Um documento tal como o sinal o nomeia para quem revê. */
export interface DocumentoNoSinal {
  documentoId: string;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  /** O anúncio, quando já existe. */
  cavaloId: string | null;
  /** A submissão, que é o que os liga enquanto o anúncio não nasce. */
  referencia: string;
}

/** O mesmo ficheiro, byte a byte, ligado a mais do que um destino. */
export interface SinalDocumentoRepetido {
  tipo: "documento_repetido";
  sha256: string;
  /** As linhas que partilham o hash, por ordem de id. */
  documentos: DocumentoNoSinal[];
  /**
   * Os destinos distintos — o anúncio quando existe, senão a submissão. É esta
   * a contagem que importa: duas linhas para o mesmo cavalo são uma
   * substituição, dois cavalos são outra coisa.
   */
  destinos: string[];
  /**
   * Os anúncios deste grupo que **já mostram documentação verificada** ao
   * público, pela definição única de `temDocumentacaoVerificada`. Um documento
   * repetido que está a sustentar um distintivo público é o caso que quem revê
   * quer ver primeiro — e continua a ser um facto, não uma acusação.
   */
  cavalosComDocumentacaoVerificada: string[];
}

/** O mesmo identificador declarado em mais do que um anúncio em pé. */
export interface SinalIdentificadorRepetido {
  tipo: "microchip_repetido" | "ueln_repetido";
  /** O valor já limpo, que é por onde se agrupou. */
  chave: string;
  anuncios: AnuncioNoSinal[];
}

/** O mesmo número de registo em anúncios de contas diferentes. */
export interface SinalRegistoEmVendedoresDiferentes {
  tipo: "registo_em_vendedores_diferentes";
  chave: string;
  anuncios: AnuncioNoSinal[];
  /** As contas distintas, por ordem. São sempre duas ou mais. */
  vendedores: string[];
  /**
   * Os anúncios do grupo sem conta associada. Ficam à parte e **não contam**
   * como um vendedor: não saber quem anunciou não é saber que foi outro.
   */
  anunciosSemVendedor: string[];
}

/** Uma contradição que a leitura do documento já tinha guardado. */
export interface SinalContradicaoPorRever {
  tipo: "contradicao_por_rever";
  documento: DocumentoNoSinal;
  conflitos: Conflito[];
}

export type Sinal =
  | SinalDocumentoRepetido
  | SinalIdentificadorRepetido
  | SinalRegistoEmVendedoresDiferentes
  | SinalContradicaoPorRever;

// ─── Utilitários privados ────────────────────────────────────────────────────

/** Agrupa por uma chave, deitando fora as linhas que não têm nenhuma. */
function agruparPorChave<T>(
  linhas: readonly T[],
  chave: (linha: T) => string | null
): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const linha of linhas) {
    const k = chave(linha);
    if (k === null) continue;
    const lista = grupos.get(k);
    if (lista) lista.push(linha);
    else grupos.set(k, [linha]);
  }
  return grupos;
}

/**
 * A ordem da saída é sempre a mesma para a mesma entrada.
 *
 * Não é preciosismo: um painel cuja lista muda de ordem entre dois
 * carregamentos faz quem revê perder o sítio onde ia, e um teste encostado à
 * ordem de inserção de um `Map` passa hoje e falha no dia em que a consulta
 * mudar de `order by`.
 */
function porTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** O destino de um documento: o anúncio quando existe, senão a submissão. */
function destinoDoDocumento(d: DocumentoParaSinais): string {
  return d.cavalo_id ?? `referencia:${d.referencia}`;
}

function nomearDocumento(d: DocumentoParaSinais): DocumentoNoSinal {
  return {
    documentoId: d.id,
    tipo: d.tipo,
    estado: d.estado,
    cavaloId: d.cavalo_id,
    referencia: d.referencia,
  };
}

/** Valores distintos, por ordem, sem repetições. */
function distintosOrdenados(valores: readonly string[]): string[] {
  return [...new Set(valores)].sort(porTexto);
}

// ─── Sinal 1: o mesmo documento em dois cavalos ──────────────────────────────

/**
 * O mesmo ficheiro ligado a mais do que um destino.
 *
 * Compara-se por `sha256`, o hash do conteúdo: não há aqui semelhança nem
 * aproximação — ou é o mesmo ficheiro ou não é. Um documento **recusado**
 * continua a contar, e de propósito: quem tentou usar noutro anúncio um Livro
 * Azul que já tinha sido recusado é precisamente o caso que interessa ver.
 */
export function documentoEmMaisDoQueUmAnuncio(
  documentos: readonly DocumentoParaSinais[]
): SinalDocumentoRepetido[] {
  const porHash = agruparPorChave(documentos, (d) => d.sha256 || null);
  const sinais: SinalDocumentoRepetido[] = [];

  for (const [sha256, linhas] of porHash) {
    const destinos = distintosOrdenados(linhas.map(destinoDoDocumento));
    // Duas linhas para o mesmo cavalo são uma substituição. Só há alguma coisa
    // a dizer quando os destinos são dois.
    if (destinos.length < 2) continue;

    const cavalos = distintosOrdenados(
      linhas.map((d) => d.cavalo_id).filter((id): id is string => typeof id === "string")
    );

    // A pergunta «este anúncio tem documentação verificada?» é uma só em todo o
    // site, e é a do contrato. Faz-se por anúncio, sobre **todos** os
    // documentos desse anúncio e não só os deste grupo: o distintivo público
    // que interessa é o que o comprador vê, e esse não sabe de hashes.
    const verificados = cavalos.filter((cavaloId) =>
      temDocumentacaoVerificada(
        documentos
          .filter((d) => d.cavalo_id === cavaloId)
          .map((d) => ({ tipo: d.tipo, estado: d.estado }))
      )
    );

    sinais.push({
      tipo: "documento_repetido",
      sha256,
      documentos: [...linhas].sort((a, b) => porTexto(a.id, b.id)).map(nomearDocumento),
      destinos,
      cavalosComDocumentacaoVerificada: verificados,
    });
  }

  return sinais.sort((a, b) => porTexto(a.sha256, b.sha256));
}

// ─── Sinais 2 e 3: o mesmo microchip, o mesmo UELN ───────────────────────────

function identificadorRepetido(
  anuncios: readonly AnuncioParaSinais[],
  tipo: SinalIdentificadorRepetido["tipo"],
  ler: (a: AnuncioParaSinais) => string | null,
  normalizar: (valor: string | null) => string | null = chaveComparavel
): SinalIdentificadorRepetido[] {
  const grupos = agruparPorChave(anuncios.filter(anuncioEstaEmPe), (a) => normalizar(ler(a)));
  const sinais: SinalIdentificadorRepetido[] = [];

  for (const [chave, linhas] of grupos) {
    // O mesmo anúncio lido duas vezes não é uma repetição.
    if (distintosOrdenados(linhas.map((a) => a.id)).length < 2) continue;

    sinais.push({
      tipo,
      chave,
      anuncios: [...linhas]
        .sort((a, b) => porTexto(a.id, b.id))
        .map((a) => ({ cavaloId: a.id, vendedor: a.user_id, valor: ler(a) })),
    });
  }

  return sinais.sort((a, b) => porTexto(a.chave, b.chave));
}

/**
 * O mesmo microchip em dois anúncios em pé.
 *
 * O transponder é único por animal — é o que a ISO 11784 fixa —, e por isso
 * dois anúncios activos com o mesmo número são o mesmo cavalo duas vezes, ou um
 * a copiar o outro. Qual dos dois, decide quem revê.
 *
 * Quem diz o que é «o mesmo microchip» é o `lib/microchip-iso.ts`, que o site
 * já tinha, e não uma limpeza escrita aqui. Um número só de algarismos com duas
 * ideias diferentes do que dele se deita fora é duas ideias de igualdade: uma
 * delas acabaria por não ver uma repetição que a outra vê.
 */
export function microchipRepetido(
  anuncios: readonly AnuncioParaSinais[]
): SinalIdentificadorRepetido[] {
  return identificadorRepetido(
    anuncios,
    "microchip_repetido",
    (a) => a.microchip,
    (valor) => {
      if (typeof valor !== "string") return null;
      const limpo = normalizarMicrochip(valor);
      return limpo.length === 0 ? null : limpo;
    }
  );
}

/**
 * O mesmo UELN em dois anúncios em pé.
 *
 * O UELN é vitalício e único, como o microchip. Compara-se pela forma limpa
 * porque o número vem impresso em três blocos separados por espaços, e cada
 * vendedor copia-o à sua maneira.
 */
export function uelnRepetido(anuncios: readonly AnuncioParaSinais[]): SinalIdentificadorRepetido[] {
  return identificadorRepetido(anuncios, "ueln_repetido", (a) => a.passaporte_equino);
}

// ─── Sinal 4: o mesmo registo em vendedores diferentes ───────────────────────

/**
 * O mesmo número de registo em anúncios de contas diferentes.
 *
 * Um cavalo é vendido e volta ao mercado pela mão de outro dono: isso é a vida
 * normal de um cavalo, e é por isso que só contam os anúncios **em pé ao mesmo
 * tempo**. Dois donos a anunciar hoje o mesmo número de registo é que não tem
 * explicação inocente óbvia.
 *
 * Os anúncios sem conta associada ficam listados à parte e não entram na conta
 * dos vendedores. Tratá-los como um vendedor só — ou como vendedores diferentes
 * uns dos outros — seria inventar em cima de um `null`.
 */
export function registoEmVendedoresDiferentes(
  anuncios: readonly AnuncioParaSinais[]
): SinalRegistoEmVendedoresDiferentes[] {
  const grupos = agruparPorChave(anuncios.filter(anuncioEstaEmPe), (a) =>
    chaveComparavel(a.registro_apsl)
  );
  const sinais: SinalRegistoEmVendedoresDiferentes[] = [];

  for (const [chave, linhas] of grupos) {
    const vendedores = distintosOrdenados(
      linhas.map((a) => a.user_id).filter((v): v is string => typeof v === "string")
    );
    if (vendedores.length < 2) continue;

    sinais.push({
      tipo: "registo_em_vendedores_diferentes",
      chave,
      anuncios: [...linhas]
        .sort((a, b) => porTexto(a.id, b.id))
        .map((a) => ({ cavaloId: a.id, vendedor: a.user_id, valor: a.registro_apsl })),
      vendedores,
      anunciosSemVendedor: distintosOrdenados(
        linhas.filter((a) => a.user_id === null).map((a) => a.id)
      ),
    });
  }

  return sinais.sort((a, b) => porTexto(a.chave, b.chave));
}

// ─── Sinal 5: as contradições que já estavam guardadas ───────────────────────

/**
 * As contradições entre o documento e o formulário, tal como a leitura as
 * guardou.
 *
 * Não calcula nada de novo: junta num sítio só o que já está no `conflitos` de
 * cada linha, para que o painel de revisão tenha uma pergunta única a fazer. Um
 * documento já verificado não entra — a contradição foi vista por uma pessoa
 * quando ela carimbou, e voltar a levantá-la seria pôr na fila trabalho que já
 * está feito.
 */
export function contradicoesPorRever(
  documentos: readonly DocumentoParaSinais[]
): SinalContradicaoPorRever[] {
  return documentos
    .filter((d) => d.estado !== "verificado")
    .filter((d): d is DocumentoParaSinais & { conflitos: Conflito[] } =>
      Array.isArray(d.conflitos) ? d.conflitos.length > 0 : false
    )
    .sort((a, b) => porTexto(a.id, b.id))
    .map((d) => ({
      tipo: "contradicao_por_rever" as const,
      documento: nomearDocumento(d),
      conflitos: d.conflitos,
    }));
}

// ─── Todos de uma vez ────────────────────────────────────────────────────────

/**
 * Todos os sinais, na ordem em que valem a pena ser lidos.
 *
 * A ordem é a da força do que cada um sabe, e não uma pontuação: o hash de um
 * ficheiro é um facto sobre bytes, um microchip repetido é um facto sobre uma
 * norma, e uma contradição é uma leitura automática que se pode ter enganado a
 * ler um algarismo. Continua a não haver nota, nem percentagem, nem semáforo —
 * quem revê lê os factos e decide.
 */
export function reunirSinais(entrada: {
  documentos: readonly DocumentoParaSinais[];
  anuncios: readonly AnuncioParaSinais[];
}): Sinal[] {
  return [
    ...documentoEmMaisDoQueUmAnuncio(entrada.documentos),
    ...microchipRepetido(entrada.anuncios),
    ...uelnRepetido(entrada.anuncios),
    ...registoEmVendedoresDiferentes(entrada.anuncios),
    ...contradicoesPorRever(entrada.documentos),
  ];
}
