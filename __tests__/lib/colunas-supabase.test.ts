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
 * ─── O ponto cego, que fechou ──────────────────────────────────────────────
 *
 * Houve aqui um buraco nos dois sentidos, e vale a pena ficar escrito porque
 * foi ele que escondeu onze consultas partidas.
 *
 * `lib/database.types.ts` estava velho e **declarava oito colunas que a base
 * não tinha** — `raca`, `nome_cavalo`, `image_url`, `nivel`, `pontuacao_apsl`,
 * `contacto_nome`, `contacto_email` e `contacto_telefone`. Como este ficheiro
 * tira daí a sua autoridade, uma consulta que pedisse qualquer uma delas
 * passava aqui e devolvia 42703 em produção. E 42703 não devolve a linha sem
 * essa coluna: devolve `data: null` para a consulta inteira, o que faz um
 * `c.nome || c.nome_cavalo` defensivo nunca chegar a correr.
 *
 * Os tipos foram regerados em 2026-09-04, depois de as duas migrações serem
 * aplicadas, e as oito fantasmas desapareceram. Nesse instante este teste
 * acusou as onze — o chat do marketplace, os dois crons de email, as denúncias
 * e as estatísticas do admin —, e ficaram corrigidas.
 *
 * A lição, para quem regerar os tipos a seguir: **um teste de contrato não vale
 * mais do que a fonte de onde tira a verdade.** Enquanto os tipos estiverem
 * atrasados face à base, este ficheiro dá verde sobre código partido.
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

  it("a tabela dos ascendentes existe mesmo, e com as colunas que o webhook escreve", () => {
    // Escrito quando a tabela só existia num `CREATE TABLE IF NOT EXISTS` por
    // aplicar, e este teste afirmava o contrário: que ela **não** era
    // verificável, porque não havia autoridade de onde a ler.
    //
    // A migração foi aplicada a 2026-09-04 e os tipos regerados a partir da
    // base, portanto a autoridade passou a existir. Passa a afirmar a forma —
    // que é o que um teste de contrato deve fazer assim que tem de onde a ler.
    const ascendentes = lerEsquema().cavalos_venda_ascendentes;
    expect(ascendentes).toBeDefined();
    for (const coluna of ["cavalo_id", "caminho", "geracao", "nome", "registo"]) {
      expect(ascendentes!.has(coluna)).toBe(true);
    }
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
