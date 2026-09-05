import { test, expect } from "@playwright/test";
import { jaRespondeuAosCookies } from "./visitante";

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

/**
 * A área de conta só é verificável onde a base de dados esteja alcançável.
 *
 * Sem Supabase, `auth.getUser()` fica pendurado e a página serve o esqueleto
 * de carregamento com 200 — não expõe anúncio nenhum, mas também nunca chega
 * a redireccionar. Marcar isso como falha é acusar o código de um defeito que
 * é do ambiente.
 *
 * O sinal é o mesmo que o do marketplace, e é de propósito: a página de login
 * não serve para isto, porque o formulário rende à mesma sem base de dados
 * nenhuma por trás.
 */
async function saltarSeAutenticacaoIndisponivel(page: import("@playwright/test").Page) {
  await page.goto("/comprar");
  const grelha = await page.getByLabel("Pesquisar cavalos").count();
  test.skip(grelha === 0, "autenticação indisponível: base de dados inacessível neste ambiente");
}

test.describe("Marketplace", () => {
  // O site é traduzido pelo idioma do browser, e o Playwright corre em inglês
  // por omissão: sem isto o botão do menu chama-se «Open menu» e um teste que
  // procure «Abrir menu» nunca o encontra. Fixar o idioma é o que torna as
  // asserções em português verdadeiras.
  test.use({ locale: "pt-PT" });

  // Estes casos exercem o percurso de negócio, e o percurso de negócio é o de
  // quem já respondeu ao pedido de cookies. O primeiro acesso tem um caso só
  // dele, mais abaixo.
  test.beforeEach(async ({ page }) => {
    await jaRespondeuAosCookies(page);
  });

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

  // O atalho por disciplina saiu da homepage quando ela foi reconstruída e
  // passou a viver no segundo nível do menu de telemóvel. O caminho que
  // interessa — uma escolha leva ao marketplace já filtrado — é o mesmo; o
  // que muda é a superfície, e por isso o teste corre num ecrã estreito.
  test("um atalho do menu chega ao marketplace já filtrado", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: /abrir menu/i }).click();
    await page
      .locator("#mobile-menu")
      .getByRole("button", { name: /comprar cavalo/i })
      .click();
    await page
      .locator('.menu-nivel[data-activo="true"]')
      .getByRole("link", { name: /equita[çc][ãa]o de trabalho/i })
      .click();

    await page.waitForURL(/\/comprar\?.*disciplina=Trabalho/);
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
    await saltarSeAutenticacaoIndisponivel(page);

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

/**
 * O primeiro acesso, que é o único onde o pedido de cookies aparece.
 *
 * Fica fora do `describe` de cima de propósito: é o `beforeEach` de lá que
 * semeia a resposta, e um teste ao pedido de cookies num browser que já
 * respondeu não testa coisa nenhuma.
 */
test.describe("Primeiro acesso", () => {
  test.use({ locale: "pt-PT" });

  test("o pedido de cookies aparece, tranca a página e não volta depois de respondido", async ({
    page,
  }) => {
    await page.goto("/");

    const pedido = page.locator("#aviso-cookies");
    await expect(pedido).toBeVisible();

    // Enquanto está por responder, tranca mesmo: a acção principal da
    // homepage não é alcançável. É a asserção que faltava — foi esta
    // interposição que apanhou três casos desprevenidos.
    const publicar = page.getByRole("link", { name: /publicar an[úu]ncio/i }).first();
    await expect(publicar).toBeVisible();
    let interposto = false;
    try {
      await publicar.click({ trial: true, timeout: 2000 });
    } catch {
      interposto = true;
    }
    expect(interposto, "o pedido de cookies devia estar a tapar a página").toBe(true);

    // Recusar é uma resposta inteira, a um clique, na primeira camada.
    await pedido.getByRole("button", { name: "Recusar todos" }).click();
    await expect(pedido).toBeHidden();

    // Respondido, a página responde.
    await publicar.click();
    await page.waitForURL(/\/vender-cavalo/);

    // E não volta a perguntar na navegação seguinte.
    await expect(page.locator("#aviso-cookies")).toHaveCount(0);
  });
});
