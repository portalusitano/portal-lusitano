/**
 * O que as cinco rotas de revisão de documentos partilham.
 *
 * Não é um ficheiro de rota: no App Router só um `route.ts` é um caminho. Está
 * aqui, ao lado de quem o usa, e não em `lib/`, porque `lib/documentos/` é o
 * contrato — comum a quem recebe, a quem lê e a quem revê — e isto é só do
 * painel de revisão.
 */

import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ESTADOS_DE_DOCUMENTO,
  type Conflito,
  type DocumentoGuardado,
  type EstadoDeDocumento,
} from "@/lib/documentos/contrato";
import {
  reunirCoerencia,
  type AscendenteParaCoerencia,
  type CavaloParaCoerencia,
  type DocumentoParaCoerencia,
} from "@/lib/documentos/coerencia";
import { cruzarComFormulario } from "@/lib/documentos/leitura/cruzar";
import type { DadosDoAnuncio } from "@/lib/documentos/leitura/cruzar";
import type { Identificadores } from "@/lib/documentos/leitura/identificadores";
import {
  reunirSinais,
  type AnuncioParaSinais,
  type DocumentoParaSinais,
} from "@/lib/documentos/sinais";
import {
  forenseDaLinha,
  reunirVerificacao,
  type VistaDeVerificacao,
} from "@/lib/documentos/verificacao";

/** A tabela da migração `20260904000002_documentos_cavalo.sql`. */
export const TABELA = "documentos_cavalo";

/*
 * Cada rota declara `export const dynamic = "force-dynamic"` à mão, com um
 * literal. Aqui já esteve uma constante partilhada para o fazer num sítio só —
 * e o `next build` recusou-a: esse valor é lido ao compilar, sem executar o
 * módulo, e um símbolo importado não lhe diz nada. Nem o `tsc` nem o `eslint`
 * apanham isso. A repetição é a única forma que o Next aceita.
 *
 * O que ela diz é o mesmo nas seis: nenhuma destas respostas se pode
 * reaproveitar — a fila muda a cada decisão e o ficheiro é privado.
 */

/**
 * A sessão de administração, ou a resposta que a nega.
 *
 * O `middleware.ts` já barra `/api/admin/*` sem cookie válido. Isto **não
 * substitui** essa verificação nem é substituído por ela: o middleware corre no
 * Edge e pode um dia deixar de casar com um caminho novo por causa de um
 * `matcher`, e uma rota que confie nele é uma rota aberta no dia em que isso
 * aconteça. Uma página protegida com uma API aberta é uma API aberta.
 *
 * Devolve também o e-mail: é o que fica em `verificado_por`, e a base recusa um
 * `verificado` sem autor.
 */
export async function sessaoDeAdmin(): Promise<
  { ok: true; email: string } | { ok: false; resposta: NextResponse }
> {
  const email = await verifySession();
  if (!email) {
    return {
      ok: false,
      resposta: NextResponse.json({ erro: "Não autorizado" }, { status: 401 }),
    };
  }
  return { ok: true, email };
}

/** O cliente com a chave de serviço. É o único que a RLS desta tabela deixa passar. */
export const baseDeDados = supabaseAdmin;

/**
 * O `id` que chega no caminho tem de ser um UUID.
 *
 * Não é zelo de formato: sem isto, um `id` com aspas ou vírgulas entra nos
 * filtros do PostgREST, que os interpreta como sintaxe. Recusar cedo o que não
 * tem a forma certa é mais barato do que confiar em escapes ao longo de cinco
 * rotas.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idValido(id: string): boolean {
  return UUID.test(id);
}

export function respostaIdInvalido(): NextResponse {
  return NextResponse.json({ erro: "Identificador inválido" }, { status: 400 });
}

/** Uma linha crua da tabela, antes de se saber se tem a forma do contrato. */
type LinhaCrua = Record<string, unknown>;

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/**
 * Os conflitos vêm de uma coluna `jsonb`, que aceita o que lá puserem.
 *
 * Quem a escreve é outro caminho do sistema, e o painel não pode assumir que a
 * escreveu bem: uma entrada malformada não pode deitar abaixo a fila inteira de
 * quem revê. O que não tiver a forma do `Conflito` é deitado fora aqui, em
 * silêncio, e a fila continua a mostrar-se.
 */
const CAMPOS_DE_CONFLITO: ReadonlyArray<Conflito["campo"]> = [
  "ueln",
  "microchip",
  "numero_registo",
  "nome",
];

