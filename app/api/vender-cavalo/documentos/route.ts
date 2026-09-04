/**
 * Recebe os documentos de identificação de um cavalo posto à venda.
 *
 * ## Como se liga ao formulário
 *
 * O `app/vender-cavalo/page.tsx` guarda os ficheiros num `useState` e nunca os
 * envia. Esta rota é o destino que faltava; a costura é uma chamada, feita
 * **antes** de o formulário seguir para o Stripe, pela mesma razão que as
 * fotografias sobem antes:
 *
 * ```ts
 * const dados = new FormData();
 * dados.append("referencia", referencia); // crypto.randomUUID(), guardado no estado
 * if (livroAzul) dados.append("livro_azul", livroAzul);
 * if (passaporte) dados.append("passaporte", passaporte);
 * if (exameVet) dados.append("exame_vet", exameVet);
 *
 * const r = await fetch("/api/vender-cavalo/documentos", { method: "POST", body: dados });
 * const resposta = await r.json();
 * ```
 *
 * **O que espera:** um `FormData` com
 *
 * - `referencia` — um UUID gerado no browser, o mesmo em todos os pedidos da
 *   mesma submissão. É por ele que os documentos se ligam ao anúncio quando o
 *   Stripe confirmar o pagamento e o anúncio finalmente nascer. **Não é
 *   autorização de coisa nenhuma** (ver mais abaixo).
 * - um campo por cada documento anexado, com o nome do tipo — `livro_azul`,
 *   `passaporte`, `exame_vet`. Todos opcionais, mas pelo menos um; no máximo
 *   um ficheiro por campo.
 *
 * **O que devolve, com 200:**
 *
 * ```json
 * {
 *   "referencia": "…",
 *   "documentos": [
 *     { "id": "…", "tipo": "livro_azul", "estado": "por_verificar",
 *       "mime": "application/pdf", "bytes": 204800, "nomeOriginal": "livro azul.pdf" }
 *   ]
 * }
 * ```
 *
 * O `caminho` dentro do balde **não vai na resposta**. Não é segredo — o balde
 * é privado e o caminho não abre nada —, mas também não serve ao browser para
 * nada, e um caminho de armazenamento que chega ao cliente é um caminho que
 * acaba colado num registo de erros ou num relatório de bug.
 *
 * Em erro devolve `{ "error": "…" }` com 400, 403, 413, 429 ou 500. Se um
 * pedido com três ficheiros falhar no segundo, os que já entraram **ficam**, e
 * a resposta de 500 traz `guardados` com eles: são documentos válidos e apagar
 * um documento verdadeiro para deixar a resposta simétrica é perder dados por
 * arrumação.
 *
 * ## O que esta rota afirma, e o que não afirma
 *
 * Afirma que um ficheiro chegou, que os bytes dele começam por uma das quatro
 * assinaturas que se aceitam, e que ficou guardado com o SHA-256 dele ao lado.
 * **Não afirma mais nada.** Não sabe se aquilo é um Livro Azul, se pertence
 * àquele cavalo, ou se é verdadeiro. Por isso o único estado que escreve é
 * `por_verificar`, e por isso não há caminho nenhum daqui até `verificado`:
 * esse é o carimbo de uma pessoa que olhou, e um site de classificados que o
 * ponha sozinho está a emprestar credibilidade que não tem.
 *
 * O visto verde que o formulário mostrava ao anexar o ficheiro era exactamente
 * essa afirmação sem cobertura. Quando esta rota for ligada, o que o formulário
 * pode dizer com verdade é «recebido, por verificar».
 *
 * ## A referência não é uma chave
 *
 * Vem do cliente, e portanto quem quiser manda a que lhe apetecer. Serve para
 * arrumar — agrupar os documentos de uma submissão, apagá-los por prefixo —, e
 * mais nada. Nunca dá acesso a nada: não há aqui nenhum `GET` que devolva
 * documentos por referência, e não pode vir a haver sem uma sessão por trás.
 * A única coisa que se lhe exige é ser um UUID, e isso é higiene de caminho de
 * armazenamento, não uma verificação de identidade.
 *
 * ## O tecto de 10 MB e o que o pode calar
 *
 * O limite escrito é o `MAX_BYTES_DOCUMENTO` do contrato. Numa função
 * serverless da Vercel — e o `vercel.json` deste repositório diz que é aí que
 * o site corre — o corpo de um pedido tem um tecto da plataforma na ordem dos
 * 4,5 MB, abaixo do nosso. Um Livro Azul digitalizado a 300dpi passa esse
 * tecto com facilidade, e nesse caso **o pedido morre antes de chegar aqui**:
 * o browser recebe um 413 da plataforma e nenhuma mensagem nossa. Não foi
 * possível confirmar de dentro deste ambiente que tecto a conta tem hoje.
 * A saída, se isso acontecer, não é baixar o limite — é o ficheiro subir
 * directamente para o armazenamento com um URL de subida assinado, e esta rota
 * passar a receber só o caminho. Fica escrito e não fica feito: mudava o
 * contrato, e o contrato tem três agentes a construir contra ele.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { strictLimiter } from "@/lib/rate-limit";
import { anfitrioesPermitidos, origemPermitida } from "@/lib/origem-permitida";
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
  type DocumentoNovo,
} from "@/lib/documentos/guardar";

// `createHash` e `randomUUID` do Node vivem em `lib/documentos/guardar`; a
// runtime tem de ser a de Node e não a de edge por causa deles.
export const runtime = "nodejs";

/* Calculado uma vez ao carregar o módulo, e não a cada pedido: a lista não
   muda enquanto o processo viver. Igual ao da rota das fotografias. */
