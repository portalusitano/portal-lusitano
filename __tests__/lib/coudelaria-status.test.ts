import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  COUDELARIA_ACCAO_LABEL,
  COUDELARIA_STATUS,
  COUDELARIA_STATUS_LABEL,
  COUDELARIA_STATUS_VALUES,
  COUDELARIA_TRANSICOES,
  etiquetaDoEstado,
  isCoudelariaStatus,
  transicoesDe,
} from "@/lib/coudelaria-status";
import { LISTING_STATUS, LISTING_STATUS_VALUES, isListingStatus } from "@/lib/marketplace-listings";

/**
 * O vocabulário do estado, preso de três lados.
 *
 * O defeito que estes testes existem para impedir custou o site inteiro às 35
 * coudelarias: o painel escrevia `'aprovado'` numa coluna cuja política RLS
 * só deixa passar `'active'`, e aprovar uma coudelaria era despublicá-la.
 * Ninguém dava por isso porque não há erro nenhum — a linha grava, e depois
 * desaparece de todas as leituras públicas.
 *
 * Por isso não chega testar as funções: testa-se também que **o SQL e o código
 * dizem a mesma coisa**, e que nenhum ficheiro do repositório volta a escrever
 * o estado à mão.
 */

const RAIZ = path.resolve(__dirname, "../..");

describe("vocabulário do estado de uma coudelaria", () => {
  it("tem três estados, e são os que a base declara", () => {
    expect([...COUDELARIA_STATUS_VALUES]).toEqual(["pending", "active", "inactive"]);
  });

  it("o estado público é o mesmo que a política RLS deixa passar", () => {
    const sql = fs.readFileSync(path.join(RAIZ, "supabase/coudelarias.sql"), "utf8");
    const politica = sql.match(/USING\s*\(\s*status\s*=\s*'([a-z_]+)'\s*\)/i);
    expect(politica, "não se encontrou a política de leitura pública no SQL").not.toBeNull();
    expect(politica![1]).toBe(COUDELARIA_STATUS.ACTIVE);
  });

  it("um registo novo entra no estado que a base põe por omissão", () => {
    const sql = fs.readFileSync(path.join(RAIZ, "supabase/coudelarias.sql"), "utf8");
    const omissao = sql.match(/status\s+VARCHAR\(\d+\)\s+DEFAULT\s+'([a-z_]+)'/i);
    expect(omissao, "não se encontrou o DEFAULT de `status` no SQL").not.toBeNull();
    expect(omissao![1]).toBe(COUDELARIA_STATUS.PENDING);
  });

  it("cada estado tem etiqueta em português", () => {
    for (const estado of COUDELARIA_STATUS_VALUES) {
      expect(COUDELARIA_STATUS_LABEL[estado]).toBeTruthy();
      expect(COUDELARIA_ACCAO_LABEL[estado]).toBeTruthy();
    }
  });

  it("reconhece o vocabulário e recusa o que ficou para trás", () => {
    for (const estado of COUDELARIA_STATUS_VALUES) expect(isCoudelariaStatus(estado)).toBe(true);
    for (const morto of ["pendente", "aprovado", "rejeitado", "suspenso", "ativo", "inativo"]) {
      expect(isCoudelariaStatus(morto), `${morto} não é um estado desta tabela`).toBe(false);
    }
    expect(isCoudelariaStatus(null)).toBe(false);
    expect(isCoudelariaStatus(undefined)).toBe(false);
    expect(isCoudelariaStatus(1)).toBe(false);
  });

  it("um estado desconhecido mostra-se tal como está, em vez de se calar", () => {
    expect(etiquetaDoEstado("active")).toBe("Publicada");
    expect(etiquetaDoEstado("aprovado")).toBe("aprovado");
    expect(etiquetaDoEstado(null)).toBe("—");
    expect(etiquetaDoEstado("")).toBe("—");
  });

  it("todas as linhas têm pelo menos um botão de estado", () => {
    // O defeito original: os botões só apareciam em `"pendente"`, valor que
    // nenhuma das 35 linhas tem. Nenhuma tinha botão nenhum.
    for (const estado of COUDELARIA_STATUS_VALUES) {
      expect(transicoesDe(estado).length, `${estado} ficaria sem saída`).toBeGreaterThan(0);
    }
    // Mesmo com lixo na coluna há como arrumar a linha.
    expect(transicoesDe("aprovado")).toEqual(["active", "inactive"]);
    expect(transicoesDe(null)).toEqual(["active", "inactive"]);
  });

  it("nenhuma transição aponta para fora do vocabulário", () => {
    for (const destinos of Object.values(COUDELARIA_TRANSICOES)) {
      for (const destino of destinos) expect(isCoudelariaStatus(destino)).toBe(true);
    }
  });

  it("um registo pendente pode ser aprovado e rejeitado; um decidido inverte-se", () => {
    expect(COUDELARIA_TRANSICOES.pending).toEqual(["active", "inactive"]);
    expect(COUDELARIA_TRANSICOES.active).toEqual(["inactive"]);
    expect(COUDELARIA_TRANSICOES.inactive).toEqual(["active"]);
  });
});

