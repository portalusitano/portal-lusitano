/**
 * POST /api/meus-anuncios/documentos/[id]/substituir — enviar outro ficheiro
 * para um documento que foi recusado.
 *
 * `FormData` com um só campo, `ficheiro`. O tipo do documento não vem no
 * pedido: é o do documento que se está a substituir. Quem envia não escolhe o
 * que aquilo passa a ser.
 *
 * ## O que autoriza
 *
 * A sessão do vendedor, e a ligação `documento → anúncio → user_id`. **Não** a
 * `referencia`: essa vem do browser, quem quiser manda a que lhe apetecer, e a
 * rota que a recebe no formulário de venda já o tem escrito. Um documento ainda
 * sem `cavalo_id` — enviado antes de o pagamento existir — não tem dono
 * conhecido e não se substitui por aqui.
 *
 * A origem confere-se porque um `POST` de `multipart/form-data` é um pedido
 * simples: um formulário noutro sítio consegue enviá-lo com o cookie desta
 * sessão sem que o browser peça licença antes. As rotas irmãs que enviam JSON
 * estão cobertas pelo pedido prévio que o browser faz por causa do
 * `Content-Type`; esta não está.
 *
 * ## O que escreve, e o que nunca escreve
 *
 * Escreve **uma linha nova**, em `por_verificar`. A linha recusada fica onde
 * está, com o motivo e com a assinatura de quem a recusou: uma decisão de
 * revisão não se apaga porque o vendedor tentou outra vez, e sem ela não há
 * como discutir mais tarde o que foi decidido e porquê.
 *
 * A linha nova leva a **mesma `referencia`** da recusada. É o que diz ao painel
 * de revisão que isto é a mesma submissão e não um documento a aparecer em dois
 * sítios — ver `mesmaSubmissao` em `app/api/admin/documentos/comum.ts`. Um
 * alarme de duplicado disparado por um reenvio legítimo gasta o alarme, e o
 * alarme é o sinal de fraude mais forte que aquele painel tem.
 *
 * Nunca escreve `verificado`, e não há daqui caminho nenhum até lá. Quem guarda
 * é `guardarDocumento`, que só sabe escrever `por_verificar`; o único estado
 * que esta rota toca depois disso é o `cavalo_id` da linha que acabou de nascer.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { strictLimiter } from "@/lib/rate-limit";
import { anfitrioesPermitidos, origemPermitida } from "@/lib/origem-permitida";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { documentoDoVendedor, NOME_DO_TIPO } from "@/lib/documentos-do-vendedor";
import {
  MAX_BYTES_DOCUMENTO,
  TIPOS_DE_DOCUMENTO,
  type TipoDeDocumento,
} from "@/lib/documentos/contrato";
import { avaliarTipo, FORMATOS_ACEITES } from "@/lib/documentos/tipo-real";
import {
  contarDocumentosDaReferencia,
  guardarDocumento,
  MAX_DOCUMENTOS_POR_REFERENCIA,
} from "@/lib/documentos/guardar";

// `createHash` e `randomUUID` do Node vivem em `lib/documentos/guardar`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Calculado uma vez ao carregar o módulo: a lista não muda enquanto o processo
   viver. Igual ao da rota que recebe os documentos do formulário. */
const ANFITRIOES_PERMITIDOS = anfitrioesPermitidos([
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
  "https://portal-lusitano.pt",
  "http://localhost:3000",
]);

/**
 * Cinco substituições por minuto e por sessão.
 *
 * O `strictLimiter.check(n, …)` recusa quando a contagem **chega** a `n`, por
 * isso o número escrito é seis e as passagens são cinco. A chave é o
 * identificador da conta e não o IP: quem está aqui já provou quem é, e duas
 * pessoas atrás do mesmo IP — uma coudelaria, um escritório — não têm de
 * partilhar orçamento. O prefixo é próprio porque o `strictLimiter` é um só
 * cache partilhado por várias rotas.
 */
