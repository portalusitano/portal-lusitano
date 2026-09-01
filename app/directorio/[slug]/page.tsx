import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { supabase } from "@/lib/supabase-admin";
import FichaCoudelaria from "@/components/directorio/ficha/FichaCoudelaria";
import type { Avaliacao } from "@/components/directorio/ficha/Avaliacoes";
import {
  dadosEstruturados,
  descricaoFactual,
  maisPerto,
  normalizarCoudelaria,
  resumoParaMeta,
  type CoudelariaBruta,
  type CoudelariaFicha,
} from "@/lib/coudelaria-ficha";
import { fotosDaCoudelaria } from "@/lib/fotos-coudelarias";
import type { Vizinha } from "@/components/directorio/ficha/Vizinhas";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal-lusitano.pt";

const COLUNAS =
  "id, nome, slug, descricao, historia, localizacao, regiao, telefone, email, website, " +
  "instagram, facebook, youtube, num_cavalos, ano_fundacao, especialidades, linhagens, premios, " +
  "servicos, horario, coordenadas_lat, coordenadas_lng, foto_capa, galeria, video_url, " +
  "cavalos_destaque, testemunhos, tags, is_pro, destaque, views_count";

/**
 * Uma consulta por pedido, partilhada entre `generateMetadata` e a página.
 * Antes eram três: uma no `layout` (para os metadados e o JSON-LD), outra no
 * `generateMetadata` da página, e outra na própria página. As duas primeiras
 * ainda discordavam no título — «X — Portal Lusitano» contra «X - Coudelaria
 * | Portal Lusitano».
 */
const obterCoudelaria = cache(async (slug: string): Promise<CoudelariaFicha | null> => {
  try {
    const { data } = await supabase
      .from("coudelarias")
      .select(COLUNAS)
      .eq("slug", slug)
      .eq("status", "active")
      .single();
    if (!data) return null;
    /* O `as` é uma promessa, não uma verificação — e neste caso era falsa: a
       coluna `cavalos_destaque` é `jsonb` e onze das vinte e nove linhas
       trazem lá uma string com JSON dentro, não um array. A ficha fazia
       `.length ? … .map(…)`, e como uma string também tem `length`, a guarda
       deixava passar e o `.map` rebentava — a construção do site morria a
       prerenderizar esta página.

       A correcção anterior tratou a coluna; esta trata a **forma**. As outras
       sete colunas de lista desta linha são lidas exactamente com a mesma
       guarda e partem-se exactamente da mesma maneira. Passam todas por
       `normalizarCoudelaria`, que é o único sítio em que se atravessa a
       fronteira; daqui para dentro o tipo é verdade. */
    return normalizarCoudelaria(data as unknown as CoudelariaBruta);
  } catch {
    return null;
  }
});

/**
 * As coudelarias mais próximas desta, com a distância em linha recta.
 *
 * Uma consulta leve — sete colunas das vinte e nove linhas — partilhada por
 * todas as fichas da mesma construção graças ao `cache`. Sem ela a ficha era
 * um beco: quem não gostasse desta coudelaria tinha de voltar atrás no
 * browser, e quem gostasse não sabia que havia outras três à mesma distância
 * de casa.
 */
const obterVizinhas = cache(async (): Promise<CoudelariaVizinhaBruta[]> => {
  try {
    const { data } = await supabase
      .from("coudelarias")
      .select("slug, nome, localizacao, regiao, coordenadas_lat, coordenadas_lng, foto_capa")
      .eq("status", "active");
    return (data as CoudelariaVizinhaBruta[] | null) || [];
  } catch {
    return [];
  }
});

interface CoudelariaVizinhaBruta {
  slug: string;
  nome: string;
  localizacao?: string | null;
  regiao?: string | null;
  coordenadas_lat?: number | null;
  coordenadas_lng?: number | null;
  foto_capa?: string | null;
}

const obterAvaliacoes = cache(async (id: string): Promise<Avaliacao[]> => {
  try {
    const { data } = await supabase
      .from("reviews")
      .select(
        "id, autor_nome, autor_localizacao, avaliacao, titulo, comentario, data_visita, tipo_visita, recomenda, created_at"
      )
      .eq("status", "approved")
      .eq("coudelaria_id", id)
      .order("created_at", { ascending: false });
    return (data as Avaliacao[] | null) || [];
  } catch {
    return [];
  }
});

/**
 * Um slug que não está na lista devolve 404 **com o estado 404**.
 *
 * Com `dynamicParams` ligado (que é a omissão), o Next gerava a página a
 * pedido, apanhava o `notFound()` e devolvia a página de erro com estado
 * **200** — medido: `curl -o /dev/null -w %{http_code}` sobre um slug
 * inventado dava 200 mesmo em cache MISS. Um 404 disfarçado de 200 é um
 * convite a que o Google indexe coudelarias que não existem.
 *
 * O preço é conhecido e aceita-se: uma coudelaria registada de fresco só
 * aparece na construção seguinte. São 29 fichas e o directório reconstrói-se
 * a cada publicação.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const { data } = await supabase.from("coudelarias").select("slug").eq("status", "active");
    return (data || []).map((c: { slug: string }) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

/**
 * Descrição da ficha. Quando a coudelaria não escreveu nenhuma — e é o caso
 * da esmagadora maioria — compõe-se uma frase **factual** com o que existe
 * (sítio, ano, número de cavalos). Não se escreve «criador de excelência»
 * numa ficha onde o único dado é o nome.
 */
