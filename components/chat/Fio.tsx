"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowDown, Check, CheckCheck, Clock } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";
import { LISTING_STATUS } from "@/lib/marketplace-listings";
import { agruparFio, type ItemDoFio } from "./agrupar";
import { estadoDaMensagem, type EstadoEntrega, type MensagemNoEcra } from "./tipos";
import { horaDe, precoDoAnuncio, rotuloDoDia } from "./formatar";
import Redaccao, { type ManipuloDaRedaccao } from "./Redaccao";

export interface ConversaAberta {
  id: string;
  cavaloId: string;
  papel: "comprador" | "vendedor";
  outraParte: string;
  cavaloNome: string;
  cavaloFoto: string | null;
  cavaloPreco: number | null;
  cavaloStatus: string | null;
}

interface Props {
  conversa: ConversaAberta;
  mensagens: MensagemNoEcra[];
  aCarregar: boolean;
  rascunho: string;
  onRascunho: (v: string) => void;
  onEnviar: () => void;
  onRepetir: (id: string) => void;
  onVoltar: () => void;
  /** Ao largo os dois painéis convivem e não há caminho de volta a mostrar. */
  ecraLargo: boolean;
}

/** A partir daqui já não se está a ler o fim do fio — está-se a ler para trás. */
const PERTO_DO_FIM = 120;

function IconeDoEstado({ estado }: { estado: EstadoEntrega }) {
  if (estado === "a-enviar") return <Clock size={11} aria-hidden="true" />;
  /* Um visto para «saiu daqui», dois para «chegou lá». O que distingue
     entregue de lida é a palavra ao lado, e não o desenho: são o mesmo
     acontecimento visto por duas pessoas, e inventar um terceiro glifo era
     pedir a quem lê que decorasse uma legenda. */
  if (estado === "lida") return <CheckCheck size={12} aria-hidden="true" />;
  if (estado === "entregue") return <CheckCheck size={12} aria-hidden="true" />;
  if (estado === "enviada") return <Check size={12} aria-hidden="true" />;
  return null;
}

/**
 * O fio de uma conversa.
 *
 * ## O rolo é da lista, não da página
 *
 * Medido antes: o documento inteiro rolava e o compositor abria **fora do
 * ecrã** nas duas vistas (topo em y=744 numa janela de 700; y=994 numa de
 * 950). Aqui a coluna tem três linhas — cabeça, rolo, compositor — e só a do
 * meio rola.
 *
 * ## E o rolo não é arrancado a quem está a ler para trás
 *
 * O código anterior chamava `scrollIntoView` a **cada mudança da lista**.
 * Medido: com o fio a meio (rolo em 300) e uma mensagem enviada, a página
 * saltava para 2180 no telemóvel e 1850 no computador. Aqui só se desce
 * sozinho em dois casos honestos: quando a mensagem é minha — carreguei em
 * enviar, quero vê-la sair — e quando já se estava no fim. A ler para trás,
 * quem chega é anunciado por um botão que não mexe em nada até ser tocado.
 * É a mesma ideia que o `CLAUDE.md` defende para a ficha rápida do globo: o
 * alvo não foge de debaixo do dedo de quem está a usar o ecrã.
 */
