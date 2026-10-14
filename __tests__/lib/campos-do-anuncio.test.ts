import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Contrato entre o formulário de publicar anúncio e quem o lê.
 *
 * O defeito que este ficheiro existe para não deixar voltar: o webhook lia
 * `formData.linhagem` e o formulário enviava `linhagemPrincipal`. Os dois
 * nomes eram plausíveis, nenhum compilador se queixou, nenhum teste falhou —
 * e **a linhagem esteve vazia em todos os anúncios publicados**. Um par
 * destes não dá erro em lado nenhum: dá uma coluna a `null` para sempre.
 *
 * São três travões, nos dois sentidos:
 *
 *  1. **Nada é lido com um nome que ninguém envia.** É o defeito da linhagem,
 *     apanhado à letra.
 *  2. **Nada é enviado sem ser lido**, fora de uma lista curta com a razão
 *     escrita de cada entrada. Foi assim que 80 dos 99 campos do formulário
 *     ficaram a viajar até ao servidor para serem deitados fora.
 *  3. **Os números não encolhem sem que alguém dê por isso.**
 *
 * A leitura é do texto dos ficheiros, como em `colunas-supabase.test.ts`, e
 * pela mesma razão: não há tipo nenhum a ligar as duas pontas — o `form_data`
 * é `Json` na base e `Record<string, unknown>` no handler.
 */

const RAIZ = path.resolve(__dirname, "../..");

/** O primeiro bloco `{…}` equilibrado a partir de uma posição. */
function bloco(fonte: string, desde: number): string {
  let profundidade = 0;
  const inicio = fonte.indexOf("{", desde);
  for (let i = inicio; i < fonte.length; i++) {
    if (fonte[i] === "{") profundidade++;
    else if (fonte[i] === "}") {
      profundidade--;
      if (profundidade === 0) return fonte.slice(inicio, i + 1);
    }
  }
  throw new Error("bloco sem fecho");
}

function ler(relativo: string): string {
  return fs.readFileSync(path.join(RAIZ, relativo), "utf8");
}

/** As chaves que a página põe no `formData` do pedido de checkout. */
function chavesEnviadas(): Set<string> {
  const fonte = ler("app/vender-cavalo/page.tsx");
  const corpo = bloco(
    fonte,
    fonte.indexOf("formData: {", fonte.indexOf("/api/vender-cavalo/checkout"))
  );
  // Uma linha por chave, com valor (`nome: x,`) ou abreviada (`imageUrls,`).
  return new Set([...corpo.matchAll(/^\s+([A-Za-z_0-9]+)\s*[:,]/gm)].map((m) => m[1]));
}

/** As chaves que alguém lê do `form_data` depois do pagamento. */
function chavesLidas(): Set<string> {
  const handler = ler("app/api/stripe/webhook/handlers/checkout-cavalo.ts");
  const campos = ler("lib/anuncio-campos.ts");
  return new Set([
    // `formData.nomeCavalo`, no handler
    ...[...handler.matchAll(/formData\.([A-Za-z_0-9]+)/g)].map((m) => m[1]),
    // `texto(p, "peso")`, `booleano(p, "aptoCriancas")`, …
    ...[...campos.matchAll(/\bp,\s*"([A-Za-z_0-9]+)"/g)].map((m) => m[1]),
    // a tabela dos ascendentes: `{ …, nome: "pai", registo: "paiRegisto" }`
    ...[...campos.matchAll(/\b(?:nome|registo):\s*"([A-Za-z_0-9]+)"/g)].map((m) => m[1]),
  ]);
}

/**
 * Chaves que o pedido leva e que o webhook não lê — cada uma com a razão pela
 * qual isso está certo. Acrescentar aqui uma entrada é uma decisão; deixar uma
 * chave cair para cá sem decisão é o defeito que este ficheiro persegue.
 */
const NAO_LIDAS_DE_PROPOSITO: Record<string, string> = {
  // Vai para o Stripe como `customer_email` no checkout e volta em
  // `session.customer_details.email`, que é de onde `vendedor_email` sai.
  proprietarioEmail: "usada no checkout, não no webhook",
  // Dados fiscais. `cavalos_venda` é lida por qualquer pessoa quando
  // `status = 'active'` e o RLS do Postgres é por linha, não por coluna: o que
  // entrar nessa tabela fica publicado. Ficam em `contact_submissions`, cujas
  // políticas exigem `service_role`, que é onde a factura os quer.
  proprietarioNif: "dado fiscal, fica em contact_submissions",
  proprietarioMorada: "dado fiscal, fica em contact_submissions",
  // O nome de um terceiro que nunca consentiu em ser publicado num
  // classificados.
  nomeVeterinario: "nome de terceiro, fica em contact_submissions",
  // Duplicados deliberados: o mesmo valor viaja com dois nomes porque um deles
  // já era lido antes. Lê-se `registoAPSL` e `linhagem`.
  numeroRegisto: "duplicado de registoAPSL, que é o nome lido",
  linhagemPrincipal: "duplicado de linhagem, que é o nome lido",
};