function descricaoDaFicha(c: CoudelariaFicha): string {
  const escrita = resumoParaMeta(c.descricao, 155);
  if (escrita) return escrita;
  return resumoParaMeta(
    descricaoFactual(c, {
      coudelariaEm: "coudelaria em",
      fundadaEm: "fundada em",
      cavalos: "cavalos",
    }),
    155
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const coudelaria = await obterCoudelaria(slug);

  const canonico = `${siteUrl}/directorio/${slug}`;
  const alternates = {
    canonical: canonico,
    languages: {
      "pt-PT": canonico,
      "en-US": `${siteUrl}/en/directorio/${slug}`,
      "es-ES": `${siteUrl}/es/directorio/${slug}`,
      "x-default": canonico,
    },
  };

  if (!coudelaria) {
    return {
      title: "Coudelaria | Portal Lusitano",
      description: "Descubra coudelarias de cavalos Lusitanos em Portugal.",
      alternates,
      robots: { index: false, follow: true },
    };
  }

  const sitio = [coudelaria.localizacao, coudelaria.regiao].filter(Boolean).join(", ");
  const titulo = sitio
    ? `${coudelaria.nome} — Coudelaria em ${sitio} | Portal Lusitano`
    : `${coudelaria.nome} — Coudelaria | Portal Lusitano`;
  const descricao = descricaoDaFicha(coudelaria);

  // Sem `images` aqui de propósito: a rota `opengraph-image.tsx` deste
  // segmento é apanhada pela convenção de ficheiros do Next e entra sozinha.
  // A versão anterior escrevia `images: []` quando não havia `foto_capa`, e
  // um array vazio explícito **ganha** à convenção — o resultado era uma
  // partilha no WhatsApp sem imagem nenhuma em quase todas as coudelarias.
  return {
    title: titulo,
    description: descricao,
    alternates,
    openGraph: {
      title: `${coudelaria.nome}${sitio ? ` — ${sitio}` : ""}`,
      description: descricao,
      url: canonico,
      siteName: "Portal Lusitano",
      locale: "pt_PT",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: coudelaria.nome,
      description: descricao,
    },
  };
}

export default async function PaginaCoudelaria({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coudelaria = await obterCoudelaria(slug);
  if (!coudelaria) notFound();

  const avaliacoes = await obterAvaliacoes(coudelaria.id);
  const total = avaliacoes.length;
  const media =
    total > 0 ? Math.round((avaliacoes.reduce((s, r) => s + r.avaliacao, 0) / total) * 10) / 10 : 0;

  // As fotografias vêm da base de dados e, na falta dela, do que está em
  // `public/images/coudelarias/<slug>/`. Nunca de bancos de imagens.
  const fotos = fotosDaCoudelaria({
    slug: coudelaria.slug,
    capaDb: coudelaria.foto_capa,
    galeriaDb: coudelaria.galeria,
  });

  // As três mais próximas, cada uma com a sua capa escolhida pelo mesmo módulo
  // que escolhe a desta — a fotografia do cartão tem de ser a fotografia que
  // se vê ao entrar.
  const vizinhas: Vizinha[] = maisPerto(coudelaria, await obterVizinhas(), 3).map((v) => ({
    slug: v.slug,
    nome: v.nome,
    localizacao: v.localizacao || null,
    regiao: v.regiao || null,
    km: v.km,
    capa: fotosDaCoudelaria({ slug: v.slug, capaDb: v.foto_capa }).capa,
  }));

  const urlPagina = `${siteUrl}/directorio/${slug}`;
  const esquema = dadosEstruturados(coudelaria, {
    urlPagina,
    imagem: fotos.capa ? `${siteUrl}${fotos.capa}` : null,
    avaliacao: total > 0 ? { media, total } : null,
    descricao: descricaoDaFicha(coudelaria),
  });

  // Contagem de visitas depois da resposta seguir; nunca atrasa a página.
  after(async () => {
    try {
      await supabase
        .from("coudelarias")
        .update({ views_count: (coudelaria.views_count || 0) + 1 })
        .eq("id", coudelaria.id);
    } catch {
      // Uma visita por contar não é motivo para estoirar o pedido.
    }
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema) }}
      />
      <FichaCoudelaria
        coudelaria={coudelaria}
        fotos={fotos}
        avaliacoes={avaliacoes}
        estatisticas={{ total, media }}
        urlPagina={urlPagina}
        vizinhas={vizinhas}
      />
    </>
  );
}
