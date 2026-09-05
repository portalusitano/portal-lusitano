"use client";

import { useMemo } from "react";
import { AlertCircle, Circle } from "lucide-react";
import type { ErroCampo } from "@/components/vender-cavalo/validacao";
import { CAMPOS, estaPreenchido } from "@/components/vender-cavalo/campos";
import type { FormData } from "@/components/vender-cavalo/types";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

/**
 * O que um campo precisa de saber quando está a travar o passo — e a
 * distinção que faltava, que é a que mudava o formulário inteiro.
 *
 * **Um campo por tocar não é um campo errado.** Com tudo obrigatório, carregar
 * em «Continuar» com o passo por preencher acendia vinte e sete campos a
 * vermelho e escrevia vinte e sete frases vermelhas por baixo deles, antes de
 * a pessoa ter escrito uma única letra. Nada ali estava errado: estava por
 * fazer. E marcar vinte e sete coisas por fazer como vinte e sete falhas tem
 * duas consequências, e nenhuma delas é a que se quer — acusa alguém de
 * faltas que ainda não cometeu, e faz com que **nenhuma se distinga de
 * nenhuma**: vinte e sete alarmes ao mesmo tempo são zero alarmes.
 *
 * Por isso o que aqui chega deixou de ser uma lista de erros e passou a ser
 * uma lista de **faltas**, com dois níveis:
 *
 * - `por-responder` — o campo é exigido e está vazio. Não é vermelho, não
 *   leva frase própria: leva o estado, em duas palavras, e uma hairline mais
 *   acesa. Sobre preto, quem assinala é o contraste, e o site já diz isso em
 *   todo o lado (o filtro activo, o dia de hoje, a página actual).
 * - `erro` — a pessoa respondeu e a resposta não serve: um email sem arroba,
 *   uma data de nascimento no futuro, um preço a zero, uma descrição com
 *   sessenta caracteres, um microchip com catorze algarismos. **Só este é
 *   vermelho**, e passa a querer dizer alguma coisa por ser raro.
 *
 * A régua que separa os dois não é uma segunda opinião sobre o valor: é o
 * `estaPreenchido` do `campos.ts`, que é a **única** definição de «isto está
 * respondido» que o formulário tem — a mesma que trava o botão, a mesma que
 * conta «7 / 12» no cabeçalho da secção. Se um dia a régua mudar, muda num
 * sítio e muda para os três sítios ao mesmo tempo.
 *
 * (O terceiro nível de que a `inspeccao.ts` fala — o aviso e a sugestão —
 * continua a entrar pelo `apontamentos.tsx`, que nunca foi vermelho.)
 */
export type ErrosPorCampo = Record<string, string>;

/** O nível de uma falta. Só o segundo é um erro. */
export type NivelFalta = "por-responder" | "erro";

export interface Falta {
  /** A frase que a validação escreveu. Só se mostra quando é um erro. */
  mensagem: string;
  nivel: NivelFalta;
}

export type FaltasPorCampo = Record<string, Falta>;

export function porCampo(erros: ErroCampo[]): ErrosPorCampo {
  const mapa: ErrosPorCampo = {};
  for (const e of erros) if (!mapa[e.campo]) mapa[e.campo] = e.mensagem;
  return mapa;
}

/** Consulta por `id`, montada uma vez. */
const POR_ID = new Map(CAMPOS.map((c) => [c.id, c]));

/**
 * Separa o que está por responder do que está respondido e mal.
 *
 * O terceiro argumento é para os três que não são campos de `FormData` e por
 * isso não estão no catálogo — o Livro Azul, as fotografias, a caixa dos
 * termos. Quem os conhece é o passo onde vivem, e é ele que diz se a resposta
 * já lá está; sem isso um anexo por escolher apareceria como erro, que é
 * exactamente a confusão que este ficheiro existe para desfazer.
 */
