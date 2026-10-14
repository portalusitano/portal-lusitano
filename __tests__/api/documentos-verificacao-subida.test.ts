/**
 * O que a subida escreve depois de a resposta seguir.
 *
 * O teste da rota (`documentos-upload-rota`) chama o `POST` como uma função
 * qualquer, fora do contexto de um pedido — e nesse contexto o `after` do Next
 * lança, por desenho. Isso é bom para provar que a subida **não falha** quando
 * o agendamento falha, e é exactamente o que esse teste prova. Mas deixa por
 * cobrir o trabalho em si.
 *
 * Este cobre-o: substitui o `after` por um que corre a função logo, e olha para
 * o que ficou escrito na base. As duas coisas que tem de provar são as duas
 * regras que mais caro custam se se perderem:
 *
 * 1. **O texto do documento não é guardado.** Num passaporte equino são páginas
 *    com o nome e a morada do proprietário, numa coluna `jsonb` que ninguém
 *    cifra.
 * 2. **A análise nunca promove nada.** Não há no `update` nenhum `estado`, e
 *    não pode vir a haver: `verificado` escreve-se num sítio só, e é uma pessoa
 *    que carrega no botão.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NextRequest } from "next/server";

import { pdfComTexto } from "../lib/documentos-leitura-pdfs";

const estado = vi.hoisted(() => ({
  inseridos: [] as Array<Record<string, unknown>>,
  actualizados: [] as Array<{ dados: Record<string, unknown>; id: string }>,
  /** Faz a primeira actualização falhar como se a coluna não existisse. */
  colunaForenseEmFalta: false,
}));

/** Um `after` que corre já, para se poder olhar para o que ele fez. */
vi.mock("next/server", async () => {
  const real = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...real, after: (fn: () => unknown) => fn() };
});

vi.mock("@/lib/supabase-admin", () => {
  const duplo = {
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ data: null, error: null })),
        remove: vi.fn(async () => ({ data: null, error: null })),
      }),
    },
    from: vi.fn(() => ({
      insert: vi.fn(async (linha: Record<string, unknown>) => {
        estado.inseridos.push(linha);
        return { data: null, error: null };
      }),
      select: vi.fn(() => ({ eq: vi.fn(async () => ({ count: 0, error: null })) })),
      update: vi.fn((dados: Record<string, unknown>) => ({
        eq: vi.fn(async (_coluna: string, id: string) => {
          if (estado.colunaForenseEmFalta && "forense" in dados) {
            return {
              data: null,
              error: {
                code: "PGRST204",
                message: "Could not find the 'forense' column of 'documentos_cavalo'",
              },
            };
          }
          estado.actualizados.push({ dados, id });
          return { data: null, error: null };
        }),
      })),
    })),
  };
  return { supabase: duplo, supabaseAdmin: duplo, supabasePublic: duplo };
});

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "@/app/api/vender-cavalo/documentos/route";

const REFERENCIA = "3f7c1e2a-0000-4000-8000-000000000001";

/** Um Livro Azul com dados do cavalo e dados pessoais do dono lá dentro. */
const LIVRO_AZUL = pdfComTexto([
  "LIVRO AZUL — ASSOCIACAO PORTUGUESA DE CRIADORES",
  "Nome: MAESTOSO XV",
  "Microchip: 620015004471234",
  "Proprietario: Joao Ferreira",
  "Morada: Rua das Coudelarias 12, 2150 Golega",
]);

/**
 * Um `File` com o `arrayBuffer` posto à mão, como no teste da rota.
 *
 * A implementação do ambiente de teste não devolve os bytes de um `Uint8Array`
 * por este caminho, e sem eles a rota não reconhece o formato e recusa com 400
 * antes de chegar a haver análise nenhuma para observar.
 */
function ficheiro(nome: string, conteudo: Uint8Array) {
  const f = new File([conteudo as unknown as BlobPart], nome, { type: "application/pdf" });
  Object.defineProperty(f, "size", { value: conteudo.byteLength });
  Object.defineProperty(f, "arrayBuffer", {
    value: async () => conteudo.buffer.slice(0) as ArrayBuffer,
  });
  return f;
}

