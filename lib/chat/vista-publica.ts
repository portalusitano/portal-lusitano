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
 *
 * ── A chave que se acrescentou, e porque é que isso foi deliberado ──────────
 *
 * `outraParteFoto` é a primeira chave nova desde que estas listas foram
 * fixadas, e o teste que as fixa foi actualizado à mão para a deixar entrar.
 * Isso é o mecanismo a funcionar, não a ser contornado: o teste existe para que
 * **ninguém acrescente um campo sem reparar**, e a maneira de acrescentar um é
 * ir lá escrever porquê.
 *
 * O porquê: um chat em que a outra parte é um nome sem cara é um formulário com
 * histórico. O que **não** entra com ela:
 *
 * - **O endereço não se deriva da identidade de ninguém.** Vive debaixo de um
 *   `avatar_prefixo` opaco de 128 bits, sem relação com o `id` da pessoa (ver a
 *   migração `20260910000001`). Se o caminho fosse `<user_id>/foto.webp`, esta
 *   chave publicaria o UUID escrito por outras letras — ou seja, desfazia em
 *   silêncio a regra do parágrafo de cima.
 * - **Continua a não sair email nem telefone.** A fotografia é um ficheiro de
 *   pixels que passou por um cano que lhe tira todos os metadados, EXIF e GPS
 *   incluídos (`lib/perfil/fotografia`); não é um contacto e não carrega um.
 * - **Sem fotografia é `null`**, e não um avatar inventado no servidor nem um
 *   Gravatar — esse mandaria o email de toda a gente para um terceiro. Quem a
 *   desenha com iniciais é o ecrã.
 *
 * ── E porque é que ela **não** vai em cada mensagem ─────────────────────────
 *
 * O pedido era «a `ChatConversa` e as mensagens precisam do nome e da
 * fotografia da outra pessoa». A conversa e o cabeçalho do fio ganharam-nas; a
 * mensagem não, e é uma decisão e não um esquecimento.
 *
 * Um fio tem duas pessoas e só duas. A fotografia da outra parte é uma
 * propriedade **do fio**, e escrevê-la em cada mensagem é repetir o mesmo
 * endereço trinta vezes por página — cerca de 3,5 KB de JSON idêntico, num
 * valor que por construção não pode diferir entre duas mensagens do mesmo fio.
 * Quem desenha um balão sabe de quem ele é pelo `minha`, que já lá está, e vai
 * buscar a cara ao cabeçalho. Se um dia houver conversas de grupo, aí a
 * fotografia passa a variar dentro do fio e a chave muda de sítio com uma razão
 * nova — que é o que este parágrafo existe para obrigar.
 */

import {
  estadoDaMensagem,
  nomeOutraParte,
  resumirMensagem,
  type ChatConversa,
  type ChatMensagem,
} from "@/lib/marketplace-chat";
import type { PerfilOutraParte } from "@/lib/perfil/contrato";

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
  "outraParteFoto",
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
  "outraParteFoto",
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

/**
 * O nome a mostrar à outra parte, agora que há um sítio onde ela o escreve.
 *
 * A cadeia antiga — `comprador_nome` na conversa, `vendedor_nome` no anúncio, e
 * um rótulo neutro no fim — continua inteira e continua a ser o que responde na
 * esmagadora maioria dos casos. O que muda é a **ordem**: o nome do perfil, se
 * existir, vem à frente.
 *
 * Porquê. O `comprador_nome` é uma cópia congelada no instante em que a conversa
 * foi aberta, e para quem não tinha `full_name` no registo é a parte local do
 * email («maria.silva»). Com uma página de perfil onde se escreve o nome, deixar
 * a cópia ganhar era desenhar um campo que não faz nada: a pessoa escreve
 * «Maria Silva» e continua a aparecer «maria.silva» a toda a gente com quem já
 * falou.
 *
 * O que isto **não** afrouxa: o `nomeOutraParte` continua a ser quem trata da
 * ausência, e um nome de perfil vazio ou só com espaços cai na cadeia antiga em
 * vez de escrever um vazio. E o nome do perfil é texto que a própria pessoa
 * escolheu sobre si — a mesma natureza do `comprador_nome` que já ia daqui para
 * fora —, limpo de controlo e cortado no `limparNome`.
 */
function nomeDaOutraParte(
  papel: "comprador" | "vendedor",
  conversa: LinhaConversa,
  cavalo: LinhaCavalo | null,
  perfil: PerfilOutraParte | null | undefined
): string {
  const doPerfil = perfil?.nome?.trim();
  if (doPerfil) return doPerfil;

  return nomeOutraParte(papel, conversa.comprador_nome, cavalo?.vendedor_nome ?? null);
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
  extra: {
    ultimaMensagem: string | null | undefined;
    porLer: number;
    /** O perfil da outra parte, quando quem chama o soube carregar. */
    perfil?: PerfilOutraParte | null;
  },
  utilizadorId: string
): ChatConversa {
  const papel = papelNaConversa(conversa, utilizadorId);

  return {
    id: conversa.id,
    cavaloId: conversa.cavalo_id,
    papel,
    outraParte: nomeDaOutraParte(papel, conversa, cavalo, extra.perfil),
    outraParteFoto: extra.perfil?.fotografia ?? null,
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
  outraParteFoto: string | null;
  cavaloNome: string;
  cavaloFoto: string | null;
  cavaloPreco: number | null;
  cavaloStatus: string | null;
}

export function vistaCabecalho(
  conversa: LinhaConversa,
  cavalo: LinhaCavalo | null,
  utilizadorId: string,
  perfil?: PerfilOutraParte | null
): CabecalhoFio {
  const papel = papelNaConversa(conversa, utilizadorId);

  return {
    id: conversa.id,
    cavaloId: conversa.cavalo_id,
    papel,
    outraParte: nomeDaOutraParte(papel, conversa, cavalo, perfil),
    outraParteFoto: perfil?.fotografia ?? null,
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