describe("campos do anúncio: o que o formulário envia e o que o webhook lê", () => {
  it("não se lê nenhuma chave que ninguém envia", () => {
    // O defeito da linhagem, à letra: um nome plausível dos dois lados, nomes
    // diferentes, e uma coluna a `null` para sempre sem um único erro.
    const enviadas = chavesEnviadas();
    const orfas = [...chavesLidas()].filter((k) => !enviadas.has(k));
    expect(
      orfas,
      "chaves lidas do form_data que o formulário nunca envia — leem-se sempre como `undefined`"
    ).toEqual([]);
  });

  it("não se envia nenhuma chave sem ser lida, fora das declaradas", () => {
    const lidas = chavesLidas();
    const perdidas = [...chavesEnviadas()].filter(
      (k) => !lidas.has(k) && !(k in NAO_LIDAS_DE_PROPOSITO)
    );
    expect(
      perdidas,
      "campos pedidos ao vendedor que viajam até ao servidor e não chegam a lado nenhum"
    ).toEqual([]);
  });

  it("a lista de excepções é mesmo de excepções e não uma lista a envelhecer", () => {
    const enviadas = chavesEnviadas();
    const lidas = chavesLidas();
    const obsoletas = Object.keys(NAO_LIDAS_DE_PROPOSITO).filter(
      (k) => !enviadas.has(k) || lidas.has(k)
    );
    expect(obsoletas, "excepções que já não correspondem a nada — tirar daqui").toEqual([]);
  });

  it("as contagens são as medidas, e não encolhem em silêncio", () => {
    // 99 campos no formulário; 103 chaves no pedido (as 99 mais `idade`
    // calculada, `documentosEmDia` derivada e os dois duplicados) mais
    // `imageUrls` e `referenciaDocumentos`, que não são campos do formulário:
    // a primeira é o resultado da subida das fotografias, a segunda é por onde
    // o webhook encontra os documentos desta submissão.
    const fonte = ler("components/vender-cavalo/types.ts");
    const corpo = bloco(fonte, fonte.indexOf("export interface FormData"));
    const campos = [...corpo.matchAll(/^ {2}([a-z_0-9]+): /gm)].map((m) => m[1]);
    expect(campos.length, "campos do formulário").toBe(99);
    expect(chavesEnviadas().size, "chaves no pedido de checkout").toBe(105);
    expect(Object.keys(NAO_LIDAS_DE_PROPOSITO).length, "chaves sem destino").toBe(6);
  });

  it("todos os blocos e a árvore são escritos pelo handler", () => {
    // Um bloco `jsonb` montado em `lib/anuncio-campos.ts` e esquecido no
    // `insert` seria uma coluna nova a `null` para sempre — o mesmo defeito
    // com outra cara.
    const handler = ler("app/api/stripe/webhook/handlers/checkout-cavalo.ts");
    expect(handler).toContain("montarCamposDoFormulario(formData)");
    expect(handler).toContain("cavalos_venda_ascendentes");
  });
});

/**
 * O inventário no repositório tem de descrever o código que existe. Um
 * documento que descreve o esquema de ontem é pior do que não haver documento:
 * dá confiança sem a merecer.
 */
describe("docs/campos-do-anuncio.md", () => {
  const doc = ler("docs/campos-do-anuncio.md");

  it("tem uma linha por campo do formulário", () => {
    const fonte = ler("components/vender-cavalo/types.ts");
    const corpo = bloco(fonte, fonte.indexOf("export interface FormData"));
    const campos = [...corpo.matchAll(/^ {2}([a-z_0-9]+): /gm)].map((m) => m[1]);
    const semLinha = campos.filter((c) => !doc.includes(`\`${c}\``));
    expect(semLinha, "campos do formulário sem linha no inventário").toEqual([]);
  });

  it("nomeia todas as colunas que a migração acrescenta", () => {
    const sql = ler("supabase/migrations/20260902000002_cavalos_venda_campos_do_formulario.sql");
    const colunas = [...sql.matchAll(/ADD COLUMN IF NOT EXISTS ([a-z_0-9]+)/g)].map((m) => m[1]);
    expect(colunas.length).toBeGreaterThan(20);
    const semLinha = colunas.filter((c) => !doc.includes(`\`${c}\``));
    expect(semLinha, "colunas novas que o inventário não menciona").toEqual([]);
  });
});
