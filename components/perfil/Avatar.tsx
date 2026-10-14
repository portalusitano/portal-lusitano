"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { iniciaisDe } from "./iniciais";

/**
 * O retrato de uma pessoa. **Um componente, em todo o lado.**
 *
 * Caixa de entrada, cabeça do fio, blocos de mensagens, barra de navegação e
 * área da conta usam este e mais nenhum. Cinco desenhos ligeiramente
 * diferentes da mesma coisa leem-se como cinco sítios, e é o mesmo argumento
 * que o `CLAUDE.md` faz para haver **um** componente de entrada ao entrar no
 * ecrã e **um** vidro.
 *
 * ── Os tamanhos são do sistema ────────────────────────────────────────────
 *
 * Quatro degraus, e cada um tem um sítio onde é medido:
 *
 *   `sm`  28px  o bloco de mensagem e a barra de navegação
 *   `md`  44px  a linha da caixa de entrada e a cabeça do fio — o mesmo
 *               número que a fotografia do anúncio já usava, para os dois
 *               assentarem na mesma coluna
 *   `lg`  64px  a área da conta
 *   `xl` 112px  o editor, onde é o assunto do ecrã
 *
 * Os números vivem em tokens no CSS (`--avatar-sm`…`--avatar-xl`) e não no
 * JSX, pela mesma razão por que as durações vivem no `globals.css`: um número
 * escrito à mão dentro de um componente é um número que ninguém encontra.
 *
 * ── Sem fotografia não há rectângulo cinzento ─────────────────────────────
 *
 * A regra da ficha rápida do globo, aplicada às pessoas. Quem não tem
 * fotografia fica com as **iniciais** sobre uma superfície do sistema; quem
 * não tem sequer nome — o «Comprador interessado» que a camada de dados
 * inventa, seis das trinta conversas do banco de ensaio — fica com o ícone de
 * pessoa, que não afirma nada. O porquê está escrito no `iniciais.ts`.
 *
 * **Nada de cores geradas por hash.** Este site tem um acento e não uma
 * paleta.
 *
 * ── Acessibilidade ────────────────────────────────────────────────────────
 *
 * Por omissão o retrato é **decoração**: em quase todos os sítios onde
 * aparece, o nome está escrito ao lado, e uma fotografia com o mesmo nome por
 * baixo faz um leitor de ecrã dizer a mesma coisa duas vezes. Nesse caso vai
 * `alt=""` e o resto fica `aria-hidden`.
 *
 * Onde o retrato está **sozinho** — a barra de navegação — quem o usa passa
 * `rotulo`, e aí ele ganha um nome acessível a sério.
 */

export type TamanhoDoAvatar = "sm" | "md" | "lg" | "xl";

/** Os pixéis de cada degrau, para o `sizes` do `next/image`. */
const PIXEIS: Record<TamanhoDoAvatar, number> = { sm: 28, md: 44, lg: 64, xl: 112 };

interface Props {
  /** O nome de quem se está a retratar. Pode ser nulo — há esse caso na base. */
  nome?: string | null;
  /** A fotografia, quando existe. */
  src?: string | null;
  tamanho?: TamanhoDoAvatar;
  /**
   * O nome acessível, quando o retrato está sozinho no ecrã. Sem ele o
   * retrato é decoração — que é o que ele é sempre que o nome está ao lado.
   */
  rotulo?: string;
  className?: string;
}

export default function Avatar({ nome, src, tamanho = "md", rotulo, className }: Props) {
  /**
   * ── Uma fotografia que não carrega volta a ser iniciais ─────────────────
   *
   * Sem isto, um `src` que falha deixa a caixa **vazia**: um disco escuro do
   * tamanho de uma cara, sem nada lá dentro, e as iniciais — que existem
   * exactamente para este momento — nunca chegam a ser desenhadas, porque o
   * ramo delas só corre quando não há `src`.
   *
   * Apanhado no ecrã, medido: quatro das oito primeiras linhas da caixa de
   * entrada com `naturalWidth` a zero e um disco vazio no lugar do retrato.
   * Ali a causa era do banco de ensaio, mas as causas em produção não faltam e
   * nenhuma delas é rara — um ficheiro apagado, o balde fora do ar, um
   * endereço que o `remotePatterns` do `next.config` não conhece (esse
   * devolve **400** e não uma imagem), ou simplesmente estar sem rede a meio
   * do carregamento.
   *
   * Um disco vazio não é um estado que este componente saiba dizer. Ele sabe
   * dizer três coisas — uma cara, umas iniciais, ou um ícone de pessoa —, e
   * quando a primeira não vem a resposta certa é a segunda, que é a mesma que
   * se daria a quem nunca pôs fotografia.
   *
   * Guarda-se **qual** o endereço que falhou, e não um sim/não. Assim, quem
   * acaba de trocar a fotografia tem a nova tentada de graça — a comparação
   * deixa de bater — sem um efeito a repor estado, que é uma renderização em
   * cascata a pagar por uma coisa que a própria comparação já diz.
   */
  const [srcFalhado, setSrcFalhado] = useState<string | null>(null);
  const falhou = !!src && srcFalhado === src;

  const iniciais = iniciaisDe(nome);
  const decorativo = !rotulo;
  const lado = PIXEIS[tamanho];

  /* Um só nó com um só papel: ou tem nome acessível ou está escondido. Meter
     `aria-hidden` num elemento e um `aria-label` no mesmo é uma contradição
     que cada leitor de ecrã resolve à sua maneira. */
  const acessibilidade = decorativo
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": rotulo } as const);

  return (
    <span
      data-avatar={tamanho}
      className={className ? `avatar ${className}` : "avatar"}
      {...acessibilidade}
    >
      {src && !falhou ? (
        /* `alt=""` sempre: o nome acessível, quando é preciso, está no
           invólucro. Duas fontes de nome no mesmo sítio é o defeito que este
           componente existe para não repetir em cinco sítios. */
        <Image
          src={src}
          alt=""
          width={lado}
          height={lado}
          sizes={`${lado}px`}
          className="avatar__foto"
          onError={() => setSrcFalhado(src)}
        />
      ) : iniciais ? (
        <span className="avatar__iniciais">{iniciais}</span>
      ) : (
        <User size={Math.round(lado * 0.44)} strokeWidth={1.5} aria-hidden="true" />
      )}
    </span>
  );
}