export function conflitosDaLinha(valor: unknown): Conflito[] {
  if (!Array.isArray(valor)) return [];
  const saida: Conflito[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const campo = c.campo;
    if (typeof campo !== "string") continue;
    if (!CAMPOS_DE_CONFLITO.includes(campo as Conflito["campo"])) continue;
    saida.push({
      campo: campo as Conflito["campo"],
      noFormulario: typeof c.noFormulario === "string" ? c.noFormulario : "",
      noDocumento: typeof c.noDocumento === "string" ? c.noDocumento : "",
    });
  }
  return saida;
}

/** O mesmo cuidado para a `leitura`. Tudo lá dentro é opcional por desenho. */
export function leituraDaLinha(valor: unknown): {
  texto: string | null;
  ueln: string | null;
  microchip: string | null;
  numeroRegisto: string | null;
  nome: string | null;
  origem: "pdf" | "nenhuma" | null;
} {
  const vazia = {
    texto: null,
    ueln: null,
    microchip: null,
    numeroRegisto: null,
    nome: null,
    origem: null,
  };
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return vazia;
  const l = valor as Record<string, unknown>;
  const origem = l.origem === "pdf" || l.origem === "nenhuma" ? l.origem : null;
  return {
    texto: texto(l.texto),
    ueln: texto(l.ueln),
    microchip: texto(l.microchip),
    numeroRegisto: texto(l.numeroRegisto),
    nome: texto(l.nome),
    origem,
  };
}

export function estadoValido(v: unknown): v is EstadoDeDocumento {
  return typeof v === "string" && (ESTADOS_DE_DOCUMENTO as readonly string[]).includes(v);
}

/**
 * Duas linhas pertencem à mesma submissão?
 *
 * Um documento sobe antes de o anúncio existir, e por isso o que o liga a uma
 * submissão nesse intervalo é a `referencia`; depois do pagamento passa a haver
 * `cavalo_id`. Uma linha antiga com a referência e uma nova já com o anúncio
 * são a mesma submissão, e **não** são um duplicado suspeito.
 *
 * É esta função que decide o que o aviso de duplicado diz, por isso é
 * deliberadamente conservadora: na dúvida, mesma submissão — um alarme falso
 * gasta o alarme, e o alarme é o que aqui vale.
 */
export function mesmaSubmissao(
  a: Pick<DocumentoGuardado, "cavalo_id" | "referencia">,
  b: Pick<DocumentoGuardado, "cavalo_id" | "referencia">
): boolean {
  if (a.referencia && b.referencia && a.referencia === b.referencia) return true;
  if (a.cavalo_id && b.cavalo_id && a.cavalo_id === b.cavalo_id) return true;
  return false;
}

/**
 * Os campos do anúncio que correspondem aos quatro campos que se confrontam.
 *
 * O nome da coluna não é o nome do campo do formulário, e a diferença não é
 * arbitrária: o `numero_registo` do formulário é gravado em `registro_apsl`, e
 * o UELN do passaporte em `passaporte_equino`. Escrever o mapa uma vez, aqui, é
 * melhor do que o adivinhar em cada sítio que o precise.
 */
export const COLUNA_DO_CAMPO: Readonly<Record<Conflito["campo"], string>> = {
  nome: "nome_registo",
  numero_registo: "registro_apsl",
  ueln: "passaporte_equino",
  microchip: "microchip",
};

/**
 * As colunas do anúncio que a ficha lê. Nada mais: é uma tabela larga.
 *
 * As cinco últimas — `user_id` e as quatro do cavalo — entraram quando a ficha
 * passou a mostrar a coerência e os sinais: sem a data de nascimento e o sexo
 * não há coerência biológica nenhuma a calcular, e sem o `user_id` não se sabe
 * se dois anúncios com o mesmo registo são do mesmo vendedor.
 */
export const COLUNAS_DO_ANUNCIO =
  "id, nome, slug, status, nome_registo, registro_apsl, passaporte_equino, microchip, " +
  "vendedor_nome, vendedor_email, user_id, data_nascimento, idade, sexo, altura";

export function valorDoAnuncio(anuncio: LinhaCrua | undefined, campo: Conflito["campo"]) {
  if (!anuncio) return null;
  return texto(anuncio[COLUNA_DO_CAMPO[campo]]);
}

// ─── O que se sabe sobre um documento ────────────────────────────────────────

/**
 * As colunas do anúncio que a coerência e os sinais leem.
 *
 * São as do `CavaloParaCoerencia` e do `AnuncioParaSinais` juntas, com os nomes
 * que as colunas têm mesmo — `registro_apsl` com o `r` a mais incluído.
 * Copiá-los poupa uma tradução que só existiria para ficar bonita e que seria
 * mais um sítio onde alguém se engana.
 */
