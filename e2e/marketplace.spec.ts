import { test, expect } from "@playwright/test";

/**
 * Smoke test do marketplace.
 *
 * Cobre o percurso que sustenta o negócio — chegar, procurar, filtrar, abrir um
 * anúncio, ir publicar — sem depender de haver cavalos na base de dados: um
 * catálogo vazio é o estado legítimo de um site acabado de instalar, e um teste
 * que só passa com dados de produção não protege ninguém.
 */

/**
 * Salta o caso quando o marketplace não conseguiu carregar.
 *
 * Sem base de dados a página mostra, correctamente, o estado de erro em vez dos
 * filtros — oferecer filtros quando não se consegue carregar nada seria mentir.
 * O caso é saltado, não dado como passado: um teste que se declara verde sem ter
 * exercido nada é pior do que um teste em falta.
 */
async function saltarSeMarketplaceIndisponivel(page: import("@playwright/test").Page) {
  // Detectado pela ausência da grelha, não pelo texto do erro: a página é
  // traduzida e o browser de teste nem sempre corre em português.
  const grelha = await page.getByLabel("Pesquisar cavalos").count();
  test.skip(grelha === 0, "marketplace indisponível: base de dados inacessível neste ambiente");
}

test.describe("Marketplace", () => {
  test("a homepage abre na pesquisa e mostra as duas acções", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Lusitano");
    await expect(page.getByLabel("Procurar cavalos")).toBeVisible();
    await expect(page.getByRole("link", { name: /publicar an[úu]ncio/i }).first()).toBeVisible();
  });

  test("pesquisar na homepage leva ao marketplace com o termo no URL", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Procurar cavalos").fill("veiga");
    await page.getByRole("button", { name: /procurar/i }).click();

    await page.waitForURL(/\/comprar\?.*search=veiga/);
    await saltarSeMarketplaceIndisponivel(page);
    await expect(page.getByLabel("Pesquisar cavalos")).toHaveValue("veiga");
  });

  test("um atalho da homepage chega ao marketplace já filtrado", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Dressage" }).first().click();

    await page.waitForURL(/\/comprar\?.*disciplina=Dressage/);
  });

  test("os filtros ficam no URL, para a pesquisa poder ser partilhada", async ({ page }) => {
    await page.goto("/comprar");
    await saltarSeMarketplaceIndisponivel(page);

    await page.getByRole("button", { name: "Fêmea" }).click();
    await page.waitForURL(/sexo=femea/);

    // Recarregar mantém o filtro: o URL é a fonte de verdade, não o estado do
    // componente.
    await page.reload();
    await expect(page).toHaveURL(/sexo=femea/);
  });

  test("voltar atrás desfaz um filtro", async ({ page }) => {
    await page.goto("/comprar");
    await saltarSeMarketplaceIndisponivel(page);

    await page.getByRole("button", { name: "Fêmea" }).click();
    await page.waitForURL(/sexo=femea/);

    await page.goBack();
    await expect(page).not.toHaveURL(/sexo=femea/);
  });

  test("o marketplace responde mesmo sem resultados", async ({ page }) => {
    // Um termo que nenhum cavalo pode ter: o ecrã vazio tem de explicar-se e
    // oferecer o alerta, em vez de ficar em branco.
    await page.goto("/comprar?search=zzzznaoexistezzzz");
    await saltarSeMarketplaceIndisponivel(page);

    await expect(page.getByText(/nenhum cavalo corresponde/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /criar alerta/i })).toBeVisible();
  });

  test("publicar anúncio abre o formulário de venda", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("link", { name: /publicar an[úu]ncio/i })
      .first()
      .click();

    await page.waitForURL(/\/vender-cavalo/);
  });

  test("as páginas da conta exigem sessão", async ({ page }) => {
    // Os anúncios, as mensagens e os alertas de uma pessoa não podem ser
    // alcançáveis sem autenticação.
    for (const rota of [
      "/minha-conta/anuncios",
      "/minha-conta/mensagens",
      "/minha-conta/alertas",
    ]) {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
