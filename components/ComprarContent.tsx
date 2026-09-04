"use client";

import { Suspense } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";
import MarketplaceGrid from "@/components/MarketplaceGrid";
import HorseCard from "@/components/HorseCard";
import Revelar from "@/components/Revelar";
import VistosRecentemente from "@/components/VistosRecentemente";
import { POR_PAGINA } from "@/lib/marketplace-filtros";

interface CavaloVenda {
  id: string;
  nome_cavalo: string;
  preco: number;
  image_url?: string;
  slug?: string;
  localizacao?: string;
  idade?: number;
  raca?: string;
  sexo?: string;
  disciplinas?: string[] | string | null;
  nivel?: string;
  destaque?: boolean;
  created_at?: string;
  status?: string;
}

function tituloDaPagina(language: string): string {
  if (language === "en") return "Lusitano Horses for Sale";
  if (language === "es") return "Caballos Lusitanos en Venta";
  return "Cavalos Lusitanos à Venda";
}

function anunciarCavalo(language: string): string {
  if (language === "en") return "List a horse";
  if (language === "es") return "Anunciar caballo";
  return "Anunciar cavalo";
}

/**
 * O cabeçalho da página. Sai do render interactivo **e** do estático, para os
 * dois começarem com o mesmo ecrã e a hidratação não trocar o que já estava lá.
 *
 * **Já não tem o botão «Comparar».** Chamava-se comparar, levava a
 * `/minha-conta/alertas`, e o comparador de cavalos está marcado como
 * descontinuado no perfil desde antes disto. Um botão que promete uma coisa,
 * faz outra e exige sessão para a fazer é pior do que não existir; guardar a
 * pesquisa vive agora na barra de resultados, ao lado do que ela guarda.
 *
 * **E o CTA deixou de ser dourado.** O cabeçalho do site já tem «Publicar
 * anúncio» a dourado, fixo, cem pixéis acima deste — medido, eram dois
 * dourados no primeiro ecrã a dizer a mesma frase, que é exactamente o que
 * gasta o acento. Um deles tinha de sair e o outro está em todas as páginas do
 * site. Fica o botão branco, que é o botão principal do sistema.
 */
function CabecalhoComprar({
  totalCount,
  language,
  t,
}: {
  totalCount: number;
  language: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        <h1 className="titulo-gradiente text-[1.75rem] leading-[120%] font-normal tracking-tighter md:text-[2.5rem]">
          {tituloDaPagina(language)}
        </h1>
        {totalCount > 0 && (
          <p className="meta mt-1">
            {totalCount}{" "}
            {totalCount === 1 ? t.comprar_page.horse_available : t.comprar_page.horses_available}
          </p>
        )}
      </div>

      {/* `self-start` para o botão medir o que a palavra mede. Sem isso, num
          telemóvel a coluna estica-o de borda a borda e um CTA de 350px de
          largura por cima da montra lê-se como uma faixa de campanha, não como
          um botão — além de gastar em altura o que a grelha ganhou. */}
      <LocalizedLink
        href="/vender-cavalo"
        className="btn btn-primario btn-sm shrink-0 self-start rounded-full px-5 whitespace-nowrap sm:self-auto"
      >
        + {anunciarCavalo(language)}
      </LocalizedLink>
    </div>
  );
}

/**
 * A montra tal como sai do servidor, sem um único controlo.
 *
 * A grelha lê o URL com `useSearchParams`, e numa rota prerenderizada isso
 * obriga o Next a escrever no HTML **o fallback do `Suspense`**, não a lista.
 * Aqui o `<Suspense>` não tinha fallback nenhum, e o resultado medido era este:
 * o HTML estático de `/comprar` trazia 694 caracteres de texto visível, deles
 * «A carregar…» e o rodapé, e **zero anúncios**. Quem chegasse sem JavaScript,
 * e o rastreador que não o executa, viam um classificados vazio — numa página
 * cujo trabalho inteiro é ser indexada com cavalos lá dentro.
 *
 * O fallback passa a ser a própria montra: os mesmos cartões, a mesma primeira
 * página, sem os controlos que precisam de estado. Ao hidratar, a versão
 * interactiva toma o lugar desta com o mesmo conteúdo por baixo. É a mesma
 * solução que o directório já usa, e pela mesma razão.
 */
