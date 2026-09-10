"use client";

import { useMemo } from "react";
import { Check, CloudOff } from "lucide-react";
import type { EstadoRascunho } from "@/components/vender-cavalo/usar-rascunho";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface GuardaRascunhoProps {
  estado: EstadoRascunho;
  className?: string;
}

/**
 * A linha que diz se o que já se escreveu está a salvo.
 *
 * Noventa e cinco campos são vinte minutos de trabalho, e durante esses vinte
 * minutos o formulário não dizia uma palavra sobre o rascunho que ia
 * guardando. Só falava dele **depois**, na barra do restauro, a quem já tinha
 * voltado — ou seja, dizia-o a quem já não precisava de o ouvir. Quem estava
 * a meio não tinha maneira nenhuma de saber que podia fechar o separador.
 *
 * Três estados, três coisas diferentes e nenhuma delas decorativa:
 *
 * - **Guardado às 14:32** — está no browser, relido de lá. A hora é a da
 *   gravação e não muda sozinha: não há relógio a bater, e por isso não há
 *   aqui ciclo nenhum. É também o que a torna verificável — quem quiser
 *   confirmar compara-a com a hora a que parou de escrever.
 * - **A guardar…** — há teclas por gravar. Dura o silêncio de 800ms e mais
 *   nada.
 * - **Não foi possível guardar** — o browser recusou (navegação privada,
 *   armazenamento cheio, cookies bloqueados). É o único estado que interrompe
 *   quem lê com leitor de ecrã, e é o único que o merece: os outros dois
 *   mudam de dois em dois segundos e anunciá-los seria falar por cima de quem
 *   escreve.
 *
 * O estado `vazio` não escreve nada. Num formulário onde ainda ninguém tocou
 * não há nada a salvo, e dizê-lo seria a mesma classe de promessa falsa que
 * este trabalho todo existe para tirar.
 */
export default function GuardaRascunho({ estado, className = "" }: GuardaRascunhoProps) {
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const horas = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [language]
  );

  if (estado.estado === "vazio") return null;

  const recusado = estado.estado === "recusado";

  return (
    <p
      className={`meta flex items-center justify-center gap-1.5 ${
        recusado ? "text-[var(--erro)]" : ""
      } ${className}`}
      // Só a recusa fala por cima de quem escreve. Ver acima.
      aria-live={recusado ? "polite" : "off"}
      data-guarda={estado.estado}
    >
      {estado.estado === "guardado" && (
        <>
          <Check size={12} className="flex-none" aria-hidden="true" />
          <span className="tabular-nums">
            {tr(
              `Guardado às ${horas.format(estado.quando)}`,
              `Saved at ${horas.format(estado.quando)}`,
              `Guardado a las ${horas.format(estado.quando)}`
            )}
          </span>
        </>
      )}

      {estado.estado === "por-guardar" && <span>{tr("A guardar…", "Saving…", "Guardando…")}</span>}

      {recusado && (
        <>
          <CloudOff size={12} className="flex-none" aria-hidden="true" />
          <span>
            {tr(
              "Este browser não deixa guardar o rascunho — não feche a página.",
              "This browser will not store the draft — do not close the page.",
              "Este navegador no deja guardar el borrador — no cierre la página."
            )}
          </span>
        </>
      )}
    </p>
  );
}
