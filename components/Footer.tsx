"use client";

import { memo, useMemo, Fragment } from "react";
import Image from "next/image";
import LocalizedLink from "@/components/LocalizedLink";
import { ArrowUpRight, Globe, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { eRotaSemRodape } from "@/lib/rotas-sem-rodape";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "@/lib/constants";
import { abrirConsentimento } from "@/lib/consentimento";

/**
 * ── Três faixas, e cada uma responde a uma pergunta diferente ─────────────
 *
 * O rodapé anterior era uma grelha de quatro listas e mais nada: quem
 * chegasse ao fim da página encontrava dezanove ligações sem uma linha a
 * dizer onde tinha chegado. As três faixas de cima respondem, por ordem, às
 * três perguntas que alguém faz nesse sítio — **o que é isto**, **por onde
 * começo**, e **onde está o resto**:
 *
 *   ┌ a marca e uma frase ─┬─ dois destinos com legenda ─┬─ o índice ─┐
 *
 * A frase da esquerda não repete a barra de navegação: a barra diz o **nome**
 * do site em todas as páginas e nunca diz o que ele **é**. É por isso que o
 * letreiro grande que aqui esteve saiu e esta marca pequena entrou — não é o
 * mesmo elemento a voltar, é a legenda que faltava, com o nome do tamanho de
 * uma assinatura.
 *
 * A faixa dos destaques absorve o convite a publicar anúncio que ocupava uma
 * linha inteira do rodapé antigo. Não se perdeu nada e não se duplicou nada:
 * o mesmo destino, agora ao lado do outro sítio por onde se começa aqui.
 *
 * ── O acento é um, e é o que a casa já lhe consentia ──────────────────────
 *
 * A referência que deu origem a este desenho pinta a linha de contacto e os
 * ícones dos destaques com o acento dela. Aqui o `CLAUDE.md` é taxativo: o
 * dourado é **do tamanho de um ícone**, é **um só em todo o site**, e a lista
 * dos sítios onde ele pode estar é fechada — a ferradura da marca, o
 * sublinhado da navegação activa, o CTA de publicar anúncio, o
 * `.selo-destaque` e os graus do pedigree. Publicar anúncio está nessa lista,
 * e é por isso que **só** o quadrado desse destaque leva dourado. O segundo
 * destaque e a linha de contacto ficam a branco, que sobre preto é quem
 * assinala uma escolha.
 *
 * ── A tinta do índice: 3,66:1 medidos, e nenhuma razão para os manter ────
 *
 * As onze ligações do índice escreviam-se com `.meta`, que é
 * `--foreground-muted` (`#666`). Sobre o preto puro do fundo isso dá
 * **3,66:1** — abaixo dos 4,5 exigidos, num rodapé que aparece em todas as
 * páginas do site. A `.meta` é a tinta de uma legenda, e uma ligação não é
 * uma legenda: é o próprio destino. Passam para `--foreground-secondary`
 * (`#a1a4a5`), que dá **8,37:1**, que é a mesma decisão que este ficheiro já
 * tomou para a `.fc-nota` da ficha e para a `.vc-nota` do formulário, e pela
 * mesma razão. O mesmo vale para a linha legal, que estava com a mesma tinta
 * e onde estão o Livro de Reclamações e a resolução de litígios.
 *
 * Os `.rotulo` dos cabeçalhos ficam onde estavam: esses **são** legendas —
 * dizem de que é a coluna e não são para clicar —, e é para isso que a classe
 * existe. O aviso de direitos usava a `.rotulo` como forma e não como papel,
 * e por isso fica com a caixa e troca a tinta: é uma frase, não uma legenda.
 */

/**
 * A linha legal, toda com a mesma caixa.
 *
 * As externas eram `flex`, as internas ficavam em linha e o botão era
 * `inline-block`: em telemóvel a regra de 44px do `globals.css` só pegava
 * nalgumas, e a linha, ao dobrar, saía aos degraus com cada entrada a uma
 * altura diferente. Uma caixa só para as três resolve a altura e o
 * alinhamento ao mesmo tempo.
 */
const LINHA_LEGAL =
  "text-[0.6875rem] uppercase tracking-[0.08em] font-semibold leading-[1.2] text-[var(--foreground-secondary)] inline-flex items-center transition-colors hover:text-[var(--foreground-strong)]";

/**
 * Os cabeçalhos das colunas: a caixa da `.rotulo` com a tinta legível.
 *
 * A `.rotulo` é `--foreground-muted`, que sobre o preto puro do fundo dá
 * **3,66:1** — e um cabeçalho é texto como outro qualquer, por muito que o
 * papel dele seja de legenda. A classe fica onde está, porque é de todo o
 * site e trocar-lhe a tinta na origem é uma decisão que merece a sua própria
 * medição, noutro sítio que não um rodapé; aqui escreve-se a mesma caixa —
 * 11px, versaletes, o mesmo `tracking` — com `--foreground-secondary`.
 */
const ROTULO_LEGIVEL =
  "block text-[0.6875rem] uppercase tracking-[0.08em] font-semibold leading-[1.2] text-[var(--foreground-secondary)]";

/** As ligações do índice: ver a nota sobre a tinta, acima. */
const LINHA_INDICE =
  "text-xs leading-[1.4] text-[var(--foreground-secondary)] inline-flex items-center transition-colors duration-200 hover:text-[var(--foreground-strong)]";

/**
 * ── O rodapé não carrega as páginas por antecipação ───────────────────────
 *
 * O `<Link>` do App Router pede a rota de destino assim que a âncora chega a
 * 200px da janela. Numa página comprida o rodapé nunca lá chega; numa página
 * que é exactamente uma janela de altura, chega **toda**. A `/mapa` é
 * exactamente isso — a lona ocupa `100vh` —, e por isso o rodapé começa no
 * pixel a seguir à dobra e as dezanove ligações dele entram na margem dos
 * 200px logo no primeiro quadro.
 *
 * Medido no browser, `/mapa` em pt-PT, três carregamentos por vista, bytes
 * contados com `request.sizes()`:
 *
 *                          com prefetch      sem            diferença
 *   390×700   prefetch RSC   23 ped  97 200 B    4 ped  48 683 B
 *             JavaScript     39 ped 553 915 B   31 ped 460 221 B
 *             **total**      77 ped 1 450 577   47 ped 1 301 303   −149 274 B (−10,3%)
 *   1400×950  total          94 ped 1 509 696   79 ped 1 474 020   −35 676 B (−2,4%)
 *
 * No telemóvel são **cento e quarenta e nove mil bytes e trinta pedidos** que
 * toda a gente paga para que alguém possa não esperar. Não é só o payload das
 * rotas: prefazer uma rota traz também os pedaços de JavaScript dela, e é daí
 * que vem a maior parte (93 694 B).
 *
 * O que custa do outro lado, medido no mesmo build — o braço frio deita fora
 * os pedidos que trazem `next-router-prefetch: 1`, que é exactamente o que
 * este `prefetch={false}` faz: um clique numa ligação do rodapé até o destino
 * ter um título no ecrã passa de **272ms para 505ms** de mediana (223–353
 * contra 212–779, em rede local). E a espera não fica muda: quem a assinala é
 * a `RouteProgressBar` que o `ClientShell` já monta.
 *
 * A razão para aceitar essa troca não é o número, é o que o rodapé é. O
 * rodapé é um índice, não um caminho: ninguém navega o site através dele:
 * vai-se lá quando já se sabe para onde se quer ir — as devoluções, o
 * contacto, a privacidade, a minha conta. O caminho é a barra de cima, e essa
 * mantém o prefetch inteiro. Um índice pode custar um quarto de segundo; a
 * página que toda a gente abre não pode custar 149 KiB a quem nunca desce até
 * ele.
 *
 * Nota para quem vier a mexer: no App Router `prefetch={false}` desliga **também**
 * o prefetch ao passar o rato — o `mountLinkInstance` só regista a âncora
 * quando o prefetch está ligado, e é desse registo que o `onNavigationIntent`
 * depende. Não é como no Pages Router, onde o hover continuava a valer.
 */
export default memo(function Footer() {
  const { t } = useLanguage();
  const pathname = usePathname();

  // Comprar
  const col1 = useMemo(
    () => [
      { name: t.footer.buy_horse, href: "/comprar" },
      { name: t.footer.favorite_horses, href: "/cavalos-favoritos" },
      { name: t.footer.search_alerts, href: "/minha-conta/alertas" },
    ],
    [t.footer.buy_horse, t.footer.favorite_horses, t.footer.search_alerts]
  );

  // Vender
  const col2 = useMemo(
    () => [
      { name: t.footer.sell_horse, href: "/vender-cavalo" },
      { name: t.footer.my_listings, href: "/minha-conta/anuncios" },
      { name: t.footer.my_messages, href: "/minha-conta/mensagens" },
    ],
    [t.footer.sell_horse, t.footer.my_listings, t.footer.my_messages]
  );

  // Descobrir
  const col3 = useMemo(
    () => [
      { name: t.footer.studs, href: "/directorio" },
      { name: t.footer.map, href: "/mapa" },
    ],
    [t.footer.studs, t.footer.map]
  );

  // Portal
  const col4 = useMemo(
    () => [
      { name: t.nav.home, href: "/" },
      { name: t.footer.contact, href: "/contacto" },
      { name: t.footer.returns, href: "/devolucoes" },
    ],
    [t.nav.home, t.footer.contact, t.footer.returns]
  );

  // A última entrada não é uma página: reabre o pedido de consentimento.
  // Retirar o consentimento tem de ser tão fácil como tê-lo dado, e depois de
  // respondido o painel não volta sozinho — sem esta porta não havia volta.
  const legalLinks = useMemo(
    () => [
      {
        key: "reclamacoes",
        label: t.footer.complaints_book,
        href: "https://www.livroreclamacoes.pt",
        tipo: "externo" as const,
      },
      {
        key: "litigios",
        label: t.footer.dispute_resolution,
        href: "https://ec.europa.eu/consumers/odr",
        tipo: "externo" as const,
      },
      {
        key: "privacidade",
        label: t.footer.privacy,
        href: "/privacidade",
        tipo: "interno" as const,
      },
      { key: "termos", label: t.footer.terms, href: "/termos", tipo: "interno" as const },
      { key: "cookies", label: t.footer.cookie_settings, tipo: "accao" as const },
    ],
    [
      t.footer.complaints_book,
      t.footer.dispute_resolution,
      t.footer.privacy,
      t.footer.terms,
      t.footer.cookie_settings,
    ]
  );

  const socials = [
    { href: SOCIAL_LINKS.instagram, label: "Instagram" },
    { href: SOCIAL_LINKS.tiktok, label: "TikTok" },
    { href: `mailto:${CONTACT_EMAIL}`, label: "Email" },
  ];

  /**
   * ── Os cabeçalhos diziam outra coisa que não o que está debaixo deles ────
   *
   * As quatro listas estão comentadas no código, uma a uma, como «Comprar»,
   * «Vender», «Descobrir» e «Portal» — e escreviam-se no ecrã como
   * «Navegação», «Lusitano», «Ferramentas» e «Portal». Só a última coincidia.
   * «Lusitano» por cima de *Vender cavalo · Os meus anúncios · As minhas
   * mensagens* não é um cabeçalho vago: é um cabeçalho falso, e num índice o
   * cabeçalho é a única coisa que evita ler a coluna toda. As chaves antigas
   * ficam no dicionário porque outras páginas as usam; o que muda é qual
   * delas este sítio lê.
   */
  const cols = [
    { label: t.footer.group_buying, items: col1 },
    { label: t.footer.group_selling, items: col2 },
    { label: t.footer.group_discover, items: col3 },
    { label: t.footer.portal, items: col4 },
  ];

  /**
   * Os dois sítios por onde se começa aqui: publicar um cavalo, ou ir ver
   * quem os cria. Cada um leva uma legenda porque um nome sozinho não diz o
   * que lá está — e é justamente a legenda que faz disto um convite em vez de
   * mais duas entradas do índice, que já as tem noutra coluna.
   */
  const destaques = useMemo(
    () => [
      {
        href: "/vender-cavalo",
        Icone: Plus,
        nome: t.footer.sell_horse,
        nota: t.footer.sell_horse_subtitle,
        // O único dourado desta página: publicar anúncio está na lista
        // fechada de sítios onde a casa o consente.
        acento: true,
      },
      {
        href: "/mapa",
        Icone: Globe,
        nome: t.footer.map_title,
        nota: t.footer.map_subtitle,
        acento: false,
      },
    ],
    [t.footer.sell_horse, t.footer.sell_horse_subtitle, t.footer.map_title, t.footer.map_subtitle]
  );

  // Nas páginas de entrada o ecrã é só o painel, e no `/mapa` é só o mapa.
  // A razão de cada uma está no `lib/rotas-sem-rodape`.
  if (eRotaSemRodape(pathname)) return null;

  return (
    <footer className="bg-[var(--background)] relative overflow-hidden">
      {/* Costura com a secção de cima. */}
      <div className="h-px w-full bg-[var(--border-soft)]" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* ── AS TRÊS FAIXAS ───────────────────────────── */}
        <div
          className="grid gap-x-8 gap-y-10 py-10 sm:py-12 lg:grid-cols-12"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* O que é isto */}
          <div className="lg:col-span-4">
            <LocalizedLink
              prefetch={false}
              href="/"
              className="group inline-flex items-center gap-2.5"
            >
              <Image
                src="/logo.webp"
                alt=""
                aria-hidden="true"
                width={28}
                height={28}
                className="h-7 w-7 flex-shrink-0 object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="text-base font-semibold tracking-[0.01em] leading-none text-[var(--foreground-strong)]">
                Portal Lusitano
              </span>
            </LocalizedLink>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-[var(--foreground-secondary)]">
              {t.footer.tagline}
            </p>
          </div>

          {/* Por onde começo */}
          <div className="lg:col-span-4">
            <h3 className={ROTULO_LEGIVEL + " mb-4"}>{t.footer.start_here}</h3>
            <ul className="space-y-3.5">
              {destaques.map(({ href, Icone, nome, nota, acento }) => (
                <li key={href}>
                  <LocalizedLink
                    prefetch={false}
                    href={href}
                    className="group flex items-start gap-3"
                  >
                    <span
                      className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border border-[var(--border-soft)] bg-[var(--background-elevated)] transition-colors duration-200 group-hover:border-[var(--border-hover)] ${
                        acento ? "text-[var(--gold)]" : "text-[var(--foreground-strong)]"
                      }`}
                    >
                      <Icone size={14} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm leading-snug text-[var(--foreground-strong)]">
                        {nome}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-[var(--foreground-secondary)]">
                        {nota}
                      </span>
                    </span>
                  </LocalizedLink>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-xs leading-relaxed text-[var(--foreground-secondary)]">
              {t.footer.stud_owner}{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="break-all text-[var(--foreground-strong)] underline decoration-[var(--border-hover)] underline-offset-2 transition-colors hover:decoration-[var(--foreground-strong)]"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          {/* Onde está o resto */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:col-span-4">
            {cols.map((col) => (
              <nav key={col.label} aria-label={col.label}>
                <h3 className={ROTULO_LEGIVEL + " mb-3"}>{col.label}</h3>
                <ul className="space-y-1.5">
                  {col.items.map((item) => (
                    <li key={item.href}>
                      {/* `inline-flex` e não `inline`: a regra de 44px que o
                          `globals.css` tem para telemóvel é um `min-height`, e
                          um `min-height` não faz nada a um elemento em linha.
                          Medidos: 16px de altura em 390px de largura — onze
                          alvos de toque abaixo do mínimo, e a regra do sistema
                          calada sem dar sinal. Com o elemento a ser caixa, é a
                          própria regra que passa a valer, sem número novo. */}
                      <LocalizedLink prefetch={false} href={item.href} className={LINHA_INDICE}>
                        {item.name}
                      </LocalizedLink>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* ── LEGAL ─────────────────────────────────── */}
        <div className="py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {legalLinks.map((link, i) => (
              <Fragment key={link.key}>
                {i > 0 && (
                  <span
                    className="text-[var(--foreground-muted)]/20 text-[10px] select-none"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                )}
                {link.tipo === "externo" ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINHA_LEGAL + " gap-1"}
                  >
                    {link.label}
                    <ArrowUpRight size={8} aria-hidden="true" />
                  </a>
                ) : link.tipo === "interno" ? (
                  <LocalizedLink prefetch={false} href={link.href} className={LINHA_LEGAL}>
                    {link.label}
                  </LocalizedLink>
                ) : (
                  <button type="button" onClick={abrirConsentimento} className={LINHA_LEGAL}>
                    {link.label}
                  </button>
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* ── COPYRIGHT ─────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          {/* A `.rotulo` é a caixa certa (11px, versaletes) e a tinta errada:
              esta linha é uma frase, não a legenda de uma coluna. Fica com a
              forma e troca a tinta, pela mesma conta do cabeçalho. */}
          <p className={LINHA_LEGAL} suppressHydrationWarning>
            © {new Date().getFullYear()} Portal Lusitano · {t.footer.rights}
          </p>

          {/* As redes em palavra, não em quadrado. Três ícones de marca lado a
              lado traziam três cores que o sistema não tem. */}
          <div className="flex items-center gap-5">
            {socials.map((rede) => (
              <a
                key={rede.label}
                href={rede.href}
                target={rede.href.startsWith("http") ? "_blank" : undefined}
                rel={rede.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={LINHA_INDICE + " gap-1"}
              >
                {rede.label}
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
});
