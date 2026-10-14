/**
 * PostgREST **e GoTrue** de mentira, para o chat.
 *
 * ── Porque é que isto tem de falar as duas línguas ───────────────────────
 *
 * O stub que serve o globo responde só a `/rest/v1/coudelarias` e devolve
 * `[]` a tudo o resto. Contra ele, o chat mede-se assim: a caixa de entrada
 * está sempre vazia, e nem lá se chega — a página faz `redirect("/login")`
 * porque `supabase.auth.getUser()` não devolve ninguém. **Um banco que
 * responde `200 []` é pior do que um que rebenta**, porque parece que
 * funciona: as etiquetas do ecrã aparecem, o carregamento acaba, e os números
 * que dali saem são sobre nada.
 *
 * Por isso este serve as duas metades:
 *
 *   /rest/v1/<tabela>   um subconjunto do PostgREST — o que o código do chat
 *                       usa e mais nada: select, eq, neq, is, in, or, order,
 *                       limit, range, o `Accept: vnd.pgrst.object+json` do
 *                       `.single()`, e POST/PATCH com `Prefer: return=…`
 *   /auth/v1/*          o suficiente para o `@supabase/ssr` autenticar: trocar
 *                       uma palavra-passe por um token, e devolver o
 *                       utilizador a quem trouxer esse token
 *
 * ── O que isto **não** é ─────────────────────────────────────────────────
 *
 * Não é uma base de dados. Não há transacções, não há RLS, não há `CHECK` e
 * não há chaves estrangeiras — as garantias que a migração escreve são
 * verificadas contra um PostgreSQL a sério, nunca aqui. E o token que emite
 * **não é verificado**: é um JWT com a forma certa e uma assinatura que não
 * quer dizer nada, porque quem o valida neste ensaio é este próprio processo.
 * Serve para medir a interface, e é só para isso que se pode invocar.
 *
 * Uso:
 *   node scratchpad/chat-ensaio/servidor.mjs            # porta 54992
 *   PORTA=54993 VAZIO=1 node scratchpad/chat-ensaio/servidor.mjs
 *
 * E depois, para o site:
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54992 npx next build && npx next start
 */
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { construir, EU, CAVALOS, PERFIS } from "./dados.mjs";

/** As vinte coudelarias do banco de ensaio. Ver o README: os nomes, as terras
    e os contactos saem dos seeds do repositório; o resto está a nulo de
    propósito, porque um campo em falta não é o mesmo que um campo inventado. */
const COUDELARIAS = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "..", "coudelarias-ensaio.json"), "utf8")
);

const PORTA = Number(process.env.PORTA || 54992);
const VAZIO = process.env.VAZIO === "1";
const LOG = process.env.LOG === "1";

const { conversas, mensagens } = construir({ vazio: VAZIO });

/** Os bytes que foram parar ao balde, por chave `<balde>/<caminho>`. */
const OBJECTOS = new Map();

/** As tabelas que este banco serve. O resto responde `[]`, como o PostgREST. */
const TABELAS = {
  marketplace_conversas: conversas.map(({ _porLer, ...c }) => c),
  marketplace_mensagens: mensagens,
  cavalos_venda: CAVALOS,
  /* As coudelarias vêm do `scratchpad/coudelarias-ensaio.json`, que é o
     ficheiro que o `CLAUDE.md` nomeia. Sem elas o `next build` gera zero
     fichas — e como a ficha tem `dynamicParams = false`, uma lista vazia
     publica-as todas a 404 sem um aviso. */
  coudelarias: COUDELARIAS,
  /* Os perfis das pessoas do ensaio.
     A gama, e é de propósito: com nome e com fotografia · com nome e sem
     fotografia · **sem nome nenhum** (que é quem exercita a cadeia antiga do
     `nomeOutraParte`) · e uma pessoa sem linha de perfil nenhuma, que é o
     estado de quem tem conta anterior ao gatilho.
     O `avatar_prefixo` é opaco e não tem nada do `id` — é essa propriedade que
     autoriza a fotografia a sair numa resposta de API. */
  user_profiles: PERFIS,
};

/* ── O subconjunto do PostgREST ─────────────────────────────────────────── */

