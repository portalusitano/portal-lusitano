/**
 * GET /api/admin/documentos/[id] — a ficha de revisão.
 *
 * O trabalho de quem revê é uma comparação: o documento de um lado, o que o
 * vendedor escreveu do outro. Esta rota junta os dois lados e mais nada — não
 * decide, não pontua, não sugere.
 *
 * O que **não** vai na resposta: o `caminho` dentro do balde. O ficheiro lê-se
 * pela rota `/ficheiro`, que volta a pedir a sessão. Mandar o caminho para o
 * browser não abriria nada por si — o balde é privado —, mas é informação sobre
 * a arrumação do balde que não serve para nada deste lado.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { Conflito, EstadoDeDocumento } from "@/lib/documentos/contrato";
import type {
  CampoConfrontado,
  DuplicadoVizinho,
  FichaDeDocumento,
} from "@/app/admin/documentos/tipos";
import { ROTULO_DO_CAMPO } from "@/app/admin/documentos/tipos";
import {
  COLUNAS_DO_ANUNCIO,
  TABELA,
  baseDeDados,
  conflitosDaLinha,
  idValido,
  leituraDaLinha,
  mesmaSubmissao,
  recolherVerificacao,
  respostaIdInvalido,
  sessaoDeAdmin,
  valorDoAnuncio,
} from "../comum";

// Literal por exigência do Next — ver a nota em `../route.ts`.
export const dynamic = "force-dynamic";

/** A ordem por que os quatro campos se leem na ficha. */
const ORDEM_DOS_CAMPOS: ReadonlyArray<Conflito["campo"]> = [
  "nome",
  "numero_registo",
  "ueln",
  "microchip",
];

/**
 * O texto extraído é para procurar sem abrir o PDF, não para o substituir.
 *
 * Um passaporte digitalizado com camada de texto pode trazer páginas inteiras;
 * mandá-las todas para o browser enche a resposta com o que ninguém lê. Corta-se
 * — e diz-se que se cortou, no painel.
 */
const MAX_TEXTO = 4000;

