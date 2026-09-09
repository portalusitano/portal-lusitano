/**
 * O que a API do chat pode dizer sobre uma conversa, e mais nada.
 *
 * ── Porque é que isto precisa de um módulo próprio ──────────────────────────
 *
 * A página inicial promete, por escrito: «Fale com o vendedor sem publicar o
 * seu número. O contacto só é partilhado se quiser.» Essa frase é uma promessa
 * sobre **respostas de API**, não sobre um ecrã — um telefone que chegue ao
 * JSON já saiu de casa, e ninguém precisa de o ver desenhado para o apanhar.
 *
 * E a tentação está mesmo ali: a conversa aponta para `cavalos_venda`, que
 * guarda `vendedor_telefone`, `vendedor_email` e `vendedor_whatsapp` na mesma
 * linha de onde saem o nome do cavalo, a foto e o preço. Um `select("*")`
 * escrito num dia apressado — ou um `select` que ganhe mais uma coluna para
 * um ecrã novo — publica os três sem que nada se queixe.
 *
 * A defesa é a mesma do `lib/documentos/selo-publico.ts`: **a forma do valor
 * devolvido**. Estas funções não filtram, não apagam e não escondem; elas
 * **constroem** o objecto campo a campo a partir de uma linha que só elas
 * vêem. Uma coluna nova na base não aparece aqui por si; tem de ser escrita à
 * mão, e nessa altura quem a escreve está a olhar para este comentário.
 *
 * O conjunto exacto de chaves está fixado por testes. Um campo a mais rebenta
 * o teste antes de chegar ao ecrã de alguém — que é o único momento em que
 * ainda é barato.
 *
 * ── E o que fica de fora sem ser um contacto ────────────────────────────────
 *
 * Não sai daqui o `id` de nenhuma das duas pessoas. A conversa diz «esta é
 * minha» com um booleano por mensagem (`minha`) e com o papel (`papel`); o
 * `uuid` da outra parte não serve nenhum ecrã e é o que permite ligar uma
 * pessoa a tudo o resto que ela faça no site.
 */

import {
  estadoDaMensagem,
  nomeOutraParte,
  resumirMensagem,
  type ChatConversa,
  type ChatMensagem,
} from "@/lib/marketplace-chat";

/**
 * As chaves que cada objecto tem, escritas uma vez para o teste as poder
 * afirmar. `as const` para que um esquecimento seja um erro de compilação e
 * não uma surpresa em produção.
 */
export const CHAVES_CONVERSA = [
  "id",
  "cavaloId",
  "papel",
  "outraParte",
  "cavaloNome",
  "cavaloFoto",
  "cavaloPreco",
  "ultimaMensagem",
  "ultimaMensagemAt",
  "porLer",
  "arquivada",
] as const;

export const CHAVES_MENSAGEM = ["id", "corpo", "createdAt", "minha", "lida", "estado"] as const;

export const CHAVES_CABECALHO = [
  "id",
  "cavaloId",
  "papel",
  "outraParte",
  "cavaloNome",
  "cavaloFoto",
  "cavaloPreco",
  "cavaloStatus",
] as const;

/** O que se lê da conversa. Deliberadamente não é a linha da tabela. */
export interface LinhaConversa {
  id: string;
  cavalo_id: string;
  comprador_id: string;
  vendedor_id: string;
  comprador_nome?: string | null;
  ultima_mensagem_at: string;
  arquivada_comprador?: boolean | null;
  arquivada_vendedor?: boolean | null;
}

/** O que se lê do anúncio. As colunas de contacto não estão aqui de propósito. */
export interface LinhaCavalo {
  nome?: string | null;
  foto_principal?: string | null;
  preco?: number | null;
  status?: string | null;
  vendedor_nome?: string | null;
}

export interface LinhaMensagem {
  id: string;
  corpo: string;
  created_at: string;
  remetente_id: string;
  lida_at?: string | null;
  entregue_at?: string | null;
}