/** `eq.3`, `is.null`, `in.(a,b)` … → um predicado sobre uma linha. */
function predicado(coluna, expr) {
  const corte = expr.indexOf(".");
  const op = expr.slice(0, corte);
  const bruto = semAspas(expr.slice(corte + 1));

  const igual = (a, b) => String(a ?? "") === String(b ?? "");

  switch (op) {
    case "eq":
      return (l) => igual(l[coluna], bruto);
    case "neq":
      return (l) => !igual(l[coluna], bruto);
    case "is":
      return (l) => (bruto === "null" ? l[coluna] === null || l[coluna] === undefined : true);
    case "in": {
      const membros = bruto
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((x) => x.replace(/^"|"$/g, ""));
      return (l) => membros.some((m) => igual(l[coluna], m));
    }
    case "gt":
      return (l) => l[coluna] > bruto;
    case "gte":
      return (l) => l[coluna] >= bruto;
    case "lt":
      return (l) => l[coluna] < bruto;
    case "lte":
      return (l) => l[coluna] <= bruto;
    default:
      // Um operador que este banco não conhece não pode passar por «sem
      // filtro»: isso devolveria linhas a mais em silêncio, que é o defeito
      // que este ficheiro existe para não repetir.
      throw new Error(`operador PostgREST não suportado: ${op} (${coluna}=${expr})`);
  }
}

/**
 * Reparte por vírgulas de topo, respeitando parênteses e aspas.
 *
 * ── O defeito que isto corrige, e o que ele custou ───────────────────────
 *
 * Isto era um `.split(",")` seco, com o comentário «só um nível, que é o que
 * o código do chat usa» — e a paginação por cursor passou a usar dois:
 *
 *   or=(created_at.lt."X",and(created_at.eq."X",id.lt.Y))
 *
 * O `split` seco parte isso em **três** pedaços, e o terceiro é `id.lt.Y)`,
 * com o parêntese lá dentro. Como o `or` é uma disjunção, um pedaço a mais
 * que calhe ser verdadeiro deixa passar a linha da fronteira — e o resultado
 * é o pior que um banco de ensaio pode dar: **uma resposta plausível**.
 * Medido pelo agente que apanhou isto: percorrer um fio de 400 mensagens por
 * cursor devolvia **413 linhas para 400 distintas**, a linha da fronteira
 * repetida em 13 de 14 páginas, sem um erro em lado nenhum.
 *
 * É exactamente contra isto que o `predicado()` atira em vez de devolver
 * `[]`, e a lição é que a guarda estava no sítio errado: o operador
 * desconhecido dava erro, mas a **gramática** mal repartida não dava nada.
 */
function reparteTopo(texto) {
  const partes = [];
  let nivel = 0;
  let aspas = false;
  let inicio = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"' && texto[i - 1] !== "\\") aspas = !aspas;
    else if (!aspas && c === "(") nivel++;
    else if (!aspas && c === ")") nivel--;
    else if (!aspas && c === "," && nivel === 0) {
      partes.push(texto.slice(inicio, i));
      inicio = i + 1;
    }
  }
  partes.push(texto.slice(inicio));
  return partes.filter((p) => p.length);
}

const semAspas = (v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v);

/**
 * `or=(…)` e `and=(…)`, com aninhamento: cada membro é um `and(…)`, um
 * `or(…)`, ou uma condição `coluna.op.valor`.
 */
function predicadoGrupo(valor, juncao) {
  const membros = reparteTopo(valor.replace(/^\(/, "").replace(/\)$/, ""));
  const preds = membros.map((m) => {
    const t = m.trim();
    if (t.startsWith("and(")) return predicadoGrupo(t.slice(3), "and");
    if (t.startsWith("or(")) return predicadoGrupo(t.slice(2), "or");
    const i = t.indexOf(".");
    if (i < 1) throw new Error(`condicao PostgREST ilegivel: ${t}`);
    return predicado(t.slice(0, i), t.slice(i + 1));
  });
  return juncao === "and" ? (l) => preds.every((f) => f(l)) : (l) => preds.some((f) => f(l));
}

