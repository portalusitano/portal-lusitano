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
/** O braço de controlo do sequestro de conversa: as duas migrações antigas e mais nada. */
const BASE_ANTES = "chat_rls_antes";

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
      naBase(path.join(MIGRACOES, "20260911000001_chat_escrita_do_cliente.sql"));
    }

    naBase(path.join(SQL, "05-privilegios.sql"));

    /* Os privilégios acima voltam a dar o que a Supabase dá por omissão, e por
       isso a migração que os fecha tem de correr **depois** deles. É a ordem
       verdadeira — a Supabase dá o `GRANT ALL` na criação da tabela, e a
       migração vem a seguir — e sem esta terceira passagem a prova do
       `13-conversa-depois.sql` media um `REVOKE` que o ficheiro de privilégios
       tinha desfeito. */
    naBase(path.join(MIGRACOES, "20260911000001_chat_escrita_do_cliente.sql"));

    const rls = naBase(path.join(SQL, "10-rls.sql"));
    const tempoReal = naBase(path.join(SQL, "20-tempo-real.sql"));
    const escrita = naBase(path.join(SQL, "13-conversa-depois.sql"));

    /* Os ficheiros SQL rebentam sozinhos quando uma prova falha — o
       `ON_ERROR_STOP` transforma isso numa excepção aqui. O que se afirma
       abaixo é o **número** de provas, para que ninguém possa apagar metade
       do ficheiro e continuar verde. */
    expect(rls).toContain("RLS: 6 provas, 0 falhas");
    expect(tempoReal).toContain("tempo real: 7 provas, 0 falhas");
    expect(escrita).toContain("escrita da conversa: 16 provas, 0 falhas");

    psql(["-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${BASE}`]);
  }, 120_000);

  /**
   * O braço de controlo do sequestro de conversa.
   *
   * A `conversas_update_participante` da `20260829000002` autorizava um UPDATE
   * **sem colunas**, e o `GRANT` da Supabase é sobre a tabela inteira: um
   * participante reescrevia `comprador_id`/`vendedor_id` e com isso entregava a
   * uma terceira pessoa o fio de outra. Este teste mostra que o defeito era
   * real; o `13-conversa-depois.sql`, na base de cima, mostra que deixou de o
   * ser.
   *
   * Rebenta sozinho se o sequestro deixar de passar — é o que faz dele um braço
   * de controlo e não um comentário.
   */
  it("reproduz o sequestro de conversa sem a migração que o fecha", () => {
    psql(["-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${BASE_ANTES}`]);
    psql(["-d", "postgres", "-c", `CREATE DATABASE ${BASE_ANTES}`]);

    const naBase = (ficheiro: string) => psql(["-d", BASE_ANTES, "-q", "-f", ficheiro]);

    naBase(path.join(SQL, "00-prelude.sql"));
    naBase(path.join(MIGRACOES, "20260829000002_marketplace_chat.sql"));
    naBase(path.join(MIGRACOES, "20260909000001_chat_tempo_real.sql"));
    naBase(path.join(SQL, "05-privilegios.sql"));

    const antes = naBase(path.join(SQL, "12-conversa-antes.sql"));
    expect(antes).toContain("antes: o sequestro passou");

    psql(["-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${BASE_ANTES}`]);
  }, 120_000);
});

describe.skipIf(disponivel)("sem PostgreSQL local", () => {
  it("diz que saltou, em vez de fingir que passou", () => {
    expect(disponivel).toBe(false);
  });
});
