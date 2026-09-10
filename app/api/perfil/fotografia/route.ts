import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { strictLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { prepararFotografia, foiRecusada } from "@/lib/perfil/fotografia";
import {
  MAX_BYTES_AVATAR,
  FORMATOS_AVATAR,
  EXTENSAO_AVATAR_GUARDADA,
  MIME_AVATAR_GUARDADO,
  pedidoGrandeDemais,
} from "@/lib/perfil/contrato";

/**
 * A fotografia de perfil: pôr e tirar.
 *
 * ── O balde é próprio, e não o `images` ────────────────────────────────────
 *
 * O `images` é onde a administração põe fotografias de anúncios
 * (`app/api/upload`), atrás de `verifySession`. Aqui escreve **qualquer pessoa
 * com conta**. São dois regimes diferentes, e misturá-los faz de qualquer
 * limite, política ou limpeza aplicada a um deles uma decisão sobre o outro.
 * O balde `avatares` nasce na migração `20260910000001`, com os mesmos limites
 * que esta rota aplica escritos também lá — «uma verificação que vive num sítio
 * só é uma verificação que se perde na primeira distracção».
 *
 * ── O caminho não se adivinha a partir de quem a pessoa é ──────────────────
 *
 * `<avatar_prefixo>/<aleatório>.webp`, e o prefixo é opaco: 128 bits sem
 * relação nenhuma com o `id` da pessoa. A razão longa está na migração, e
 * resume-se a isto — **este endereço vai numa resposta de API para outra
 * pessoa**, e um endereço com o UUID lá dentro publica o UUID escrito por
 * outras letras. O `lib/chat/vista-publica` deixou de devolver o `id` de
 * ninguém precisamente para isso não acontecer; entrar pela porta da
 * fotografia desfazia-o.
 *
 * O segundo segmento é aleatório a cada envio, e não um nome fixo como
 * `avatar.webp`. Duas razões: uma fotografia nova não fica presa atrás da cache
 * da anterior (o balde é público e servido por CDN), e um endereço que já
 * circulou não passa a mostrar uma fotografia diferente da que mostrava.
 *
 * ── O que o cliente nunca decide ───────────────────────────────────────────
 *
 * Nem o caminho, nem o tipo, nem as dimensões. O que ele manda são bytes; o que
 * fica no balde são pixels redesenhados por nós, em WebP, num quadrado de lado
 * fixo, sem um único byte de metadados. Ver `lib/perfil/fotografia`.
 */

/**
 * Quantos envios por minuto e por conta.
 *
 * Cada envio é um descodificador de imagem a correr sobre bytes de um estranho
 * — a coisa mais cara e mais delicada que este servidor faz a pedido de quem
 * quer que seja. Cinco chega para quem está a experimentar fotografias e não
 * chega para quem está a experimentar o servidor. A chave é a conta e não o IP,
 * pela razão escrita em `app/api/conversas`.
 */
const MAX_ENVIOS_POR_MINUTO = 5;

/** O balde. Nasce na migração `20260910000001`. */
const MARCA_BALDE = "avatares";

/** O prefixo opaco desta pessoa, criando o perfil se ainda não houver. */
async function prefixoDe(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("avatar_prefixo")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logger.error("[perfil/fotografia] Falhou a ler o prefixo:", error);
    return null;
  }

  const prefixo = (data as { avatar_prefixo?: string | null } | null)?.avatar_prefixo;
  if (typeof prefixo === "string" && prefixo) return prefixo;

  /* Sem linha, ou com uma linha anterior à migração. O `DEFAULT` da coluna é
     que gera o valor — não se escreve aqui um prefixo vindo da aplicação, pela
     mesma razão pela qual não se deixa o cliente escolher: a política de
     escrita do balde assenta neste valor, e quem o gera tem de ser a base. */
  const { data: criado, error: erroCriar } = await supabaseAdmin
    .from("user_profiles")
    .upsert({ id: userId }, { onConflict: "id" })
    .select("avatar_prefixo")
    .maybeSingle();

  if (erroCriar) {
    logger.error("[perfil/fotografia] Falhou a criar o perfil:", erroCriar);
    return null;
  }

  return (criado as { avatar_prefixo?: string | null } | null)?.avatar_prefixo ?? null;
}

