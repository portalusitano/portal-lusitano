// playwright.setup.ts - Shared test utilities and setup
import { test as base } from "@playwright/test";

import type { Page } from "@playwright/test";

type TestFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }: { page: Page }, use: (fixture: Page) => Promise<void>) => {
    // Setup: navigate to app
    await page.goto("/");
    // You can add authentication setup here if needed
    // A regra dos hooks do React engana-se aqui: `use` é o nome que o
    // Playwright dá ao segundo argumento de uma fixture, e qualquer chamada
    // a `use(...)` é lida como um hook fora de um componente. Não é um hook,
    // é a API do Playwright.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
    // Cleanup if needed
  },
});

export { expect } from "@playwright/test";
