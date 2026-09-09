/**
 * O que é um perfil, e o que dele pode sair.
 *
 * ── Porque é que isto está separado da rota ─────────────────────────────────
 *
 * Este módulo não importa o `sharp` nem o cliente de serviço, de propósito: é
 * o único ficheiro de `lib/perfil` que um componente pode importar sem
 * arrastar meio servidor para o pacote do cliente. Os números que aqui estão —
 * o lado do quadrado, o tecto do ficheiro, o comprimento do nome — são os
 * mesmos que a rota aplica e os mesmos que um ecrã escreveria numa mensagem de
 * erro. Escritos duas vezes, divergem à primeira distracção.
 *
 * ── A forma do que sai, e porquê esta ───────────────────────────────────────
 *
 * A regra desta casa está escrita no `lib/chat/vista-publica` e no
 * `lib/documentos/selo-publico`, e é a mesma aqui: **a defesa é a forma do
 * valor devolvido**. `user_profiles` guarda, na mesma linha do nome e da
 * fotografia, o `stripe_customer_id` e o estado da assinatura. Um
 * `select("*")` escrito num dia apressado publica os dois. Por isso nada neste
 * módulo devolve uma linha da tabela: constrói-se o objecto campo a campo, e
 * uma coluna nova na base só aparece do outro lado se alguém a escrever aqui à
 * mão — e nessa altura está a olhar para este comentário.
 */

// ===========================================================================
// A fotografia
// ===========================================================================

/**
 * O lado do quadrado que se guarda, em pixels.
 *
 * O maior sítio onde uma fotografia de perfil aparece é a ficha da pessoa, a
 * 128 pixels de CSS; na caixa de entrada são 32 e num balão de mensagem menos
 * ainda. 256 é o dobro do maior, que é o que um ecrã de densidade dupla pede,
 * e é onde a curva do peso ainda não dói.
 *
 * Medido sobre uma fotografia a sério (`public/images/optimized/capa-1600w`)
 * levada a 12 MP e passada por este cano, em WebP a 82:
 *
 *   lado   128    160    192    **256**   320     384     512
 *   bytes  5 040  7 346  10 148 **17 k**  23 992  34 528  53 958
 *
 * O degrau de 256 para 320 custa 44% mais bytes para pixels que ninguém vê a
 * 128 CSS; o degrau para baixo, 192, já não chega a um ecrã de densidade
 * tripla. E o que se ganha contra o original é a razão de isto existir:
 * **1 765 894 → ~17 000 bytes, cerca de cem vezes.**
 */
export const LADO_AVATAR = 256;

/**
 * A qualidade do WebP à saída.
 *
 * É o mesmo 82 do `lib/comprimir-imagem`, e é de propósito que não se inventa
 * aqui um segundo número: as duas fotografias deste site — a do anúncio e a da
 * pessoa — passam a ter uma qualidade só, e quem a quiser mudar muda-a nos
 * dois sítios ao mesmo tempo por a encontrar duas vezes com o mesmo valor.
 */
export const QUALIDADE_AVATAR = 82;

/**
 * O maior ficheiro que se aceita à entrada, antes de encolher.
 *
 * Não é o tecto do que se guarda — o que se guarda são os ~17 KB acima. É o
 * tecto do que se deixa **subir e descodificar**, e por isso é uma defesa e
 * não uma preferência: descodificar uma imagem é o único sítio deste servidor
 * onde bytes de um estranho viram trabalho de CPU e memória.
 *
 * Oito megabytes cobrem o que um telemóvel entrega hoje com folga — medido, a
 * fotografia de 48 MP do banco de ensaio são 4,4 MiB e a de 12 MP são 1,68.
 */
export const MAX_BYTES_AVATAR = 8 * 1024 * 1024;

/**
 * O tecto em pixels do que se descodifica.
 *
 * Um ficheiro pequeno pode declarar uma imagem enorme — é a bomba de
 * descompressão: alguns kilobytes de PNG que pedem gigabytes de memória para
 * abrir. O tecto de bytes acima não a apanha; este apanha. 100 megapixels
 * deixa passar o modo de máxima resolução de qualquer telemóvel (48 MP) com
 * mais do dobro de folga.
 */
export const MAX_PIXELS_AVATAR = 100_000_000;

/**
 * Os três formatos que se aceitam à entrada.
 *
 * Decididos pelos **bytes** do ficheiro e nunca pela extensão nem pelo
 * `Content-Type` que o cliente declara — quem faz essa leitura é o
 * `lib/documentos/tipo-real`, que já existe nesta casa e que não se duplica
 * aqui. GIF fica de fora: um GIF animado como fotografia de perfil é um
 * anúncio a piscar na caixa de entrada de outra pessoa, e a saída é WebP
 * estático de qualquer maneira.
 */
export const MIMES_AVATAR = ["image/jpeg", "image/png", "image/webp"] as const;
export type MimeAvatar = (typeof MIMES_AVATAR)[number];