export const COLUNAS_PARA_COERENCIA =
  "id, data_nascimento, idade, sexo, altura, nome, nome_registo, registro_apsl, " +
  "status, user_id, passaporte_equino, microchip";

/** As colunas de `documentos_cavalo` que os sinais e a coerência leem. */
const COLUNAS_PARA_SINAIS = "id, cavalo_id, referencia, tipo, sha256, estado, leitura, conflitos";

/** Quantos anúncios se trazem por identificador partilhado. */
const TECTO_DE_VIZINHOS = 20;

/**
 * O que o vendedor escreveu, na forma que o cruzamento espera.
 *
 * Devolve `{}` quando o anúncio ainda não existe — o documento sobe antes do
 * pagamento —, e nesse caso o cruzamento não tem contra o que comparar e
 * devolve uma lista vazia. **Ausência não é contradição.**
 */
export function anuncioParaCruzar(anuncio: LinhaCrua | undefined): DadosDoAnuncio {
  if (!anuncio) return {};
  const campo = (nome: string) => texto(anuncio[nome]) ?? undefined;
  return {
    ueln: campo("passaporte_equino"),
    microchip: campo("microchip"),
    numeroRegisto: campo("registro_apsl"),
    nome: campo("nome"),
    nomeRegisto: campo("nome_registo"),
  };
}

/** A leitura guardada, sem os `null`, que é a forma que o cruzamento espera. */
function identificadoresDaLeitura(leitura: ReturnType<typeof leituraDaLinha>): Identificadores {
  return {
    ...(leitura.ueln ? { ueln: leitura.ueln } : {}),
    ...(leitura.microchip ? { microchip: leitura.microchip } : {}),
    ...(leitura.numeroRegisto ? { numeroRegisto: leitura.numeroRegisto } : {}),
    ...(leitura.nome ? { nome: leitura.nome } : {}),
  };
}

/**
 * Tudo o que se sabe sobre este documento, das cinco famílias de uma vez.
 *
 * ## Porque é que os conflitos se recalculam em vez de se lerem
 *
 * A coluna `conflitos` é escrita na subida, e na subida **o anúncio ainda não
 * existe**: o documento sobe antes do pagamento e o `cavalo_id` só é preenchido
 * quando o Stripe confirma. Sem os campos do formulário não há contra o que
 * comparar, e o que fica guardado é uma lista vazia — que está certa naquele
 * instante e passa a estar errada no instante seguinte.
 *
 * Por isso, quando o anúncio existe, a contradição calcula-se aqui, agora,
 * contra o que o anúncio diz **hoje**. É também a resposta certa para o caso em
 * que o vendedor corrigiu o número depois de o documento ter subido: a
 * contradição desaparece sozinha em vez de ficar a acusar o que já foi
 * emendado. O que está na coluna só se usa enquanto não houver anúncio.
 *
 * ## O que esta função não faz
 *
 * Não escreve nada, não decide nada e não promove nada. Devolve factos com a
 * explicação inocente ao lado, e quem decide é a pessoa que tem o documento
 * aberto à frente.
 */
