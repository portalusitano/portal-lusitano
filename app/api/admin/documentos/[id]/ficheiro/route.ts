/**
 * GET /api/admin/documentos/[id]/ficheiro — o documento.
 *
 * ## Porque é um proxy e não um URL assinado
 *
 * Os dois cumprem a regra que interessa — o balde é privado e continua privado.
 * A diferença está no que sai daqui.
 *
 * Um URL assinado é uma chave: enquanto durar, abre o ficheiro para quem o
 * tiver, sem cookie e sem sessão. E um URL viaja — fica no histórico do
 * browser, no `Referer` do que ele carregue, no que se cola num chat sem
 * pensar, e no ecrã de quem estiver a ver por cima do ombro. Um passaporte
 * equino traz o nome e a morada do proprietário: a diferença entre «privado» e
 * «privado durante cinco minutos» não é académica.
 *
 * Neste caminho o browser nunca chega a ver um endereço do balde. O que ele tem
 * é este endereço, do nosso domínio, que **volta a exigir a sessão a cada
 * pedido** — incluindo os que o visualizador de PDF faz sozinho. Revogar uma
 * sessão fecha o documento no instante seguinte; revogar um URL assinado não é
 * possível.
 *
 * O que se paga: os bytes passam pelo servidor. Com um tecto de 10 MB por
 * ficheiro e um punhado de administradores, é troco.
 *
 * Nunca `getPublicUrl`. Este balde não tem leitura pública, e um endereço
 * público sobre ele seria um endereço adivinhável para um documento de
 * identificação — que é a definição de fuga de dados pessoais, não um descuido
 * de arrumação.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  BALDE_DOCUMENTOS,
  MIMES_DE_DOCUMENTO,
  type MimeDeDocumento,
} from "@/lib/documentos/contrato";
import { TABELA, baseDeDados, idValido, respostaIdInvalido, sessaoDeAdmin } from "../../comum";

// Literal por exigência do Next — ver a nota em `../../route.ts`.
export const dynamic = "force-dynamic";

/**
 * O nome que o browser vê ao gravar.
 *
 * O nome original é do vendedor e pode trazer lá dentro o que lhe apetecer —
 * aspas, quebras de linha, um caminho. Um `Content-Disposition` é um cabeçalho,
 * e uma quebra de linha num cabeçalho é uma injecção de cabeçalhos. Só passam
 * letras, algarismos, ponto, hífen e sublinhado; o resto vira hífen.
 */
function nomeSeguro(original: string, extensaoDoMime: string): string {
  const limpo = original
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return limpo || `documento.${extensaoDoMime}`;
}

export async function GET(_pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoDeAdmin();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await params;
  if (!idValido(id)) return respostaIdInvalido();

  try {
    const { data, error } = await baseDeDados
      .from(TABELA)
      .select("caminho, mime, nome_original")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logger.error("[admin/documentos/ficheiro] falha a ler a linha", error);
      return NextResponse.json({ erro: "Erro ao carregar o documento" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });
    }

    const linha = data as { caminho: string; mime: string; nome_original: string };

    // O `Content-Type` sai da coluna `mime`, e essa foi lida nos bytes do
    // ficheiro quando ele entrou — nunca do que o cliente declarou. Ainda
    // assim confere-se contra a lista do contrato: se um dia alguém escrever
    // outra coisa naquela coluna, o que sai daqui não passa a ser servido com
    // um tipo à escolha de quem lá escreveu.
    const mime = (MIMES_DE_DOCUMENTO as readonly string[]).includes(linha.mime)
      ? (linha.mime as MimeDeDocumento)
      : null;
    if (!mime) {
      logger.error("[admin/documentos/ficheiro] mime fora do contrato", { id, mime: linha.mime });
      return NextResponse.json({ erro: "Documento com formato inesperado" }, { status: 500 });
    }

    const { data: ficheiro, error: erroBalde } = await baseDeDados.storage
      .from(BALDE_DOCUMENTOS)
      .download(linha.caminho);

    if (erroBalde || !ficheiro) {
      logger.error("[admin/documentos/ficheiro] falha a descarregar do balde", erroBalde);
      return NextResponse.json({ erro: "Ficheiro indisponível" }, { status: 502 });
    }

    const bytes = await ficheiro.arrayBuffer();
    const extensao = mime.split("/")[1] ?? "bin";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.byteLength),
        // `inline`: quem revê quer ver, não quer uma pasta de transferências
        // cheia de passaportes de outras pessoas.
        "Content-Disposition": `inline; filename="${nomeSeguro(linha.nome_original, extensao)}"`,
        // Sem isto, um browser que adivinhe o tipo pode tratar um ficheiro
        // como HTML e executá-lo no nosso domínio — o que aqui seria executá-lo
        // com a sessão de administração aberta.
        "X-Content-Type-Options": "nosniff",
        // Não fica em disco nem em cache partilhada. Um documento privado num
        // proxy pelo caminho é o mesmo problema outra vez.
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        // O `Referrer-Policy` fecha a última porta: sem ele, este endereço
        // viaja no `Referer` de tudo o que a página seguinte carregar.
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    logger.error("[admin/documentos/ficheiro] erro inesperado", e);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
