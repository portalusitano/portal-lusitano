/**
 * A disciplina da saída da junta, verificada por máquina.
 *
 * O `sinais.ts`, o `coerencia/` e o `forense/` têm cada um o seu teste a
 * comparar as chaves da saída contra uma lista proibida. Este faz o mesmo à
 * saída do `verificacao.ts` — e é aqui que ele mais faz falta, porque é esta a
 * saída que **chega ao ecrã**. Um módulo interno disciplinado que passe por uma
 * junta indisciplinada não serviu de nada.
 *
 * E faz uma coisa que os outros não podiam fazer: prova que **cada facto sai
 * com a explicação inocente ao lado**, incluindo os que vêm de módulos que não
 * a trazem. O `coerencia/` e o `sinais.ts` devolvem identificadores e números;
 * as frases deles vivem no `verificacao.ts`, e uma frase que alguém se esqueça
 * de escrever no dia em que acrescentar um achado novo é exactamente o que este
 * teste existe para apanhar.
 *
 * A razão de isto ser um teste e não uma nota no cabeçalho: um número que diz
 * «73% de suspeita» é lido como sentença, e o preço de estar errado é acusar de
 * fraude um criador honesto. Uma regra que dependa de quem revê o código se
 * lembrar dela é uma regra que se perde à primeira pressa.
 */

import { describe, expect, it } from "vitest";

import {
  TIPOS_DE_ACHADO as TIPOS_DE_COERENCIA,
  type Achado as AchadoDeCoerencia,
} from "@/lib/documentos/coerencia";
import { reunirForense } from "@/lib/documentos/forense";
import { TIPOS_DE_SINAL, type Sinal } from "@/lib/documentos/sinais";
import { reunirVerificacao, type Nota } from "@/lib/documentos/verificacao";

import { montarJpeg, montarPdfComRemate, esqueleto } from "./documentos-forense-ficheiros";

// ─── O corpo de prova ────────────────────────────────────────────────────────

/**
 * Um achado de cada espécie, montado à mão.
 *
 * São dados puros — o `coerencia/` devolve objectos assim — e montá-los aqui
 * cobre os treze ramos da observação sem ter de orquestrar treze cenários de
 * base de dados que provariam o `coerencia/`, não esta junta. O que se está a
 * testar é a tradução, e a tradução só precisa de uma entrada de cada forma.
 */
