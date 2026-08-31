"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import Partilhar from "./Partilhar";
import { useLanguage } from "@/context/LanguageContext";
import {
  CHAVE_GUARDADAS,
  alternar,
  estaGuardada,
  lerGuardadas,
  type CoudelariaGuardada,
} from "@/lib/coudelarias-guardadas";

// ─── A lista guardada, como fonte externa ────────────────────────────────────
// O `localStorage` é um sistema fora do React, e é assim que se lê: com
// `useSyncExternalStore`. Lê-lo no arranque do estado dava marcações
// diferentes no servidor e no cliente; lê-lo num efeito com `setState` obriga
// a um segundo render de cada vez. De caminho, guardar num separador
// actualiza o botão nos outros — o evento `storage` já o diz.

const VAZIO: CoudelariaGuardada[] = [];
let brutoEmCache: string | null = null;
let listaEmCache: CoudelariaGuardada[] = VAZIO;
const ouvintes = new Set<() => void>();

/** Tem de devolver sempre a mesma referência enquanto nada mudar. */
function instantaneo(): CoudelariaGuardada[] {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE_GUARDADAS);
  } catch {
    bruto = null;
  }
  if (bruto !== brutoEmCache) {
    brutoEmCache = bruto;
    listaEmCache = bruto ? lerGuardadas(bruto) : VAZIO;
  }
  return listaEmCache;
}

function instantaneoNoServidor(): CoudelariaGuardada[] {
  return VAZIO;
}

function subscrever(aoMudar: () => void) {
  ouvintes.add(aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

function guardarLista(lista: CoudelariaGuardada[]) {
  const bruto = JSON.stringify(lista);
  try {
    localStorage.setItem(CHAVE_GUARDADAS, bruto);
  } catch {
    // Navegação privada ou armazenamento cheio: o botão responde nesta
    // sessão, só não sobrevive ao fecho do separador.
  }
  brutoEmCache = bruto;
  listaEmCache = lista;
  for (const ouvinte of ouvintes) ouvinte();
}

/**
 * Guardar e partilhar — os dois botões que fazem uma ficha circular, os
 * mesmos que a ficha do anúncio já tem (`components/comprar/AccoesAnuncio`).
 * A partilha é o mesmo componente, para o painel ser o mesmo painel; o
 * guardar é local porque as coudelarias não têm contexto de favoritos como os
 * cavalos têm, e montar um obrigaria a mexer na casca da aplicação.
 *
 * O estado escolhido é branco, não vermelho nem dourado: sobre preto quem
 * assinala uma escolha é o contraste.
 */
export default function AccoesCoudelaria({
  slug,
  nome,
  localizacao,
  url,
}: {
  slug: string;
  nome: string;
  localizacao?: string;
  url: string;
}) {
  const { t } = useLanguage();
  const lista = useSyncExternalStore(subscrever, instantaneo, instantaneoNoServidor);
  const guardada = estaGuardada(lista, slug);

  const alternarGuardada = useCallback(() => {
    guardarLista(alternar(instantaneo(), { slug, nome, localizacao }));
  }, [slug, nome, localizacao]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={alternarGuardada}
        aria-pressed={guardada}
        title={t.directorio.ficha.guardar_ajuda}
        className={guardada ? "btn chip-activo" : "btn btn-secundario"}
      >
        <Heart size={15} aria-hidden="true" fill={guardada ? "currentColor" : "none"} />
        {guardada ? t.directorio.ficha.guardada : t.directorio.ficha.guardar}
      </button>

      <Partilhar titulo={nome} url={url} />
    </div>
  );
}
