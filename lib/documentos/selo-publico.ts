/**
 * O que a ficha pública pode dizer sobre a documentação de um anúncio.
 *
 * ── Porque é que isto precisa de um módulo próprio ──────────────────────────
 *
 * As duas perguntas já tinham resposta escrita e testada — o
 * `temDocumentacaoVerificada` no `documentos/contrato` e o
 * `temRegistoConfirmadoNoStudBook` no `documentos/stud-book/contrato` —, e as
 * duas respostas não chegavam a página nenhuma. Um sinal de confiança que
 * ninguém vê não é um sinal de confiança: é trabalho de verificação a ser
 * feito e deitado fora.
 *
 * Faltava a ponte, e a ponte tem de ser estreita **de propósito**.
 *
 * ── A regra que este ficheiro existe para não deixar partir ─────────────────
 *
 * `documentos_cavalo` tem a RLS ligada e **zero políticas**: nega tudo a quem
 * passe pelo PostgREST, e lê-se do servidor com a chave de serviço e de mais
 * lado nenhum. A migração diz isso por escrito e não é um passo por acabar.
 *
 * Ligar isso a uma página pública é, portanto, o momento exacto em que se pode
 * abrir um buraco sem dar por ela. A resposta é a forma do valor devolvido:
 * **dois booleanos**. Não um documento, não um estado, não um motivo, não uma
 * data, não o número de registo. Um `true` não diz que documento foi visto,
 * nem quando, nem por quem; um `false` não distingue «não enviou» de «enviou e
 * foi recusado» — e essa indistinção **é a funcionalidade**, não uma perda.
 * Quem quiser mais tem o painel de administração, que é onde essa informação
 * vive e onde há uma sessão para a merecer.
 *
 * O inverso também não existe aqui, pela mesma razão que não existe no
 * `stud-book/contrato`: `desconhecido` e `indisponivel` são indistinguíveis do
 * ponto de vista do comprador, e nenhum dos dois autoriza dizer-lhe seja o que
 * for. Um selo apagado quer dizer «não temos a dizer», nunca «não tem».
 *
 * ── E porque é que nunca lança ──────────────────────────────────────────────
 *
 * Uma ficha de anúncio que rebenta porque a tabela dos documentos não
 * respondeu é uma ficha que deixa de vender um cavalo por causa de um selo. A
 * falha lê-se como «não temos a dizer», que é a mesma coisa que a ausência de
 * documento — e é a leitura conservadora, a única que nunca afirma de mais.
 */

/* A mesma guarda do `lib/supabase-admin`, e pela mesma razão: este módulo
   importa-o, logo puxa a chave de serviço atrás de si. Um `import "server-only"`
   seria mais bonito, mas o pacote não está nas dependências deste projecto —
   vem por arrasto do Next — e uma guarda que depende de uma dependência
   transitiva é uma guarda que desaparece sem ninguém dar por isso. */
if (typeof window !== "undefined") {
  throw new Error(
    "[Segurança] lib/documentos/selo-publico.ts lê documentos com a chave de serviço e só pode correr no servidor."
  );
}

import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

import { temDocumentacaoVerificada } from "./contrato";
import { temRegistoConfirmadoNoStudBook } from "./stud-book/contrato";

/**
 * Os dois factos, e mais nenhum.
 *
 * Os nomes são afirmações e não estados, para que ninguém seja tentado a
 * escrever `estado === "recusado"` a partir daqui.
 */
export interface SeloPublico {
  /** Há um livro azul **verificado** por uma pessoa deste lado. */
  documentacaoVerificada: boolean;
  /** O Livro Genealógico da APSL confirmou o registo. */
  registoConfirmadoNoStudBook: boolean;
}

/** O que se diz quando não se sabe. É também o que se diz quando falha. */
const CALADO: SeloPublico = {
  documentacaoVerificada: false,
  registoConfirmadoNoStudBook: false,
};

export function seloVazio(): SeloPublico {
  return { ...CALADO };
}

/** Um selo que não afirma nada não vale a linha que ocupa. */
export function seloDizAlgumaCoisa(selo: SeloPublico): boolean {
  return selo.documentacaoVerificada || selo.registoConfirmadoNoStudBook;
}

/**
 * As duas perguntas, numa só ida ao servidor.
 *
 * Pedem-se **só as colunas de que os dois predicados precisam** — `tipo` e
 * `estado` de um lado, `estado` do outro. Não é micro-optimização: é que uma
 * coluna que não se pede é uma coluna que não pode escapar por engano para o
 * lado do browser no dia em que alguém passe este objecto para um componente
 * de cliente.
 */
export async function seloPublicoDoAnuncio(cavaloId: string): Promise<SeloPublico> {
  if (!cavaloId) return seloVazio();

  try {
    const [documentos, consulta] = await Promise.all([
      supabaseAdmin.from("documentos_cavalo").select("tipo, estado").eq("cavalo_id", cavaloId),
      supabaseAdmin
        .from("consultas_stud_book")
        .select("estado")
        .eq("cavalo_id", cavaloId)
        .maybeSingle(),
    ]);

    /* O erro não se deita fora com um `const { data }`: um selo apagado por
       falha e um selo apagado por ausência leem-se iguais na página — e é
       assim que deve ser —, mas quem mantém o site tem de os poder distinguir
       no registo. */
    if (documentos.error) {
      logger.error("[seloPublico] os documentos não responderam:", documentos.error);
    }
    if (consulta.error) {
      logger.error("[seloPublico] a consulta ao stud book não respondeu:", consulta.error);
    }

    return {
      documentacaoVerificada: temDocumentacaoVerificada(documentos.data ?? []),
      registoConfirmadoNoStudBook: temRegistoConfirmadoNoStudBook(consulta.data ?? null),
    };
  } catch (erro) {
    logger.error("[seloPublico] falhou a ler o selo:", erro);
    return seloVazio();
  }
}
