import { comprimirVarias } from "@/lib/comprimir-imagem";
import { subirFotografias, SubidaFalhada } from "@/lib/subir-fotografias";
import type { TipoDeDocumento } from "@/lib/documentos/contrato";

/**
 * Tudo o que o formulário de venda tem de mandar para o servidor antes de
 * seguir para o pagamento: as fotografias e os documentos.
 *
 * Vive fora do `page.tsx` porque o `handleSubmit` já tinha cento e tal linhas
 * a montar o corpo do checkout, e enterrar aqui a compressão, o lotear e duas
 * rondas de pedidos tornava-o ilegível. E porque assim isto tem testes.
 *
 * ## A ordem, e porquê
 *
 * 1. **Encolher as fotografias** — antes de qualquer pedido, porque é o que
 *    decide se os pedidos cabem.
 * 2. **Subir as fotografias**, em voltas.
 * 3. **Subir os documentos**, um pedido por documento.
 * 4. Só depois é que o `page.tsx` fala com o Stripe.
 *
 * Os documentos vão **um pedido por documento** em vez de um pedido com os
 * três. Um Livro Azul digitalizado é o ficheiro mais pesado de toda a
 * submissão, e três deles no mesmo corpo é a maneira mais certa de bater no
 * tecto da plataforma. Um a um, o pior caso é o de um documento sozinho.
 *
 * ## A referência
 *
 * É gerada uma vez por submissão e vai nos dois sítios: nos pedidos dos
 * documentos e no corpo do checkout. É por ela que o webhook do Stripe liga os
 * documentos ao anúncio quando este finalmente nasce — antes do pagamento o
 * anúncio não existe, e portanto não há `cavalo_id` a que os prender.
 *
 * Não é uma chave nem uma autorização: está escrito na rota, e é por isso que
 * não existe nenhum `GET` que devolva documentos por referência.
 */

export interface AnexosEnviados {
  imageUrls: string[];
  referencia: string;
  /** Quantos documentos entraram. Zero quando não havia nenhum para enviar. */
  documentosEnviados: number;
}

export interface Anexos {
  imagens: File[];
  documentos: Partial<Record<TipoDeDocumento, File | undefined>>;
}

export interface Progresso {
  /** `fase` diz o que está a acontecer, para o botão poder dizê-lo também. */
  fase: "a-encolher" | "a-subir-fotografias" | "a-subir-documentos";
  feitos: number;
  total: number;
}

/**
 * Os documentos, na ordem em que o formulário os pede. O Livro Azul primeiro
 * porque é o obrigatório: se alguma coisa correr mal, é o que já subiu.
 */
const ORDEM_DOS_DOCUMENTOS: TipoDeDocumento[] = ["livro_azul", "passaporte", "exame_vet"];

/** O que um erro de rede não deve conseguir dizer ao utilizador. */
async function razaoDoErro(r: Response, seNaoHouver: string): Promise<string> {
  try {
    const corpo = await r.json();
    return typeof corpo?.error === "string" ? corpo.error : seNaoHouver;
  } catch {
    // Um 413 da plataforma não traz JSON nenhum: o corpo é HTML e o pedido
    // nunca chegou ao nosso código. É o caso mais provável de todos, e a
    // mensagem tem de dizer alguma coisa de útil em vez de «erro».
    return r.status === 413 ? seNaoHouver : `${seNaoHouver} (${r.status})`;
  }
}

export async function enviarAnexos(
  anexos: Anexos,
  mensagens: { fotografias: string; documentos: string; grandeDemais: string },
  opcoes: {
    referencia?: string;
    fetch?: typeof globalThis.fetch;
    aoProgredir?: (p: Progresso) => void;
  } = {}
): Promise<AnexosEnviados> {
  const pedir = opcoes.fetch ?? globalThis.fetch.bind(globalThis);
  const referencia = opcoes.referencia ?? crypto.randomUUID();
  const avisar = opcoes.aoProgredir;

  // 1. Encolher.
  const encolhidas = await comprimirVarias(anexos.imagens, {
    aoProgredir: (feitos, total) => avisar?.({ fase: "a-encolher", feitos, total }),
  });
  const fotografias = encolhidas.map((e) => e.ficheiro);

  // 2. Subir as fotografias, em voltas que cabem.
  let imageUrls: string[] = [];
  if (fotografias.length > 0) {
    try {
      const r = await subirFotografias(
        fotografias,
        async (lote) => {
          const corpo = new FormData();
          for (const f of lote) corpo.append("images", f);

          const resposta = await pedir("/api/vender-cavalo/upload", {
            method: "POST",
            body: corpo,
          });
          if (!resposta.ok) {
            throw new Error(await razaoDoErro(resposta, mensagens.grandeDemais));
          }
          const { urls } = await resposta.json();
          return urls as string[];
        },
        {
          aoProgredir: (feitos, total) => avisar?.({ fase: "a-subir-fotografias", feitos, total }),
        }
      );
      imageUrls = r.urls;
    } catch (erro) {
      // As fotografias das voltas anteriores ficaram no balde. Não se
      // aproveitam nesta tentativa — o anúncio não vai nascer —, mas dizê-lo
      // no erro poupa a quem depura a pergunta «subiu alguma?».
      const jaSubidas = erro instanceof SubidaFalhada ? erro.urlsJaSubidos.length : 0;
      throw new Error(
        `${mensagens.fotografias}: ${erro instanceof Error ? erro.message : String(erro)}` +
          (jaSubidas > 0 ? ` (${jaSubidas} já tinham subido)` : "")
      );
    }
  }

  // 3. Os documentos, um pedido por documento.
  const porEnviar = ORDEM_DOS_DOCUMENTOS.filter((t) => anexos.documentos[t]);
  let documentosEnviados = 0;

  for (const tipo of porEnviar) {
    const ficheiro = anexos.documentos[tipo];
    if (!ficheiro) continue;

    const corpo = new FormData();
    corpo.append("referencia", referencia);
    corpo.append(tipo, ficheiro);

    const resposta = await pedir("/api/vender-cavalo/documentos", {
      method: "POST",
      body: corpo,
    });

    if (!resposta.ok) {
      throw new Error(
        `${mensagens.documentos}: ${await razaoDoErro(resposta, mensagens.grandeDemais)}`
      );
    }

    documentosEnviados += 1;
    avisar?.({ fase: "a-subir-documentos", feitos: documentosEnviados, total: porEnviar.length });
  }

  return { imageUrls, referencia, documentosEnviados };
}
