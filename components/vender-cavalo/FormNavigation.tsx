"use client";

import { useMemo } from "react";
import { TOTAL_STEPS } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import GuardaRascunho from "@/components/vender-cavalo/GuardaRascunho";
import type { EstadoRascunho } from "@/components/vender-cavalo/usar-rascunho";

interface FormNavigationProps {
  step: number;
  onPrev: () => void;
  /** Quantas respostas faltam neste passo. Zero quer dizer que ele passa. */
  faltam: number;
  /** Se o que já se escreveu está a salvo. */
  rascunho: EstadoRascunho;
}

/**
 * Os botões de andar para a frente e para trás.
 *
 * O «Continuar» é `type="submit"` e não tem `onClick` nenhum: quem avança o
 * passo é o `onSubmit` do formulário. Assim a tecla Enter num campo de texto e
 * o carregar no botão passam pelo mesmo caminho — antes não havia `<form>` de
 * todo, e a tecla Enter não fazia nada.
 *
 * O «Anterior» leva `type="button"` de propósito: dentro de um formulário, um
 * botão sem `type` é um botão de submissão, e voltar atrás submetia.
 *
 * **O rótulo diz quantas faltam, e o botão continua a carregar.** São duas
 * decisões, e as duas são sobre a mesma coisa:
 *
 * - «Faltam 7 campos» é uma informação; «corrija os erros» é uma repreensão. A
 *   segunda só se pode dizer depois de alguém tentar; a primeira pode dizer-se
 *   antes, e é a que evita a tentativa falhada. Num formulário de vinte campos
 *   a diferença era de estilo; num de noventa e cinco, saber que faltam sete e
 *   não trinta é a diferença entre continuar e desistir.
 * - **Não se desactiva.** Um botão apagado não diz porquê, não recebe foco e
 *   não é clicável — quem lá chegasse ficava sem nada a fazer e sem saber o
 *   que falta. Carregar continua a levar ao resumo, que leva ao campo.
 *
 * **O estado do rascunho mora aqui**, e não no indicador lá em cima, por uma
 * razão de sítio: num passo de cinquenta campos o topo da página está a três
 * mil pixéis de distância, e a altura em que se quer saber se o trabalho está
 * a salvo é aquela em que se pára — que é em frente ao botão. Em telemóvel a
 * barra é fixa, e portanto é a única superfície da página que está sempre à
 * vista.
 */
export default function FormNavigation({ step, onPrev, faltam, rascunho }: FormNavigationProps) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const rotulo =
    faltam === 0
      ? t.vender_cavalo.continue
      : faltam === 1
        ? tr("Falta 1 campo", "1 field left", "Falta 1 campo")
        : tr(`Faltam ${faltam} campos`, `${faltam} fields left`, `Faltan ${faltam} campos`);

  const contadorDePasso = t.vender_cavalo.step_counter
    .replace("{current}", String(step))
    .replace("{total}", String(TOTAL_STEPS));

  return (
    <>
      {/* Computador */}
      <div className="hidden sm:flex items-center justify-between gap-4 mt-6">
        {step > 1 ? (
          <button type="button" onClick={onPrev} className="btn btn-secundario rounded-full">
            {t.vender_cavalo.previous}
          </button>
        ) : (
          <div />
        )}

        <GuardaRascunho estado={rascunho} className="min-w-0 text-center" />

        {step < TOTAL_STEPS ? (
          <button
            type="submit"
            className="btn btn-primario rounded-full px-6 tabular-nums"
            data-faltam={faltam}
          >
            {rotulo}
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Barra fixa em telemóvel */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-3 flex items-center gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={onPrev}
            className="btn btn-secundario btn-sm flex-none touch-manipulation active:scale-95"
          >
            {t.vender_cavalo.previous}
          </button>
        ) : (
          <div className="flex-none w-0" />
        )}

        <div className="flex-1 min-w-0 text-center">
          <p className="rotulo">{contadorDePasso}</p>
          <GuardaRascunho estado={rascunho} className="mt-0.5" />
        </div>

        {step < TOTAL_STEPS && (
          <button
            type="submit"
            className="btn btn-primario btn-sm flex-none px-4 touch-manipulation active:scale-95 tabular-nums"
            data-faltam={faltam}
          >
            {rotulo}
          </button>
        )}
      </div>

      {/* Não há espaçador aqui, e é de propósito. Havia um `h-20`, do tempo em
          que esta página era um `<main>` dentro do `<main>` do layout: a regra
          sem camada `@media (max-width:1024px) { main { padding-bottom } }`
          ganhava ao `pb-32` da página e calava-o, e as 5rem deste div eram o
          que sobrava para o conteúdo não ficar debaixo da barra fixa. Com o
          `<main>` a mais fora, o `pb-32` vale o que diz — 128px, mais os 64px
          que a regra dá ao `<main>` de fora — e chegam de sobra para uma barra
          que ocupa 136px. Medido: 272px de folga passaram a 192px, e nenhum
          campo fica tapado. */}
    </>
  );
}
