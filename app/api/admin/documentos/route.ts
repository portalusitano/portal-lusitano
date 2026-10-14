/**
 * GET /api/admin/documentos — a fila de quem revê.
 *
 * Por ordem de chegada, com uma excepção escrita: **quem tem conflitos vai à
 * frente**. Um conflito é uma contradição entre o que o documento diz e o que o
 * vendedor escreveu; não recusa nada por si, mas é o caso que mais depressa
 * merece olhos.
 *
 * A ordenação faz-se aqui e não em SQL de propósito. Ordenar por «tem
 * conflitos» numa coluna `jsonb` que pode ser `null` ou `[]` obriga a uma
 * expressão que o PostgREST não exprime sem uma vista ou uma função na base —
 * e a base não é minha para lhe acrescentar coisas. A fila tem centenas de
 * linhas, não milhões: ordenar em memória custa menos do que o pedido que a
 * trouxe. O que se paga por essa escolha está declarado no `truncada`.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ESTADOS_DE_DOCUMENTO, type EstadoDeDocumento } from "@/lib/documentos/contrato";
import type { LinhaDaFila, RespostaDaFila } from "@/app/admin/documentos/tipos";
import {
  TABELA,
  baseDeDados,
  conflitosDaLinha,
  estadoValido,
  mesmaSubmissao,
  sessaoDeAdmin,
} from "./comum";

// Um literal, e não uma constante partilhada. O Next lê este valor ao compilar,
// sem executar o módulo, e uma referência a um símbolo importado não lhe diz
// nada — recusa o build com «needs to be a static string». Nem o `tsc` nem o
// `eslint` dão por isso: só o `next build`.
export const dynamic = "force-dynamic";

/**
 * O tecto da fila.
 *
 * Um número, e não «todos», porque a página desenha uma linha por documento e
 * ninguém revê mil documentos numa sessão. Passado o tecto, o painel diz que a
 * fila está cortada em vez de fingir que acabou.
 */
const TECTO = 200;

