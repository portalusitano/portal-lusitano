// @vitest-environment node
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * As migrações do chat, corridas contra um PostgreSQL a sério.
 *
 * ── Porque é que isto existe ────────────────────────────────────────────────
 *
 * Duas afirmações desta funcionalidade não se podem provar com duplos:
 *
 * 1. **A migração é idempotente.** A regra da casa é essa, e a única maneira
 *    de a verificar é aplicá-la duas vezes a uma base verdadeira.
 * 2. **A RLS é quem decide quem recebe o quê no Realtime.** O Realtime, para
 *    cada linha que sai do WAL e para cada subscritor, põe os claims desse
 *    subscritor e pergunta à base se a linha lhe é visível. Isso é uma
 *    pergunta de Postgres, não de JavaScript: um duplo que respondesse «não»
 *    estaria a testar o duplo.
 *
 * ── O que isto **não** prova, e fica dito ───────────────────────────────────
 *
 * Não prova o serviço Realtime da Supabase — não há projecto alcançável a
 * partir deste ambiente, e por isso não há aqui nenhuma medição de latência de
 * entrega ponta a ponta. O que se prova é a política que esse serviço aplica,
 * e o `auth.uid()` do prelúdio é o mesmo que a Supabase define.
 *
 * ── Quando não há PostgreSQL ────────────────────────────────────────────────
 *
 * Salta, e diz porquê. Um teste que se finge verde sem servidor é pior do que
 * um teste que não existe: passa a ser a razão pela qual ninguém volta a
 * correr a verificação a sério.
 */

const RAIZ = path.resolve(__dirname, "../..");
const SQL = path.join(RAIZ, "__tests__/sql");
const MIGRACOES = path.join(RAIZ, "supabase/migrations");

const LIGACAO = [
  "-U",
  process.env.PGUSER || "postgres",
  "-h",
  process.env.PGHOST || "/var/run/postgresql",
];
const BASE = "chat_rls_teste";

function psql(args: string[]): string {
  return execFileSync("psql", [...LIGACAO, "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function haPostgres(): boolean {
  try {
    psql(["-d", "postgres", "-tAc", "select 1"]);
    return true;
  } catch {
    return false;
  }
}

const disponivel = haPostgres();

describe.skipIf(!disponivel)("as migrações do chat contra um PostgreSQL local", () => {
  it("aplicam-se duas vezes e provam a RLS que o Realtime usa", () => {
    psql(["-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${BASE}`]);
    psql(["-d", "postgres", "-c", `CREATE DATABASE ${BASE}`]);

    const naBase = (ficheiro: string) => psql(["-d", BASE, "-q", "-f", ficheiro]);

    naBase(path.join(SQL, "00-prelude.sql"));

    /* Duas voltas. A segunda é o teste de idempotência: qualquer `CREATE` sem
       `IF NOT EXISTS`, qualquer `ALTER` que não seja repetível, e qualquer
       preenchimento que conte duas vezes rebenta aqui. */
    for (let volta = 1; volta <= 2; volta++) {
      naBase(path.join(MIGRACOES, "20260829000002_marketplace_chat.sql"));
      naBase(path.join(MIGRACOES, "20260909000001_chat_tempo_real.sql"));
    }

    naBase(path.join(SQL, "05-privilegios.sql"));

    const rls = naBase(path.join(SQL, "10-rls.sql"));
    const tempoReal = naBase(path.join(SQL, "20-tempo-real.sql"));

    /* Os ficheiros SQL rebentam sozinhos quando uma prova falha — o
       `ON_ERROR_STOP` transforma isso numa excepção aqui. O que se afirma
       abaixo é o **número** de provas, para que ninguém possa apagar metade
       do ficheiro e continuar verde. */
    expect(rls).toContain("RLS: 6 provas, 0 falhas");
    expect(tempoReal).toContain("tempo real: 7 provas, 0 falhas");

    psql(["-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${BASE}`]);
  }, 120_000);
});

describe.skipIf(disponivel)("sem PostgreSQL local", () => {
  it("diz que saltou, em vez de fingir que passou", () => {
    expect(disponivel).toBe(false);
  });
});
