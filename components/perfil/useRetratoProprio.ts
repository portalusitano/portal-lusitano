"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { lerPerfil, type Perfil } from "./api";

/**
 * O meu retrato e o meu nome, para os sítios que os mostram.
 *
 * ── Porque é que isto não é um `Provider` em `app/providers.tsx` ──────────
 *
 * Porque custaria a toda a gente. O pedido do dono diz, por escrito, que o
 * site não pode ficar mais pesado para quem nunca abre o chat, e um provider
 * a mais na raiz é JavaScript em **todas** as páginas — incluindo a inicial,
 * que mede 1 101 996 bytes de JS em telemóvel e onde ninguém tem perfil para
 * ver.
 *
 * Em vez disso, uma cache ao nível do módulo e um `useState`. Quem não importa
 * este ficheiro não paga nada; quem o importa duas vezes na mesma página faz
 * **um** pedido, porque a promessa é partilhada.
 *
 * ── E porque é que a primeira resposta não vem da rede ────────────────────
 *
 * O `user_metadata` da sessão já está no browser quando a página monta — o
 * `AuthProvider` foi buscá-lo de qualquer maneira. Se o retrato lá estiver,
 * desenha-se **no primeiro quadro**, sem pedido nenhum e sem o piscar de
 * iniciais-e-depois-fotografia que se vê em metade dos sítios que fazem isto.
 * A rota só se pergunta quando o `user_metadata` não sabe.
 *
 * É a mesma forma do envio optimista do chat: o que já se sabe aparece já, e
 * o servidor confirma depois.
 */

/** Uma promessa por sessão, partilhada por todos os que perguntem. */
let emCurso: Promise<Perfil | null> | null = null;
let sabido: Perfil | null | undefined;
let paraQuem: string | null = null;

/** Esquecer o que se sabe — depois de gravar ou apagar o retrato. */
export function esquecerPerfil(novo?: Perfil) {
  emCurso = null;
  sabido = novo;
  for (const ouvinte of ouvintes) ouvinte(novo ?? null);
}

const ouvintes = new Set<(p: Perfil | null) => void>();

function retratoDaSessao(metadata: Record<string, unknown> | undefined): Perfil | null {
  if (!metadata) return null;
  const url = metadata.avatar_url;
  const nome = metadata.full_name;
  if (typeof url !== "string" || url.length === 0) return null;
  return { fotografia: url, nome: typeof nome === "string" ? nome : null };
}

export function useRetratoProprio(): { perfil: Perfil | null; recarregar: () => void } {
  const { user } = useAuth();
  const id = user?.id ?? null;

  /* O que a sessão já sabe, sem pedir nada a ninguém. Derivado no render
     porque é uma leitura pura do que o `AuthProvider` já tem. */
  const daSessao = retratoDaSessao(user?.user_metadata);
  const [perfil, setPerfil] = useState<Perfil | null>(() => sabido ?? daSessao);

  useEffect(() => {
    const ouvinte = (p: Perfil | null) => setPerfil(p);
    ouvintes.add(ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
    };
  }, []);

  useEffect(() => {
    /* Trocar de sessão é deitar a cache fora: o retrato de quem saiu não pode
       ficar no canto da barra de quem entrou.

       Isto vive num efeito e **não** no corpo do render de propósito. Escrever
       em estado de módulo durante o render é um efeito colateral no meio de
       uma função que o React pode chamar duas vezes, descartar a meio, ou
       correr para uma árvore que nunca chega a ser pintada — e o `StrictMode`
       do desenvolvimento faz exactamente a primeira. O sintoma seria a cache
       limpa por um render que foi deitado fora, e um pedido a mais por cada
       montagem. */
    if (id !== paraQuem) {
      paraQuem = id;
      emCurso = null;
      sabido = undefined;
    }

    if (!id) {
      setPerfil(null);
      return;
    }
    // Já se sabe pela sessão, ou já se perguntou: não se pergunta outra vez.
    if (sabido !== undefined) {
      setPerfil(sabido);
      return;
    }
    if (daSessao) {
      setPerfil(daSessao);
      return;
    }

    let vivo = true;
    emCurso ??= lerPerfil();
    emCurso.then((p) => {
      sabido = p;
      if (vivo) setPerfil(p);
    });
    return () => {
      vivo = false;
    };
    // `daSessao` é derivado do `user`, que o `id` já representa para este efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const recarregar = useCallback(() => {
    sabido = undefined;
    emCurso = null;
    if (!id) return;
    emCurso = lerPerfil();
    emCurso.then((p) => {
      sabido = p;
      for (const o of ouvintes) o(p);
    });
  }, [id]);

  return { perfil, recarregar };
}
