import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Contrato entre o código e o esquema.
 *
 * O cliente Supabase deste projecto é criado sem o genérico `Database`
 * (`lib/supabase-admin.ts`), por isso o TypeScript não vê nada de errado num
 * `.select("imagens")` sobre uma tabela que não tem coluna nenhuma com esse
 * nome. O PostgREST vê: devolve 42703, `data` fica a `null` e — nas rotas que
 * não verificam o erro — a página mostra «não há nada» em vez de «não consegui
 * carregar». Foi assim que os cavalos desapareceram da pesquisa do site.
 *
 * Este teste lê os nomes de colunas escritos em cada `.from(...).select(...)`
 * do repositório e compara-os com o esquema. Não exige lista limpa — exige que
 * a lista não cresça: as entradas de `DIVIDA_CONHECIDA` são defeitos já
 * apurados que precisam de uma decisão de esquema, não de uma linha de código.
 * Corrigir um deles deixa o teste verde na mesma; introduzir um novo parte-o.
 *
 * De onde vem o esquema, e porquê:
 *
 * - `lib/database.types.ts` é gerado a partir da base de dados real e é a
 *   autoridade para as tabelas que conhece.
 * - As migrações mais recentes são posteriores a essa geração, por isso
 *   juntam-se também as colunas de `ALTER TABLE … ADD COLUMN`, que correm
 *   sempre.
 * - **Não** se lê de `CREATE TABLE IF NOT EXISTS`: numa tabela que já existia
 *   esse statement não corre, e as colunas que declara podem nunca ter sido
 *   criadas. É exactamente o caso de `coudelarias.morada`, escrita no SQL e
 *   ausente da base.
 * - As tabelas que os tipos gerados não conhecem de todo (as do marketplace
 *   novo) não são verificadas: aí não há autoridade nenhuma para comparar, e
 *   acusar por comparação com o SQL daria falsos positivos.
 */

const RAIZ = path.resolve(__dirname, "../..");

/** Ficheiro → tabela → colunas inexistentes já apuradas e ainda por resolver. */
const DIVIDA_CONHECIDA: Record<string, Record<string, string[]>> = {
  // `eventos` tem `titulo`, não `nome`; `coudelarias` tem `plan`, não `plano`;
  // `profissionais` tem `tipo` e `cidade`/`distrito`.
  "app/api/admin/search/route.ts": {
    eventos: ["nome"],
    coudelarias: ["plano"],
    profissionais: ["categoria", "localizacao"],
  },
  // `leads` não tem `location`; `cavalos_venda` não tem
  // `proprietario_localizacao` (é `localizacao`/`regiao`).
  "app/api/admin/geo/route.ts": {
    leads: ["location"],
    cavalos_venda: ["proprietario_localizacao"],
  },
  // Aqui as fontes divergem: `supabase/schema.sql` declara `leads.name` e
  // `leads.sequence_step`, os tipos gerados declaram `leads.nome` e nem uma
  // coisa nem outra. Fica registado como dívida em vez de correcção porque
  // corrigir para o nome errado é pior do que deixar como está — é preciso
  // olhar para a base.
  "app/api/cron/email-drip/route.ts": {
    leads: ["name", "sequence_step"],
  },
};

/** Tabelas e colunas conhecidas. */
function lerEsquema(): Record<string, Set<string>> {
  const tabelas: Record<string, Set<string>> = {};

  const fonte = fs.readFileSync(path.join(RAIZ, "lib/database.types.ts"), "utf8");
  const re = /^ {6}([a-z0-9_]+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\};/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fonte))) {
    tabelas[m[1]] ??= new Set();
    for (const c of m[2].matchAll(/^ {10}([a-z0-9_]+)\??:/gm)) tabelas[m[1]].add(c[1]);
  }

  for (const f of percorrer(path.join(RAIZ, "supabase"), /\.sql$/)) {
    const sql = fs.readFileSync(f, "utf8").replace(/--[^\n]*/g, "");
    // Statement a statement: uma expressão regular com `[\s\S]*?` sobre estes
    // ficheiros entra em backtracking catastrófico.
    for (const stmt of sql.split(";")) {
      const cab = stmt.match(
        /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?([a-z0-9_]+)"?/i
      );
      if (!cab) continue;
      const cols = [...stmt.matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-z0-9_]+)"?/gi)];
      if (!cols.length) continue;
      const t = cab[1].toLowerCase();
      tabelas[t] ??= new Set();
      for (const c of cols) tabelas[t].add(c[1].toLowerCase());
    }
  }

  return tabelas;
}

