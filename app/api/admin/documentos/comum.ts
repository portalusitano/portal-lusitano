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

/** As colunas do anúncio que a ficha lê. Nada mais: é uma tabela larga. */
export const COLUNAS_DO_ANUNCIO =
  "id, nome, slug, status, nome_registo, registro_apsl, passaporte_equino, microchip, vendedor_nome, vendedor_email";

export function valorDoAnuncio(anuncio: LinhaCrua | undefined, campo: Conflito["campo"]) {
  if (!anuncio) return null;
  return texto(anuncio[COLUNA_DO_CAMPO[campo]]);
}