export async function GET(pedido: NextRequest) {
  const sessao = await sessaoDeAdmin();
  if (!sessao.ok) return sessao.resposta;

  const pedidoEstado = new URL(pedido.url).searchParams.get("estado");
  const filtro: EstadoDeDocumento | null = estadoValido(pedidoEstado) ? pedidoEstado : null;
  // Um `estado` que não seja um dos quatro nem `todos` é um engano de quem
  // chamou; mostra-se a fila por omissão em vez de devolver um erro, porque a
  // fila por verificar é sempre a resposta útil.
  const todos = pedidoEstado === "todos";
  const estadoEfectivo = filtro ?? (todos ? null : "por_verificar");

  try {
    let consulta = baseDeDados
      .from(TABELA)
      .select(
        "id, tipo, estado, criado_em, cavalo_id, referencia, nome_original, mime, bytes, sha256, conflitos, verificado_por, verificado_em, motivo_recusa"
      )
      .order("criado_em", { ascending: true })
      .limit(TECTO + 1);

    if (estadoEfectivo) consulta = consulta.eq("estado", estadoEfectivo);

    const { data, error } = await consulta;
    if (error) {
      logger.error("[admin/documentos] falha a ler a fila", error);
      return NextResponse.json({ erro: "Erro ao carregar a fila" }, { status: 500 });
    }

    const cruas = (data ?? []) as Record<string, unknown>[];
    const truncada = cruas.length > TECTO;
    const linhas = truncada ? cruas.slice(0, TECTO) : cruas;

    // ── Os duplicados ───────────────────────────────────────────────────────
    //
    // O mesmo ficheiro, byte a byte, anexado a duas submissões diferentes é o
    // sinal de fraude mais forte que este sistema tem: um Livro Azul a servir
    // dois anúncios. Uma consulta só, pelos SHA da página, e o cruzamento
    // faz-se aqui — 29 ou 200 linhas contra as suas vizinhas é uma volta
    // curta, e uma consulta por linha seriam 200 idas à base para desenhar uma
    // lista.
    const shas = [...new Set(linhas.map((l) => String(l.sha256 ?? "")).filter(Boolean))];
    const vizinhosPorSha = new Map<string, Record<string, unknown>[]>();
    if (shas.length > 0) {
      const { data: vizinhos, error: erroVizinhos } = await baseDeDados
        .from(TABELA)
        .select("id, sha256, cavalo_id, referencia")
        .in("sha256", shas);
      if (erroVizinhos) {
        // A fila vale sem o aviso; o aviso não vale sem a fila. Regista-se e
        // segue-se — mas o campo fica a zero, e um zero aqui quer dizer «não
        // se sabe», não «não há». É por isso que o aviso a sério vive na
        // ficha, onde a consulta é uma só e não se degrada em silêncio.
        logger.error("[admin/documentos] falha a procurar duplicados", erroVizinhos);
      } else {
        for (const v of (vizinhos ?? []) as Record<string, unknown>[]) {
          const sha = String(v.sha256 ?? "");
          const lista = vizinhosPorSha.get(sha);
          if (lista) lista.push(v);
          else vizinhosPorSha.set(sha, [v]);
        }
      }
    }

    const documentos: LinhaDaFila[] = linhas.map((l) => {
      const sha = String(l.sha256 ?? "");
      const eu = {
        cavalo_id: (l.cavalo_id as string | null) ?? null,
        referencia: String(l.referencia ?? ""),
      };
      const outras = new Set<string>();
      for (const v of vizinhosPorSha.get(sha) ?? []) {
        if (v.id === l.id) continue;
        const outro = {
          cavalo_id: (v.cavalo_id as string | null) ?? null,
          referencia: String(v.referencia ?? ""),
        };
        if (mesmaSubmissao(eu, outro)) continue;
        outras.add(outro.cavalo_id ?? outro.referencia);
      }

      return {
        id: String(l.id),
        tipo: l.tipo as LinhaDaFila["tipo"],
        estado: l.estado as EstadoDeDocumento,
        criadoEm: String(l.criado_em),
        cavaloId: (l.cavalo_id as string | null) ?? null,
        cavaloNome: null,
        referencia: eu.referencia,
        nomeOriginal: String(l.nome_original ?? ""),
        mime: l.mime as LinhaDaFila["mime"],
        bytes: Number(l.bytes ?? 0),
        conflitos: conflitosDaLinha(l.conflitos),
        duplicadoNoutras: outras.size,
        verificadoPor: (l.verificado_por as string | null) ?? null,
        verificadoEm: (l.verificado_em as string | null) ?? null,
        motivoRecusa: (l.motivo_recusa as string | null) ?? null,
      };
    });

    // ── O nome do anúncio ───────────────────────────────────────────────────
    //
    // Vai numa consulta à parte, e não num `select` encaixado, pela mesma razão
    // que a caixa de entrada e as denúncias o fazem: não se depende do
    // encaixe de relações do PostgREST, que precisa de uma chave estrangeira
    // declarada e cai em silêncio quando o esquema muda debaixo dele.
    const idsDeCavalo = [...new Set(documentos.map((d) => d.cavaloId).filter(Boolean))] as string[];
    if (idsDeCavalo.length > 0) {
      const { data: cavalos } = await baseDeDados
        .from("cavalos_venda")
        .select("id, nome")
        .in("id", idsDeCavalo);
      const nomes = new Map(
        ((cavalos ?? []) as Record<string, unknown>[]).map((c) => [
          String(c.id),
          (c.nome as string | null) ?? null,
        ])
      );
      for (const d of documentos) {
        if (d.cavaloId) d.cavaloNome = nomes.get(d.cavaloId) ?? null;
      }
    }

    // Conflitos primeiro, duplicados a seguir, e dentro de cada grupo a ordem
    // de chegada que a base já deu. O `sort` do JavaScript é estável desde o
    // ES2019, e é dessa estabilidade que depende a ordem de chegada
    // sobreviver a esta passagem.
    documentos.sort((a, b) => prioridade(b) - prioridade(a));

    const contagens = await contarPorEstado();

    const resposta: RespostaDaFila = { documentos, contagens, truncada };
    return NextResponse.json(resposta);
  } catch (e) {
    logger.error("[admin/documentos] erro inesperado", e);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

/** Dois degraus, e não uma pontuação: quem revê não precisa de mais do que isto. */
function prioridade(d: LinhaDaFila): number {
  return (d.duplicadoNoutras > 0 ? 2 : 0) + (d.conflitos.length > 0 ? 1 : 0);
}

/**
 * Quantos há em cada estado.
 *
 * Quatro contagens com `head: true` — o PostgREST devolve o total no cabeçalho
 * e nem uma linha no corpo. É mais barato do que trazer a tabela para contar em
 * memória, e é o número que faz os filtros dizerem o tamanho de cada fila em
 * vez de serem quatro botões mudos.
 */
async function contarPorEstado(): Promise<Record<EstadoDeDocumento, number>> {
  const contagens = {
    por_verificar: 0,
    em_revisao: 0,
    verificado: 0,
    recusado: 0,
  } as Record<EstadoDeDocumento, number>;

  await Promise.all(
    ESTADOS_DE_DOCUMENTO.map(async (estado) => {
      const { count, error } = await baseDeDados
        .from(TABELA)
        .select("id", { count: "exact", head: true })
        .eq("estado", estado);
      if (!error && typeof count === "number") contagens[estado] = count;
    })
  );

  return contagens;
}
