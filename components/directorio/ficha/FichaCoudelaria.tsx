"use client";

import { useEffect } from "react";
import Image from "next/image";
import LocalizedLink from "@/components/LocalizedLink";
import Revelar from "@/components/Revelar";
import Breadcrumb from "@/components/Breadcrumb";
import { useLanguage } from "@/context/LanguageContext";
import { analytics } from "@/lib/analytics-events";
import {
  Award,
  Clock,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Play,
  Quote,
  Users,
  Youtube,
} from "lucide-react";
import {
  contaInstagram,
  descricaoFactual,
  dominioLegivel,
  fichaTecnica,
  painelValeAPena,
  hrefDireccoes,
  hrefEmail,
  hrefTelefone,
  paragrafos,
  telefoneLegivel,
  urlAbsoluto,
  urlRedeSocial,
  type CoudelariaFicha,
} from "@/lib/coudelaria-ficha";
import { iniciaisDe } from "@/lib/directorio-capas";
import type { FotosCoudelaria } from "@/lib/fotos-coudelarias";
import AccoesCoudelaria from "./AccoesCoudelaria";
import Avaliacoes, { type Avaliacao } from "./Avaliacoes";
import Galeria from "./Galeria";
import MapaDaCoudelaria from "./MapaDaCoudelaria";
import PainelIdentidade from "./PainelIdentidade";

interface Props {
  coudelaria: CoudelariaFicha;
  fotos: FotosCoudelaria;
  avaliacoes: Avaliacao[];
  estatisticas: { total: number; media: number };
  /** URL absoluto desta ficha, para a partilha. */
  urlPagina: string;
}

/**
 * A ficha de uma coudelaria.
 *
 * O que a página tem de fazer é uma coisa só: dar a quem procura um cavalo
 * razões para contactar aquela coudelaria, e o meio de o fazer. Daí a ordem —
 * quem é, onde é, o que faz, e o contacto sempre à mão (na coluna à direita
 * no ecrã grande, numa barra fixa no telemóvel).
 *
 * Três regras que valem para tudo o que está aqui:
 *
 * 1. **Não se afirma o que os dados não provam.** Saiu o distintivo
 *    «Verificada» que aparecia em todas as fichas sem que ninguém verifique
 *    coisa nenhuma, e saiu a galeria de fotografias de stock do Unsplash que
 *    entrava quando a coudelaria não tinha fotografias suas.
 * 2. **Sem fotografia a página continua a ser uma página.** Quase nenhuma
 *    coudelaria tem capa; nesse caso a capa é composta com os dados — a ficha
 *    técnica em HTML, a receita dos previews — em vez de 65vh de preto.
 * 3. **Todo o texto passa pelo dicionário**, nas três línguas.
 */
