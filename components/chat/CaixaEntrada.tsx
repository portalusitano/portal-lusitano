"use client";

import Image from "next/image";
import { AlertTriangle, MessagesSquare } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";
import type { ChatConversa } from "@/lib/marketplace-chat";
import Avatar from "@/components/perfil/Avatar";
import { nomeParaRetrato, retratoDaOutraParte } from "@/components/perfil/outra-parte";
import { quandoNaLista } from "./formatar";

interface Props {
  conversas: (ChatConversa & { outraParteFoto?: string | null })[];
  abertaId: string | null;
  aCarregar: boolean;
  erro: string | null;
  onAbrir: (c: ChatConversa) => void;
  onTentarDeNovo: () => void;
  registarLinha: (id: string, n: HTMLButtonElement | null) => void;
}

/**
 * Sete linhas de esqueleto — as que cabem numa coluna de conversas.
 *
 * Medido antes: 700ms depois de entrar na página, a caixa de entrada tinha
 * **zero linhas e nada escrito**, exactamente como quando não há conversa
 * nenhuma. «Ainda não carregou» e «não há» diziam a mesma coisa: nada. O
 * `animate-pulse` é a excepção que o `CLAUDE.md` aceita aos ciclos infinitos,
 * porque só existe enquanto o conteúdo não chegou.
 */
function Esqueleto() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="chat-esqueleto__linha animate-pulse">
          <div className="chat-esqueleto__bloco h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="chat-esqueleto__bloco h-3" style={{ width: `${52 + (i % 3) * 12}%` }} />
            <div
              className="chat-esqueleto__bloco h-2.5"
              style={{ width: `${68 - (i % 4) * 9}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CaixaEntrada({
  conversas,
  abertaId,
  aCarregar,
  erro,
  onAbrir,
  onTentarDeNovo,
  registarLinha,
}: Props) {
  const { t, language } = useLanguage();

  if (aCarregar) {
    return (
      <>
        <p className="sr-only" role="status">
          {t.chat.a_carregar}
        </p>
        <Esqueleto />
      </>
    );
  }

  if (erro) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle
          size={18}
          className="mx-auto mb-3"
          style={{ color: "var(--erro)" }}
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--foreground-secondary)]">{erro}</p>
        <button onClick={onTentarDeNovo} className="btn btn-secundario btn-sm mt-5">
          {t.chat.tentar_de_novo}
        </button>
      </div>
    );
  }

  if (conversas.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessagesSquare
          size={22}
          className="mx-auto mb-4 text-[var(--foreground-secondary)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--foreground-strong)]">{t.chat.vazio_titulo}</p>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-[var(--foreground-secondary)]">
          {t.chat.vazio_nota}
        </p>
        <LocalizedLink href="/comprar" className="btn btn-secundario btn-sm mt-6 inline-flex">
          {t.chat.vazio_accao}
        </LocalizedLink>
      </div>
    );
  }

  return (
    <ul>
      {conversas.map((c) => (
        <li key={c.id}>
          <button
            ref={(n) => registarLinha(c.id, n)}
            onClick={() => onAbrir(c)}
            /* Escolhida, e branca — a mesma regra do `.chip-activo`. O
               `aria-current` não é decoração: é o que diz a quem ouve a página
               qual das trinta linhas é a que está aberta ao lado. */
            aria-current={c.id === abertaId ? "true" : undefined}
            className="chat-linha"
          >
            {/* ── Quem escreveu, e não só sobre que cavalo ──────────────────
                Medido antes, nas duas vistas: das trinta linhas, **zero**
                mostravam seja o que for sobre a pessoa do outro lado — só o
                anúncio. E o nome assentava em **duas abcissas**, 16px nas oito
                linhas sem fotografia do anúncio e 72px nas vinte e duas com:
                uma coluna de nomes com dois começos não é uma coluna.

                O retrato resolve as duas de uma vez, porque está sempre lá.
                Quem não tem fotografia leva iniciais, e quem nem nome tem —
                seis das trinta — leva o ícone de pessoa: um rectângulo
                cinzento a fingir uma fotografia é o que o `CLAUDE.md` proíbe
                na ficha rápida do globo, e «CI» dentro de um disco seria pior,
                porque as quatro conversas de «Comprador interessado» ficariam
                com o mesmo carimbo.

                A fotografia do anúncio não se perde: passa a um selo pequeno
                ao canto do retrato, que é onde ela responde à pergunta que faz
                — «de que cavalo é esta conversa?» — sem disputar o lugar de
                quem a escreveu. */}
            <span className="chat-retrato">
              <Avatar
                nome={nomeParaRetrato(c.outraParte)}
                src={retratoDaOutraParte(c)}
                tamanho="md"
              />
              {c.cavaloFoto && (
                <span className="chat-retrato__anuncio">
                  <Image src={c.cavaloFoto} alt="" fill sizes="20px" className="object-cover" />
                </span>
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="chat-linha__nome">{c.outraParte}</span>
                <span className="chat-linha__hora">
                  {quandoNaLista(c.ultimaMensagemAt, language, t)}
                </span>
              </span>
              <span className="chat-linha__cavalo mt-0.5 block">
                {c.papel === "comprador" ? t.chat.papel_compra : t.chat.papel_venda} ·{" "}
                {c.cavaloNome}
              </span>
              {c.ultimaMensagem && (
                <span className="chat-linha__resumo mt-1 block">{c.ultimaMensagem}</span>
              )}
            </span>

            {c.porLer > 0 && (
              <span className="chat-conta mt-0.5">
                {c.porLer}
                <span className="sr-only"> {t.chat.por_ler}</span>
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