export default function Fio({
  conversa,
  mensagens,
  aCarregar,
  rascunho,
  onRascunho,
  onEnviar,
  onRepetir,
  onVoltar,
  ecraLargo,
}: Props) {
  const { t, language } = useLanguage();
  const rolo = useRef<HTMLDivElement>(null);
  const redaccao = useRef<ManipuloDaRedaccao | null>(null);

  /**
   * Os dois avisos que dependem da mesma medição vivem num estado só.
   *
   * São a mesma pergunta — «chegou coisa nova e onde é que eu estava a ler?» —
   * e a resposta a ela só existe depois do layout, porque é preciso saber a
   * que distância do fim está o rolo. Um estado só é também um `setState` só,
   * que é o que importa à regra que está aqui em baixo.
   */
  const [aviso, setAviso] = useState({ haNovas: false, anuncio: "" });

  // O que já se sabia da última vez, para distinguir «chegou agora» de «está
  // aqui desde que se abriu». Sem isto, abrir um fio de vinte e quatro
  // mensagens leria as vinte e quatro em voz alta. Não precisa de ser reposto
  // ao mudar de conversa: quem monta o `Fio` dá-lhe uma `key` com o
  // identificador dela, por isso mudar de conversa é um componente novo.
  const ultimaConhecida = useRef<string | null>(null);

  const desceAoFim = useCallback((suave: boolean) => {
    const el = rolo.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
    setAviso((a) => (a.haNovas ? { ...a, haNovas: false } : a));
  }, []);

  useLayoutEffect(() => {
    if (aCarregar || mensagens.length === 0) return;
    const el = rolo.current;
    if (!el) return;

    const ultima = mensagens[mensagens.length - 1];
    const primeiraVez = ultimaConhecida.current === null;
    const novidade = !primeiraVez && ultima.id !== ultimaConhecida.current;
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < PERTO_DO_FIM;
    ultimaConhecida.current = ultima.id;

    // Descer é uma escrita no DOM, não estado: abrir um fio põe-no no fim sem
    // animação — um fio que se compõe a rolar sozinho é um fio que ninguém
    // consegue ler enquanto ele corre.
    if (primeiraVez || ultima.minha || perto) {
      el.scrollTo({ top: el.scrollHeight, behavior: primeiraVez ? "auto" : "smooth" });
    }

    // Só a que chega da outra parte é que se anuncia. As minhas já as escrevi
    // eu, e cada tecla anunciada seria uma região viva a falar por cima de
    // quem está a escrever.
    const haNovas = novidade && !ultima.minha && !perto;
    const anuncio =
      novidade && !ultima.minha ? `${conversa.outraParte}: ${ultima.corpo.slice(0, 180)}` : null;
    if (!haNovas && anuncio === null) return;

    /* A regra `react-hooks/set-state-in-effect` está certa quase sempre, e a
       excepção aqui é a razão de ela existir ao contrário: o que decide estes
       dois avisos é **a distância a que o rolo está do fim**, e essa medida só
       existe depois do layout. Não há maneira de a derivar durante o render.
       É um `setState` só, corre uma vez por mensagem que chega, e o caso em
       que nada muda sai na linha acima sem tocar em estado nenhum. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAviso((a) => ({
      haNovas: haNovas || a.haNovas,
      anuncio: anuncio ?? a.anuncio,
    }));
  }, [mensagens, aCarregar, conversa.outraParte]);

  /**
   * O foco vai com quem entra, e assenta na cabeça do fio.
   *
   * Na cabeça e não no compositor: quem entra numa conversa lê-a antes de
   * responder, e um leitor de ecrã que começasse na caixa de escrever saltava
   * por cima do que a outra pessoa acabou de dizer.
   *
   * E nas **duas** vistas, não só na estreita. Ao largo os dois painéis
   * convivem, e a tentação é deixar o foco na linha em que se carregou — mas
   * medido no banco de ensaio, a caixa de entrada tem trinta linhas, e da
   * primeira até ao compositor vão trinta paragens de tabulação. Escolher uma
   * conversa é um acto explícito, com o rato ou com o Enter; levar o foco com
   * ele é o que a `.pilha` do `/mapa` já faz, e com rato não se vê nada porque
   * o anel é `:focus-visible`.
   */
  useEffect(() => {
    const el = rolo.current?.closest(".chat-coluna")?.querySelector<HTMLElement>("[data-foco]");
    el?.focus({ preventScroll: true });
  }, [conversa.id]);

  const itens: ItemDoFio[] = agruparFio(mensagens);
  const preco = precoDoAnuncio(conversa.cavaloPreco, language);
  const vendido = conversa.cavaloStatus === LISTING_STATUS.VENDIDO;
  const reservado = conversa.cavaloStatus === LISTING_STATUS.RESERVADO;

  return (
    <div className="chat-coluna">
      {/* ── A cabeça: o assunto da conversa, uma vez ────────────────────── */}
      <div className="chat-cabeca">
        {!ecraLargo && (
          <button
            type="button"
            onClick={onVoltar}
            aria-label={t.chat.voltar}
            className="chat-atalho -ml-2"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        )}

        <div className="chat-assunto">
          {/* Sem fotografia não há fotografia — nem um rectângulo cinzento a
              fingir uma. É a regra que o `CLAUDE.md` escreve para a ficha
              rápida do globo, e a razão é a mesma: um rectângulo com um ícone
              de imagem promete uma fotografia que não existe, e ocupa o lugar
              dela em oito das trinta conversas do banco de ensaio. */}
          {conversa.cavaloFoto && (
            <div className="chat-assunto__foto">
              <Image src={conversa.cavaloFoto} alt="" fill sizes="44px" className="object-cover" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* `tabIndex={-1}` e `data-foco`: é aqui que o foco assenta ao
                entrar, tal como a `.pilha` do `/mapa` faz. */}
            <h2
              data-foco=""
              tabIndex={-1}
              className="truncate text-sm text-[var(--foreground-strong)] outline-none"
            >
              {conversa.outraParte}
            </h2>
            <p className="flex items-center gap-2 text-[11px] leading-tight text-[var(--foreground-secondary)]">
              <LocalizedLink
                href={`/comprar/${conversa.cavaloId}`}
                className="chat-assunto__anuncio"
              >
                {conversa.cavaloNome}
              </LocalizedLink>
              {/* O preço, uma vez por conversa. Não vai nas linhas da caixa de
                  entrada: trinta preços dourados numa coluna deixariam de ser
                  um acento e passariam a ser uma segunda cor de texto. */}
              {preco && <span className="preco shrink-0 text-[11px]">{preco}</span>}
            </p>
          </div>

          {/* Vendido ou reservado é um facto sobre o assunto, e é branco: o
              `.selo-destaque` dourado é para o que é raro, e um anúncio
              vendido não é uma recomendação. */}
          {(vendido || reservado) && (
            <span className="selo selo-neutro shrink-0">
              {vendido ? t.chat.vendido : t.chat.reservado}
            </span>
          )}
        </div>
      </div>

      {/* ── O rolo ───────────────────────────────────────────────────────── */}
      <div ref={rolo} className="chat-coluna__rolo">
        <div className="chat-fio">
          {aCarregar ? (
            <div aria-hidden="true" className="space-y-3 py-4">
              {[68, 44, 80, 52].map((largura, i) => (
                <div
                  key={i}
                  className={`chat-esqueleto__bloco h-12 animate-pulse ${i % 2 ? "ml-auto" : ""}`}
                  style={{ width: `${largura}%`, maxWidth: "22rem" }}
                />
              ))}
            </div>
          ) : (
            itens.map((item) =>
              item.tipo === "dia" ? (
                <p key={`d-${item.chave}`} className="chat-dia">
                  <span className="chat-dia__texto">
                    {rotuloDoDia(item.categoria, item.data, language, t)}
                  </span>
                </p>
              ) : (
                <BlocoDeFio
                  key={item.chave}
                  minha={item.minha}
                  mensagens={item.mensagens}
                  lingua={language}
                  onRepetir={onRepetir}
                  rotuloRepetir={t.chat.repetir}
                  rotulos={{
                    "a-enviar": t.chat.estado_a_enviar,
                    enviada: t.chat.estado_enviada,
                    entregue: t.chat.estado_entregue,
                    lida: t.chat.estado_lida,
                    falhou: t.chat.estado_falhou,
                  }}
                />
              )
            )
          )}

          {aviso.haNovas && (
            <button
              type="button"
              onClick={() => desceAoFim(true)}
              className="chat-ha-novas vidro-leve"
            >
              <ArrowDown size={13} aria-hidden="true" />
              {t.chat.ha_novas}
            </button>
          )}
        </div>
      </div>

      {/* A região viva vive fora do rolo: dentro dele, o browser conta-lhe a
          altura e ela empurrava o fio meio pixel a cada anúncio. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {aviso.anuncio}
      </p>

      <Redaccao
        valor={rascunho}
        onChange={onRascunho}
        onEnviar={onEnviar}
        aEnviar={mensagens.some((m) => m.aEnviar)}
        manipulo={redaccao}
      />
    </div>
  );
}

function BlocoDeFio({
  minha,
  mensagens,
  lingua,
  onRepetir,
  rotuloRepetir,
  rotulos,
}: {
  minha: boolean;
  mensagens: MensagemNoEcra[];
  lingua: string;
  onRepetir: (id: string) => void;
  rotuloRepetir: string;
  rotulos: Record<EstadoEntrega, string>;
}) {
  const ultima = mensagens[mensagens.length - 1];
  const estado = estadoDaMensagem(ultima);

  return (
    <div className="chat-bloco" data-minha={minha ? "sim" : "nao"}>
      {mensagens.map((m) => (
        <p
          key={m.id}
          className="chat-balao"
          data-minha={minha ? "sim" : "nao"}
          data-estado={estadoDaMensagem(m) ?? undefined}
        >
          {m.corpo}
        </p>
      ))}

      <p className="chat-rodape-bloco" data-estado={estado ?? undefined}>
        {estado === "falhou" ? (
          <>
            <span>{rotulos.falhou}</span>
            <button type="button" onClick={() => onRepetir(ultima.id)} className="chat-repetir">
              {rotuloRepetir}
            </button>
          </>
        ) : (
          <>
            <time dateTime={ultima.createdAt}>{horaDe(ultima.createdAt, lingua)}</time>
            {estado && (
              <>
                <IconeDoEstado estado={estado} />
                <span className="sr-only">{rotulos[estado]}</span>
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}