const RESERVADOS = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function consultar(tabela, u) {
  let linhas = [...(TABELAS[tabela] ?? [])];

  for (const [chave, valor] of u.searchParams.entries()) {
    if (RESERVADOS.has(chave)) continue;
    if (chave === "or" || chave === "and") {
      linhas = linhas.filter(predicadoGrupo(valor, chave));
      continue;
    }
    linhas = linhas.filter(predicado(chave, valor));
  }

  const order = u.searchParams.get("order");
  if (order) {
    for (const termo of order.split(",").reverse()) {
      const [coluna, ...resto] = termo.split(".");
      const desc = resto.includes("desc");
      linhas.sort((a, b) => {
        const x = a[coluna],
          y = b[coluna];
        if (x === y) return 0;
        const menor =
          x === null || x === undefined ? true : y === null || y === undefined ? false : x < y;
        return (menor ? -1 : 1) * (desc ? -1 : 1);
      });
    }
  }

  const offset = Number(u.searchParams.get("offset") || 0);
  const limite = Number(u.searchParams.get("limit") || 0);
  if (offset) linhas = linhas.slice(offset);
  if (limite > 0) linhas = linhas.slice(0, limite);

  // O `select` recorta as colunas, como o PostgREST faz. Serve para apanhar o
  // código que lê uma coluna que não pediu — que contra um banco que devolve
  // a linha inteira passa despercebido e contra a base a sério é `undefined`.
  const select = decodeURIComponent(u.searchParams.get("select") || "*").replace(/\s/g, "");
  if (select && select !== "*") {
    const cols = select.split(",").filter((c) => c && !c.includes("("));
    linhas = linhas.map((l) => Object.fromEntries(cols.map((c) => [c, l[c] ?? null])));
  }
  return linhas;
}

/* ── O GoTrue de mentira ────────────────────────────────────────────────── */

const b64url = (o) =>
  Buffer.from(JSON.stringify(o))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const UTILIZADOR = {
  id: EU.id,
  aud: "authenticated",
  role: "authenticated",
  email: EU.email,
  email_confirmed_at: "2026-01-01T00:00:00Z",
  phone: "",
  confirmed_at: "2026-01-01T00:00:00Z",
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: EU.nome, email: EU.email, email_verified: true },
  identities: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: new Date().toISOString(),
  is_anonymous: false,
};

function sessao() {
  const expira = Math.floor(Date.now() / 1000) + 3600;
  // JWT com a forma certa e uma assinatura que não quer dizer nada: quem o
  // valida neste ensaio é este processo, que só olha para o `sub`.
  const token = [
    b64url({ alg: "HS256", typ: "JWT" }),
    b64url({
      iss: `http://127.0.0.1:${PORTA}/auth/v1`,
      sub: EU.id,
      aud: "authenticated",
      role: "authenticated",
      email: EU.email,
      exp: expira,
      iat: Math.floor(Date.now() / 1000),
      session_id: "00000000-0000-4000-8000-000000000000",
      is_anonymous: false,
    }),
    "ensaio",
  ].join(".");

  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expira,
    refresh_token: "ensaio-refresh",
    user: UTILIZADOR,
  };
}

/* ── O servidor ─────────────────────────────────────────────────────────── */

