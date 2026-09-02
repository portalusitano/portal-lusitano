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
 *
 * ─── O ponto cego, medido ───────────────────────────────────────────────────
 *
 * `lib/database.types.ts` está velho, e isso abre um buraco nos dois sentidos.
 * Comparado com o esquema vivo de `cavalos_venda` (lido de `information_schema`
 * em 2026-09-02), o ficheiro gerado **declara oito colunas que a base não tem**
 * — `raca`, `nome_cavalo`, `image_url`, `nivel`, `pontuacao_apsl`,
 * `contacto_nome`, `contacto_email` e `contacto_telefone` — e **desconhece
 * quinze que ela tem**, entre elas `user_id`, `listing_tier` e `verificado`
 * (essas chegam pelas migrações).
 *
 * As oito a mais são o buraco que interessa: uma consulta que peça `raca` passa
 * aqui e devolve 42703 em produção. Foi o que aconteceu com
 * `app/api/cavalos/route.ts`, que a pede no `.select(...)` desde sempre — o
 * teste «a listagem de cavalos pede colunas que existem» dava verde sobre uma
 * coluna que não existia. A migração `20260902000002` cria `raca`, porque ela é
 * também o destino do campo `raca_confirmada` do formulário, o que fecha esse
 * caso pelo lado certo. Os outros sete continuam por fechar até alguém regerar
 * os tipos, e é por isso que isto fica escrito aqui e não só no relatório.
 */

const RAIZ = path.resolve(__dirname, "../..");

/** Ficheiro → tabela → colunas inexistentes já apuradas e ainda por resolver. */
const DIVIDA_CONHECIDA: Record<string, Record<string, string[]>> = {
  // Olhou-se para a base: `leads` tem `id`, `email`, `nome`, `utm_source`,
  // `utm_medium`, `utm_campaign` e `created_at`, e mais nada. `name` era
  // inequivocamente `nome` e ficou corrigido; `sequence_step` fica em dívida
  // porque acrescentá-la não é corrigir um nome, é desenhar a cadeia de
  // emails — quem entra, o que marca a saída, como se conta o passo. Isso é
  // uma decisão de produto e de esquema, e a rota já responde 500 a cada
  // firing do cron desde sempre, por isso nada piora enquanto não se decide.
  "app/api/cron/email-drip/route.ts": {
    leads: ["sequence_step"],
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

  it("conhece as colunas que dão destino aos campos do formulário", () => {
    // A migração `20260902000002` dá coluna a 22 campos que o formulário pedia
    // e que ninguém guardava (ver `docs/campos-do-anuncio.md`). Se um dia for
    // reescrita numa forma que este leitor não sabe ler — um bloco `DO $$`,
    // por exemplo, que o corte por `;` parte ao meio —, as colunas deixam de
    // ser conhecidas e o teste seguinte passa a acusar como inexistente tudo o
    // que as use. Vale mais dar por isso aqui.
    const tabelas = lerEsquema();
    const novas = [
      "raca",
      "nome_registo",
      "microchip",
      "passaporte_equino",
      "pais_nascimento",
      "peso_kg",
      "nivel_apsl",
      "prova_aptidao_apsl",
      "temperamento",
      "coudelaria_origem",
      "anos_treino",
      "nivel_cavaleiro",
      "uso_atual",
      "vendedor_tipo",
      "vendedor_pais",
      "vendedor_website",
      "video_url_2",
      "morfologia",
      "treino",
      "comportamento",
      "maneio",
      "saude",
      "condicoes_venda",
    ];
    expect(novas.filter((c) => !tabelas.cavalos_venda.has(c))).toEqual([]);
  });

  it("a tabela dos ascendentes não é verificada, e é de propósito", () => {
    // `cavalos_venda_ascendentes` nasce de um `CREATE TABLE IF NOT EXISTS`, e a
    // regra deste ficheiro é não tirar autoridade daí: numa base onde a tabela
    // já existisse com outra forma, o statement não corre e as colunas que
    // declara podem nunca ter sido criadas. Sem autoridade não se acusa —
    // acusar por comparação com o SQL dava falsos positivos.
    //
    // O contrato dela está garantido do outro lado: a migração foi validada
    // contra um PostgreSQL local, e `__tests__/api/stripe-webhook-handlers.test.ts`
    // prova que o webhook lhe escreve as cinco colunas com os nomes certos.
    expect(lerEsquema().cavalos_venda_ascendentes).toBeUndefined();
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
