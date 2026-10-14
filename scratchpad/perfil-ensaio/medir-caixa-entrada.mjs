/**
 * O que custa saber quem é a outra parte, nas trinta conversas da caixa.
 *
 * ── O método ────────────────────────────────────────────────────────────────
 *
 * A/B **intercalado**: os dois braços correm alternadamente na mesma sessão de
 * `psql`, contra a mesma base, na mesma corrida. O `CLAUDE.md` conta duas vezes
 * o que custou medir em sequência — «quando a diferença que se procura é da
 * ordem da variância da máquina, a ordem das medições é a medição» —, e aqui a
 * diferença que se procura é justamente um punhado de milissegundos.
 *
 * O que se mede é o **tempo do cliente**, com o `\timing` do psql, e não o
 * `EXPLAIN ANALYZE`: o que distingue os dois braços não é o plano — os dois
 * usam o mesmo índice de chave primária — são as trinta idas e voltas. Um
 * `EXPLAIN` mediria o que não está em causa e diria que são iguais.
 *
 * ── O que isto não mede ─────────────────────────────────────────────────────
 *
 * A base está no mesmo computador, por um socket de ficheiro. Em produção está
 * do outro lado de uma rede, e cada ida e volta custa muito mais do que aqui —
 * ou seja, este ensaio mede o **piso** da diferença, não o valor dela.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const BASE = "perfil_custo";
const LIGACAO = ["-U", "postgres", "-h", "/var/run/postgresql"];
const PARES = 30;
const CONVERSAS = 30;
/** Quantas contas existem no site. A caixa lê trinta de entre estas. */
const PESSOAS = 5000;

function psql(args, entrada) {
  return execFileSync("psql", [...LIGACAO, "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    input: entrada,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

psql(["-d", "postgres", "-q", "-c", `DROP DATABASE IF EXISTS ${BASE}`]);
psql(["-d", "postgres", "-q", "-c", `CREATE DATABASE ${BASE}`]);

// A tabela como a migração a deixa, com o que interessa à leitura.
psql(
  ["-d", BASE, "-q"],
  `
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  avatar_prefixo TEXT UNIQUE,
  stripe_customer_id TEXT,
  tools_subscription_status TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO user_profiles (id, full_name, avatar_url, avatar_prefixo)
SELECT gen_random_uuid(),
       'Pessoa ' || g,
       -- Dois terços com fotografia, um terço sem: a coluna tem de ter os dois
       -- casos, senão mede-se uma tabela que não é a do produto.
       CASE WHEN g % 3 = 0 THEN NULL
            ELSE 'https://exemplo.supabase.co/storage/v1/object/public/avatares/'
                 || replace(gen_random_uuid()::text,'-','') || '/'
                 || replace(gen_random_uuid()::text,'-','') || '.webp' END,
       replace(gen_random_uuid()::text, '-', '')
FROM generate_series(1, ${PESSOAS}) g;

ANALYZE user_profiles;
`
);

// Os trinta ids que a caixa de entrada vai querer.
const ids = psql([
  "-d",
  BASE,
  "-tAc",
  `SELECT id FROM user_profiles ORDER BY random() LIMIT ${CONVERSAS}`,
])
  .trim()
  .split("\n");

const COLUNAS = "id, full_name, avatar_url";

/** Braço A: uma pergunta por conversa. O que sai de escrever o óbvio. */
const umaPorConversa = ids.map((id) => `SELECT ${COLUNAS} FROM user_profiles WHERE id = '${id}';`);

/** Braço B: uma pergunta para as trinta. */
const umaSo = `SELECT ${COLUNAS} FROM user_profiles WHERE id = ANY(ARRAY[${ids
  .map((i) => `'${i}'::uuid`)
  .join(",")}]);`;

// Um guião só, com os dois braços alternados e marcados. Uma sessão, uma
// ligação, sem nada entre eles a não ser a marca.
const linhas = ["\\timing on", "\\o /dev/null"];
// Aquecimento: a primeira consulta de uma sessão paga o plano e a cache.
linhas.push(...umaPorConversa, umaSo);
linhas.push("\\echo ---INICIO---");
for (let p = 0; p < PARES; p++) {
  linhas.push("\\echo ==A==", ...umaPorConversa);
  linhas.push("\\echo ==B==", umaSo);
}

const guiao = path.join(AQUI, "custo.sql");
writeFileSync(guiao, linhas.join("\n") + "\n");

const saida = psql(["-d", BASE, "-f", guiao]);

// O `\echo` sai no stdout junto com os "Time: x ms" do `\timing`.
const depois = saida.slice(saida.indexOf("---INICIO---"));
const a = [];
const b = [];
let braco = null;
let acumulado = 0;
let contadas = 0;

for (const linha of depois.split("\n")) {
  if (linha.startsWith("==A==")) {
    if (braco === "A" && contadas) a.push(acumulado);
    braco = "A";
    acumulado = 0;
    contadas = 0;
    continue;
  }
  if (linha.startsWith("==B==")) {
    if (braco === "A" && contadas) a.push(acumulado);
    braco = "B";
    acumulado = 0;
    contadas = 0;
    continue;
  }
  const m = /^Time: ([\d.]+) ms/.exec(linha);
  if (m && braco) {
    acumulado += Number(m[1]);
    contadas++;
    if (braco === "B") {
      b.push(acumulado);
      acumulado = 0;
      contadas = 0;
      braco = null;
    }
  }
}

function mediana(v) {
  const s = [...v].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

console.log(`pares: A=${a.length} B=${b.length} (${CONVERSAS} conversas, ${PESSOAS} contas)\n`);
console.log(`uma pergunta por conversa (${CONVERSAS} idas): mediana ${mediana(a).toFixed(2)} ms`);
console.log(`uma pergunta para as ${CONVERSAS}   (1 ida):  mediana ${mediana(b).toFixed(2)} ms`);
console.log(`razão das medianas: ${(mediana(a) / mediana(b)).toFixed(1)}x`);

// Quantos pares o braço B ganha. Uma mediana melhor com metade dos pares a
// perder não é uma melhoria, é ruído — a mesma lição dos «8 de 8 pares».
const ganhos = a.filter((v, i) => b[i] !== undefined && v > b[i]).length;
console.log(`pares em que a pergunta única ganha: ${ganhos} de ${Math.min(a.length, b.length)}`);

psql(["-d", "postgres", "-q", "-c", `DROP DATABASE IF EXISTS ${BASE}`]);
