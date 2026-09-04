/**
 * POST /api/admin/documentos/[id]/recusar — corpo `{ motivo }`.
 *
 * Recusar exige um motivo escrito, e a exigência é verdadeira em três sítios
 * independentes: o botão do painel não se acende com o campo vazio, esta rota
 * recusa um motivo vazio com 400, e a base tem um `check` que rejeita a linha.
 * São três porque cada um cobre a falha do anterior — o botão não vale contra
 * quem chama a rota à mão, e a rota não vale contra quem escreva outra rota
 * amanhã.
 *
 * O motivo não é papelada: o vendedor é avisado e vai ler aquele texto para
 * saber o que reenviar. «Não serve» não é um motivo; é o fim de uma conversa
 * que ninguém pode continuar.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { TABELA, baseDeDados, idValido, respostaIdInvalido, sessaoDeAdmin } from "../../comum";

// Literal por exigência do Next — ver a nota em `../../route.ts`.
export const dynamic = "force-dynamic";

/**
 * O tecto do motivo. Generoso — quem revê pode ter de explicar que a página do
 * meio falta e que o microchip não bate certo — mas existe: o campo é `text` e
 * sem tecto entra lá um ficheiro inteiro colado por engano.
 */
const MAX_MOTIVO = 2000;

export async function POST(pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoDeAdmin();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await params;
  if (!idValido(id)) return respostaIdInvalido();

  let corpo: unknown;
  try {
    corpo = await pedido.json();
  } catch {
    return NextResponse.json({ erro: "Corpo do pedido inválido" }, { status: 400 });
  }

  const bruto = (corpo as { motivo?: unknown } | null)?.motivo;
  const motivo = typeof bruto === "string" ? bruto.trim() : "";

  // Espaços em branco não são um motivo. O `trim` acontece antes do teste de
  // propósito: um campo com três espaços passaria por um `if (motivo)` e
  // gravaria uma recusa que não explica nada a ninguém.
  if (motivo === "") {
    return NextResponse.json(
      { erro: "A recusa precisa de um motivo escrito. O vendedor vai lê-lo." },
      { status: 400 }
    );
  }
  if (motivo.length > MAX_MOTIVO) {
    return NextResponse.json(
      { erro: `O motivo não pode passar de ${MAX_MOTIVO} caracteres.` },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await baseDeDados
      .from(TABELA)
      .update({
        estado: "recusado",
        motivo_recusa: motivo,
        // Quem recusa também assina. A base só o exige para `verificado`, mas
        // uma recusa sem autor é igualmente impossível de discutir com o
        // vendedor que a recebeu.
        verificado_por: sessao.email,
        verificado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .in("estado", ["por_verificar", "em_revisao"])
      .select("id, estado, motivo_recusa");

    if (error) {
      logger.error("[admin/documentos/recusar] falha a recusar", error);
      return NextResponse.json({ erro: "Erro ao recusar o documento" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      const { data: actual } = await baseDeDados
        .from(TABELA)
        .select("estado, verificado_por")
        .eq("id", id)
        .maybeSingle();

      if (!actual) {
        return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });
      }

      const { estado, verificado_por } = actual as {
        estado: string;
        verificado_por: string | null;
      };
      return NextResponse.json(
        {
          erro: `Já foi decidido: está ${estado}${verificado_por ? ` (por ${verificado_por})` : ""}.`,
          estado,
        },
        { status: 409 }
      );
    }

    logger.info("[admin/documentos] documento recusado", { id, por: sessao.email });

    return NextResponse.json({ estado: "recusado", motivoRecusa: motivo });
  } catch (e) {
    logger.error("[admin/documentos/recusar] erro inesperado", e);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