const COERENCIA: readonly AchadoDeCoerencia[] = [
  {
    tipo: "nascimento_no_futuro",
    natureza: "impossivel",
    cavalos: ["c1"],
    dataNascimento: "2030-01-01",
    hoje: "2026-09-04",
  },
  {
    tipo: "nascimento_depois_do_historial",
    natureza: "impossivel",
    cavalos: ["c1"],
    dataNascimento: "2020-05-01",
    historial: [{ campo: "ultima_vacina", data: "2019-01-01" }],
  },
  {
    tipo: "idade_declarada_diverge",
    natureza: "improvavel",
    cavalos: ["c1"],
    dataNascimento: "2015-03-01",
    idadeDeclarada: 8,
    idadePelaData: 11,
    anosDeDiferenca: 3,
  },
  {
    tipo: "longevidade_invulgar",
    natureza: "improvavel",
    cavalos: ["c1"],
    dataNascimento: "1990-01-01",
    anos: 36,
  },
  {
    tipo: "altura_para_a_idade",
    natureza: "improvavel",
    cavalos: ["c1"],
    dataNascimento: "2024-01-01",
    alturaCm: 168,
    mesesDeIdade: 20,
    alturaAdultaImplicita: 195,
  },
  {
    tipo: "progenitor_mais_novo",
    natureza: "impossivel",
    cavalos: ["c1", "c2"],
    cavaloId: "c1",
    caminho: "pai",
    geracoes: 1,
    identidade: { chave: "LUS201900421", base: "registo" },
    cavaloDoProgenitor: "c2",
    dataNascimento: "2018-04-01",
    dataNascimentoDoProgenitor: "2020-06-01",
    mesesEntreOsNascimentos: -26,
    mesesMinimosExigidos: 36,
  },
  {
    tipo: "partos_demasiado_juntos",
    natureza: "improvavel",
    cavalos: ["c1", "c2"],
    mae: { chave: "ZAMBUJEIRA", base: "nome" },
    nascimentos: [
      { cavaloId: "c1", data: "2021-03-01" },
      { cavaloId: "c2", data: "2021-06-01" },
    ],
    dias: 92,
  },
  {
    tipo: "antepassado_de_si_proprio",
    natureza: "improvavel",
    cavalos: ["c1"],
    cavaloId: "c1",
    identidade: { chave: "MAESTOSO", base: "nome" },
    caminhos: ["exemplar", "pai.pai"],
  },
  {
    tipo: "papel_contraditorio",
    natureza: "improvavel",
    cavalos: ["c1", "c2"],
    identidade: { chave: "NILO", base: "nome" },
    ocorrencias: [
      { cavaloId: "c1", caminho: "pai", papel: "pai", nome: "Nilo", registo: null },
      { cavaloId: "c2", caminho: "mae", papel: "mae", nome: "Nilo", registo: null },
    ],
  },
  {
    tipo: "sexo_contra_papel",
    natureza: "impossivel",
    cavalos: ["c1", "c2"],
    cavaloId: "c1",
    caminho: "mae",
    papel: "mae",
    identidade: { chave: "LUS201400111", base: "registo" },
    cavaloDoAntepassado: "c2",
    sexo: "Garanhão",
  },
  {
    tipo: "registo_com_dois_nomes",
    natureza: "improvavel",
    cavalos: ["c1", "c2"],
    registo: "LUS201200999",
    nomes: ["XAQUIRO", "ZIMBRO"],
    ocorrencias: [
      { cavaloId: "c1", caminho: "pai", papel: "pai", nome: "Xaquiro", registo: "LUS201200999" },
      { cavaloId: "c2", caminho: "pai", papel: "pai", nome: "Zimbro", registo: "LUS201200999" },
    ],
  },
  {
    tipo: "nome_com_dois_registos",
    natureza: "improvavel",
    cavalos: ["c1", "c2"],
    nome: "OFENSOR",
    registos: ["LUS201100222", "LUS201100333"],
    ocorrencias: [
      { cavaloId: "c1", caminho: "pai", papel: "pai", nome: "Ofensor", registo: "LUS201100222" },
      { cavaloId: "c2", caminho: "pai", papel: "pai", nome: "Ofensor", registo: "LUS201100333" },
    ],
  },
  {
    tipo: "contradicao_entre_documentos",
    natureza: "improvavel",
    cavalos: ["c1"],
    referencia: "11111111-1111-4111-8111-111111111111",
    campo: "microchip",
    leituras: [
      { documentoId: "d1", tipoDeDocumento: "livro_azul", valor: "620015004471234" },
      { documentoId: "d2", tipoDeDocumento: "passaporte", valor: "620015004479999" },
    ],
  },
];

const SINAIS: readonly Sinal[] = [
  {
    tipo: "documento_repetido",
    sha256: "a".repeat(64),
    documentos: [
      {
        documentoId: "d1",
        tipo: "livro_azul",
        estado: "por_verificar",
        cavaloId: "c1",
        referencia: "r1",
      },
      {
        documentoId: "d2",
        tipo: "livro_azul",
        estado: "verificado",
        cavaloId: "c2",
        referencia: "r2",
      },
    ],
    destinos: ["c1", "c2"],
    cavalosComDocumentacaoVerificada: ["c2"],
  },
  {
    tipo: "microchip_repetido",
    chave: "620015004471234",
    anuncios: [
      { cavaloId: "c1", vendedor: "u1", valor: "620015004471234" },
      { cavaloId: "c2", vendedor: "u2", valor: "620 015 004471234" },
    ],
  },
  {
    tipo: "ueln_repetido",
    chave: "620015004471234",
    anuncios: [
      { cavaloId: "c1", vendedor: "u1", valor: "620015004471234" },
      { cavaloId: "c3", vendedor: null, valor: "620015004471234" },
    ],
  },
  {
    tipo: "registo_em_vendedores_diferentes",
    chave: "LUS201900421",
    anuncios: [
      { cavaloId: "c1", vendedor: "u1", valor: "LUS 2019 00421" },
      { cavaloId: "c2", vendedor: "u2", valor: "LUS201900421" },
    ],
    vendedores: ["u1", "u2"],
    anunciosSemVendedor: ["c9"],
  },
  {
    tipo: "contradicao_por_rever",
    documento: {
      documentoId: "d1",
      tipo: "passaporte",
      estado: "por_verificar",
      cavaloId: "c1",
      referencia: "r1",
    },
    conflitos: [
      { campo: "microchip", noFormulario: "620015004471234", noDocumento: "620015004479999" },
    ],
  },
];