describe("vocabulário do estado de um anúncio de cavalo", () => {
  it("tem os seis estados que a coluna guarda", () => {
    expect([...LISTING_STATUS_VALUES]).toEqual([
      "pending",
      "active",
      "reservado",
      "vendido",
      "inativo",
      "removido",
    ]);
  });

  it("recusa o vocabulário que o painel andou a escrever", () => {
    expect(isListingStatus(LISTING_STATUS.PENDING)).toBe(true);
    for (const morto of ["aprovado", "rejeitado", "pendente", "suspenso"]) {
      expect(isListingStatus(morto), `${morto} não é um estado desta tabela`).toBe(false);
    }
    expect(isListingStatus(null)).toBe(false);
  });
});

/**
 * A guarda de repositório: as palavras dos vocabulários mortos não voltam.
 *
 * Não se proíbe todo o literal — `\`.eq("status", "active")\`` é honesto e está
 * em muitos sítios. O que se proíbe são as palavras que **provadamente não
 * pertencem** a estas duas colunas: `pendente`, `aprovado`, `rejeitado` e
 * `suspenso`. Foi uma delas — `aprovado`, escrita num `onClick` — que fez com
 * que aprovar uma coudelaria a apagasse do site, e outra — `aprovado` de novo,
 * num `updateStatus` — que escondia um anúncio pago de `/comprar`. Nenhuma dá
 * erro: a linha grava e some-se das leituras públicas.
 *
 * As duas excepções são os módulos que definem o vocabulário e este ficheiro.
 */
const VOCABULARIO_MORTO = ["pendente", "aprovado", "rejeitado", "suspenso"];
const MODULOS_DO_VOCABULARIO = ["lib/coudelaria-status.ts", "lib/marketplace-listings.ts"];

function percorrer(dir: string, saida: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) percorrer(p, saida);
    else if (/\.tsx?$/.test(e.name)) saida.push(p);
  }
  return saida;
}

/** Palavras de outro vocabulário escritas no estado destas tabelas. */
function estadosDeOutroVocabulario(tabela: string): string[] {
  const achados: string[] = [];
  for (const d of ["app", "components", "lib"]) {
    const raizDir = path.join(RAIZ, d);
    if (!fs.existsSync(raizDir)) continue;
    for (const f of percorrer(raizDir)) {
      const relativo = path.relative(RAIZ, f).split(path.sep).join("/");
      if (MODULOS_DO_VOCABULARIO.includes(relativo)) continue;
      const fonte = fs.readFileSync(f, "utf8");
      if (!fonte.includes(`from("${tabela}")`)) continue;
      // Fora comentários: a explicação de um defeito cita as palavras dele.
      const semComentarios = fonte
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
      const padroes = [
        /\.n?eq\(\s*"status"\s*,\s*"([a-z_]+)"/g,
        /\bstatus:\s*"([a-z_]+)"/g,
        /\bstatus\s*===?\s*"([a-z_]+)"/g,
      ];
      for (const re of padroes) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(semComentarios))) {
          if (VOCABULARIO_MORTO.includes(m[1])) achados.push(`${relativo} → "${m[1]}"`);
        }
      }
    }
  }
  return achados.sort();
}

describe("as palavras dos vocabulários mortos não voltam", () => {
  it("nos ficheiros que tocam em `coudelarias`", () => {
    expect(
      estadosDeOutroVocabulario("coudelarias"),
      "usar COUDELARIA_STATUS de `lib/coudelaria-status.ts` — foi um literal destes que fez aprovar significar despublicar"
    ).toEqual([]);
  });

  it("nos ficheiros que tocam em `cavalos_venda`", () => {
    expect(
      estadosDeOutroVocabulario("cavalos_venda"),
      "usar LISTING_STATUS de `lib/marketplace-listings.ts`"
    ).toEqual([]);
  });
});
