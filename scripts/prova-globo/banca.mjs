#!/usr/bin/env node
/**
 * A BANCA — o sítio onde o globo se põe a medir.
 *
 *   node scripts/prova-globo/banca.mjs            # levanta e fica de pé
 *   node scripts/prova-globo/banca.mjs --preparar # só copia o standalone
 *
 * Duas peças, e ambas existem por uma razão que vale a pena escrever:
 *
 * 1. **Um PostgREST de mentira.** O `.env.local` deste ambiente aponta para um
 *    Supabase de exemplo, e por isso a `/mapa` real cai no estado de falha e
 *    não há globo nenhum. A banca serve as vinte e nove linhas do
 *    `dados-falsos.mjs` no mesmo formato que o PostgREST devolve, e mais nada:
 *    responde `[]` a qualquer outra tabela e um utilizador nulo à autenticação.
 *    Não é um Supabase — é o pedaço dele de que esta página precisa.
 *
 * **Não deixar a banca de pé durante um `next build`.** O `/directorio/[slug]`
 * tem `generateStaticParams`, e com a banca a responder o build gera páginas
 * para as vinte e nove coudelarias de mentira — e sai com erro numa delas.
 * Um `node scripts/prova-globo/parar.mjs` antes do build resolve; foram três
 * construções perdidas a perceber isto.
 *
 * 2. **O `output: standalone` servido a sério.** Medir em `next dev` seria
 *    medir o compilador: recarregamentos, mapas de código, `StrictMode` a
 *    montar cada efeito duas vezes. É precisamente o dobro da montagem que
 *    esconderia um defeito de arranque intermitente, que é o que aqui se
 *    persegue. O `next build` deixa o servidor em `.next/standalone` sem os
 *    ficheiros estáticos nem o `public/`; copiam-se, como a documentação
 *    manda, e corre-se o `server.js`.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { COUDELARIAS } from "./dados-falsos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(AQUI, "..", "..");

export const PORTA_BASE = Number(process.env.PROVA_PORTA_BASE || 54999);
export const PORTA_SITE = Number(process.env.PROVA_PORTA_SITE || 4331);

/* ── O PostgREST de mentira ──────────────────────────────────────────────── */

/** `select=a,b,c` → só essas colunas, que é o que o PostgREST faz. */
function projectar(linhas, select) {
  if (!select || select === "*") return linhas;
  const colunas = select
    .split(",")
    .map((c) => c.trim().split(":").pop())
    .filter(Boolean);
  return linhas.map((l) => Object.fromEntries(colunas.map((c) => [c, l[c] ?? null])));
}

/** `?status=eq.active` e companhia. Só os operadores que esta página usa. */
function filtrar(linhas, params) {
  let saida = linhas;
  for (const [chave, valor] of params) {
    if (["select", "order", "limit", "offset"].includes(chave)) continue;
    const [op, ...resto] = String(valor).split(".");
    const alvo = resto.join(".");
    if (op === "eq") saida = saida.filter((l) => String(l[chave]) === alvo);
    else if (op === "neq") saida = saida.filter((l) => String(l[chave]) !== alvo);
    else if (op === "in") {
      const conjunto = new Set(alvo.replace(/^\(|\)$/g, "").split(","));
      saida = saida.filter((l) => conjunto.has(String(l[chave])));
    }
  }
  return saida;
}

/** `?order=destaque.desc,nome.asc` */
function ordenar(linhas, order) {
  if (!order) return linhas;
  const chaves = order.split(",").map((c) => {
    const [campo, ...op] = c.trim().split(".");
    return { campo, desc: op.includes("desc") };
  });
  return [...linhas].sort((a, b) => {
    for (const { campo, desc } of chaves) {
      const x = a[campo];
      const y = b[campo];
      if (x === y) continue;
      /* Ascendente sempre, e o `desc` inverte no fim: um booleano ordena por
         `false < true`, como no Postgres, e não por «true primeiro». */
      const cmp =
        typeof x === "boolean" || typeof y === "boolean"
          ? Number(!!x) - Number(!!y)
          : String(x ?? "").localeCompare(String(y ?? ""), "pt");
      if (cmp !== 0) return desc ? -cmp : cmp;
    }
    return 0;
  });
}

const TABELAS = { coudelarias: COUDELARIAS };

export function levantarBanca(porta = PORTA_BASE) {
  const servidor = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const responder = (codigo, corpo) => {
      const texto = JSON.stringify(corpo);
      res.writeHead(codigo, {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "content-range": `0-${Math.max(0, (Array.isArray(corpo) ? corpo.length : 1) - 1)}/*`,
      });
      res.end(texto);
    };
    if (req.method === "OPTIONS") return responder(204, {});

    const rest = url.pathname.match(/^\/rest\/v1\/([^/]+)$/);
    if (rest) {
      const tabela = TABELAS[rest[1]];
      if (!tabela) return responder(200, []);
      const params = [...url.searchParams.entries()];
      const filtradas = filtrar(tabela, params);
      const ordenadas = ordenar(filtradas, url.searchParams.get("order"));
      return responder(200, projectar(ordenadas, url.searchParams.get("select")));
    }
    /* A sessão: ninguém está autenticado, e é assim que a página se serve a
       quem chega de fora. Um 401 daqui punha o cliente a repetir o pedido. */
    if (url.pathname.startsWith("/auth/v1/user")) return responder(200, { user: null });
    if (url.pathname.startsWith("/auth/v1/")) return responder(200, {});
    return responder(200, []);
  });
  return new Promise((ok) => servidor.listen(porta, "127.0.0.1", () => ok(servidor)));
}

