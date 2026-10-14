/**
 * Reclamar um documento para revisão, e largá-lo.
 *
 * `POST`   `por_verificar` → `em_revisao`
 * `DELETE` `em_revisao`    → `por_verificar`
 *
 * É para isto que o estado `em_revisao` existe: para que dois administradores
 * não revejam o mesmo documento ao mesmo tempo e cheguem a duas decisões
 * diferentes sobre o mesmo Livro Azul.
 *
 * **Isto não promove nada.** Reclamar é dizer «estou a olhar»; não é uma
 * decisão, não escreve `verificado_por`, e um documento pode ficar reclamado
 * para sempre sem que isso mude o que o público vê — só `verificado` conta, e
 * `verificado` só se põe com um clique numa pessoa.
 *
 * O largar existe porque a alternativa é uma fila que se entope sozinha: quem
 * abre a ficha e fecha o separador deixaria o documento marcado como em revisão
 * até alguém ir à base. A ficha larga-o ao sair, e há um botão para o fazer à
 * mão.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { TABELA, baseDeDados, idValido, respostaIdInvalido, sessaoDeAdmin } from "../../comum";

// Literal por exigência do Next — ver a nota em `../../route.ts`.
export const dynamic = "force-dynamic";

export async function POST(_pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return mover(params, "por_verificar", "em_revisao");
}

export async function DELETE(
  _pedido: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return mover(params, "em_revisao", "por_verificar");
}

async function mover(
  params: Promise<{ id: string }>,
  de: "por_verificar" | "em_revisao",
  para: "por_verificar" | "em_revisao"
) {
  const sessao = await sessaoDeAdmin();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await params;
  if (!idValido(id)) return respostaIdInvalido();

  try {
    // O estado de partida entra no `where`, não numa leitura anterior seguida
    // de uma escrita. Ler-e-depois-escrever é a corrida que este estado existe
    // para evitar: entre a leitura e a escrita cabe outro administrador
    // inteiro. Assim, quem chega em segundo actualiza zero linhas e sabe-o.
    const { data, error } = await baseDeDados
      .from(TABELA)
      .update({ estado: para })
      .eq("id", id)
      .eq("estado", de)
      .select("id, estado");

    if (error) {
      logger.error("[admin/documentos/reclamar] falha a mover o estado", error);
      return NextResponse.json({ erro: "Erro ao actualizar o documento" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      // Nem sempre é uma corrida: pode ser um documento já decidido, ou um id
      // que não existe. Distingue-se com uma leitura, e só agora — no caminho
      // que já falhou — é que ela custa alguma coisa.
      const { data: actual } = await baseDeDados
        .from(TABELA)
        .select("estado")
        .eq("id", id)
        .maybeSingle();

      if (!actual) {
        return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });
      }

      const estado = (actual as { estado: string }).estado;
      return NextResponse.json(
        {
          erro:
            estado === "em_revisao"
              ? "Já está em revisão por outra pessoa."
              : `Já não está por rever: está ${estado}.`,
          estado,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ estado: para });
  } catch (e) {
    logger.error("[admin/documentos/reclamar] erro inesperado", e);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
