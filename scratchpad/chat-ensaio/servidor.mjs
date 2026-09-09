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
import { construir, EU, CAVALOS } from "./dados.mjs";

const PORTA = Number(process.env.PORTA || 54992);
const VAZIO = process.env.VAZIO === "1";
const LOG = process.env.LOG === "1";

const { conversas, mensagens } = construir({ vazio: VAZIO });

/** As tabelas que este banco serve. O resto responde `[]`, como o PostgREST. */
const TABELAS = {
  marketplace_conversas: conversas.map(({ _porLer, ...c }) => c),
  marketplace_mensagens: mensagens,
  cavalos_venda: CAVALOS,
  coudelarias: [],
};

/* ── O subconjunto do PostgREST ─────────────────────────────────────────── */

/** `eq.3`, `is.null`, `in.(a,b)` … → um predicado sobre uma linha. */
function predicado(coluna, expr) {
  const corte = expr.indexOf(".");
  const op = expr.slice(0, corte);
  const bruto = expr.slice(corte + 1);

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

/** `or=(a.eq.1,b.eq.2)` — só um nível, que é o que o código do chat usa. */
function predicadoOu(valor) {
  const partes = valor.replace(/^\(|\)$/g, "").split(",");
  const preds = partes.map((p) => {
    const i = p.indexOf(".");
    return predicado(p.slice(0, i), p.slice(i + 1));
  });
  return (l) => preds.some((f) => f(l));
}

const RESERVADOS = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function consultar(tabela, u) {
  let linhas = [...(TABELAS[tabela] ?? [])];

  for (const [chave, valor] of u.searchParams.entries()) {
    if (RESERVADOS.has(chave)) continue;
    if (chave === "or") {
      linhas = linhas.filter(predicadoOu(valor));
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