/** Um PDF e um JPEG que disparam o que o forense sabe disparar. */
function forense() {
  const pdf = montarPdfComRemate(
    [
      ...esqueleto(
        "BT /F1 10 Tf 100 700 Td (Microchip 620015004471234) Tj ET\n1 1 1 rg\n90 690 200 20 re\nf\n"
      ),
      {
        numero: 8,
        dicionario: "<< /Producer (Adobe Photoshop 24.0) /CreationDate (D:20240115103000Z) >>",
      },
    ],
    { trailer: "<< /Root 1 0 R /Info 8 0 R >>" }
  );
  return [
    ...reunirForense(pdf, "application/pdf"),
    ...reunirForense(montarJpeg({ largura: 800, altura: 600 }), "image/jpeg"),
    ...reunirForense(new Uint8Array(0), "application/pdf"),
  ];
}

function todasAsNotas(): Nota[] {
  return reunirVerificacao({
    forense: forense(),
    coerencia: COERENCIA,
    sinais: SINAIS,
    conflitos: [
      { campo: "nome", noFormulario: "Maestoso", noDocumento: "Maestoso XV" },
      { campo: "ueln", noFormulario: "620015004471234", noDocumento: "620015004479999" },
    ],
    analise: "correu",
    analisadoEm: "2026-09-04T10:00:00.000Z",
  }).notas;
}

// ─── As chaves proibidas ─────────────────────────────────────────────────────

const CHAVES_PROIBIDAS = ["gravidade", "risco", "score", "pontuacao", "accao", "decisao"] as const;

/** Todas as chaves da saída, incluindo as dos objectos lá dentro. */
function chavesDe(valor: unknown, encontradas = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) {
    for (const item of valor) chavesDe(item, encontradas);
    return encontradas;
  }
  if (valor !== null && typeof valor === "object") {
    for (const [chave, dentro] of Object.entries(valor)) {
      encontradas.add(chave);
      chavesDe(dentro, encontradas);
    }
  }
  return encontradas;
}

/** Todos os textos da saída, para se lhes poder ler o vocabulário. */
function textosDe(valor: unknown, encontrados: string[] = []): string[] {
  if (typeof valor === "string") encontrados.push(valor);
  else if (Array.isArray(valor)) for (const item of valor) textosDe(item, encontrados);
  else if (valor !== null && typeof valor === "object") {
    for (const dentro of Object.values(valor)) textosDe(dentro, encontrados);
  }
  return encontrados;
}