export async function recolherVerificacao(entrada: {
  documentoId: string;
  cavaloId: string | null;
  referencia: string;
  sha256: string;
  /** A linha crua, para se lhe ler a `leitura` e a `forense`. */
  linha: LinhaCrua;
  /** O anúncio, já lido pela ficha, ou `undefined` se ainda não existe. */
  anuncio: LinhaCrua | undefined;
}): Promise<VistaDeVerificacao> {
  const { analise, analisadoEm, achados } = forenseDaLinha(entrada.linha.forense);
  const leitura = leituraDaLinha(entrada.linha.leitura);

  const conflitos = entrada.anuncio
    ? cruzarComFormulario(identificadoresDaLeitura(leitura), anuncioParaCruzar(entrada.anuncio))
    : conflitosDaLinha(entrada.linha.conflitos);

  // ── Os documentos vizinhos ───────────────────────────────────────────────
  //
  // Um pedido só para os três laços: o mesmo ficheiro (sha), a mesma submissão
  // (referência) e o mesmo anúncio. A referência só entra no filtro se tiver a
  // forma de um UUID — vem do cliente, e o `or` do PostgREST é sintaxe e não um
  // parâmetro. Ver a nota do `idValido`.
  const laços = [`sha256.eq.${entrada.sha256}`];
  if (idValido(entrada.referencia)) laços.push(`referencia.eq.${entrada.referencia}`);
  if (entrada.cavaloId) laços.push(`cavalo_id.eq.${entrada.cavaloId}`);

  const { data: vizinhos } = await baseDeDados
    .from(TABELA)
    .select(COLUNAS_PARA_SINAIS)
    .or(laços.join(","));

  /* Duplo `as`: com um `or` o supabase-js não sabe inferir a forma da linha e
     dá-lhe um tipo de erro. A leitura de cada campo abaixo é defensiva à mesma. */
  const linhasVizinhas = (vizinhos ?? []) as unknown as LinhaCrua[];

  const documentos: DocumentoParaSinais[] = linhasVizinhas.map((d) => ({
    id: String(d.id),
    cavalo_id: (d.cavalo_id as string | null) ?? null,
    referencia: String(d.referencia ?? ""),
    tipo: d.tipo as DocumentoParaSinais["tipo"],
    sha256: String(d.sha256 ?? ""),
    estado: d.estado as EstadoDeDocumento,
    conflitos: conflitosDaLinha(d.conflitos),
  }));

  /* Cada documento com a leitura dele — é entre elas que a coerência procura
     contradições, e passar só a deste não comparava nada com nada. */
  const paraCoerencia: DocumentoParaCoerencia[] = linhasVizinhas.map((d) => ({
    id: String(d.id),
    referencia: String(d.referencia ?? ""),
    tipo: String(d.tipo ?? ""),
    estado: String(d.estado ?? ""),
    leitura: identificadoresDaLeitura(leituraDaLinha(d.leitura)),
  }));

  // ── Os anúncios que partilham um identificador ───────────────────────────
  //
  // Três consultas com `eq` e não um `or` montado à mão: os valores são texto
  // que o vendedor escreveu, e o `eq` do supabase-js codifica-os. Só se
  // pergunta pelos campos que este anúncio tem preenchidos — perguntar por
  // vazio juntava num grupo todos os que deixaram o campo em branco.
  const anuncios = new Map<string, AnuncioParaSinais>();
  const juntar = (linhas: LinhaCrua[]) => {
    for (const a of linhas) {
      anuncios.set(String(a.id), {
        id: String(a.id),
        user_id: (a.user_id as string | null) ?? null,
        status: (a.status as string | null) ?? null,
        microchip: (a.microchip as string | null) ?? null,
        passaporte_equino: (a.passaporte_equino as string | null) ?? null,
        registro_apsl: (a.registro_apsl as string | null) ?? null,
      });
    }
  };

  if (entrada.anuncio) {
    juntar([entrada.anuncio]);
    for (const coluna of ["microchip", "passaporte_equino", "registro_apsl"]) {
      const valor = texto(entrada.anuncio[coluna]);
      if (!valor) continue;
      const { data } = await baseDeDados
        .from("cavalos_venda")
        .select(COLUNAS_PARA_COERENCIA)
        .eq(coluna, valor)
        .limit(TECTO_DE_VIZINHOS);
      juntar((data ?? []) as unknown as LinhaCrua[]);
    }
  }

  // ── A ascendência, para a coerência da árvore ────────────────────────────
  let ascendentes: AscendenteParaCoerencia[] = [];
  if (entrada.cavaloId) {
    const { data } = await baseDeDados
      .from("cavalos_venda_ascendentes")
      .select("cavalo_id, caminho, geracao, nome, registo")
      .eq("cavalo_id", entrada.cavaloId);
    ascendentes = ((data ?? []) as LinhaCrua[]).map((a) => ({
      cavalo_id: String(a.cavalo_id),
      caminho: String(a.caminho),
      geracao: Number(a.geracao ?? 0),
      nome: (a.nome as string | null) ?? null,
      registo: (a.registo as string | null) ?? null,
    }));
  }

  const cavalos: CavaloParaCoerencia[] = entrada.anuncio
    ? [
        {
          id: String(entrada.anuncio.id),
          data_nascimento: (entrada.anuncio.data_nascimento as string | null) ?? null,
          idade: (entrada.anuncio.idade as number | null) ?? null,
          sexo: (entrada.anuncio.sexo as string | null) ?? null,
          altura: (entrada.anuncio.altura as number | null) ?? null,
          nome: (entrada.anuncio.nome as string | null) ?? null,
          nome_registo: (entrada.anuncio.nome_registo as string | null) ?? null,
          registro_apsl: (entrada.anuncio.registro_apsl as string | null) ?? null,
          status: (entrada.anuncio.status as string | null) ?? null,
        },
      ]
    : [];

  return reunirVerificacao({
    forense: achados,
    coerencia: reunirCoerencia({ cavalos, ascendentes, documentos: paraCoerencia }),
    sinais: reunirSinais({ documentos, anuncios: [...anuncios.values()] }),
    conflitos,
    analise,
    ...(analisadoEm ? { analisadoEm } : {}),
  });
}