const ANFITRIOES_PERMITIDOS = anfitrioesPermitidos([
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
  "https://portal-lusitano.pt",
  "http://localhost:3000",
]);

/**
 * Cinco submissões de documentos por minuto e por IP.
 *
 * O `strictLimiter.check(n, …)` recusa quando a contagem **chega** a `n`, por
 * isso o número escrito é seis e as passagens são cinco. Cada uma pode trazer
 * três ficheiros de dez megabytes, o que é generoso para quem está a preencher
 * um formulário e apertado para quem está a despejar.
 */
const PEDIDOS_POR_MINUTO = 6;

/**
 * O IP entra no contador com um prefixo próprio.
 *
 * O `strictLimiter` é um só cache partilhado por todas as rotas que o importam:
 * com o IP cru como chave, subir dez fotografias gastava o orçamento de subir
 * os documentos, e o vendedor via um 429 no passo seguinte sem ter feito nada
 * de mais. São dois orçamentos diferentes porque são dois trabalhos diferentes.
 */
const chaveDoLimite = (ip: string) => `documentos:${ip}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Escrito a partir do contrato e não à mão: uma mensagem que diga «10 MB»
   enquanto o limite é outro é uma mensagem que mente ao vendedor. */
const TECTO_POR_EXTENSO = `${Math.round(MAX_BYTES_DOCUMENTO / (1024 * 1024))} MB`;

const erro = (mensagem: string, estado: number) =>
  NextResponse.json({ error: mensagem }, { status: estado });

/** O que sai na resposta. Repare-se em quem não está cá: o `caminho`. */
function paraOCliente(documento: DocumentoNovo) {
  return {
    id: documento.id,
    tipo: documento.tipo,
    estado: documento.estado,
    mime: documento.mime,
    bytes: documento.bytes,
    nomeOriginal: documento.nome_original,
  };
}

export async function POST(req: NextRequest) {
  // A comparação é por anfitrião e não por prefixo de texto — ver
  // `lib/origem-permitida.ts`, que explica porque um `startsWith` deixava
  // passar `https://portal-lusitano.pt.exemplo.com`.
  const origin = req.headers.get("origin");
  if (!origemPermitida(origin, ANFITRIOES_PERMITIDOS)) {
    return erro("Origem não autorizada.", 403);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    await strictLimiter.check(PEDIDOS_POR_MINUTO, chaveDoLimite(ip));
  } catch {
    return erro("Demasiados envios de documentos. Tente novamente dentro de um minuto.", 429);
  }

  try {
    const formulario = await req.formData();

    const referencia = formulario.get("referencia");
    if (typeof referencia !== "string" || !UUID.test(referencia)) {
      return erro("Referência em falta ou mal formada.", 400);
    }

    // ------------------------------------------------------------------
    // Recolher os ficheiros, um por tipo
    // ------------------------------------------------------------------
    const anexados: Array<{ tipo: TipoDeDocumento; ficheiro: File }> = [];

    for (const tipo of TIPOS_DE_DOCUMENTO) {
      const entradas = formulario.getAll(tipo).filter((v): v is File => v instanceof File);
      if (entradas.length === 0) continue;
      if (entradas.length > 1) {
        // Um documento por tipo, e não uma pilha deles. Quem quiser substituir
        // um envia outra vez; quem revê vê o mais recente.
        return erro(`Envie um só ficheiro para cada documento.`, 400);
      }
      anexados.push({ tipo, ficheiro: entradas[0]! });
    }

    if (anexados.length === 0) {
      return erro("Nenhum documento enviado.", 400);
    }

    // ------------------------------------------------------------------
    // O tecto por referência
    // ------------------------------------------------------------------
    //
    // `null` quer dizer que a contagem falhou, e nesse caso deixa-se passar: um
    // vendedor legítimo travado por uma consulta que não respondeu é um anúncio
    // perdido, e o limite por IP continua de pé.
    const jaTem = await contarDocumentosDaReferencia(referencia);
    if (jaTem !== null && jaTem + anexados.length > MAX_DOCUMENTOS_POR_REFERENCIA) {
      return erro("Já foram enviados documentos a mais para este anúncio.", 400);
    }

    // ------------------------------------------------------------------
    // Ler, decidir o tipo pelos bytes, guardar
    // ------------------------------------------------------------------
    const guardados: ReturnType<typeof paraOCliente>[] = [];

    for (const { tipo, ficheiro } of anexados) {
      if (ficheiro.size > MAX_BYTES_DOCUMENTO) {
        return erro(
          `O ficheiro "${ficheiro.name}" tem mais de ${TECTO_POR_EXTENSO}. Envie uma digitalização mais leve.`,
          413
        );
      }
      if (ficheiro.size === 0) {
        return erro(`O ficheiro "${ficheiro.name}" está vazio.`, 400);
      }

      const conteudo = new Uint8Array(await ficheiro.arrayBuffer());

      // Quem decide o tipo são os bytes. O `ficheiro.type` só entra para se
      // registar a discordância — ver `lib/documentos/tipo-real.ts`.
      const veredicto = avaliarTipo(conteudo, ficheiro.type);

      if (!veredicto.real) {
        // A mensagem diz o que se aceita. «Tipo inválido» obriga quem está do
        // outro lado a adivinhar, e quem está do outro lado é alguém a tentar
        // vender um cavalo, não um programador.
        return erro(
          `O ficheiro "${ficheiro.name}" não é um dos formatos aceites. Envie ${FORMATOS_ACEITES}.`,
          400
        );
      }

      if (veredicto.discordancia) {
        // Um browser engana-se raramente no `Content-Type`; um pedido montado à
        // mão para ver o que passa é exactamente assim que se parece. Não trava
        // nada — os bytes já mandaram —, mas fica escrito para quem for ver.
        logger.warn("Documento: o tipo declarado não bate com os bytes", {
          referencia,
          tipo,
          declarado: veredicto.declarado,
          real: veredicto.real,
        });
      }

      const resultado = await guardarDocumento({
        referencia,
        tipo,
        nomeOriginal: ficheiro.name,
        mime: veredicto.real,
        conteudo,
      });

      if (!resultado.ok) {
        return NextResponse.json(
          {
            error:
              resultado.falha === "armazenamento"
                ? "Não foi possível guardar o documento. Tente novamente."
                : "O documento foi recebido mas não ficou registado. Tente novamente.",
            guardados,
          },
          { status: 500 }
        );
      }

      guardados.push(paraOCliente(resultado.documento));
    }

    logger.info("Documentos recebidos", {
      referencia,
      quantos: guardados.length,
      tipos: guardados.map((d) => d.tipo),
    });

    return NextResponse.json({ referencia, documentos: guardados });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    logger.error("Rota dos documentos: erro inesperado", mensagem);
    return NextResponse.json(
      {
        error: "Erro interno no servidor",
        ...(process.env.NODE_ENV !== "production" && { detail: mensagem }),
      },
      { status: 500 }
    );
  }
}
