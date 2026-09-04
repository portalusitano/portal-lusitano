"use client";

import { forwardRef, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import type { ErroCampo } from "@/components/vender-cavalo/validacao";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface FormErrorsProps {
  erros: ErroCampo[];
}

/**
 * O resumo do que falta, no topo do passo.
 *
 * Duas coisas mudaram, e as duas foram medidas antes:
 *
 * 1. **Cada linha leva ao campo.** Carregar em «Continuar» com o passo 1 vazio
 *    dava dez frases e mais nada; num passo com vinte e sete campos, saber que
 *    «Sexo é obrigatório» ainda deixa a pessoa a procurar onde. Agora cada
 *    linha é um botão que rola até ao campo e lhe põe o foco.
 * 2. **Diz quantas faltam, e não «corrija os erros».** O título era
 *    `fix_errors` — uma repreensão, e uma que não informa: com noventa e oito
 *    campos obrigatórios, «corrija os erros» pode querer dizer um campo ou
 *    trinta, e a diferença entre esses dois números é a diferença entre
 *    voltar atrás e fechar o separador. A frase passou a ser a conta.
 * 3. **Ele próprio recebe o foco.** Medido: em computador o resumo aparecia
 *    1302px acima do que estava no ecrã, porque o botão fica no fim de uma
 *    página de 2987px; em telemóvel aparecia 1452px abaixo da dobra, porque o
 *    botão vive numa barra fixa. Nos dois casos a pessoa carregava e não
 *    acontecia nada visível. É por isso que a página o chama pelo `ref`.
 */
const FormErrors = forwardRef<HTMLDivElement, FormErrorsProps>(function FormErrors({ erros }, ref) {
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  if (erros.length === 0) return null;

  const n = erros.length;
  const titulo =
    n === 1
      ? tr(
          "Falta 1 resposta para avançar:",
          "1 answer left before you can continue:",
          "Falta 1 respuesta para avanzar:"
        )
      : tr(
          `Faltam ${n} respostas para avançar:`,
          `${n} answers left before you can continue:`,
          `Faltan ${n} respuestas para avanzar:`
        );

  const irAoCampo = (campo: string) => {
    const alvo =
      document.getElementById(campo) ||
      document.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
    if (!alvo) return;
    alvo.scrollIntoView({ block: "center", behavior: "smooth" });
    // Onde é que o foco aterra, que quase nunca é no elemento que tem o `id`.
    //
    // Três casos, e os três medidos no browser:
    //
    // 1. Um `<Seleccao>` põe o `id` num `<select>` a sério que está escondido
    //    (1×1 px, `opacity: 0`) e mostra um botão. É o botão que recebe o foco.
    //    O `tabIndex >= 0` da primeira condição é o que exclui esse `<select>`,
    //    e **tem de continuar a excluí-lo**: ele tem `tabindex="-1"` mas também
    //    tem `offsetParent`, por isso qualquer teste mais permissivo o
    //    apanharia e mandaria o foco para um pixel invisível.
    // 2. Uma pergunta de sim ou não põe o `id` no texto da pergunta. O que se
    //    quer focar é a primeira das duas respostas — é lá que as setas do
    //    teclado servem para alguma coisa, e o leitor de ecrã lê a pergunta na
    //    mesma, porque o grupo é `aria-labelledby` para ela.
    // 3. As pastilhas e os anexos não têm `id` nenhum: são um bloco com
    //    `data-campo`, e o que lá dentro se foca é a primeira pastilha.
    //
    // Os casos 2 e 3 procuram-se a partir do bloco com `data-campo`, e não a
    // partir do elemento irmão. Medido: com a procura no irmão, carregar na
    // linha de uma das vinte e sete perguntas de sim ou não deixava o foco no
    // próprio botão do resumo — que num leitor de ecrã é não ter ido a lado
    // nenhum.
    const contentor = alvo.closest<HTMLElement>("[data-campo]") ?? alvo.parentElement;
    const focavel =
      alvo.tabIndex >= 0 && alvo.offsetParent !== null
        ? alvo
        : contentor?.querySelector<HTMLElement>(
            'input:not([type="hidden"]):not(.hidden), button, textarea'
          );
    focavel?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="resumo-erros mb-6 scroll-mt-24 focus:outline-none"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          size={20}
          className="text-[var(--erro)] flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--erro)] mb-1 tabular-nums">{titulo}</p>
          <ul>
            {erros.map((erro) => (
              <li key={erro.campo + erro.mensagem}>
                <button
                  type="button"
                  className="resumo-erros__ir"
                  onClick={() => irAoCampo(erro.campo)}
                >
                  {erro.mensagem}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

export default FormErrors;
