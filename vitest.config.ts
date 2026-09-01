import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Só *.test.*: os *.spec.* pertencem ao Playwright, cujo testDir é o mesmo
    // __tests__/. Reclamar ambos fazia o vitest tentar correr specs de browser e
    // falhar sem nunca executar um teste.
    include: ["**/*.test.{ts,tsx}"],
    /* Os padrões têm de ser recursivos.
       «node_modules» sem `**` só casa com o directório de topo: os
       `node_modules` aninhados — os das worktrees dos agentes em
       `.claude/worktrees/`, por exemplo — escapavam, e o vitest ia correr a
       suite de bibliotecas de terceiros. Medido: 229 ficheiros a falhar que
       não têm nada a ver com este projecto, o que esconde uma falha a sério
       no meio do ruído. */
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", ".claude/**"],
    pool: "forks",
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", ".next/", "**/*.d.ts", "**/*.config.*", "**/types/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