export function faltasDe(
  erros: ErrosPorCampo,
  formData: FormData,
  respondidoFora: Readonly<Record<string, boolean>> = {}
): FaltasPorCampo {
  const faltas: FaltasPorCampo = {};
  for (const id of Object.keys(erros)) {
    const campo = POR_ID.get(id);
    const respondido = campo ? estaPreenchido(campo, formData) : (respondidoFora[id] ?? false);
    faltas[id] = { mensagem: erros[id], nivel: respondido ? "erro" : "por-responder" };
  }
  return faltas;
}

/** O mesmo, memorizado — é o que cada passo chama na primeira linha. */
export function useFaltas(
  erros: ErrosPorCampo,
  formData: FormData,
  respondidoFora?: Readonly<Record<string, boolean>>
): FaltasPorCampo {
  // `respondidoFora` é um literal novo a cada render nos passos que o usam; o
  // que o identifica é o conteúdo, e são três chaves.
  const assinatura = respondidoFora ? JSON.stringify(respondidoFora) : "";
  return useMemo(
    () => faltasDe(erros, formData, respondidoFora ?? {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [erros, formData, assinatura]
  );
}

/** Só o nível, para quem precisa de decidir sem montar a frase. */
export function nivelDe(faltas: FaltasPorCampo, campo: string): NivelFalta | null {
  return faltas[campo]?.nivel ?? null;
}

/**
 * `.campo`, mais o estado em que ele está.
 *
 * `.campo-erro` — vermelho — ficou reservado a quem respondeu e respondeu mal.
 * Quem ainda não respondeu leva `.campo-por-responder`, que é a mesma ideia um
 * tom abaixo: a hairline acesa e o halo frio, sem cor de alarme.
 */
export function classeCampo(faltas: FaltasPorCampo, campo: string, extra = ""): string {
  const nivel = faltas[campo]?.nivel;
  return [
    "campo",
    nivel === "erro" ? "campo-erro" : nivel === "por-responder" ? "campo-por-responder" : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/* Os atributos que dizem a um leitor de ecrã que o campo está inválido e onde
   está a explicação vivem agora em `apontamentos.tsx`, no `atributosCampo`.
   Esta função só conhecia o erro, e o `aria-describedby` é uma lista: num
   campo com erro *e* com aviso, quem não vê o ecrã ouvia só metade. */

/**
 * A linha por baixo do campo.
 *
 * Duas linhas diferentes, e a diferença é a que dá nome a este ficheiro:
 *
 * - **Erro** — a frase que a validação escreveu, a vermelho, com o mesmo
 *   ícone de sempre. É prosa revista sobre um problema concreto e vale a pena
 *   lê-la.
 * - **Por responder** — duas palavras, no secundário. E **não** a frase da
 *   validação: «Falta preencher: NIF.» por baixo de um campo cujo rótulo, dois
 *   centímetros acima, diz «NIF», é dizer o nome do campo duas vezes. O que
 *   falta ali não é o nome — é o estado, e o estado cabe em duas palavras.
 *
 * O `id` é o mesmo nos dois casos (`erro-${campo}`) porque é o que o
 * `aria-describedby` do campo aponta, e quem não vê o ecrã precisa de ouvir
 * as duas coisas — a diferença entre elas está no que se diz, não em dizer
 * uma e calar a outra.
 */
export function ErroDoCampo({ erros, campo }: { erros: FaltasPorCampo; campo: string }) {
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);
  const falta = erros[campo];
  if (!falta) return null;

  if (falta.nivel === "erro") {
    return (
      <p className="erro-campo" id={`erro-${campo}`}>
        <AlertCircle size={13} className="flex-none mt-0.5" aria-hidden="true" />
        <span>{falta.mensagem}</span>
      </p>
    );
  }

  return (
    <p className="falta-campo" id={`erro-${campo}`}>
      <Circle size={11} className="flex-none mt-[3px]" aria-hidden="true" />
      <span>{tr("Por responder", "Not answered yet", "Sin responder")}</span>
    </p>
  );
}
