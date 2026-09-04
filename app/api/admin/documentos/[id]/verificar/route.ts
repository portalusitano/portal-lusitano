/**
 * POST /api/admin/documentos/[id]/verificar
 *
 * **É o único sítio de todo o sistema onde se escreve `verificado`.** Um
 * documento chega aqui porque uma pessoa autenticada carregou num botão com o
 * documento aberto à frente; nenhum script, nenhuma heurística e nenhum estado
 * por omissão passa por este caminho.
 *
 * A conta que a palavra tem de pagar é essa: `temDocumentacaoVerificada` diz ao
 * anúncio público que o Livro Azul está verificado, e o que sustenta essa
 * afirmação é o e-mail que fica em `verificado_por` e a hora em
 * `verificado_em`. Sem os dois a base recusa a linha — e recusa bem: um
 * «verificado» sem autor é indistinguível de um posto por engano.
 *
 * Não há corpo de pedido. Verificar não tem parâmetros: ou a pessoa viu o
 * documento e ele serve, ou não. Um campo de observações aqui seria uma
 * segunda ideia de decisão a competir com a primeira.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { TABELA, baseDeDados, idValido, respostaIdInvalido, sessaoDeAdmin } from "../../comum";

// Literal por exigência do Next — ver a nota em `../../route.ts`.
export const dynamic = "force-dynamic";

export async function POST(_pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoDeAdmin();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await params;
  if (!idValido(id)) return respostaIdInvalido();

  try {
    // Só de um estado não terminal, e a condição vai no `where`.
    //
    // Aceita-se `por_verificar` além de `em_revisao` de propósito: a reclamação
    // é uma cortesia entre administradores, não uma fechadura, e se ela falhar
    // por causa da rede quem tem o documento aberto não pode ficar impedido de
    // registar a decisão que já tomou. O que **não** se aceita é passar por
    // cima de um estado terminal — quem chegar depois de outro ter decidido
    // recebe 409 e vê qual foi a decisão, em vez de a apagar sem dar por isso.
    const { data, error } = await baseDeDados
      .from(TABELA)
      .update({
        estado: "verificado",
        verificado_por: sessao.email,
        verificado_em: new Date().toISOString(),
        // Uma recusa anterior que foi revista deixa de ter motivo. Deixar lá o
        // texto antigo faria a ficha dizer duas coisas ao mesmo tempo.
        motivo_recusa: null,
      })
      .eq("id", id)
      .in("estado", ["por_verificar", "em_revisao"])
      .select("id, estado, verificado_por, verificado_em");

    if (error) {
      logger.error("[admin/documentos/verificar] falha a verificar", error);
      return NextResponse.json({ erro: "Erro ao verificar o documento" }, { status: 500 });
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

    const linha = data[0] as { estado: string; verificado_por: string; verificado_em: string };
    logger.info("[admin/documentos] documento verificado", { id, por: sessao.email });

    return NextResponse.json({
      estado: linha.estado,
      verificadoPor: linha.verificado_por,
      verificadoEm: linha.verificado_em,
    });
  } catch (e) {
    logger.error("[admin/documentos/verificar] erro inesperado", e);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
