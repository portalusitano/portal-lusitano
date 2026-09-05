/**
 * GET /api/meus-anuncios/documentos/[id]/ficheiro — o documento, ao próprio.
 *
 * ## Porque é um proxy, e porque é o mesmo proxy do painel de revisão
 *
 * Um documento é dado pessoal: o passaporte equino traz o nome e a morada do
 * proprietário. Que o dono o possa reler não muda nada disso — muda quem tem
 * direito a vê-lo, não o cuidado com que se serve.
 *
 * Por isso este caminho é, ponto por ponto, o de
 * `app/api/admin/documentos/[id]/ficheiro/route.ts`, e pela mesma razão:
 *
 * - **Nunca `getPublicUrl`.** O balde não tem leitura pública, e um endereço
 *   público sobre ele seria um endereço adivinhável para um documento de
 *   identificação.
 * - **Nunca um URL assinado.** Um URL assinado é uma chave: enquanto durar abre
 *   o ficheiro para quem o tiver, sem cookie e sem sessão, e viaja — histórico,
 *   `Referer`, um chat. Aqui o browser nunca vê um endereço do balde; vê este,
 *   do nosso domínio, que **volta a exigir a sessão a cada pedido**, incluindo
 *   os que o visualizador de PDF faz sozinho.
 *
 * A diferença entre as duas rotas é só uma, e é a que interessa: lá a sessão
 * que abre é a de quem administra, aqui é a de quem enviou o ficheiro. Quem
 * decide isso é `documentoDoVendedor`, que exige que o documento esteja ligado
 * a um anúncio **desta** sessão. A `referencia` não entra na conta.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { documentoDoVendedor } from "@/lib/documentos-do-vendedor";
import {
  BALDE_DOCUMENTOS,
  MIMES_DE_DOCUMENTO,
  type MimeDeDocumento,
} from "@/lib/documentos/contrato";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * O nome com que o browser grava.
 *
 * O nome original é do vendedor e pode trazer lá dentro o que lhe apetecer —
 * aspas, uma quebra de linha, um caminho. Uma quebra de linha num cabeçalho é
 * uma injecção de cabeçalhos, e o facto de o nome ser dele não o torna seguro:
 * o ficheiro pode ter sido montado à mão. Só passam letras, algarismos, ponto,
 * hífen e sublinhado.
 */
function nomeSeguro(original: string, extensao: string): string {
  const limpo = original
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return limpo || `documento.${extensao}`;
}

export async function GET(_pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    // Sem isto, um `id` com aspas ou vírgulas entra nos filtros do PostgREST,
    // que os lê como sintaxe. Recusar cedo o que não tem a forma certa sai mais
    // barato do que confiar em escapes.
    if (!UUID.test(id)) {
      return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
    }

    const dono = await documentoDoVendedor(user, id);
    // 404 tanto para o que não existe como para o que é de outra pessoa. A
    // diferença entre os dois é a resposta a «este identificador acertou?».
    if (!dono) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    const caminho = dono.documento.caminho;
    const nomeOriginal = dono.documento.nome_original;
    if (typeof caminho !== "string" || caminho === "") {
      logger.error("[meus-anuncios/documentos/ficheiro] linha sem caminho", { id });
      return NextResponse.json({ error: "Ficheiro indisponível" }, { status: 500 });
    }

    // O `Content-Type` sai da coluna `mime`, que foi lida nos bytes do ficheiro
    // quando ele entrou. Ainda assim se confere contra a lista do contrato: se
    // um dia alguém escrever outra coisa naquela coluna, o que sai daqui não
    // passa a ser servido com um tipo à escolha de quem lá escreveu.
    const mime = (MIMES_DE_DOCUMENTO as readonly string[]).includes(dono.documento.mime as string)
      ? (dono.documento.mime as MimeDeDocumento)
      : null;
    if (!mime) {
      logger.error("[meus-anuncios/documentos/ficheiro] mime fora do contrato", {
        id,
        mime: dono.documento.mime,
      });
      return NextResponse.json({ error: "Documento com formato inesperado" }, { status: 500 });
    }

    const { data: ficheiro, error: erroBalde } = await supabaseAdmin.storage
      .from(BALDE_DOCUMENTOS)
      .download(caminho);

    if (erroBalde || !ficheiro) {
      logger.error("[meus-anuncios/documentos/ficheiro] falha a descarregar do balde", erroBalde);
      return NextResponse.json({ error: "Ficheiro indisponível" }, { status: 502 });
    }

    const bytes = await ficheiro.arrayBuffer();
    const extensao = mime.split("/")[1] ?? "bin";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${nomeSeguro(
          typeof nomeOriginal === "string" ? nomeOriginal : "",
          extensao
        )}"`,
        // Sem isto, um browser que adivinhe o tipo pode tratar o ficheiro como
        // HTML e executá-lo no nosso domínio — com a sessão do vendedor aberta.
        "X-Content-Type-Options": "nosniff",
        // Não fica em disco nem numa cache partilhada. Um documento privado num
        // proxy pelo caminho é o mesmo problema outra vez.
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        // Sem isto este endereço viaja no `Referer` de tudo o que a página
        // seguinte carregar.
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    logger.error("[meus-anuncios/documentos/ficheiro] erro inesperado", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