/* Cada pedido leva um IP próprio: o `strictLimiter` é um cache em memória
   partilhado por todo o processo, e com o mesmo IP o sexto teste apanhava 429
   por causa dos cinco anteriores. Mesma razão que no teste da rota. */
let contadorDeIps = 0;

function pedido(): NextRequest {
  const dados = new FormData();
  dados.append("referencia", REFERENCIA);
  dados.append("livro_azul", ficheiro("livro azul.pdf", LIVRO_AZUL) as unknown as string);

  const cabecalhos = new Map<string, string>([
    ["origin", "http://localhost:3000"],
    ["x-forwarded-for", `10.1.0.${(contadorDeIps += 1) % 250}`],
  ]);

  return {
    headers: { get: (nome: string) => cabecalhos.get(nome.toLowerCase()) ?? null },
    formData: async () => dados,
  } as unknown as NextRequest;
}

beforeEach(() => {
  estado.inseridos.length = 0;
  estado.actualizados.length = 0;
  estado.colunaForenseEmFalta = false;
});

describe("a análise corre depois da resposta e escreve o que leu", () => {
  it("a linha entra primeiro, e só depois é que a análise a completa", async () => {
    // A ordem é a garantia de que um analisador que rebente não leva consigo o
    // documento: quando o exame começa, o Livro Azul já está guardado.
    const resposta = await POST(pedido());
    expect(resposta.status).toBe(200);

    expect(estado.inseridos).toHaveLength(1);
    expect(estado.actualizados).toHaveLength(1);
    expect(estado.actualizados[0]!.id).toBe(estado.inseridos[0]!.id);
  });

  it("guarda os identificadores que servem para confrontar", async () => {
    await POST(pedido());
    const leitura = estado.actualizados[0]!.dados.leitura as Record<string, unknown>;
    expect(leitura.origem).toBe("pdf");
    expect(leitura.microchip).toBe("620015004471234");
  });

  it("e não guarda o texto do documento nem a morada do proprietário", async () => {
    await POST(pedido());
    const leitura = estado.actualizados[0]!.dados.leitura as Record<string, unknown>;

    expect(leitura).not.toHaveProperty("texto");
    expect(JSON.stringify(leitura)).not.toMatch(/Coudelarias|Golega|Joao Ferreira/);
  });

  it("o exame do ficheiro fica registado como tendo corrido", async () => {
    await POST(pedido());
    const forense = estado.actualizados[0]!.dados.forense as Record<string, unknown>;
    expect(forense.correu).toBe(true);
    expect(typeof forense.em).toBe("string");
  });

  it("sem anúncio não há contradições — e a coluna diz isso, não fica nula", async () => {
    // O documento sobe antes do pagamento, por isso não há formulário contra o
    // que cruzar. Uma lista vazia é a resposta certa; um `null` seria «não se
    // tentou», que é outra afirmação.
    await POST(pedido());
    expect(estado.actualizados[0]!.dados.conflitos).toEqual([]);
  });

  it("a análise nunca escreve o estado do documento", async () => {
    // Se alguma coisa aqui pudesse produzir um `verificado`, estava escrita a
    // coisa errada. O `update` não toca no estado, e este teste é o que impede
    // que alguém lho acrescente por conveniência.
    await POST(pedido());
    const dados = estado.actualizados[0]!.dados;
    expect(dados).not.toHaveProperty("estado");
    expect(dados).not.toHaveProperty("verificado_por");
    expect(dados).not.toHaveProperty("verificado_em");
    expect(Object.keys(dados).sort()).toEqual(["conflitos", "forense", "leitura"]);
  });

  it("o documento entra na mesma se a coluna `forense` ainda não existir", async () => {
    // A coluna vem de uma migração à parte, e este código pode correr antes
    // dela. O que não pode é perder-se também a leitura, que é a que os sinais
    // entre anúncios leem e a que não se recalcula sem descarregar o ficheiro.
    estado.colunaForenseEmFalta = true;

    const resposta = await POST(pedido());
    expect(resposta.status).toBe(200);

    expect(estado.actualizados).toHaveLength(1);
    expect(Object.keys(estado.actualizados[0]!.dados).sort()).toEqual(["conflitos", "leitura"]);
    expect(estado.actualizados[0]!.dados.leitura).toHaveProperty("microchip");
  });
});
