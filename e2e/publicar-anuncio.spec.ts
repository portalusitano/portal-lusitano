import { test, expect, type Page } from "@playwright/test";
import { jaRespondeuAosCookies } from "./visitante";

/**
 * O percurso de publicar um anúncio.
 *
 * Os casos aqui não verificam que a página «abre»: verificam as três coisas
 * que, medidas num browser, faziam perder anúncios já escritos.
 *
 * 1. Carregar em «Continuar» com o passo por preencher não fazia nada visível.
 *    O resumo de erros existia — mas em computador aparecia 1302px acima do
 *    que estava no ecrã (o botão vive no fim de uma página de três ecrãs) e em
 *    telemóvel 1452px abaixo da dobra (o botão vive numa barra fixa). O botão
 *    parecia avariado.
 * 2. Avançar de passo deixava a página onde estava: o passo seguinte abria a
 *    meio de si próprio, com `scrollY` a 3455 numa página de 4872.
 * 3. Fechar o separador e voltar repunha o texto mas não as fotografias nem os
 *    documentos — e sem o dizer, porque o aviso só aparecia no passo 1 e o
 *    rascunho repunha o passo 3.
 * 4. Cada campo só respondia ao que lhe tinham escrito quando alguém carregava
 *    em «Continuar», seis passos depois de o ter escrito. Agora responde ao
 *    sair do campo — e responde em três tons, que é a parte que estes casos
 *    guardam: o que impede, o que pergunta e o que propõe.
 */

/** Preenche o passo 1 com o mínimo que a validação exige. */
async function preencherPasso1(page: Page) {
  await page.fill("#proprietario_nome", "Maria Ferreira");
  await page.fill("#proprietario_email", "maria@exemplo.pt");
  await page.fill("#proprietario_telefone", "912345678");
  await page.fill("#nome", "Zíngaro");
  await page.fill("#numero_registo", "PSL-2019-4471");
  await page.fill("#data_nascimento", "2019-04-12");
  await escolher(page, "sexo", "Égua");
  await escolher(page, "pelagem", "Ruço");
}

/**
 * Escolhe num `<Seleccao>`.
 *
 * O componente mostra um botão e guarda um `<select>` a sério escondido; é a
 * esse que o teste fala, pelo mesmo `change` que o widget dispara.
 */
