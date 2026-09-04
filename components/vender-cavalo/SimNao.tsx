"use client";

import { useMemo } from "react";
import type { Resposta } from "@/components/vender-cavalo/types";
import type { ErrosPorCampo } from "@/components/vender-cavalo/campos-com-erro";
import { ErroDoCampo } from "@/components/vender-cavalo/campos-com-erro";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface SimNaoProps {
  id: string;
  /** A pergunta. É uma pergunta, não um rótulo: lê-se e responde-se. */
  pergunta: string;
  valor: Resposta;
  onChange: (valor: Resposta) => void;
  erros: ErrosPorCampo;
  /** Uma linha por baixo, quando a pergunta precisa de contexto. */
  nota?: string;
}

/**
 * Uma pergunta de sim ou não.
 *
 * Substitui as vinte e sete caixas de selecção do formulário, e a razão é a
 * mesma que está escrita no tipo `Resposta`: **uma caixa de selecção não sabe
 * dizer «ainda não respondi»**. Por fora, «este cavalo não é bom com o
 * ferrador» e «ainda não cheguei a esta pergunta» são o mesmo quadrado vazio.
 *
 * Enquanto estas perguntas eram opcionais isso não custava nada — ninguém
 * verificava. A partir do momento em que passam a ser obrigatórias, custa
 * tudo, porque só há duas maneiras de exigir uma resposta a uma caixa:
 *
 * - exigir que fique **marcada**, que é obrigar o vendedor a declarar que o
 *   cavalo é bom com o ferrador para o formulário o deixar passar — e o site
 *   já aprendeu essa lição uma vez, com a vacinação, que era obrigatória e
 *   cuja única saída era declarar o que não era verdade;
 * - ou aceitar a caixa vazia como resposta, que é não exigir nada.
 *
 * Com dois botões não há esse dilema: «não» é uma resposta a sério, dada de
 * propósito, e distingue-se de não ter respondido. É o que permite que
 * «obrigatório» queira dizer **respondido**, que é a única leitura que não
 * corrompe os dados que se estão a recolher.
 *
 * **Porque são dois `<input type="radio">` e não dois botões.** Um grupo de
 * rádio nativo dá de graça o que um par de botões obrigaria a escrever à mão e
 * mal: as setas do teclado andam entre as opções e a tabulação salta o grupo
 * inteiro de uma vez (com noventa e oito campos, tabular duas vezes por
 * pergunta seriam mais de cinquenta tabulações a mais), e o leitor de ecrã
 * anuncia «2 de 2» sem que ninguém lho diga. O `<input>` está escondido mas
 * continua focável; quem o desenha é a `.chip`, que é a pastilha que o site já
 * usa para «escolhido», a branco e não a dourado.
 */
export default function SimNao({ id, pergunta, valor, onChange, erros, nota }: SimNaoProps) {
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const opcoes: readonly { valor: Exclude<Resposta, "">; texto: string }[] = [
    { valor: "sim", texto: tr("Sim", "Yes", "Sí") },
    { valor: "nao", texto: tr("Não", "No", "No") },
  ];

  const temErro = Boolean(erros[id]);

  return (
    <div className="sim-nao" data-campo={id}>
      <div className="sim-nao__pergunta">
        {/* O `id` vive aqui e não no `<input>`: é a este elemento que o resumo
            de erros no topo do passo vem ter, e o que a pessoa precisa de ver
            quando lá chega é a pergunta, não uma das duas respostas. */}
        <span id={id} tabIndex={-1} className="sim-nao__texto">
          {pergunta} <span aria-hidden="true">*</span>
        </span>
        {nota && <span className="meta block mt-0.5">{nota}</span>}
      </div>
      <div
        className="sim-nao__opcoes"
        role="radiogroup"
        aria-labelledby={id}
        aria-required="true"
        {...(temErro ? { "aria-invalid": true as const, "aria-describedby": `erro-${id}` } : {})}
      >
        {opcoes.map((opcao) => (
          <label
            key={opcao.valor}
            className={`chip sim-nao__opcao ${valor === opcao.valor ? "chip-activo" : ""}`}
          >
            <input
              type="radio"
              className="sim-nao__radio"
              name={id}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => onChange(opcao.valor)}
            />
            <span>{opcao.texto}</span>
          </label>
        ))}
      </div>
      <ErroDoCampo erros={erros} campo={id} />
    </div>
  );
}