export default function FichaCoudelaria({
  coudelaria,
  fotos,
  avaliacoes,
  estatisticas,
  urlPagina,
}: Props) {
  const { t, language } = useLanguage();
  const f = t.directorio.ficha;

  useEffect(() => {
    analytics.viewCoudelaria({
      id: coudelaria.id,
      nome: coudelaria.nome,
      localizacao: coudelaria.localizacao || "",
      regiao: coudelaria.regiao || "",
    });
  }, [coudelaria.id, coudelaria.nome, coudelaria.localizacao, coudelaria.regiao]);

  // ─── Contactos ────────────────────────────────────────────────────────────
  const telefone = hrefTelefone(coudelaria.telefone);
  const email = hrefEmail(coudelaria.email);
  const website = urlAbsoluto(coudelaria.website);
  const instagram = contaInstagram(coudelaria.instagram);
  const facebook = urlRedeSocial(coudelaria.facebook, "https://www.facebook.com");
  const youtube = urlRedeSocial(coudelaria.youtube, "https://www.youtube.com");
  const video = urlAbsoluto(coudelaria.video_url);
  const direccoes = hrefDireccoes(coudelaria.coordenadas_lat, coudelaria.coordenadas_lng);
  const temContactoDirecto = Boolean(telefone || email || website);

  // ─── Texto ────────────────────────────────────────────────────────────────
  const descricao =
    coudelaria.descricao?.trim() ||
    descricaoFactual(coudelaria, {
      coudelariaEm: f.descricao_coudelaria_em,
      fundadaEm: f.descricao_fundada_em,
      cavalos: f.descricao_cavalos,
    });
  const historia = paragrafos(coudelaria.historia);
  const sitio = [coudelaria.localizacao, coudelaria.regiao].filter(Boolean).join(", ");

  const linhas = fichaTecnica(coudelaria, {
    localizacao: f.rot_localizacao,
    regiao: f.rot_regiao,
    fundacao: f.rot_fundacao,
    cavalos: f.rot_cavalos,
    linhagens: f.rot_linhagens,
  });

  const haPainel = painelValeAPena(linhas);
  // Sem capa, o painel de identidade é o que preenche o cabeçalho; com capa,
  // vive na coluna da direita. Nunca nos dois sítios ao mesmo tempo.
  const painelNaCapa = !fotos.capa && haPainel;

  const locale = language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT";
  const moeda = (valor: number) =>
    valor.toLocaleString(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

  return (
    <main className="min-h-screen bg-[var(--background)] [overflow-x:clip]">
      {/* ── Capa ───────────────────────────────────────────────────────────── */}
      {fotos.capa ? (
        <header className="relative min-h-[340px] sm:min-h-[480px]" aria-label={coudelaria.nome}>
          <div className="absolute inset-0">
            <Image
              src={fotos.capa}
              alt={coudelaria.nome}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* Dois véus, e os dois são precisos. O de baixo para cima assenta
                o título em preto em vez de o pousar na fotografia. O de cima
                para baixo é para a barra de navegação: sem ele, o menu branco
                aterra em copas de árvore ao sol e deixa de se ler. */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--background)]/85 to-transparent" />
          </div>
          <div className="relative mx-auto flex min-h-[340px] max-w-6xl flex-col justify-end px-4 pb-8 pt-28 sm:min-h-[480px] sm:px-6 sm:pb-12">
            <CabecalhoTexto
              coudelaria={coudelaria}
              sitio={sitio}
              rotuloFundada={t.directorio.founded}
              rotuloCavalos={t.directorio.horses}
              urlPagina={urlPagina}
              sobreFoto
            />
          </div>
        </header>
      ) : (
        <header className="relative" aria-label={coudelaria.nome}>
          {/* Sem fotografia não se inventa uma: o cabeçalho é feito com os
              dados que existem — a ficha técnica em HTML ao lado do nome. */}
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
            <div
              className={`grid items-center gap-8 ${
                painelNaCapa ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : ""
              }`}
            >
              <CabecalhoTexto
                coudelaria={coudelaria}
                sitio={sitio}
                rotuloFundada={t.directorio.founded}
                rotuloCavalos={t.directorio.horses}
                urlPagina={urlPagina}
                monograma={iniciaisDe(coudelaria.nome)}
                rotuloSemFoto={t.directorio.no_photo}
              />
              {painelNaCapa && (
                <Revelar direccao="left" atraso={100}>
                  <PainelIdentidade
                    titulo={f.identidade}
                    etiqueta={coudelaria.regiao || undefined}
                    linhas={linhas}
                  />
                </Revelar>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── Corpo ──────────────────────────────────────────────────────────── */}
      {/* A costura: hairline com o risco de luz a nascer no centro, para o
          corpo encaixar no cabeçalho em vez de ficar empilhado debaixo dele. */}
      <div className="separador-brilho mx-auto max-w-6xl rounded-t-[var(--raio-lg)] border-t border-[var(--border-soft)] px-4 pb-28 pt-8 sm:px-6 sm:pb-16">
        {/* O `Breadcrumb` é partilhado por meia dúzia de páginas e não se
            mexe; as duas correcções que ele precisa a 390px fazem-se daqui.
            Uma: a lista quebrava, e passa a ser uma linha só que desliza.
            Outra: a regra global de alvo de toque põe `min-height: 44px` em
            todo o `a` no telemóvel, e um `<a>` que é item de flex fica
            blocado — o texto encostava ao topo de uma caixa de 44px enquanto
            as barras «/» ficavam a meio, e lia-se como duas linhas
            desalinhadas. Medido: 14px de desnível. Centrar o conteúdo do
            link põe tudo na mesma linha e mantém o alvo de toque. */}
        <div className="-mx-4 overflow-x-auto px-4 [&_a]:flex [&_a]:items-center [&_ol]:flex-nowrap [&_ol]:whitespace-nowrap">
          <Breadcrumb
            items={[
              { label: f.inicio, href: "/" },
              { label: f.directorio, href: "/directorio" },
              { label: coudelaria.nome },
            ]}
          />
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-3 lg:gap-12">
          {/* ── Coluna principal ── */}
          <div className="min-w-0 space-y-10 lg:col-span-2 sm:space-y-12">
            <Revelar>
              <p className="max-w-prose text-base leading-relaxed text-[var(--foreground-secondary)] sm:text-lg">
                {descricao}
              </p>
            </Revelar>

            {coudelaria.especialidades?.length ? (
              <Revelar atraso={60}>
                <section aria-labelledby="t-especialidades">
                  <Titulo id="t-especialidades">{t.directorio.specialties}</Titulo>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {coudelaria.especialidades.map((especialidade) => (
                      <li
                        key={especialidade}
                        className="rounded-full border border-[var(--border-soft)] bg-[var(--elevate-1)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                      >
                        {especialidade}
                      </li>
                    ))}
                  </ul>
                </section>
              </Revelar>
            ) : null}

            {historia.length > 0 && (
              <Revelar atraso={60}>
                <section aria-labelledby="t-historia">
                  <Titulo id="t-historia">{t.directorio.history}</Titulo>
                  <div className="max-w-prose space-y-3">
                    {historia.map((paragrafo, i) => (
                      <p key={i} className="leading-relaxed text-[var(--foreground-secondary)]">
                        {paragrafo}
                      </p>
                    ))}
                  </div>
                </section>
              </Revelar>
            )}

            {fotos.galeria.length > 0 && (
              <Revelar atraso={60}>
                <section aria-labelledby="t-fotografias">
                  <Titulo id="t-fotografias">{f.fotografias}</Titulo>
                  <Galeria fotos={fotos.galeria} nome={coudelaria.nome} />
                </section>
              </Revelar>
            )}

            {coudelaria.premios?.length ? (
              <Revelar atraso={60}>
                <section aria-labelledby="t-premios">
                  <Titulo id="t-premios">{t.directorio.awards}</Titulo>
                  <ul className="m-0 list-none space-y-2 p-0">
                    {coudelaria.premios.map((premio) => (
                      <li
                        key={premio}
                        className="flex items-start gap-3 rounded-[var(--raio)] border border-[var(--border-soft)] bg-[var(--background-card)] p-3.5"
                      >
                        <Award
                          size={16}
                          className="mt-0.5 flex-shrink-0 text-[var(--foreground-muted)]"
                          aria-hidden="true"
                        />
                        <span className="text-sm leading-relaxed text-[var(--foreground-secondary)]">
                          {premio}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </Revelar>
            ) : null}

            {coudelaria.cavalos_destaque?.length ? (
              <Revelar atraso={60}>
                <section aria-labelledby="t-cavalos">
                  <Titulo id="t-cavalos">{t.directorio.featured_horses}</Titulo>
                  <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                    {coudelaria.cavalos_destaque.map((cavalo) => (
                      <li
                        key={cavalo.nome}
                        className={`rounded-[var(--raio)] border border-[var(--border-soft)] bg-[var(--background-card)] p-4 ${
                          cavalo.vendido ? "opacity-60" : ""
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="titulo-seccao min-w-0 truncate">{cavalo.nome}</h3>
                          {cavalo.vendido && (
                            <span className="selo selo-neutro flex-shrink-0">
                              {t.directorio.sold}
                            </span>
                          )}
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {cavalo.ano ? (
                            <DadoCavalo rotulo={f.ano} valor={String(cavalo.ano)} numerico />
                          ) : null}
                          {cavalo.pelagem ? (
                            <DadoCavalo rotulo={f.pelagem} valor={cavalo.pelagem} />
                          ) : null}
                          {cavalo.aptidao ? (
                            <DadoCavalo rotulo={f.aptidao} valor={cavalo.aptidao} largo />
                          ) : null}
                        </dl>
                        {cavalo.preco && !cavalo.vendido ? (
                          <p className="mt-3 font-mono text-base tabular-nums text-[var(--foreground-strong)]">
                            {moeda(cavalo.preco)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </Revelar>
            ) : null}

            {coudelaria.testemunhos?.length ? (
              <Revelar atraso={60}>
                <section aria-labelledby="t-testemunhos">
                  <Titulo id="t-testemunhos">{t.directorio.testimonials}</Titulo>
                  <ul className="m-0 list-none space-y-3 p-0">
                    {coudelaria.testemunhos.map((testemunho) => (
                      <li key={`${testemunho.autor}-${testemunho.data ?? ""}`}>
                        <blockquote className="rounded-[var(--raio)] border border-[var(--border-soft)] bg-[var(--background-card)] p-4 sm:p-5">
                          <Quote
                            size={16}
                            className="mb-2 text-[var(--foreground-muted)]"
                            aria-hidden="true"
                          />
                          <p className="leading-relaxed text-[var(--foreground-secondary)]">
                            {testemunho.texto}
                          </p>
                          <footer className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                            <cite className="text-sm not-italic text-[var(--foreground-strong)]">
                              {testemunho.autor}
                            </cite>
                            {testemunho.data && <span className="meta">{testemunho.data}</span>}
                          </footer>
                        </blockquote>
                      </li>
                    ))}
                  </ul>
                </section>
              </Revelar>
            ) : null}

            <Revelar atraso={60}>
              <Avaliacoes
                coudelariaId={coudelaria.id}
                nome={coudelaria.nome}
                avaliacoesIniciais={avaliacoes}
                estatisticasIniciais={estatisticas}
              />
            </Revelar>
          </div>

          {/* ── Coluna do contacto ── */}
          <aside className="min-w-0 lg:col-span-1" aria-label={f.contactar}>
            <div className="space-y-4 lg:sticky lg:top-28">
              {!painelNaCapa && haPainel && (
                <Revelar direccao="left">
                  <PainelIdentidade
                    titulo={f.identidade}
                    etiqueta={coudelaria.regiao || undefined}
                    linhas={linhas}
                  />
                </Revelar>
              )}

              <Revelar direccao="left" atraso={60}>
                <section className="cartao p-4 sm:p-5" aria-labelledby="t-contacto" id="contacto">
                  <h2 id="t-contacto" className="titulo-seccao mb-4">
                    {t.directorio.contact_info}
                  </h2>

                  {temContactoDirecto ? (
                    <div className="space-y-2">
                      {telefone && (
                        <a href={telefone} className="btn btn-primario w-full justify-start">
                          <Phone size={15} aria-hidden="true" />
                          <span className="truncate font-mono tabular-nums">
                            {telefoneLegivel(coudelaria.telefone)}
                          </span>
                        </a>
                      )}
                      {email && (
                        <a
                          href={email}
                          className={`btn w-full justify-start ${telefone ? "btn-secundario" : "btn-primario"}`}
                        >
                          <Mail size={15} aria-hidden="true" />
                          <span className="min-w-0 truncate">{coudelaria.email}</span>
                        </a>
                      )}
                      {website && (
                        <a
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className={`btn w-full justify-start ${telefone || email ? "btn-secundario" : "btn-primario"}`}
                        >
                          <Globe size={15} aria-hidden="true" />
                          <span className="min-w-0 truncate">{dominioLegivel(website)}</span>
                          <ExternalLink size={12} aria-hidden="true" className="flex-shrink-0" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[var(--raio)] border border-dashed border-[var(--border-soft)] p-3.5">
                      <p className="rotulo-forte mb-1">{f.sem_contactos_titulo}</p>
                      <p className="meta">{f.sem_contactos_texto}</p>
                    </div>
                  )}

                  {/* Sem «Como chegar» aqui: ele vive no cartão «Onde fica»,
                      logo a seguir, e repetido em dois cartões encostados
                      lia-se como um erro. Quando não há contactos, o que este
                      cartão tem para dizer é justamente que não há. */}
                  {video && (
                    <a
                      href={video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-subtil mt-2 w-full justify-start"
                    >
                      <Play size={15} aria-hidden="true" />
                      {f.ver_video}
                      <ExternalLink size={12} aria-hidden="true" className="flex-shrink-0" />
                    </a>
                  )}

                  {(instagram || facebook || youtube) && (
                    <ul className="m-0 mt-4 flex list-none gap-2 border-t border-[var(--border-soft)] p-0 pt-4">
                      {instagram && (
                        <li>
                          <a
                            href={instagram.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Instagram ${instagram.etiqueta}`}
                            className="flex h-11 w-11 items-center justify-center rounded-[var(--raio-sm)] border border-[var(--border-soft)] text-[var(--foreground-secondary)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground-strong)]"
                          >
                            <Instagram size={16} aria-hidden="true" />
                          </a>
                        </li>
                      )}
                      {facebook && (
                        <li>
                          <a
                            href={facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            className="flex h-11 w-11 items-center justify-center rounded-[var(--raio-sm)] border border-[var(--border-soft)] text-[var(--foreground-secondary)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground-strong)]"
                          >
                            <Facebook size={16} aria-hidden="true" />
                          </a>
                        </li>
                      )}
                      {youtube && (
                        <li>
                          <a
                            href={youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="YouTube"
                            className="flex h-11 w-11 items-center justify-center rounded-[var(--raio-sm)] border border-[var(--border-soft)] text-[var(--foreground-secondary)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground-strong)]"
                          >
                            <Youtube size={16} aria-hidden="true" />
                          </a>
                        </li>
                      )}
                    </ul>
                  )}

                  {coudelaria.horario && (
                    <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                      <p className="rotulo mb-1 flex items-center gap-1.5">
                        <Clock size={13} aria-hidden="true" />
                        {t.directorio.schedule}
                      </p>
                      <p className="meta leading-relaxed">{coudelaria.horario}</p>
                    </div>
                  )}
                </section>
              </Revelar>

              {coudelaria.servicos?.length ? (
                <Revelar direccao="left" atraso={60}>
                  <section className="cartao p-4 sm:p-5" aria-labelledby="t-servicos">
                    <h2 id="t-servicos" className="titulo-seccao mb-3">
                      {t.directorio.services}
                    </h2>
                    <ul className="m-0 list-none space-y-2 p-0">
                      {coudelaria.servicos.map((servico) => (
                        <li
                          key={servico}
                          className="flex items-center gap-2.5 text-sm text-[var(--foreground-secondary)]"
                        >
                          <span className="ponto bg-[var(--foreground-muted)]" aria-hidden="true" />
                          {servico}
                        </li>
                      ))}
                    </ul>
                  </section>
                </Revelar>
              ) : null}

              {direccoes && (
                <Revelar direccao="left" atraso={60}>
                  <MapaDaCoudelaria
                    coudelaria={coudelaria}
                    capa={fotos.capa}
                    direccoes={direccoes}
                    sitio={sitio}
                  />
                </Revelar>
              )}

              <Revelar direccao="left" atraso={60}>
                <section className="cartao p-4 sm:p-5" aria-labelledby="t-reclamar">
                  <h2 id="t-reclamar" className="titulo-seccao mb-2">
                    {f.reclamar_titulo}
                  </h2>
                  <p className="meta mb-4 leading-relaxed">{f.reclamar_texto}</p>
                  <LocalizedLink href="/directorio/registar" className="btn btn-secundario w-full">
                    {f.reclamar_cta}
                  </LocalizedLink>
                </section>
              </Revelar>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Barra de contacto no telemóvel ─────────────────────────────────── */}
      {(telefone || email || website || direccoes) && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--background)]/95 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="rotulo-forte truncate">{coudelaria.nome}</p>
              {sitio && <p className="meta truncate">{sitio}</p>}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {email && (
                <a
                  href={email}
                  aria-label={f.enviar_email}
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--raio-sm)] border border-[var(--border-soft)] text-[var(--foreground-strong)]"
                >
                  <Mail size={16} aria-hidden="true" />
                </a>
              )}
              {telefone ? (
                <a href={telefone} className="btn btn-primario">
                  <Phone size={15} aria-hidden="true" />
                  {f.telefonar}
                </a>
              ) : website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="btn btn-primario"
                >
                  <Globe size={15} aria-hidden="true" />
                  {f.ver_website}
                </a>
              ) : direccoes ? (
                <a
                  href={direccoes}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primario"
                >
                  <Navigation size={15} aria-hidden="true" />
                  {f.como_chegar}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Peças ────────────────────────────────────────────────────────────────────

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="titulo-pagina mb-4 flex items-center gap-2.5">
      <span className="h-5 w-px bg-[var(--border)]" aria-hidden="true" />
      {children}
    </h2>
  );
}

function DadoCavalo({
  rotulo,
  valor,
  numerico,
  largo,
}: {
  rotulo: string;
  valor: string;
  numerico?: boolean;
  largo?: boolean;
}) {
  return (
    <div className={largo ? "col-span-2" : ""}>
      <dt className="rotulo">{rotulo}</dt>
      <dd
        className={`m-0 text-sm text-[var(--foreground-secondary)] ${
          numerico ? "font-mono tabular-nums" : ""
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}

/** Nome, sítio e as duas ou três medidas que se lêem de relance. */
function CabecalhoTexto({
  coudelaria,
  sitio,
  rotuloFundada,
  rotuloCavalos,
  urlPagina,
  sobreFoto,
  monograma,
  rotuloSemFoto,
}: {
  coudelaria: CoudelariaFicha;
  sitio: string;
  rotuloFundada: string;
  rotuloCavalos: string;
  urlPagina: string;
  sobreFoto?: boolean;
  /** Iniciais a mostrar quando não há fotografia nenhuma. */
  monograma?: string;
  /** O que o leitor de ecrã ouve no lugar da fotografia que não existe. */
  rotuloSemFoto?: string;
}) {
  return (
    <div className="min-w-0">
      {/* Sem fotografia, a mesma chapa tipográfica que o cartão da listagem
          desenha — as iniciais em mono, saltando o «Coudelaria» que está em
          quase todos os nomes. Quem chega aqui vindo do cartão reconhece a
          marca em vez de encontrar um cabeçalho estranho. */}
      {monograma ? (
        <p
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[var(--raio)] border border-[var(--border-soft)] bg-[var(--elevate-1)] font-mono text-xl tracking-widest text-[var(--foreground-muted)]"
          aria-hidden="true"
        >
          {monograma}
        </p>
      ) : null}
      {monograma && rotuloSemFoto ? <span className="sr-only">{rotuloSemFoto}</span> : null}
      {coudelaria.ano_fundacao ? (
        // Sobre a fotografia o `.rotulo` ténue desaparece; aí sobe um degrau.
        <p className={`rotulo mb-2 ${sobreFoto ? "text-[var(--foreground-secondary)]" : ""}`}>
          {rotuloFundada} <span className="font-mono tabular-nums">{coudelaria.ano_fundacao}</span>
        </p>
      ) : null}
      <h1
        className={`mb-3 text-3xl leading-tight sm:text-5xl ${
          sobreFoto ? "text-[var(--foreground-strong)]" : "titulo-gradiente"
        }`}
      >
        {coudelaria.nome}
      </h1>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--foreground-secondary)]">
        {sitio && (
          <span className="flex items-center gap-2">
            <MapPin size={14} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            {sitio}
          </span>
        )}
        {coudelaria.num_cavalos ? (
          <span className="flex items-center gap-2">
            <Users size={14} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            <span>
              <span className="font-mono tabular-nums">{coudelaria.num_cavalos}</span>{" "}
              {rotuloCavalos}
            </span>
          </span>
        ) : null}
      </div>
      <AccoesCoudelaria
        slug={coudelaria.slug}
        nome={coudelaria.nome}
        localizacao={coudelaria.localizacao || undefined}
        url={urlPagina}
      />
    </div>
  );
}