function percorrer(dir: string, filtro: RegExp, saida: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) percorrer(p, filtro, saida);
    else if (filtro.test(e.name)) saida.push(p);
  }
  return saida;
}

type Falha = { ficheiro: string; tabela: string; coluna: string };

function colunasInexistentes(): Falha[] {
  const tabelas = lerEsquema();
  const ficheiros: string[] = [];
  for (const d of ["app", "components", "lib", "hooks", "context"]) {
    const p = path.join(RAIZ, d);
    if (fs.existsSync(p)) percorrer(p, /\.tsx?$/, ficheiros);
  }

  const falhas: Falha[] = [];
  for (const f of ficheiros) {
    if (f.endsWith("database.types.ts")) continue;
    const fonte = fs.readFileSync(f, "utf8");
    const re = /\.from\(\s*"([a-z0-9_]+)"\s*\)\s*(?:\n\s*)?\.select\(\s*\n?\s*"([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(fonte))) {
      const tabela = m[1];
      const sel = m[2];
      const ficheiro = path.relative(RAIZ, f).split(path.sep).join("/");
      // Tabela que os tipos gerados não conhecem — sem autoridade para comparar.
      if (!tabelas[tabela]) continue;
      if (sel.includes("*")) continue;
      // fora as relações embebidas: `coudelarias(nome, slug)`
      const limpo = sel.replace(/[a-z0-9_]+\s*(?:!\w+)?\s*\([^()]*\)/g, "");
      for (const bruto of limpo.split(",")) {
        const coluna = bruto.trim().split(":").pop()!.trim();
        if (!/^[a-z0-9_]+$/.test(coluna)) continue;
        if (tabelas[tabela].has(coluna)) continue;
        falhas.push({ ficheiro, tabela, coluna });
      }
    }
  }
  return falhas;
}

function conhecida(f: Falha): boolean {
  return DIVIDA_CONHECIDA[f.ficheiro]?.[f.tabela]?.includes(f.coluna) ?? false;
}

describe("colunas pedidas ao Supabase", () => {
  it("lê o esquema das duas fontes", () => {
    const tabelas = lerEsquema();
    expect(Object.keys(tabelas).length).toBeGreaterThan(20);
    // dos tipos gerados
    expect(tabelas.cavalos_venda.has("foto_principal")).toBe(true);
    expect(tabelas.cavalos_venda.has("imagens")).toBe(false);
    expect(tabelas.cavalos_venda.has("disciplina")).toBe(false);
    // de um ALTER TABLE posterior à geração dos tipos
    expect(tabelas.cavalos_venda.has("user_id")).toBe(true);
    expect(tabelas.cavalos_venda.has("aviso_expiracao_dias")).toBe(true);
    // um CREATE TABLE IF NOT EXISTS não conta como autoridade
    expect(tabelas.coudelarias.has("morada")).toBe(false);
  });

  it("não pede colunas que a base não tem, fora da dívida já apurada", () => {
    const novas = colunasInexistentes().filter((f) => !conhecida(f));
    expect(
      novas.map((f) => `${f.ficheiro} → ${f.tabela}.${f.coluna}`),
      "colunas inexistentes novas — o PostgREST devolve 42703 e a consulta volta vazia"
    ).toEqual([]);
  });

  it("a pesquisa do site pede colunas que existem", () => {
    expect(colunasInexistentes().filter((f) => f.ficheiro === "app/api/search/route.ts")).toEqual(
      []
    );
  });

  it("a listagem de cavalos pede colunas que existem", () => {
    expect(colunasInexistentes().filter((f) => f.ficheiro === "app/api/cavalos/route.ts")).toEqual(
      []
    );
  });

  it("a dívida registada é dívida a sério e não uma lista a envelhecer", () => {
    // Uma entrada em DIVIDA_CONHECIDA que já não corresponde a nenhuma falha
    // real é ruído: quem a corrigiu devia tê-la tirado daqui.
    const reais = new Set(
      colunasInexistentes().map((f) => `${f.ficheiro}|${f.tabela}|${f.coluna}`)
    );
    const obsoletas: string[] = [];
    for (const [ficheiro, tabelas] of Object.entries(DIVIDA_CONHECIDA)) {
      for (const [tabela, colunas] of Object.entries(tabelas)) {
        for (const coluna of colunas) {
          if (!reais.has(`${ficheiro}|${tabela}|${coluna}`)) {
            obsoletas.push(`${ficheiro} → ${tabela}.${coluna}`);
          }
        }
      }
    }
    expect(obsoletas, "dívida já resolvida — tirar da lista").toEqual([]);
  });
});