describe("a saída da junta não se parece com um veredicto", () => {
  it("nenhuma chave da lista proibida aparece, nem no fundo dos objectos", () => {
    const chaves = chavesDe(todasAsNotas());
    for (const proibida of CHAVES_PROIBIDAS) {
      expect(chaves.has(proibida)).toBe(false);
    }
  });

  it("a busca de chaves desce mesmo até ao fundo", () => {
    // Sem esta prova, o teste de cima passaria a olhar só para o primeiro nível
    // e ninguém daria por isso.
    expect(chavesDe([{ a: { b: [{ risco: 1 }] } }]).has("risco")).toBe(true);
  });

  it("nenhum texto traz uma percentagem, uma nota ou uma probabilidade", () => {
    for (const texto of textosDe(todasAsNotas())) {
      expect(texto).not.toMatch(/\d{1,3}\s?%/);
      expect(texto).not.toMatch(/probabilidade|pontuaç|classificaç[ãa]o de|n[íi]vel de risco/i);
      expect(texto).not.toMatch(/\b(alto|m[ée]dio|baixo)\s+risco\b/i);
    }
  });

  it("nenhuma nota traz um grau, uma ordem ou um peso disfarçado de dado", () => {
    // A ordem é a do array e mais nada. Um campo de posição na `Nota` seria uma
    // pontuação com outro nome, e chegaria ao ecrã como um número ao lado do
    // facto.
    const permitidas = new Set(["origem", "chave", "observacao", "explicacaoInocente", "cavalos"]);
    for (const nota of todasAsNotas()) {
      for (const chave of Object.keys(nota)) {
        expect(permitidas.has(chave)).toBe(true);
      }
    }
  });

  it("em lado nenhum se afirma que o documento é verdadeiro ou verificado", () => {
    // A junta não carimba nada. A palavra pode aparecer a descrever o estado de
    // outro anúncio — «já mostram documentação verificada» —, o que é um facto
    // sobre a tabela, não uma afirmação sobre este documento.
    for (const nota of todasAsNotas()) {
      expect(nota.observacao).not.toMatch(
        /\beste documento (é|parece) (verdadeiro|falso|aut[êe]ntico)\b/i
      );
      expect(nota.observacao).not.toMatch(/\bconfirma(-se|do)\s+que\b/i);
    }
  });
});

// ─── A explicação inocente ───────────────────────────────────────────────────

describe("cada facto sai com a sua explicação inocente", () => {
  it("todas as notas a têm, e não é uma frase de encher", () => {
    const notas = todasAsNotas();
    expect(notas.length).toBeGreaterThan(20);

    for (const nota of notas) {
      expect(nota.observacao.trim().length).toBeGreaterThan(20);
      expect(nota.explicacaoInocente.trim().length).toBeGreaterThan(60);
      expect(nota.explicacaoInocente).not.toBe(nota.observacao);
    }
  });

  it("cada tipo de achado de coerência produz uma nota, e nenhuma frase se repete", () => {
    // A cobertura é o que impede que um achado novo entre sem passar por aqui:
    // um tipo declarado e nunca traduzido é um tipo que ninguém testou. E duas
    // frases iguais quer dizer que alguém copiou uma e não a escreveu.
    const notas = reunirVerificacao({ coerencia: COERENCIA }).notas;
    expect(notas).toHaveLength(TIPOS_DE_COERENCIA.length);

    const porTipo = new Set(notas.map((n) => n.chave));
    for (const tipo of TIPOS_DE_COERENCIA) expect(porTipo.has(tipo)).toBe(true);

    const frases = new Set(notas.map((n) => n.explicacaoInocente));
    expect(frases.size).toBe(notas.length);
  });

  it("cada tipo de sinal produz uma nota, e nenhuma frase se repete", () => {
    const notas = reunirVerificacao({ sinais: SINAIS }).notas;
    expect(notas).toHaveLength(TIPOS_DE_SINAL.length);

    const porTipo = new Set(notas.map((n) => n.chave));
    for (const tipo of TIPOS_DE_SINAL) expect(porTipo.has(tipo)).toBe(true);

    const frases = new Set(notas.map((n) => n.explicacaoInocente));
    expect(frases.size).toBe(notas.length);
  });

  it("a explicação inocente do forense é a que o forense escreveu, não uma cópia", () => {
    // A frase tem de viajar com o facto desde o módulo que a escreveu. Se a
    // junta a reescrevesse, existiria um sítio onde ela se pode perder.
    const achados = forense();
    const notas = reunirVerificacao({ forense: achados }).notas;
    for (const achado of achados) {
      const nota = notas.find((n) => n.observacao === achado.observacao);
      expect(nota?.explicacaoInocente).toBe(achado.explicacaoInocente);
    }
  });
});