export function papelNaConversa(
  conversa: Pick<LinhaConversa, "comprador_id">,
  utilizadorId: string
): "comprador" | "vendedor" {
  return conversa.comprador_id === utilizadorId ? "comprador" : "vendedor";
}

/** Quem tem de receber o que se escrever nesta conversa. */
export function outraParteDaConversa(
  conversa: Pick<LinhaConversa, "comprador_id" | "vendedor_id">,
  utilizadorId: string
): string {
  return conversa.comprador_id === utilizadorId ? conversa.vendedor_id : conversa.comprador_id;
}

export function vistaMensagem(linha: LinhaMensagem, utilizadorId: string): ChatMensagem {
  const minha = linha.remetente_id === utilizadorId;

  return {
    id: linha.id,
    corpo: linha.corpo,
    createdAt: linha.created_at,
    minha,
    lida: Boolean(linha.lida_at),
    /* Quem recebeu não precisa que lhe digam que recebeu: para o destinatário
       a mensagem está lida no instante em que ele a lê. O estado é a resposta
       à pergunta de quem escreveu — «chegou?» — e só a ele. */
    estado: minha ? estadoDaMensagem(linha.lida_at, linha.entregue_at) : "lida",
  };
}

export function vistaConversa(
  conversa: LinhaConversa,
  cavalo: LinhaCavalo | null,
  extra: { ultimaMensagem: string | null | undefined; porLer: number },
  utilizadorId: string
): ChatConversa {
  const papel = papelNaConversa(conversa, utilizadorId);

  return {
    id: conversa.id,
    cavaloId: conversa.cavalo_id,
    papel,
    outraParte: nomeOutraParte(papel, conversa.comprador_nome, cavalo?.vendedor_nome ?? null),
    cavaloNome: cavalo?.nome || "Anúncio removido",
    cavaloFoto: cavalo?.foto_principal || null,
    cavaloPreco: typeof cavalo?.preco === "number" ? cavalo.preco : null,
    ultimaMensagem: resumirMensagem(extra.ultimaMensagem),
    ultimaMensagemAt: conversa.ultima_mensagem_at,
    porLer: extra.porLer,
    arquivada: Boolean(
      papel === "comprador" ? conversa.arquivada_comprador : conversa.arquivada_vendedor
    ),
  };
}

export interface CabecalhoFio {
  id: string;
  cavaloId: string;
  papel: "comprador" | "vendedor";
  outraParte: string;
  cavaloNome: string;
  cavaloFoto: string | null;
  cavaloPreco: number | null;
  cavaloStatus: string | null;
}

export function vistaCabecalho(
  conversa: LinhaConversa,
  cavalo: LinhaCavalo | null,
  utilizadorId: string
): CabecalhoFio {
  const papel = papelNaConversa(conversa, utilizadorId);

  return {
    id: conversa.id,
    cavaloId: conversa.cavalo_id,
    papel,
    outraParte: nomeOutraParte(papel, conversa.comprador_nome, cavalo?.vendedor_nome ?? null),
    cavaloNome: cavalo?.nome || "Anúncio removido",
    cavaloFoto: cavalo?.foto_principal || null,
    cavaloPreco: typeof cavalo?.preco === "number" ? cavalo.preco : null,
    cavaloStatus: cavalo?.status || null,
  };
}

/**
 * As colunas que se pedem ao anúncio, escritas aqui e não em cada rota.
 *
 * Um `select` repetido em três ficheiros é três sítios onde alguém pode
 * acrescentar `vendedor_telefone` sem passar por este comentário.
 */
export const COLUNAS_CAVALO = "id, nome, foto_principal, preco, status, vendedor_nome";

/** O mesmo, para as mensagens. */
export const COLUNAS_MENSAGEM = "id, corpo, remetente_id, lida_at, entregue_at, created_at";