/**
 * Apaga o ficheiro anterior, se houver.
 *
 * Melhor esforço: uma fotografia nova que não entra porque a antiga não saiu é
 * uma troca falhada por causa da limpeza. O que fica é um órfão no balde, que
 * custa uns kilobytes e não é visível a ninguém — o `avatar_url` já aponta para
 * a nova.
 *
 * Só se apaga debaixo do prefixo desta pessoa. O caminho vem da coluna, mas a
 * coluna é uma cadeia de texto e um dia pode lá estar outra coisa; sem esta
 * verificação, uma linha estragada seria um `remove` a um caminho escolhido por
 * quem a estragou.
 */
async function apagarAnterior(anterior: string | null | undefined, prefixo: string) {
  if (!anterior) return;

  const marca = `/${MARCA_BALDE}/`;
  const i = anterior.indexOf(marca);
  if (i === -1) return;

  const caminho = anterior.slice(i + marca.length);
  if (!caminho.startsWith(`${prefixo}/`) || caminho.includes("..")) return;

  const { error } = await supabaseAdmin.storage.from(MARCA_BALDE).remove([caminho]);
  if (error) logger.error("[perfil/fotografia] Falhou a apagar a anterior:", error);
}

/** POST /api/perfil/fotografia — enviar uma fotografia nova. */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
      await strictLimiter.check(MAX_ENVIOS_POR_MINUTO + 1, `perfil-foto:${user.id}`);
    } catch {
      return NextResponse.json(
        { error: "Demasiados envios seguidos. Tente novamente dentro de um minuto." },
        { status: 429 }
      );
    }

    /* ── O único sítio onde se pode recusar sem ler ────────────────────────
       O `await req.formData()` lê e decompõe o corpo **inteiro** antes de
       devolver um campo, e uma rota do App Router não tem tecto de corpo por
       omissão: sem esta linha, um corpo de duzentos megabytes era posto todo em
       memória e só depois recusado pelo `size` da parte, que é onde o
       comentário deste ficheiro dizia — a dizer mal — que a recusa acontecia
       «antes».

       O `Content-Length` não decide a favor de ninguém; ver
       `pedidoGrandeDemais` no `lib/perfil/contrato`. Quem mentir para baixo ou
       não o mandar cai nas duas verificações de sempre, que ficam onde
       estavam. */
    if (pedidoGrandeDemais(req.headers.get("content-length"))) {
      const mb = Math.floor(MAX_BYTES_AVATAR / (1024 * 1024));
      return NextResponse.json(
        { error: `A fotografia é demasiado grande. Máximo ${mb} MB.` },
        { status: 413 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const ficheiro = formData.get("fotografia");
    if (!(ficheiro instanceof File)) {
      return NextResponse.json({ error: "Ficheiro não fornecido" }, { status: 400 });
    }

    /* O `size` é o que o cliente declarou na parte multipart e não se acredita
       nele para decidir — quem decide são os bytes que chegaram, e o
       `prepararFotografia` volta a medi-los. Serve para recusar **antes** de
       ler oito megabytes para memória, que é a única coisa que um número
       declarado pode fazer com honestidade. */
    if (ficheiro.size > MAX_BYTES_AVATAR) {
      const mb = Math.floor(MAX_BYTES_AVATAR / (1024 * 1024));
      /* 413 e não 400, pela mesma razão da recusa pelo `Content-Length` acima:
         é a mesma recusa, e o cliente já sabe traduzir o 413 numa frase sobre o
         tamanho (`erroDaResposta` em `components/perfil/api`). Com 400, o ramo
         `grande-demais` que lá está escrito nunca corria e quem mandasse uma
         fotografia grande via a frase genérica de erro de servidor. */
      return NextResponse.json(
        { error: `A fotografia é demasiado grande. Máximo ${mb} MB.` },
        {
          status: 413,
        }
      );
    }

    const prefixo = await prefixoDe(user.id);
    if (!prefixo) {
      return NextResponse.json({ error: "Erro ao guardar a fotografia" }, { status: 500 });
    }

    const veredicto = await prepararFotografia(await ficheiro.arrayBuffer());

    if (foiRecusada(veredicto)) {
      /* O motivo curto vai para o registo e a frase vai para o ecrã. Quem está
         a experimentar o que passa não ganha um mapa; quem escolheu a
         fotografia errada percebe à mesma. */
      logger.error(
        `[perfil/fotografia] Recusada (${veredicto.motivo}) — declarado ${ficheiro.type || "nada"}`
      );
      return NextResponse.json(
        { error: veredicto.erro, formatos: FORMATOS_AVATAR },
        {
          status: 400,
        }
      );
    }

    const nome = `${prefixo}/${crypto.randomUUID().replace(/-/g, "")}.${EXTENSAO_AVATAR_GUARDADA}`;

    const { data: subida, error: erroSubida } = await supabaseAdmin.storage
      .from(MARCA_BALDE)
      .upload(nome, veredicto.bytes, { contentType: MIME_AVATAR_GUARDADO, upsert: false });

    if (erroSubida || !subida) {
      logger.error("[perfil/fotografia] Falhou a subida:", erroSubida);
      return NextResponse.json({ error: "Erro ao guardar a fotografia" }, { status: 500 });
    }

    const { data: publico } = supabaseAdmin.storage.from(MARCA_BALDE).getPublicUrl(subida.path);
    const url = publico.publicUrl;

    // Lê-se a anterior antes de escrever a nova, para se saber o que apagar.
    const { data: antes } = await supabaseAdmin
      .from("user_profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const { error: erroGravar } = await supabaseAdmin.from("user_profiles").upsert(
      {
        id: user.id,
        avatar_url: url,
        avatar_atualizado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (erroGravar) {
      logger.error("[perfil/fotografia] Falhou a gravar o endereço:", erroGravar);
      /* O ficheiro subiu e a linha não. Apaga-se o que acabou de subir: um
         ficheiro no balde que nenhuma linha aponta é lixo que ninguém encontra
         para apagar depois. */
      await supabaseAdmin.storage.from(MARCA_BALDE).remove([subida.path]);
      return NextResponse.json({ error: "Erro ao guardar a fotografia" }, { status: 500 });
    }

    await apagarAnterior((antes as { avatar_url?: string | null } | null)?.avatar_url, prefixo);

    logger.info(
      `[perfil/fotografia] ${veredicto.bytesOriginais} → ${veredicto.bytes.length} bytes ` +
        `(${veredicto.mimeOriginal} → ${MIME_AVATAR_GUARDADO})`
    );

    return NextResponse.json({ perfil: { fotografia: url } }, { status: 201 });
  } catch (error) {
    logger.error("[perfil/fotografia/POST] Erro inesperado:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/perfil/fotografia — tirar a fotografia.
 *
 * Tirar tem de ser tão fácil como pôr. Quem publicou a cara e se arrependeu não
 * pode ficar dependente de substituir por outra — e o estado sem fotografia é
 * um estado a sério, desenhado com iniciais, e não uma avaria.
 */
export async function DELETE() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("avatar_url, avatar_prefixo")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      logger.error("[perfil/fotografia/DELETE] Falhou a ler o perfil:", error);
      return NextResponse.json({ error: "Erro ao remover a fotografia" }, { status: 500 });
    }

    const linha = data as { avatar_url?: string | null; avatar_prefixo?: string | null } | null;

    /* A linha primeiro, o ficheiro depois. Ao contrário, um `remove` que falhe
       a meio deixava o `avatar_url` a apontar para um ficheiro que já não
       existe — e um `<img>` partido na caixa de entrada de outra pessoa é pior
       do que um ficheiro órfão que ninguém vê. */
    const { error: erroGravar } = await supabaseAdmin
      .from("user_profiles")
      .update({
        avatar_url: null,
        avatar_atualizado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (erroGravar) {
      logger.error("[perfil/fotografia/DELETE] Falhou a apagar o endereço:", erroGravar);
      return NextResponse.json({ error: "Erro ao remover a fotografia" }, { status: 500 });
    }

    if (linha?.avatar_prefixo) {
      await apagarAnterior(linha.avatar_url, linha.avatar_prefixo);
    }

    return NextResponse.json({ perfil: { fotografia: null } });
  } catch (error) {
    logger.error("[perfil/fotografia/DELETE] Erro inesperado:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