async function escolher(page: Page, id: string, valor: string) {
  await page.evaluate(
    ([id, valor]) => {
      const sel = document.querySelector<HTMLSelectElement>(`select#${CSS.escape(id)}`);
      if (!sel) throw new Error(`sem select #${id}`);
      const opt = [...sel.options].find((o) => o.value === valor || o.text.includes(valor));
      if (!opt) throw new Error(`sem opção ${valor} em #${id}`);
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!.call(
        sel,
        opt.value
      );
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [id, valor] as const
  );
}

const passoActual = (page: Page) => page.locator("[aria-current='step']").innerText();

test.describe("Publicar anúncio", () => {
  test.use({ locale: "pt-PT" });

  test.beforeEach(async ({ page }) => {
    await jaRespondeuAosCookies(page);
    // Não se limpa o rascunho aqui: cada caso corre num contexto novo, logo o
    // armazenamento já começa vazio. Limpá-lo a cada carregamento apagava-o
    // também no regresso que o caso do rascunho existe para exercer.
    await page.goto("/vender-cavalo");
    await page.waitForSelector("#proprietario_nome");
  });

  test("um campo cala-se enquanto se escreve e fala ao sair", async ({ page }) => {
    // Marcar a vermelho quem ainda vai a meio de escrever é dizer-lhe que
    // está errado antes de ele ter acabado.
    await page.fill("#altura", "193");
    await expect(page.locator("#apontamento-altura")).toHaveCount(0);

    await page.locator("#altura").blur();
    const apontamento = page.locator("#apontamento-altura .apontamento");
    await expect(apontamento).toHaveCount(1);
    await expect(apontamento).toContainText(/150.*170/);

    // Um aviso não é um erro: não trava nada, e por isso não marca o campo
    // como inválido nem abre o resumo do topo.
    await expect(page.locator("#altura")).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".resumo-erros")).toHaveCount(0);
    // Mas quem não vê o ecrã tem de lá chegar na mesma.
    await expect(page.locator("#altura")).toHaveAttribute("aria-describedby", "apontamento-altura");
  });

  test("uma sugestão escreve-se no campo com um clique", async ({ page }) => {
    // `16.2` são dezasseis mãos e duas polegadas — 168cm. Quem escreve mãos
    // numa caixa que pede centímetros não se enganou: usou a unidade da casa
    // dele.
    await page.fill("#altura", "16.2");
    await page.locator("#altura").blur();

    const aceitar = page.locator("#apontamento-altura .apontamento__aceitar");
    await expect(aceitar).toHaveText("168");
    await aceitar.click();
    await expect(page.locator("#altura")).toHaveValue("168");
  });

  test("um erro aparece ao sair do campo, sem abrir o resumo do topo", async ({ page }) => {
    // O 95 não é prefixo móvel de ninguém. Isto impede — mas o resumo do topo
    // é `aria-live="assertive"` e continua a ser só do «Continuar»: a cada
    // `blur` interromperia quem escreve para lhe ler a lista inteira.
    await page.fill("#proprietario_telefone", "952345678");
    await page.locator("#proprietario_telefone").blur();

    await expect(page.locator("#erro-proprietario_telefone")).toBeVisible();
    await expect(page.locator("#proprietario_telefone")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".resumo-erros")).toHaveCount(0);

    // E trava mesmo: com ele por corrigir não se passa ao passo 2.
    await preencherPasso1(page);
    await page.fill("#proprietario_telefone", "952345678");
    const continuar = page.getByRole("button", { name: /continuar/i }).first();
    await continuar.scrollIntoViewIfNeeded();
    await continuar.click();
    await expect(page.locator(".resumo-erros")).toBeVisible();
    expect(await passoActual(page)).toContain("1");
  });

  test("o resumo de erros aparece no ecrã e cada linha leva ao campo", async ({ page }) => {
    const continuar = page.getByRole("button", { name: /continuar/i }).first();
    await continuar.scrollIntoViewIfNeeded();
    await continuar.click();

    // `.resumo-erros` e não `[role="alert"]`: o anunciador de rotas do Next
    // também é um `role="alert"`, e um selector que apanha os dois não aponta
    // a nada em concreto.
    const resumo = page.locator(".resumo-erros");
    await expect(resumo).toBeVisible();
    // Não basta existir: tem de estar dentro da janela. Era isto que faltava.
    await expect(resumo).toBeInViewport();

    // E os campos que faltam ficam marcados, não só listados.
    expect(await page.locator("[aria-invalid='true']").count()).toBeGreaterThan(0);

    // Cada linha do resumo é um botão que leva ao campo respectivo.
    await resumo.getByRole("button").first().click();
    await expect(page.locator("#proprietario_nome")).toBeFocused();
  });

  test("a tecla Enter num campo avança o passo, como em qualquer formulário", async ({ page }) => {
    // Antes não havia `<form>` nenhum: Enter não fazia rigorosamente nada.
    await expect(page.locator("form")).toHaveCount(1);

    await preencherPasso1(page);
    await page.focus("#nome");
    await page.keyboard.press("Enter");

    await expect.poll(() => passoActual(page)).toBe("2");
  });

  test("um email com gralha é apanhado no passo 1, e a queixa desaparece ao corrigir", async ({
    page,
  }) => {
    await preencherPasso1(page);
    await page.fill("#proprietario_email", "maria.exemplo.pt");
    await page
      .getByRole("button", { name: /continuar/i })
      .first()
      .click();

    await expect(page.locator("#proprietario_email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#erro-proprietario_email")).toBeVisible();

    await page.fill("#proprietario_email", "maria@exemplo.pt");
    await expect(page.locator("#erro-proprietario_email")).toHaveCount(0);
  });

  test("avançar de passo leva a página ao topo do formulário", async ({ page }) => {
    await preencherPasso1(page);
    const continuar = page.getByRole("button", { name: /continuar/i }).first();
    await continuar.scrollIntoViewIfNeeded();
    const antes = await page.evaluate(() => window.scrollY);
    expect(antes).toBeGreaterThan(400); // o botão está mesmo lá em baixo

    await continuar.click();
    await expect.poll(() => passoActual(page)).toBe("2");

    // O indicador de passos tem de ficar à vista: é o que diz onde se está.
    await expect(page.locator("[role='progressbar']")).toBeInViewport();
  });

  test("o rascunho volta, e diz o que não conseguiu guardar", async ({ page }) => {
    await preencherPasso1(page);
    await page
      .getByRole("button", { name: /continuar/i })
      .first()
      .click();
    await expect.poll(() => passoActual(page)).toBe("2");

    // Anexa o Livro Azul: é um `File`, e um `File` não sobrevive ao rascunho.
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name: "livro-azul.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 teste"),
      });
    await expect(page.getByText("livro-azul.pdf")).toBeVisible();

    // Fecha o separador e volta.
    await page.goto("/");
    await page.goto("/vender-cavalo");
    await page.waitForSelector("main");

    // O aviso aparece — antes só aparecia no passo 1, e como o rascunho também
    // repõe o passo, quem o tinha deixado adiante nunca chegava a vê-lo.
    await expect(page.getByText(/rascunho/i).first()).toBeVisible();
    // E diz porque é que o documento não está lá.
    await expect(page.getByText(/não ficam guardados no rascunho/i)).toBeVisible();
    // Devolve ao passo onde o ficheiro que falta se anexa, e não a um passo à
    // frente onde o botão não andava e ninguém percebia porquê.
    await expect.poll(() => passoActual(page)).toBe("2");
    // O texto do passo anterior também voltou.
    await page
      .getByRole("button", { name: /anterior/i })
      .first()
      .click();
    await expect(page.locator("#nome")).toHaveValue("Zíngaro");
  });

  test("«Recomeçar de novo» limpa mesmo tudo", async ({ page }) => {
    await preencherPasso1(page);
    await page.goto("/vender-cavalo");
    await page.waitForSelector("#nome");
    await expect(page.locator("#nome")).toHaveValue("Zíngaro");

    await page.getByRole("button", { name: /recomeçar/i }).click();

    await expect(page.locator("#nome")).toHaveValue("");
    await expect(page.locator("#proprietario_nome")).toHaveValue("");
    expect(await page.evaluate(() => localStorage.getItem("vender-cavalo-draft"))).toBeNull();
  });

  test("os detalhes opcionais estão fechados, e abrem quando se quer", async ({ page }) => {
    const painel = page.getByRole("button", { name: /Facturação e contacto adicional/i });
    await expect(painel).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#proprietario_nif")).toBeHidden();

    await painel.click();
    await expect(painel).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#proprietario_nif")).toBeVisible();
  });
});
