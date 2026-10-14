/**
 * Quais são as tabelas que o `colunas-supabase.test.ts` só conhece por um
 * `ALTER TABLE`, sem estarem nos tipos gerados.
 *
 * Serve para medir o que se perde ao exigir que a autoridade venha dos tipos,
 * em vez de a deduzir de uma migração — ver a nota nesse ficheiro.
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

const tipos = new Set();
const fonte = fs.readFileSync(path.join(RAIZ, "lib/database.types.ts"), "utf8");
const re = /^ {6}([a-z0-9_]+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\};/gm;
let m;
while ((m = re.exec(fonte))) tipos.add(m[1]);

function percorrer(dir, filtro, saida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) percorrer(p, filtro, saida);
    else if (filtro.test(e.name)) saida.push(p);
  }
  return saida;
}

const soAlter = new Map();
for (const f of percorrer(path.join(RAIZ, "supabase"), /\.sql$/)) {
  const sql = fs.readFileSync(f, "utf8").replace(/--[^\n]*/g, "");
  for (const stmt of sql.split(";")) {
    const cab = stmt.match(
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?([a-z0-9_]+)"?/i
    );
    if (!cab) continue;
    const cols = [...stmt.matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-z0-9_]+)"?/gi)];
    if (!cols.length) continue;
    const t = cab[1].toLowerCase();
    if (tipos.has(t)) continue;
    if (!soAlter.has(t)) soAlter.set(t, new Set());
    for (const c of cols) soAlter.get(t).add(c[1].toLowerCase());
  }
}

console.log(`tipos gerados: ${tipos.size} tabelas`);
console.log("conhecidas SÓ por ALTER TABLE (sem estarem nos tipos):");
for (const [t, c] of soAlter) console.log(" ", t, "->", [...c].sort().join(", "));

// E quais dessas são mesmo consultadas com um `.select(...)` explícito.
const ficheiros = [];
for (const d of ["app", "components", "lib", "hooks", "context"]) {
  const p = path.join(RAIZ, d);
  if (fs.existsSync(p)) percorrer(p, /\.tsx?$/, ficheiros);
}
const consultadas = new Map();
for (const f of ficheiros) {
  if (f.endsWith("database.types.ts")) continue;
  const src = fs.readFileSync(f, "utf8");
  const r = /\.from\(\s*"([a-z0-9_]+)"\s*\)\s*(?:\n\s*)?\.select\(\s*\n?\s*"([^"]*)"/g;
  let mm;
  while ((mm = r.exec(src))) {
    if (!soAlter.has(mm[1])) continue;
    if (!consultadas.has(mm[1])) consultadas.set(mm[1], []);
    consultadas.get(mm[1]).push(`${path.relative(RAIZ, f)}: ${mm[2]}`);
  }
}
console.log("\ndessas, as que algum `.select` explícito consulta:");
for (const [t, usos] of consultadas) {
  console.log(" ", t);
  for (const u of usos) console.log("     ", u);
}
if (consultadas.size === 0) console.log("  (nenhuma)");
