"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { TOTAL_STEPS } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface StepIndicatorProps {
  currentStep: number;
  /** Quantas respostas cada passo já tem, pela ordem dos passos. */
  feitos: number[];
  /** Quantas respostas cada passo pede, no estado actual do formulário. */
  totais: number[];
  /** O passo mais longe a que se chegou. Até aí volta-se com um toque. */
  maiorPasso: number;
  /** Levar a pessoa a um passo já visitado. */
  onIrParaPasso: (passo: number) => void;
}

/**
 * Onde vai o formulário.
 *
 * A barra media **o passo**: `(passo − 1) / 3`. Com vinte campos obrigatórios
 * isso ainda passava; com noventa e cinco passa a mentir de uma maneira
 * concreta — alguém com o passo 2 preenchido a meio vê exactamente a mesma
 * barra de quem acabou de lá chegar, e os dois têm quarenta e sete respostas
 * de diferença. A barra mede **respostas**: quantas das que o formulário pede
 * já lá estão, somando os quatro passos.
 *
 * Cada passo mostra a sua conta por baixo do número. Um passo por fazer não
 * diz nada — pôr «0 / 47» debaixo de um passo onde ainda ninguém entrou é
 * escrever o tamanho da tarefa antes de ela começar, e isso não informa,
 * desanima. Diz-se a partir do momento em que há uma resposta lá dentro, e no
 * passo em que se está.
 *
 * **Três coisas mudaram, e as três são sobre não prometer o que não se
 * cumpre:**
 *
 * 1. **O visto é ganho, não é geográfico.** Era `passo < passoActual` — ou
 *    seja, «já passei por aqui». Enquanto só se andava para a frente as duas
 *    coisas coincidiam; a partir do momento em que se pode voltar atrás,
 *    deixam de coincidir, e um passo a que se voltou para apagar o email
 *    ficava com o visto verde na mesma. Agora o visto sai da mesma conta que
 *    trava o botão: um passo está fechado quando as respostas dele estão lá.
 * 2. **Dá para voltar.** Eram quatro círculos que não faziam nada, e a única
 *    maneira de rever o passo 1 a partir do 3 era carregar em «Anterior» duas
 *    vezes e depois em «Continuar» duas vezes — quatro cliques e duas
 *    validações para ver um campo. Um passo já visitado é um botão e leva lá.
 *    Um passo por alcançar não é: um botão que não leva a lado nenhum é pior
 *    do que nenhum botão.
 * 3. **A conta deixou de ser só para quem vê.** O `14/30` estava
 *    `aria-hidden`, e quem navega por leitor de ecrã ouvia «passo 2» e mais
 *    nada — a informação que a página inteira existe para dar ficava de fora.
 *    Continua escondido como texto solto (lido em fila, «14 barra 30» quatro
 *    vezes seguidas não é uma frase) e passou para o nome do próprio botão,
 *    onde é uma.
 */