const PEDIDOS_POR_MINUTO = 6;
const chaveDoLimite = (userId: string) => `documentos-vendedor:${userId}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Escrito a partir do contrato: uma mensagem que diga «10 MB» enquanto o limite
   é outro é uma mensagem que mente a quem está a tentar enviar. */
const TECTO_POR_EXTENSO = `${Math.round(MAX_BYTES_DOCUMENTO / (1024 * 1024))} MB`;

const erro = (mensagem: string, estado: number) =>
  NextResponse.json({ error: mensagem }, { status: estado });

export async function POST(pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // A comparação é por anfitrião e não por prefixo de texto — ver
  // `lib/origem-permitida.ts`, que explica porque um `startsWith` deixava
  // passar `https://portal-lusitano.pt.exemplo.com`.
  if (!origemPermitida(pedido.headers.get("origin"), ANFITRIOES_PERMITIDOS)) {
    return erro("Origem não autorizada.", 403);
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) return erro("Não autorizado", 401);

    try {
      await strictLimiter.check(PEDIDOS_POR_MINUTO, chaveDoLimite(user.id));
    } catch {
      return erro("Demasiados envios seguidos. Tente novamente dentro de um minuto.", 429);
    }

    const { id } = await params;
    if (!UUID.test(id)) return erro("Identificador inválido", 400);

    const dono = await documentoDoVendedor(user, id);
    // 404 tanto para o que não existe como para o que é de outra pessoa: a
    // diferença entre os dois responde a «este identificador acertou?».
    if (!dono) return erro("Documento não encontrado", 404);

    const estadoActual = dono.documento.estado;
    if (estadoActual !== "recusado") {
      // Substituir por baixo de quem está a rever é tirar-lhe o ficheiro das
      // mãos a meio da decisão; substituir um verificado é desfazer o carimbo
      // de uma pessoa sem que ela saiba. Só o recusado é que pede outro.
      return erro("Só um documento recusado pode ser substituído.", 409);
    }

    const tipo = dono.documento.tipo;
    if (typeof tipo !== "string" || !(TIPOS_DE_DOCUMENTO as readonly string[]).includes(tipo)) {
      logger.error("[meus-anuncios/documentos/substituir] tipo fora do contrato", { id, tipo });
      return erro("Documento com tipo inesperado.", 500);
    }
    const referencia = dono.documento.referencia;
    if (typeof referencia !== "string" || referencia === "") {
      logger.error("[meus-anuncios/documentos/substituir] linha sem referência", { id });
      return erro("Documento sem referência.", 500);
    }

    const formulario = await pedido.formData();
    const entradas = formulario.getAll("ficheiro").filter((v): v is File => v instanceof File);
    if (entradas.length === 0) return erro("Nenhum ficheiro enviado.", 400);
    if (entradas.length > 1) return erro("Envie um só ficheiro.", 400);

    const ficheiro = entradas[0]!;
    if (ficheiro.size === 0) return erro(`O ficheiro "${ficheiro.name}" está vazio.`, 400);
    if (ficheiro.size > MAX_BYTES_DOCUMENTO) {
      return erro(
        `O ficheiro "${ficheiro.name}" tem mais de ${TECTO_POR_EXTENSO}. Envie uma digitalização mais leve.`,
        413
      );
    }

    // `null` quer dizer que a contagem falhou, e nesse caso deixa-se passar: um
    // vendedor legítimo travado por uma consulta que não respondeu perde a
    // hipótese de corrigir o que lhe recusaram, e o limite por sessão está de pé.
    const jaTem = await contarDocumentosDaReferencia(referencia);
    if (jaTem !== null && jaTem + 1 > MAX_DOCUMENTOS_POR_REFERENCIA) {
      return erro("Já foram enviados documentos a mais para este anúncio.", 400);
    }

    const conteudo = new Uint8Array(await ficheiro.arrayBuffer());

    // Quem decide o tipo do ficheiro são os bytes. O `ficheiro.type` só entra
    // para se registar a discordância — ver `lib/documentos/tipo-real.ts`.
    const veredicto = avaliarTipo(conteudo, ficheiro.type);
    if (!veredicto.real) {
      // A mensagem diz o que se aceita. «Tipo inválido» obriga quem está do
      // outro lado a adivinhar, e quem está do outro lado acabou de levar uma
      // recusa e está a tentar corrigi-la.
      return erro(
        `O ficheiro "${ficheiro.name}" não é um dos formatos aceites. Envie ${FORMATOS_ACEITES}.`,
        400
      );
    }
    if (veredicto.discordancia) {
      logger.warn("[meus-anuncios/documentos/substituir] tipo declarado não bate com os bytes", {
        substitui: id,
        declarado: veredicto.declarado,
        real: veredicto.real,
      });
    }

    const resultado = await guardarDocumento({
      referencia,
      tipo: tipo as TipoDeDocumento,
      nomeOriginal: ficheiro.name,
      mime: veredicto.real,
      conteudo,
    });

    if (!resultado.ok) {
      return erro(
        resultado.falha === "armazenamento"
          ? "Não foi possível guardar o documento. Tente novamente."
          : "O documento foi recebido mas não ficou registado. Tente novamente.",
        500
      );
    }

    // `guardarDocumento` deixa o `cavalo_id` nulo — foi escrito para o caminho
    // em que o anúncio ainda não existe. Aqui existe, e é conhecido, e é ele
    // que faz o documento aparecer na conta de quem o enviou.
    const { error: erroDeLigacao } = await supabaseAdmin
      .from("documentos_cavalo")
      .update({ cavalo_id: dono.anuncioId })
      .eq("id", resultado.documento.id);

    if (erroDeLigacao) {
      // O ficheiro está guardado e a linha existe: nada se perdeu, e o painel
      // de revisão dá com ela pela referência. O que se perdeu foi a ligação ao
      // anúncio, e sem ela o vendedor não a vê na conta — dizer «recebido» aqui
      // era esconder metade do que aconteceu.
      logger.error("[meus-anuncios/documentos/substituir] documento guardado sem ligação", {
        documento: resultado.documento.id,
        anuncio: dono.anuncioId,
        erro: erroDeLigacao.message,
      });
      return erro(
        "O documento foi recebido mas não ficou ligado ao anúncio. A equipa foi avisada.",
        500
      );
    }

    logger.info("[meus-anuncios/documentos] documento substituído", {
      substitui: id,
      novo: resultado.documento.id,
      anuncio: dono.anuncioId,
      tipo,
    });

    return NextResponse.json({
      documento: {
        id: resultado.documento.id,
        anuncioId: dono.anuncioId,
        tipo,
        nomeDoTipo: NOME_DO_TIPO[tipo as TipoDeDocumento],
        // O que se afirma é o que aconteceu: chegou e está guardado. Não «em
        // análise», que descreve trabalho que ninguém começou.
        estado: resultado.documento.estado,
        nomeOriginal: resultado.documento.nome_original,
        mime: resultado.documento.mime,
        bytes: resultado.documento.bytes,
      },
    });
  } catch (e) {
    logger.error("[meus-anuncios/documentos/substituir] erro inesperado", e);
    return erro("Erro interno", 500);
  }
}