/* ── O standalone ────────────────────────────────────────────────────────── */

/** Copiar uma árvore. Ver a nota no `prepararStandalone` sobre o `fs.cp`. */
function copiarArvore(origem, destino) {
  return new Promise((ok, falhar) => {
    const p = spawn("cp", ["-a", origem, destino], { stdio: "inherit" });
    p.on("exit", (c) => (c === 0 ? ok() : falhar(new Error(`cp -a saiu com ${c}`))));
    p.on("error", falhar);
  });
}

/**
 * O `next build` deixa o standalone sem estáticos nem `public/`; copiam-se.
 *
 * O `server.js` nem sempre fica na raiz do `standalone/`: quando a raiz de
 * rastreio que o Next infere é mais acima do que o projecto — nesta cópia é,
 * porque o `node_modules` é uma ligação para o repositório partilhado —, a
 * aplicação fica numa sub-árvore que repete o caminho relativo. Procura-se em
 * vez de se presumir, que custa uma passagem e poupa meia hora.
 */
export async function prepararStandalone() {
  const raizStandalone = path.join(RAIZ, ".next", "standalone");
  const candidatos = [
    raizStandalone,
    path.join(raizStandalone, path.relative("/home/user/portal-lusitano", RAIZ)),
  ];
  let base = null;
  for (const c of candidatos) {
    if (existsSync(path.join(c, "server.js"))) {
      base = c;
      break;
    }
  }
  if (!base) throw new Error(`sem server.js debaixo de ${raizStandalone} — falta o next build?`);

  /* Copia-se uma vez por construção, e não uma vez por servidor levantado: o
     `public/` tem 84MB e a cópia dele, repetida a cada arranque de uma corrida
     de quarenta carregamentos, é mais tempo do que a corrida inteira. Quem diz
     que a cópia é desta construção é o `BUILD_ID`, escrito na marca. */
  const marca = path.join(base, ".prova-copiado");
  const idAgora = readFileSync(path.join(RAIZ, ".next", "BUILD_ID"), "utf8").trim();
  const idFeito = existsSync(marca) ? readFileSync(marca, "utf8").trim() : "";
  if (idFeito !== idAgora) {
    await mkdir(path.join(base, ".next"), { recursive: true });
    /* `cp -a` e não `fs.cp`: são as mesmas 84MB e a diferença medida nesta
       máquina foi de segundos para mais de dez minutos sem acabar. O `fs.cp`
       percorre a árvore em JavaScript, um `stat` e um `open` de cada vez pelo
       laço de eventos; o `cp` do sistema faz o mesmo em C e com a árvore
       inteira à frente. Numa máquina com outras coisas a correr, a diferença
       deixa de ser um detalhe e passa a ser a corrida não acontecer. */
    await copiarArvore(path.join(RAIZ, ".next", "static"), path.join(base, ".next", "static"));
    await copiarArvore(path.join(RAIZ, "public"), path.join(base, "public"));
    await writeFile(marca, idAgora);
  }
  return base;
}

/** O `.env.local` no ambiente: o `server.js` do standalone não o lê sozinho. */
export async function ambiente() {
  const texto = await readFile(path.join(RAIZ, ".env.local"), "utf8").catch(() => "");
  const env = { ...process.env };
  for (const linha of texto.split("\n")) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

export async function levantarSite({ porta = PORTA_SITE, base = PORTA_BASE } = {}) {
  /* Liberta a porta antes de a pedir. Um servidor esquecido de uma corrida
     anterior responde 200 à sondagem que se segue, e o que se mediria era a
     construção antiga — a pior avaria possível numa comparação A/B. Ver o
     `parar.mjs`, que explica porque é que um `pkill` pelo comando não chega. */
  const { libertarPortas } = await import("./parar.mjs");
  const mortos = libertarPortas([porta]);
  for (const m of mortos) {
    process.stderr.write(`porta ${m.porta} estava tomada por ${m.pid} (${m.nome}) — morto\n`);
  }
  const dir = await prepararStandalone();
  const env = await ambiente();
  env.PORT = String(porta);
  env.HOSTNAME = "127.0.0.1";
  env.NODE_ENV = "production";
  env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${base}`;
  const filho = spawn("node", ["server.js"], { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });
  const registo = [];
  filho.stdout.on("data", (d) => registo.push(String(d)));
  filho.stderr.on("data", (d) => registo.push(String(d)));

  const alvo = `http://127.0.0.1:${porta}/mapa`;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(alvo, { method: "HEAD" });
      if (r.status < 500) return { processo: filho, url: `http://127.0.0.1:${porta}`, registo };
    } catch {
      /* ainda não subiu */
    }
    await new Promise((ok) => setTimeout(ok, 250));
  }
  filho.kill("SIGKILL");
  throw new Error(`o site não subiu em 30s:\n${registo.join("")}`);
}

/* ── Correr à mão ────────────────────────────────────────────────────────── */

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  if (process.argv.includes("--preparar")) {
    await prepararStandalone();
    process.stderr.write("standalone preparado\n");
  } else {
    await levantarBanca();
    const { url } = await levantarSite();
    process.stderr.write(`banca em http://127.0.0.1:${PORTA_BASE}\nsite em ${url}/mapa\n`);
  }
}