export async function GET(_pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoDeAdmin();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await params;
  if (!idValido(id)) return respostaIdInvalido();

  try {
    const { data, error } = await baseDeDados.from(TABELA).select("*").eq("id", id).maybeSingle();

    if (error) {
      logger.error("[admin/documentos/id] falha a ler o documento", error);
      return NextResponse.json({ erro: "Erro ao carregar o documento" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });
    }

    const linha = data as Record<string, unknown>;
    const conflitos = conflitosDaLinha(linha.conflitos);
    const leitura = leituraDaLinha(linha.leitura);
    const cavaloId = (linha.cavalo_id as string | null) ?? null;
    const referencia = String(linha.referencia ?? "");

    // ── O anúncio, quando já existe ─────────────────────────────────────────
    //
    // Fica nulo enquanto o vendedor não pagar: o documento sobe primeiro e o
    // anúncio nasce quando o Stripe confirma. Nesse intervalo a coluna «o que o
    // vendedor escreveu» só pode dizer o que o registo do conflito guardou — e
    // a ficha diz isso por palavras, em vez de mostrar quatro traços que se
    // leem como «o vendedor não escreveu nada».
    let anuncio: Record<string, unknown> | undefined;
    if (cavaloId) {
      const { data: c } = await baseDeDados
        .from("cavalos_venda")
        .select(COLUNAS_DO_ANUNCIO)
        .eq("id", cavaloId)
        .maybeSingle();
      anuncio = (c as Record<string, unknown> | null) ?? undefined;
    }

    const porCampo = new Map(conflitos.map((c) => [c.campo, c]));
    const lidoDoDocumento: Record<Conflito["campo"], string | null> = {
      nome: leitura.nome,
      numero_registo: leitura.numeroRegisto,
      ueln: leitura.ueln,
      microchip: leitura.microchip,
    };

    const campos: CampoConfrontado[] = ORDEM_DOS_CAMPOS.map((campo) => {
      const conflito = porCampo.get(campo);
      const noAnuncio = valorDoAnuncio(anuncio, campo);
      const noFormulario = noAnuncio ?? (conflito?.noFormulario || null);
      return {
        campo,
        rotulo: ROTULO_DO_CAMPO[campo],
        noFormulario,
        origemDoFormulario: noAnuncio ? "anuncio" : conflito?.noFormulario ? "conflito" : "nenhuma",
        noDocumento: conflito?.noDocumento || lidoDoDocumento[campo],
        emConflito: Boolean(conflito),
      };
    });

    // ── O mesmo ficheiro noutra submissão ───────────────────────────────────
    //
    // Aqui a consulta é uma só e o resultado é uma lista com nomes, não um
    // algarismo: é nesta página que a pessoa decide, e é aqui que o aviso tem
    // de ser legível. Se falhar, falha alto — um aviso de fraude que se
    // degrada em silêncio é pior do que não haver aviso, porque a página
    // continua a parecer completa.
    const sha = String(linha.sha256 ?? "");
    const duplicados: DuplicadoVizinho[] = [];
    if (sha) {
      const { data: vizinhos, error: erroVizinhos } = await baseDeDados
        .from(TABELA)
        .select("id, tipo, estado, criado_em, cavalo_id, referencia")
        .eq("sha256", sha)
        .neq("id", id);
      if (erroVizinhos) {
        logger.error("[admin/documentos/id] falha a procurar duplicados", erroVizinhos);
        return NextResponse.json(
          { erro: "Não foi possível verificar duplicados. Não decida sem isso." },
          { status: 500 }
        );
      }
      const eu = { cavalo_id: cavaloId, referencia };
      for (const v of (vizinhos ?? []) as Record<string, unknown>[]) {
        const outro = {
          cavalo_id: (v.cavalo_id as string | null) ?? null,
          referencia: String(v.referencia ?? ""),
        };
        if (mesmaSubmissao(eu, outro)) continue;
        duplicados.push({
          id: String(v.id),
          tipo: v.tipo as DuplicadoVizinho["tipo"],
          estado: v.estado as EstadoDeDocumento,
          criadoEm: String(v.criado_em),
          cavaloId: outro.cavalo_id,
          cavaloNome: null,
          referencia: outro.referencia,
        });
      }

      const idsVizinhos = [
        ...new Set(duplicados.map((d) => d.cavaloId).filter(Boolean)),
      ] as string[];
      if (idsVizinhos.length > 0) {
        const { data: cavalos } = await baseDeDados
          .from("cavalos_venda")
          .select("id, nome")
          .in("id", idsVizinhos);
        const nomes = new Map(
          ((cavalos ?? []) as Record<string, unknown>[]).map((c) => [
            String(c.id),
            (c.nome as string | null) ?? null,
          ])
        );
        for (const d of duplicados) {
          if (d.cavaloId) d.cavaloNome = nomes.get(d.cavaloId) ?? null;
        }
      }
    }

    // ── O que os cinco motores sabem ────────────────────────────────────────
    //
    // Num sítio só. Se cada ecrã os chamasse à mão, o sexto ecrã ia chamar
    // quatro — e um achado que falta não se vê: a página continua a parecer
    // completa. Nada disto decide nada; é a matéria que quem revê lê antes de
    // decidir, e a decisão continua a ser um clique noutra rota.
    //
    // Se falhar, a ficha continua a abrir — a comparação entre o documento e o
    // que o vendedor escreveu é o trabalho, e não pode ficar refém de uma
    // consulta acessória. Mas **diz que falhou**: devolver uma lista vazia com
    // «por correr» seria afirmar uma coisa que não se sabe, e quem revê via um
    // painel calmo em vez de um painel avariado. O aviso de duplicado por SHA
    // continua a falhar alto, com 500, mais acima — esse é o sinal mais forte
    // que este sistema tem e não se degrada.
    let verificacao: FichaDeDocumento["verificacao"] = { notas: [], analise: "por_correr" };
    try {
      verificacao = await recolherVerificacao({
        documentoId: id,
        cavaloId,
        referencia,
        sha256: sha,
        linha,
        anuncio,
      });
    } catch (e) {
      logger.error("[admin/documentos/id] falha a reunir a verificação", e);
      verificacao = { notas: [], analise: "por_correr", recolhaFalhou: true };
    }

    const ficha: FichaDeDocumento = {
      id,
      tipo: linha.tipo as FichaDeDocumento["tipo"],
      estado: linha.estado as EstadoDeDocumento,
      criadoEm: String(linha.criado_em),
      referencia,
      cavaloId,
      cavaloNome: (anuncio?.nome as string | null) ?? null,
      cavaloSlug: (anuncio?.slug as string | null) ?? null,
      cavaloEstado: (anuncio?.status as string | null) ?? null,
      vendedorNome: (anuncio?.vendedor_nome as string | null) ?? null,
      vendedorEmail: (anuncio?.vendedor_email as string | null) ?? null,
      nomeOriginal: String(linha.nome_original ?? ""),
      mime: linha.mime as FichaDeDocumento["mime"],
      bytes: Number(linha.bytes ?? 0),
      sha256Curto: sha.slice(0, 12),
      origemDaLeitura: leitura.origem,
      textoLido: leitura.texto ? leitura.texto.slice(0, MAX_TEXTO) : null,
      campos,
      conflitos,
      duplicados,
      verificacao,
      motivoRecusa: (linha.motivo_recusa as string | null) ?? null,
      verificadoPor: (linha.verificado_por as string | null) ?? null,
      verificadoEm: (linha.verificado_em as string | null) ?? null,
    };

    return NextResponse.json({ documento: ficha });
  } catch (e) {
    logger.error("[admin/documentos/id] erro inesperado", e);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
