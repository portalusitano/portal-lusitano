import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts utilitários usam CommonJS (require) - não são parte do bundle.
    // O `.cjs` faltava no padrão: a extensão é a forma de dizer ao Node que o
    // ficheiro é CommonJS, e mesmo assim apanhava «require() style import is
    // forbidden» — a regra certa aplicada ao ficheiro errado.
    "scripts/*.js",
    "scripts/*.cjs",
    // As worktrees que o Claude Code cria para agentes são cópias inteiras do
    // repositório. Sem esta linha, `npx eslint` — que é o portão escrito nas
    // regras de trabalho — percorre o `app/`, o `components/` e o `lib/` uma
    // vez por worktree. Com quarenta e seis paradas em disco, o portão passou
    // de segundos a mais de um quarto de hora e deixou de ser corrido. Não é
    // código do produto: nada aqui vai para o bundle e cada worktree tem o seu
    // próprio portão.
    ".claude/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
