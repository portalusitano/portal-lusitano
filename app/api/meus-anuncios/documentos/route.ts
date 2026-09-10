/**
 * GET /api/meus-anuncios/documentos — o estado dos documentos de quem os enviou.
 *
 * Devolve os anúncios da sessão, cada um com os documentos que lhe estão
 * ligados e o ponto em que cada um está. Nada mais: nem o caminho no balde, nem
 * a leitura automática, nem o e-mail de quem revê — ver
 * `lib/documentos-do-vendedor.ts`, onde essa escolha está escrita.
 *
 * **Não escreve nada.** Em especial, não há aqui — nem pode vir a haver — um
 * caminho que ponha um documento em `verificado`. Esse estado escreve-se num
 * sítio só, com o clique de quem revê.
 *
 * Um anúncio sem documentos nenhuns vem na mesma, com a lista vazia. É
 * informação: um vendedor que julgue ter anexado o Livro Azul e não vê nada
 * fica a saber que não chegou.
 */

import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { anunciosComDocumentos } from "@/lib/documentos-do-vendedor";
import { logger } from "@/lib/logger";

// Documentos privados de uma sessão. Nada disto se reaproveita entre pedidos.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const anuncios = await anunciosComDocumentos(user);
    if (anuncios === null) {
      return NextResponse.json({ error: "Erro ao carregar os documentos" }, { status: 500 });
    }

    return NextResponse.json(
      { anuncios },
      {
        headers: {
          // O que sai daqui é privado e não pode ficar numa cache pelo
          // caminho — a mesma razão do proxy do ficheiro.
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (e) {
    logger.error("[meus-anuncios/documentos] erro inesperado", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
