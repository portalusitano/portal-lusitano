"use client";

/**
 * Uma secção do formulário.
 *
 * Substitui o `<Detalhes>`, que era uma gaveta fechada com a palavra
 * «Opcional» na cabeça. Deixou de haver opcional, e por isso deixou de haver
 * gaveta: uma gaveta é uma promessa de que o que lá está dentro se pode
 * ignorar, e num formulário em que tudo é obrigatório essa promessa é falsa.
 * Pior do que falsa: quem carregasse em Continuar levava com sete erros
 * escondidos atrás de um painel que lhe tinham dito que podia saltar.
 *
 * O que fica no lugar é o cabeçalho, que é o que sempre foi preciso: **um
 * assunto e a conta de onde vai**. A conta é o que torna noventa e oito campos
 * percorríveis — não é o número total que assusta, é não se saber quanto falta.
 * Por isso ela é «7 de 12» e não «faltam 5»: o que se lê é o progresso, e o
 * que falta calcula-se sozinho. O botão de Continuar é que diz o que falta,
 * porque é ele que trava.
 *
 * A hierarquia é a que o site já tem: `.titulo-seccao` para o assunto e
 * `.meta` para a conta, que vai em `tabular-nums` para as contas de secções
 * seguidas alinharem em coluna e se lerem de relance.
 */
interface SeccaoProps {
  titulo: string;
  /** Quantas respostas esta secção pede no estado actual do formulário. */
  total: number;
  /** Quantas já lá estão. */
  feitos: number;
  /** Uma linha que diga o que esta secção serve. Não é um parágrafo. */
  nota?: string;
  children: React.ReactNode;
}

export default function Seccao({ titulo, total, feitos, nota, children }: SeccaoProps) {
  const completa = total > 0 && feitos >= total;

  return (
    <section className="seccao-campos" data-completa={completa ? "sim" : "nao"}>
      <div className="seccao-campos__cabeca">
        <div className="min-w-0">
          <h3 className="titulo-seccao">{titulo}</h3>
          {nota && <p className="meta mt-0.5">{nota}</p>}
        </div>
        {/* `aria-label` porque «7 / 12» lido em voz alta é «sete barra doze».
            O texto que se vê fica curto; o que se ouve fica em português. */}
        <p
          className="seccao-campos__conta"
          aria-label={`${feitos} de ${total} respondidos`}
          data-completa={completa ? "sim" : "nao"}
        >
          <span className="tabular-nums">{feitos}</span>
          <span aria-hidden="true"> / </span>
          <span className="tabular-nums">{total}</span>
        </p>
      </div>
      <div className="seccao-campos__corpo">{children}</div>
    </section>
  );
}
