import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StepIndicator from "@/components/vender-cavalo/StepIndicator";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "pt",
    t: {
      vender_cavalo: {
        step_label_owner: "Proprietário",
        step_label_id: "Identificação",
        step_label_lineage: "Linhagem",
        step_label_health: "Saúde",
        step_label_price: "Preço",
        step_label_payment: "Pagamento",
        step_counter: "Passo {current} de {total}",
      },
    },
  }),
}));

const desenhar = (parcial: Partial<React.ComponentProps<typeof StepIndicator>> = {}) => {
  const onIrParaPasso = vi.fn();
  const props = {
    currentStep: 1,
    feitos: [0, 0, 0, 0],
    totais: [30, 40, 24, 1],
    maiorPasso: 1,
    onIrParaPasso,
    ...parcial,
  };
  render(<StepIndicator {...props} />);
  return { onIrParaPasso };
};

const barra = () => screen.getByRole("progressbar");

describe("a barra mede respostas, e não passos", () => {
  it("um passo à frente sem respostas não enche barra nenhuma", () => {
    // Era `(passo − 1) / 3`: chegar ao passo 2 dava 33% com o formulário
    // vazio. O que a pessoa fez foi carregar num botão, não responder a
    // trinta perguntas.
    desenhar({ currentStep: 2, maiorPasso: 2 });
    expect(barra()).toHaveAttribute("aria-valuenow", "0");
  });

  it("cem por cento só quando são cem por cento", () => {
    // Com noventa e cinco respostas a última vale 1,05%, e `round` dava 100%
    // a partir das noventa e quatro — uma barra cheia com um campo por
    // responder e um «Continuar» que não anda.
    desenhar({ feitos: [30, 40, 24, 0], totais: [30, 40, 24, 1] });
    expect(barra()).toHaveAttribute("aria-valuenow", "98");

    screen.getByText("94 de 95 respostas");
  });

  it("com tudo respondido chega aos cem", () => {
    desenhar({ feitos: [30, 40, 24, 1], totais: [30, 40, 24, 1] });
    expect(barra()).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("o visto é ganho, não é geográfico", () => {
  it("um passo por onde se passou mas que ficou incompleto não leva visto", () => {
    // O caso que só se tornou possível quando se pôde voltar atrás: ir ao
    // passo 1 apagar o email e continuar a ver lá o visto verde.
    desenhar({ currentStep: 3, maiorPasso: 3, feitos: [29, 40, 0, 0] });
    const passo1 = screen.getByRole("button", { name: /Passo 1 de 4/ });
    expect(passo1).toHaveAttribute("data-fechado", "nao");
  });

  it("um passo com as respostas todas leva visto", () => {
    desenhar({ currentStep: 3, maiorPasso: 3, feitos: [30, 40, 0, 0] });
    expect(screen.getByRole("button", { name: /Passo 1 de 4/ })).toHaveAttribute(
      "data-fechado",
      "sim"
    );
  });
});

describe("voltar a um passo é um toque, e ir para a frente não", () => {
  it("um passo já visitado é um botão e leva lá", () => {
    const { onIrParaPasso } = desenhar({ currentStep: 3, maiorPasso: 3, feitos: [30, 40, 0, 0] });
    fireEvent.click(screen.getByRole("button", { name: /Passo 1 de 4/ }));
    expect(onIrParaPasso).toHaveBeenCalledWith(1);
  });

  it("um passo por alcançar não é botão nenhum", () => {
    // Um botão que não leva a lado nenhum é pior do que nenhum botão. Quem
    // avança é o «Continuar», que valida o passo antes de deixar passar.
    desenhar({ currentStep: 1, maiorPasso: 1 });
    expect(screen.queryByRole("button", { name: /Passo 3 de 4/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Passo 4 de 4/ })).toBeNull();
  });

  it("o passo onde se está não é botão — não leva a lado nenhum", () => {
    desenhar({ currentStep: 2, maiorPasso: 3, feitos: [30, 10, 0, 0] });
    expect(screen.queryByRole("button", { name: /Passo 2 de 4/ })).toBeNull();
  });
});

describe("a conta de cada passo também se ouve", () => {
  it("o nome do passo diz onde é, o que é e quanto lá está", () => {
    // Estava tudo em `aria-hidden`: quem navega por leitor de ecrã ouvia
    // «passo 2» e mais nada, que é justamente a informação que esta página
    // existe para dar.
    desenhar({ currentStep: 3, maiorPasso: 3, feitos: [30, 12, 0, 0] });
    expect(
      screen.getByRole("button", {
        name: "Passo 2 de 4, Linhagem & Saúde, 12 de 40 respostas",
      })
    ).toBeTruthy();
  });

  it("um passo onde ainda ninguém entrou não anuncia o tamanho da tarefa", () => {
    // «0 / 40» debaixo de um passo por começar não informa, desanima.
    desenhar({ currentStep: 1, maiorPasso: 1 });
    expect(screen.queryByText("0/40")).toBeNull();
  });
});