function corpo(req) {
  return new Promise((ok) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try {
        ok(b ? JSON.parse(b) : null);
      } catch {
        ok(null);
      }
    });
  });
}

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, "http://x");
    if (LOG) console.log(req.method, req.url);

    const cab = {
      "content-type": "application/json",
      "access-control-allow-origin": req.headers.origin || "*",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-expose-headers": "content-range,content-type",
    };
    if (req.method === "OPTIONS") {
      res.writeHead(204, cab);
      return res.end();
    }

    const responder = (codigo, dados) => {
      res.writeHead(codigo, cab);
      res.end(JSON.stringify(dados));
    };

    /* Auth */
    if (u.pathname.startsWith("/auth/v1/")) {
      const parte = u.pathname.slice("/auth/v1/".length);
      if (parte === "token") return responder(200, sessao());
      if (parte === "user") {
        const bearer = String(req.headers.authorization || "");
        // Sem token não há utilizador — é isto que faz a página redirigir
        // para o login quando se mede o estado de quem não entrou.
        if (!bearer.startsWith("Bearer ") || bearer.length < 20) {
          return responder(401, { message: "invalid claim: missing sub claim" });
        }
        return responder(200, UTILIZADOR);
      }
      if (parte === "logout") {
        res.writeHead(204, cab);
        return res.end();
      }
      return responder(200, {});
    }

    /* ── Armazenamento de mentira ──────────────────────────────────────────
       O suficiente para as rotas do perfil: escrever um objecto, apagá-lo, e
       servi-lo de volta pelo endereço público. Guarda os bytes em memória para
       se poder **verificar o que lá ficou** — que é o ponto: o ensaio serve
       para provar que o que chega ao balde é WebP de 256px sem EXIF, e não só
       que a rota devolveu 201.

       Não é armazenamento a sério: não há políticas, não há limites de balde e
       não há CDN. As políticas verificam-se contra um PostgreSQL, em
       `__tests__/lib/perfil-rls.sql.test.ts`. */
    if (u.pathname.startsWith("/storage/v1/")) {
      const resto = u.pathname.slice("/storage/v1/".length);

      if (resto.startsWith("object/public/")) {
        const chave = resto.slice("object/public/".length);
        const bytes = OBJECTOS.get(chave);
        if (!bytes) return responder(404, { message: "não encontrado" });
        res.writeHead(200, { "content-type": "image/webp", "content-length": bytes.length });
        return res.end(bytes);
      }

      if (resto.startsWith("object/")) {
        const chave = resto.slice("object/".length);
        if (req.method === "POST" || req.method === "PUT") {
          const trocos = [];
          for await (const t of req) trocos.push(t);
          OBJECTOS.set(chave, Buffer.concat(trocos));
          return responder(200, {
            Id: chave,
            Key: chave,
            path: chave.split("/").slice(1).join("/"),
          });
        }
        if (req.method === "DELETE") {
          OBJECTOS.delete(chave);
          return responder(200, {});
        }
      }

      // O `.remove([...])` do supabase-js é um DELETE em `object/<balde>` com
      // os caminhos no corpo.
      if (req.method === "DELETE" && resto.split("/").length === 1) {
        const { prefixes = [] } = (await corpo(req)) || {};
        for (const p of prefixes) OBJECTOS.delete(`${resto}/${p}`);
        return responder(200, {});
      }

      return responder(400, { message: `storage: não sei servir ${req.method} ${resto}` });
    }

    /* PostgREST */
    if (u.pathname.startsWith("/rest/v1/")) {
      const tabela = u.pathname.slice("/rest/v1/".length).split("/")[0];
      const um = String(req.headers.accept || "").includes("vnd.pgrst.object");
      const devolve = String(req.headers.prefer || "").includes("return=representation");

      try {
        if (req.method === "GET") {
          const linhas = consultar(tabela, u);
          res.writeHead(200, {
            ...cab,
            "content-range": `0-${Math.max(0, linhas.length - 1)}/${linhas.length}`,
          });
          return res.end(JSON.stringify(um ? (linhas[0] ?? null) : linhas));
        }

        if (req.method === "POST") {
          const novo = await corpo(req);
          const linhas = Array.isArray(novo) ? novo : [novo];

          /* O `.upsert()` do supabase-js é um POST com
             `Prefer: resolution=merge-duplicates`. Sem isto o banco empilhava
             uma segunda linha com o mesmo `id` e a leitura seguinte devolvia a
             velha — que é pior do que rebentar, porque parece que funciona. */
          if (String(req.headers.prefer || "").includes("merge-duplicates")) {
            const tocadas = [];
            for (const l of linhas) {
              const existente = (TABELAS[tabela] ??= []).find((x) => x.id === l.id);
              if (existente) {
                Object.assign(existente, l);
                tocadas.push(existente);
              } else {
                const criada = { created_at: new Date().toISOString(), ...l };
                TABELAS[tabela].push(criada);
                tocadas.push(criada);
              }
            }
            if (!devolve) {
              res.writeHead(201, cab);
              return res.end();
            }
            res.writeHead(201, cab);
            return res.end(JSON.stringify(um ? (tocadas[0] ?? null) : tocadas));
          }

          const criadas = linhas.map((l) => ({
            id: `ffffff${Math.random().toString(16).slice(2, 10)}-0000-4000-8000-000000000000`,
            created_at: new Date().toISOString(),
            lida_at: null,
            ...l,
          }));
          (TABELAS[tabela] ??= []).push(...criadas);
          if (!devolve) {
            res.writeHead(201, cab);
            return res.end();
          }
          res.writeHead(201, cab);
          return res.end(JSON.stringify(um ? criadas[0] : criadas));
        }

        if (req.method === "PATCH") {
          const campos = await corpo(req);
          const alvo = new Set(consultar(tabela, u).map((l) => l.id));
          const tocadas = [];
          for (const l of TABELAS[tabela] ?? []) {
            if (alvo.has(l.id)) {
              Object.assign(l, campos);
              tocadas.push(l);
            }
          }
          if (!devolve) {
            res.writeHead(204, cab);
            return res.end();
          }
          return responder(200, um ? (tocadas[0] ?? null) : tocadas);
        }
      } catch (e) {
        // Um pedido que este banco não sabe servir tem de dar erro, não `[]`.
        return responder(400, { message: String(e.message || e), code: "ENSAIO" });
      }
    }

    responder(200, []);
  })
  .listen(PORTA, "127.0.0.1", () =>
    console.log(
      `banco de ensaio do chat em http://127.0.0.1:${PORTA}` +
        (VAZIO
          ? " (caixa de entrada vazia)"
          : ` — ${conversas.length} conversas, ${mensagens.length} mensagens`)
    )
  );
