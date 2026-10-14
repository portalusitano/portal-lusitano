"use client";

import { useEffect } from "react";
import { lerVistos, registarVisto, guardarVistos } from "@/lib/vistos-recentemente";

interface HistoricoVisitaProps {
  id: string;
  nome: string;
  preco?: number | null;
  imagem?: string | null;
  localizacao?: string | null;
}

/**
 * Guarda o anúncio no histórico local de "vistos recentemente".
 *
 * Não desenha nada: existe para que o visitante consiga voltar a um anúncio
 * que abriu e fechou sem ter de o procurar outra vez.
 */
export default function HistoricoVisita({
  id,
  nome,
  preco,
  imagem,
  localizacao,
}: HistoricoVisitaProps) {
  useEffect(() => {
    guardarVistos(registarVisto(lerVistos(), { id, nome, preco, imagem, localizacao }));
  }, [id, nome, preco, imagem, localizacao]);

  return null;
}
