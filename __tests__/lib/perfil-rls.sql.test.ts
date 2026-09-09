// @vitest-environment node
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * A migração do perfil, corrida contra um PostgreSQL a sério.
 *
 * ── Porque é que isto não se pode fazer com duplos ──────────────────────────
 *
 * Três afirmações desta funcionalidade são afirmações sobre o Postgres:
 *
 * 1. **A migração é idempotente.** A regra da casa, e a única maneira de a
 *    verificar é aplicá-la duas vezes a uma base verdadeira.
 * 2. **Uma pessoa não consegue dar-se a assinatura paga.** A `RLS` é por linha
 *    e o `GRANT` é por coluna; qual dos dois ganha é uma pergunta de Postgres.
 *    Um duplo que respondesse «negado» estaria a testar o duplo.
 * 3. **Cada pessoa só escreve debaixo do seu prefixo no balde.** Isto é uma
 *    política em `storage.objects` com uma subconsulta a `user_profiles`.
 *
 * ── O A/B, e porque é que ele tem dois braços ───────────────────────────────
 *
 * Correm-se **duas** bases na mesma corrida: uma com a `004` só, outra com a
 * `004` mais esta migração. No braço «antes» a escalada de privilégio tem de
 * **passar**, e o ficheiro rebenta se não passar. Sem esse braço, o «depois»
 * prova que a base recusa hoje mas não prova que alguma vez aceitou — e uma
 * correcção sem o defeito reproduzido é uma afirmação sobre o passado que
 * ninguém verificou.
 *
 * Medido, e é o que os dois ficheiros afirmam:
 *
 *   antes  — `UPDATE 1`, `tools_subscription_status = 'active'`,
 *            `stripe_customer_id = 'cus_forjado'`
 *   depois — `insufficient_privilege`, e a linha continua em `free`
 *
 * ── O que isto **não** prova, e fica dito ───────────────────────────────────
 *
 * Não prova o serviço de armazenamento da Supabase. O `storage.objects` do
 * `30-prelude-perfil.sql` é um substituto com as três colunas de que as
 * políticas dependem, mais a `storage.foldername()`. O que se prova é a
 * política que o serviço aplica, não o serviço.
 *
 * ── Quando não há PostgreSQL ────────────────────────────────────────────────
 *
 * Salta, e diz porquê — a mesma regra do `chat-rls.sql.test.ts`. Um teste que
 * se finge verde sem servidor é pior do que um teste que não existe.
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

const BASE_DEPOIS = "perfil_rls_teste";
const BASE_ANTES = "perfil_rls_antes";

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

function recriar(base: string) {
  psql(["-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${base}`]);
  psql(["-d", "postgres", "-c", `CREATE DATABASE ${base}`]);
}

/**
 * O ponto de partida comum aos dois braços: os papéis e o `auth` da Supabase,
 * a `004` que cria a tabela, e os privilégios que a Supabase dá por omissão.
 *
 * Os privilégios entram **antes** da migração de propósito. Sem eles, a
 * negação do braço «depois» viria de um GRANT que nunca existiu em vez de vir
 * da migração — a prova seria vazia e diria o contrário do que parece dizer.
 * É o mesmo cuidado que o `05-privilegios.sql` do chat já tem escrito.
 */
function prepararBase(base: string) {
  const naBase = (ficheiro: string) => psql(["-d", base, "-q", "-f", ficheiro]);
  recriar(base);
  naBase(path.join(SQL, "00-prelude.sql"));
  naBase(path.join(MIGRACOES, "004_user_auth_tools.sql"));
  naBase(path.join(SQL, "30-prelude-perfil.sql"));
  return naBase;
}

const disponivel = haPostgres();

describe.skipIf(!disponivel)("a migração do perfil contra um PostgreSQL local", () => {
  it("aplica-se duas vezes e fecha o buraco que a 004 tinha aberto", () => {
    // ── Braço «antes»: a 004 sozinha ────────────────────────────────────────
    // Rebenta sozinho se a escalada deixar de passar, que é o que faz dele um
    // braço de controlo e não um comentário.
    const antes = prepararBase(BASE_ANTES);
    const saidaAntes = antes(path.join(SQL, "35-perfil-antes.sql"));
    expect(saidaAntes).toContain("antes: a escalada passou");

    // ── Braço «depois»: a 004 mais esta migração, aplicada duas vezes ───────
    const depois = prepararBase(BASE_DEPOIS);
    for (let volta = 1; volta <= 2; volta++) {
      depois(path.join(MIGRACOES, "20260910000001_perfil_com_fotografia.sql"));
    }

    const provas = depois(path.join(SQL, "40-perfil.sql"));

    /* O ficheiro SQL rebenta sozinho quando uma prova falha — o `ON_ERROR_STOP`
       transforma isso numa excepção aqui. O que se afirma abaixo é o **número**
       de provas, para que ninguém possa apagar metade do ficheiro e continuar
       verde. */
    expect(provas).toContain("perfil: 20 provas, 0 falhas");

    psql(["-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${BASE_ANTES}`]);
    psql(["-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${BASE_DEPOIS}`]);
  }, 180_000);
});

describe.skipIf(disponivel)("sem PostgreSQL local", () => {
  it("diz que saltou, em vez de fingir que passou", () => {
    expect(disponivel).toBe(false);
  });
});