export default function StepIndicator({
  currentStep,
  feitos,
  totais,
  maiorPasso,
  onIrParaPasso,
}: StepIndicatorProps) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const stepLabels: string[] = [
    t.vender_cavalo.step_label_owner + " & " + t.vender_cavalo.step_label_id,
    t.vender_cavalo.step_label_lineage + " & " + t.vender_cavalo.step_label_health,
    t.vender_cavalo.step_label_price,
    t.vender_cavalo.step_label_payment,
  ];

  const somaFeitos = feitos.reduce((a, b) => a + b, 0);
  const somaTotais = totais.reduce((a, b) => a + b, 0);

  /**
   * `floor` e não `round`, e o cheio à parte.
   *
   * Com noventa e cinco respostas, a última vale 1,05% — e `round` dava 100%
   * a partir das noventa e quatro. Uma barra cheia com um campo por responder
   * é a promessa falsa desta página em versão gráfica: quem a vê carrega em
   * Continuar à espera de passar. Cem por cento só quando são cem por cento.
   */
  const parte = somaTotais > 0 ? Math.min(somaFeitos / somaTotais, 1) : 0;
  const progressPercent =
    somaFeitos >= somaTotais && somaTotais > 0 ? 100 : Math.floor(parte * 100);

  const stepText = t.vender_cavalo.step_counter
    .replace("{current}", String(currentStep))
    .replace("{total}", String(TOTAL_STEPS));

  const contagem = tr(
    `${somaFeitos} de ${somaTotais} respostas`,
    `${somaFeitos} of ${somaTotais} answers`,
    `${somaFeitos} de ${somaTotais} respuestas`
  );

  return (
    <nav
      className="mb-10"
      aria-label={tr("Passos do formulário", "Form steps", "Pasos del formulario")}
    >
      <div
        className="passo-barra"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={contagem}
      >
        <div className="passo-barra__cheio" style={{ "--parte": parte } as React.CSSProperties} />
      </div>

      <p className="meta text-center mb-6 tabular-nums">{contagem}</p>

      {/* O anúncio do passo para quem ouve a página. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {stepText} — {contagem}
      </div>

      <ol className="flex items-start justify-between list-none p-0 m-0">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => {
          const label = stepLabels[s - 1] ?? `${s}`;
          const feitosNoPasso = feitos[s - 1] ?? 0;
          const totalNoPasso = totais[s - 1] ?? 0;
          const isCurrent = s === currentStep;
          // Fechado é ter as respostas todas, e não ter passado por aqui.
          const fechado = totalNoPasso > 0 && feitosNoPasso >= totalNoPasso;
          // Só se escreve a conta de um passo onde já se mexeu ou onde se
          // está. Antes disso é o tamanho da tarefa e mais nada.
          const mostraConta = totalNoPasso > 0 && (isCurrent || feitosNoPasso > 0);
          const alcancado = s <= maiorPasso;
          const navegavel = alcancado && !isCurrent;

          // O nome do botão diz a frase toda, que é o que a fila de números
          // soltos não conseguia dizer.
          const nomeAcessivel = [
            t.vender_cavalo.step_counter
              .replace("{current}", String(s))
              .replace("{total}", String(TOTAL_STEPS)),
            label,
            mostraConta
              ? tr(
                  `${feitosNoPasso} de ${totalNoPasso} respostas`,
                  `${feitosNoPasso} of ${totalNoPasso} answers`,
                  `${feitosNoPasso} de ${totalNoPasso} respuestas`
                )
              : null,
          ]
            .filter(Boolean)
            .join(", ");

          const interior = (
            <>
              <span className="passo-marco__disco" aria-hidden="true">
                {fechado && !isCurrent ? <Check size={13} strokeWidth={2.5} /> : s}
              </span>
              <span className="rotulo passo-marco__nome hidden sm:block" aria-hidden="true">
                {label}
              </span>
              {mostraConta && (
                <span className="meta passo-marco__conta" aria-hidden="true">
                  {feitosNoPasso}/{totalNoPasso}
                </span>
              )}
            </>
          );

          return (
            <li key={s} className="flex flex-1">
              {navegavel ? (
                <button
                  type="button"
                  onClick={() => onIrParaPasso(s)}
                  className="passo-marco"
                  data-passo={s}
                  data-fechado={fechado ? "sim" : "nao"}
                  aria-label={nomeAcessivel}
                >
                  {interior}
                </button>
              ) : (
                // O `aria-current` está no marco inteiro e não no círculo: o
                // que é «o passo actual» é o passo, e não o algarismo dentro
                // dele. Quem quiser saber qual é lê o `data-passo`, que é um
                // número e não um texto de onde é preciso pescá-lo.
                <span
                  className="passo-marco"
                  data-passo={s}
                  data-fechado={fechado ? "sim" : "nao"}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="sr-only">{nomeAcessivel}</span>
                  {interior}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Contador do passo, em telemóvel — onde os nomes dos passos não cabem. */}
      <p className="sm:hidden text-center text-xs text-[var(--foreground-muted)] mt-3">
        {stepText}
      </p>
    </nav>
  );
}