function MontraEstatica({ cavalos }: { cavalos: CavaloVenda[] }) {
  const { t, language } = useLanguage();
  const primeiros = cavalos.slice(0, POR_PAGINA);

  return (
    <Envolucro>
      <CabecalhoComprar totalCount={cavalos.length} language={language} t={t} />

      <div className="mt-8">
        {primeiros.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {primeiros.map((horse, i) => (
              <HorseCard
                key={horse.id}
                horse={horse}
                href={`/comprar/${horse.id}`}
                priority={i < 5}
              />
            ))}
          </div>
        ) : (
          <div className="cartao mx-auto max-w-xl px-6 py-12 text-center">
            <h2 className="titulo-seccao mb-3">Ainda não há cavalos anunciados.</h2>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]">
              Assim que o primeiro anúncio for publicado, aparece aqui.
            </p>
          </div>
        )}
      </div>
    </Envolucro>
  );
}

/** A moldura da página, uma só, para as duas versões assentarem no mesmo sítio. */
function Envolucro({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-[var(--background)] px-4 pt-16 pb-24 text-[var(--foreground)] sm:px-6 sm:pt-20 sm:pb-32 md:px-12 lg:px-20">
      <div className="mx-auto max-w-[1600px]">{children}</div>
    </section>
  );
}

function ComprarContentInner({
  cavalos,
  hasError,
}: {
  cavalos: CavaloVenda[];
  hasError?: boolean;
}) {
  const { t, language } = useLanguage();

  return (
    <Envolucro>
      {/* O cabeçalho entra ao carregar e não ao entrar no ecrã — está sempre
          no primeiro ecrã, e um `<Revelar>` só aqui é uma entrada só. */}
      <Revelar duracao={600}>
        <CabecalhoComprar totalCount={cavalos.length} language={language} t={t} />
      </Revelar>

      <div className="mt-8">
        {hasError ? (
          <ErroAoCarregar language={language} />
        ) : (
          /* A grelha é sempre montada quando não há erro: é ela que distingue
             o catálogo vazio de uma pesquisa sem resultados, e é ela que
             oferece o aviso para quando o primeiro cavalo aparecer. */
          <MarketplaceGrid horses={cavalos} />
        )}

        <VistosRecentemente className="mt-16 border-t border-[var(--border)] pt-10" />
      </div>
    </Envolucro>
  );
}

/**
 * A base de dados não respondeu.
 *
 * Era um ecrã inteiro com um círculo vermelho e «Ocorreu um erro temporário» —
 * uma parede, e uma que não diz o que fazer a seguir a carregar em «tentar
 * novamente» duas vezes. Diz-se o que falhou (a lista, não o site), oferece-se
 * a recarga, e deixa-se aberta a parte do site que **não** depende desta
 * consulta: o directório de coudelarias e o formulário de publicar. Um erro
 * com saídas não é uma parede.
 */
function ErroAoCarregar({ language }: { language: string }) {
  const titulo =
    language === "en"
      ? "The listings did not load"
      : language === "es"
        ? "Los anuncios no se cargaron"
        : "Os anúncios não carregaram";
  const corpo =
    language === "en"
      ? "The horses could not be fetched. The rest of the site is working — try again in a moment."
      : language === "es"
        ? "No se pudieron obtener los caballos. El resto del sitio funciona — inténtelo de nuevo en un momento."
        : "Não foi possível ir buscar os cavalos. O resto do site está a funcionar — tente daqui a pouco.";
  const tentar =
    language === "en" ? "Try again" : language === "es" ? "Intentar de nuevo" : "Tentar de novo";

  return (
    <div className="cartao mx-auto max-w-xl px-6 py-12 text-center" role="alert">
      <p className="rotulo mb-4 text-[var(--erro)]">Erro</p>
      <h2 className="titulo-seccao mb-3">{titulo}</h2>
      <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]">
        {corpo}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primario btn-sm rounded-full px-5"
        >
          {tentar}
        </button>
        <LocalizedLink href="/directorio" className="btn btn-subtil btn-sm">
          Ver coudelarias
        </LocalizedLink>
      </div>
    </div>
  );
}

export default function ComprarContent({
  cavalos,
  hasError,
}: {
  cavalos: CavaloVenda[];
  hasError?: boolean;
}) {
  return (
    <Suspense fallback={<MontraEstatica cavalos={hasError ? [] : cavalos} />}>
      <ComprarContentInner cavalos={cavalos} hasError={hasError} />
    </Suspense>
  );
}