/** Como se escrevem os três a quem está a escolher um ficheiro. */
export const FORMATOS_AVATAR = "JPEG, PNG ou WebP";

/** O que sai do cano, e por isso o que se guarda. */
export const MIME_AVATAR_GUARDADO = "image/webp";
export const EXTENSAO_AVATAR_GUARDADA = "webp";

// ===========================================================================
// O nome
// ===========================================================================

/**
 * O comprimento máximo do nome.
 *
 * 120 é o mesmo tecto que o `nomeDoUtilizador` de `app/api/conversas` já
 * aplica ao nome que grava numa conversa. Um segundo número aqui deixaria um
 * nome passar num sítio e ser cortado no outro.
 */
export const MAX_NOME = 120;

/**
 * Limpa um nome vindo de fora.
 *
 * Devolve `null` para o que fica vazio, e é `null` que se guarda: uma cadeia
 * vazia na base é um nome que existe e não diz nada, e obriga toda a gente que
 * a leia a tratar dois casos onde há um.
 *
 * Os caracteres de controlo saem porque um `\n` num nome parte a linha de uma
 * caixa de entrada, e o `‮` — o que inverte a direcção do texto — faz o
 * resto da linha ler-se ao contrário a partir dali.
 */
export function limparNome(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;

  const limpo = bruto
    // Controlo (C0 e C1) e as marcas de direcção do Unicode.
    .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NOME)
    .trim();

  return limpo ? limpo : null;
}

// ===========================================================================
// O que sai
// ===========================================================================

/**
 * O perfil como a própria pessoa o vê.
 *
 * Não traz o `id`: quem pergunta é o dono da sessão, e a resposta a «quem sou
 * eu» não precisa de lhe repetir o UUID que ele não escreve em lado nenhum.
 * Não traz o email, que é da sessão e não do perfil. E não traz nada de
 * facturação, pela razão escrita no topo deste ficheiro.
 */
export interface PerfilProprio {
  nome: string | null;
  fotografia: string | null;
}

export const CHAVES_PERFIL_PROPRIO = ["nome", "fotografia"] as const;

/**
 * O que uma pessoa pode saber sobre a outra parte de uma conversa.
 *
 * **Duas chaves, e são estas.** O `id` não sai daqui pela mesma razão pela qual
 * já não sai do `lib/chat/vista-publica`: é o que permite ligar uma pessoa a
 * tudo o resto que ela faça no site, e não serve ecrã nenhum. O email e o
 * telefone não saem porque a promessa da página inicial é sobre isso.
 *
 * E a `fotografia` é um endereço que **não se deriva de quem a pessoa é** —
 * ver a nota do `avatar_prefixo` na migração. Sem isso, publicar a fotografia
 * seria publicar o UUID escrito por outras letras.
 */
export interface PerfilOutraParte {
  nome: string | null;
  fotografia: string | null;
}

/**
 * Quem não tem fotografia não tem fotografia.
 *
 * Não há avatar por omissão gerado no servidor, e não há Gravatar. O Gravatar
 * está fora de questão por si só: o endereço dele é o `md5` do email, ou seja
 * pedir um avatar por omissão a um terceiro é **mandar-lhe o email de toda a
 * gente que abrir a caixa de entrada** — o contrário exacto da promessa desta
 * casa. E um rectângulo cinzento devolvido pelo servidor é a mesma coisa que o
 * `CLAUDE.md` já proíbe para a `foto_capa` de uma coudelaria: uma ausência
 * desenhada a fingir um dado.
 *
 * `null` é a resposta honesta, e quem a desenha com iniciais é o ecrã — que é
 * quem sabe o tamanho da caixa e a cor do fundo.
 */
export const SEM_FOTOGRAFIA = null;

/**
 * As colunas que se pedem, escritas aqui e não em cada sítio que pergunta.
 *
 * Um `select` repetido em três ficheiros é três sítios onde alguém pode
 * acrescentar `stripe_customer_id` sem passar por este comentário. É a mesma
 * razão pela qual o `COLUNAS_CAVALO` existe no `lib/chat/vista-publica`.
 */
export const COLUNAS_PERFIL = "id, full_name, avatar_url";

export interface LinhaPerfil {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

/** Constrói a vista pública de uma linha, campo a campo. Ver o topo do ficheiro. */
export function vistaPerfil(linha: LinhaPerfil): PerfilOutraParte {
  return {
    nome: limparNome(linha.full_name),
    /* Sem fotografia é `null`, e não um avatar inventado. A razão longa está no
       `SEM_FOTOGRAFIA`, acima: um Gravatar mandaria o email de toda a gente
       para um terceiro, e um rectângulo cinzento é uma ausência desenhada a
       fingir um dado. Quem a desenha com iniciais é o ecrã. */
    fotografia: typeof linha.avatar_url === "string" && linha.avatar_url ? linha.avatar_url : null,
  };
}
