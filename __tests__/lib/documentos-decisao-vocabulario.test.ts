/**
 * A disciplina da saída da decisão, verificada por máquina.
 *
 * O `sinais.ts`, o `coerencia/`, o `forense/`, o `stud-book/` e o
 * `verificacao.ts` têm cada um o seu teste a comparar as chaves da saída contra
 * a mesma lista proibida. Este faz o mesmo à saída do `decisao.ts` — e é aqui
 * que ele mais faz falta, porque esta é a saída que **responde a uma pergunta**.
 * Seis módulos disciplinados a desaguar numa resposta indisciplinada não
 * serviram de nada: um «73% de confiança» ao lado de um anúncio é lido como
 * sentença, e o preço de estar errado é acusar de fraude um criador honesto.
 *
 * E prova as duas coisas que só aqui se podem provar:
 *
 * 1. **A saída tem três valores nomeados e uma lista, e não um número.**
 *    Nenhuma chave da `Razao` é um grau, um peso ou uma posição.
 * 2. **Cada razão sai com a explicação inocente ao lado**, incluindo as duas
 *    famílias que a junta não conhece — o stud-book e as fotografias — cujas
 *    frases vivem no `decisao.ts` e que ninguém mais testa.
 */

import { describe, expect, it } from "vitest";

import type { Achado as AchadoDeCoerencia } from "@/lib/documentos/coerencia";
import {
  decidirSobreOAnuncio,
  PALAVRAS_DA_SAIDA,
  SAIDAS,
  type Decisao,
  type Razao,
} from "@/lib/documentos/decisao";
import { reunirForense } from "@/lib/documentos/forense";
import type { Sinal } from "@/lib/documentos/sinais";
import { TIPOS_DE_FACTO, type FactoDoStudBook } from "@/lib/documentos/stud-book";
import { TIPOS_DE_SINAL as TIPOS_DE_SINAL_DE_FOTO } from "@/lib/fotos/sinais";
import type { SinalFotografiaParecida } from "@/lib/fotos/sinais";

import { esqueleto, montarJpeg, montarPdfComRemate } from "./documentos-forense-ficheiros";

// ─── O corpo de prova: uma de cada espécie ───────────────────────────────────

const COERENCIA: readonly AchadoDeCoerencia[] = [
  {
    tipo: "nascimento_no_futuro",
    natureza: "impossivel",
    cavalos: ["c1"],
    dataNascimento: "2030-01-01",
    hoje: "2026-09-04",
  },
  {
    tipo: "longevidade_invulgar",
    natureza: "improvavel",
    cavalos: ["c1"],
    dataNascimento: "1990-01-01",
    anos: 36,
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
];

/** Os quatro factos do stud-book: dois dão razão, dois não dão nenhuma. */
const STUD_BOOK: readonly FactoDoStudBook[] = [
  { tipo: "consulta_por_confirmar", cavaloId: "c1", estado: "desligado", tentativas: 0 },
  {
    tipo: "registo_confirmado",
    cavaloId: "c1",
    identificador: "ueln",
    registo: { nome: "Zimbro" },
  },
  { tipo: "registo_desconhecido", cavaloId: "c1", identificador: "microchip" },
  {
    tipo: "divergencia_com_o_stud_book",
    cavaloId: "c1",
    identificador: "numero_registo",
    divergencias: [
      { campo: "data_nascimento", noAnuncio: "2019-05-02", noStudBook: "2014-03-11" },
      { campo: "pelagem", noAnuncio: "Ruço", noStudBook: "Castanho" },
    ],
  },
];

const FOTOGRAFIAS: readonly SinalFotografiaParecida[] = [
  {
    tipo: "fotografia_parecida",
    fotografias: [
      { cavaloId: "c1", url: "https://exemplo/1.jpg", vendedor: "u1", largura: 1600, altura: 1200 },
      { cavaloId: "c2", url: "https://exemplo/2.jpg", vendedor: "u2", largura: 800, altura: 600 },
    ],
    distanciaPhash: 2,
    distanciaDhash: 3,
    enquadramento: "inteira-centro",
    vendedores: ["u1", "u2"],
    anunciosSemVendedor: [],
  },
];

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

function decisaoCompleta(): Decisao {
  return decidirSobreOAnuncio({
    coerencia: COERENCIA,
    forense: forense(),
    sinais: SINAIS,
    conflitos: [
      { campo: "nome", noFormulario: "Maestoso", noDocumento: "Maestoso XV" },
      { campo: "ueln", noFormulario: "620015004471234", noDocumento: "620015004479999" },
    ],
    studBook: STUD_BOOK,
    fotografias: FOTOGRAFIAS,
  });
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

describe("a resposta não se parece com um veredicto", () => {
  it("nenhuma chave da lista proibida aparece, nem no fundo dos objectos", () => {
    const chaves = chavesDe(decisaoCompleta());
    for (const proibida of CHAVES_PROIBIDAS) {
      expect(chaves.has(proibida), proibida).toBe(false);
    }
  });

  it("a busca de chaves desce mesmo até ao fundo", () => {
    // Sem esta prova, o teste de cima passaria a olhar só para o primeiro nível
    // e ninguém daria por isso.
    expect(chavesDe([{ a: { b: [{ risco: 1 }] } }]).has("risco")).toBe(true);
  });

  it("a saída tem três valores nomeados e uma lista, e nada mais", () => {
    const decisao = decisaoCompleta();
    expect(Object.keys(decisao).sort()).toEqual(["paraOVendedor", "razoes", "saida"]);
    expect(SAIDAS).toContain(decisao.saida);
    // O que responde a pergunta é uma palavra, não um número.
    expect(typeof decisao.saida).toBe("string");
  });

  it("nenhuma razão traz um grau, uma ordem ou um peso disfarçado de dado", () => {
    // A ordem é a do array e mais nada. Um campo de posição na `Razao` seria
    // uma pontuação com outro nome, e chegaria ao ecrã como um número ao lado
    // do anúncio.
    const permitidas = new Set([
      "origem",
      "chave",
      "observacao",
      "explicacaoInocente",
      "cavalos",
      "segura",
      "campo",
    ]);
    for (const razao of decisaoCompleta().razoes) {
      for (const chave of Object.keys(razao)) {
        expect(permitidas.has(chave), chave).toBe(true);
      }
    }
  });

  it("«segura» é um booleano, e não um número disfarçado", () => {
    // Não há meio-segura, e não há duas razões que somadas segurem.
    for (const razao of decisaoCompleta().razoes) {
      expect(typeof razao.segura).toBe("boolean");
    }
  });

  it("nenhum texto traz uma percentagem, uma nota ou uma probabilidade", () => {
    for (const texto of textosDe(decisaoCompleta())) {
      expect(texto).not.toMatch(/\d{1,3}\s?%/);
      expect(texto).not.toMatch(/probabilidade|pontuaç|classificaç[ãa]o de|n[íi]vel de risco/i);
      expect(texto).not.toMatch(/\b(alto|m[ée]dio|baixo)\s+risco\b/i);
    }
  });

  it("nenhuma observação acusa: conta-se o que se mediu e mais nada", () => {
    // A fronteira é entre os dois campos, e é onde tem de estar. A
    // `observacao` diz o que se mediu, em indicativo e sem adjectivos — e uma
    // medição nunca é uma falsificação. A `explicacaoInocente` pode nomear a
    // falsificação, e uma delas nomeia: é a que diz que um erro de
    // transcrição, um cavalo estrangeiro por inscrever e uma falsificação
    // produzem **o mesmo silêncio**, e que não os sabemos distinguir. Apagar
    // essa frase era esconder de quem revê a única coisa que ele precisa de
    // saber sobre aquele facto.
    for (const razao of decisaoCompleta().razoes) {
      expect(razao.observacao).not.toMatch(/\bfraude\b|\bfalsificaç|\bfalso\b|\bforjad/i);
    }
  });

  it("a palavra «roubada» não aparece em lado nenhum", () => {
    // É a regra do `lib/fotos/sinais.ts`, e vale para tudo o que dele venha:
    // duas fotografias parecidas não são uma fotografia roubada.
    for (const texto of textosDe(decisaoCompleta())) {
      expect(texto).not.toMatch(/\broubad/i);
    }
  });

  it("em lado nenhum se afirma que o anúncio é falso", () => {
    for (const texto of textosDe(decisaoCompleta())) {
      expect(texto).not.toMatch(/\beste an[úu]ncio (é|parece) (falso|fraudulento)\b/i);
      expect(texto).not.toMatch(/\bconfirma(-se|do)\s+que\b/i);
    }
  });

  it("a palavra «recusado» só aparece a dizer que não houve recusa", () => {
    // Não há saída nenhuma chamada «recusado», e não é um esquecimento: recusar
    // continua a ser um acto de uma pessoa, no painel de administração.
    expect([...SAIDAS]).not.toContain("recusado");
    for (const saida of SAIDAS) {
      const texto = `${PALAVRAS_DA_SAIDA[saida].titulo} ${PALAVRAS_DA_SAIDA[saida].explicacao}`;
      if (/recusad/i.test(texto)) expect(texto).toMatch(/n[ãa]o foi recusado/i);
    }
  });
});

// ─── A explicação inocente ───────────────────────────────────────────────────

describe("cada razão sai com a sua explicação inocente", () => {
  it("todas a têm, e não é uma frase de encher", () => {
    const razoes = decisaoCompleta().razoes;
    expect(razoes.length).toBeGreaterThan(8);

    for (const razao of razoes) {
      expect(razao.observacao.trim().length).toBeGreaterThan(20);
      expect(razao.explicacaoInocente.trim().length).toBeGreaterThan(60);
      expect(razao.explicacaoInocente).not.toBe(razao.observacao);
    }
  });

  it("a frase que a junta escreveu viaja intacta, não é reescrita aqui", () => {
    // Uma segunda cópia da mesma frase é uma frase que amanhã diverge da
    // primeira. Quem escreve a do forense é o forense.
    const achados = forense().filter((a) => a.tipo === "pdf_tinta_por_cima_de_texto");
    expect(achados).toHaveLength(1);

    const razoes = decidirSobreOAnuncio({ forense: achados }).razoes;
    expect(razoes[0].explicacaoInocente).toBe(achados[0].explicacaoInocente);
    expect(razoes[0].observacao).toBe(achados[0].observacao);
  });

  it("as duas famílias que a junta não conhece também as trazem", () => {
    // O stud-book e as fotografias nasceram depois do `verificacao.ts`, e as
    // frases delas vivem no `decisao.ts`. Ninguém mais as testa.
    const doStudBook = decidirSobreOAnuncio({ studBook: STUD_BOOK }).razoes;
    const dasFotos = decidirSobreOAnuncio({ fotografias: FOTOGRAFIAS }).razoes;

    expect(doStudBook.map((r) => r.chave).sort()).toEqual([
      "divergencia_com_o_stud_book",
      "registo_desconhecido",
    ]);
    expect(dasFotos.map((r) => r.chave)).toEqual([...TIPOS_DE_SINAL_DE_FOTO]);

    for (const razao of [...doStudBook, ...dasFotos]) {
      expect(razao.explicacaoInocente.trim().length).toBeGreaterThan(60);
    }
  });

  it("cada tipo de facto do stud-book tem um destino escrito", () => {
    // Dois dão razão e dois não dão nenhuma — e o que não pode acontecer é um
    // tipo novo entrar sem que ninguém tenha decidido para que lado vai.
    const comRazao = new Set(
      decidirSobreOAnuncio({ studBook: STUD_BOOK }).razoes.map((r) => r.chave)
    );
    for (const tipo of TIPOS_DE_FACTO) {
      const presente = STUD_BOOK.some((f) => f.tipo === tipo);
      expect(presente, tipo).toBe(true);
    }
    expect(comRazao.size).toBe(2);
  });

  it("nenhuma explicação inocente se repete entre razões de tipos diferentes", () => {
    // Duas frases iguais quer dizer que alguém copiou uma e não a escreveu.
    const porChave = new Map<string, string>();
    for (const razao of decisaoCompleta().razoes)
      porChave.set(razao.chave, razao.explicacaoInocente);
    expect(new Set(porChave.values()).size).toBe(porChave.size);
  });
});

// ─── As palavras do vendedor ─────────────────────────────────────────────────

describe("as palavras que chegam a quem enviou o anúncio", () => {
  it("há palavras para cada saída, e nenhuma a mais", () => {
    expect(Object.keys(PALAVRAS_DA_SAIDA).sort()).toEqual([...SAIDAS].sort());
  });

  it("nenhuma frase promete um prazo", () => {
    // Não há fila com prazo e não há nada que a percorra sozinha. Um prazo
    // escrito aqui é um compromisso que ninguém está a cumprir.
    const proibidas = [
      /\d+\s*h\b/i,
      /hora/i,
      /\bdias?\b/i,
      /\búteis\b/i,
      /at[ée]\s+\d/i,
      /prazo/i,
      /brevemente/i,
      /em breve/i,
    ];
    for (const saida of SAIDAS) {
      const texto = `${PALAVRAS_DA_SAIDA[saida].titulo} ${PALAVRAS_DA_SAIDA[saida].explicacao}`;
      for (const padrao of proibidas) {
        expect(padrao.test(texto), `${saida}: «${texto}» contra ${padrao}`).toBe(false);
      }
    }
  });

  it("nenhuma frase afirma uma verificação que ninguém fez", () => {
    for (const saida of SAIDAS) {
      const texto =
        `${PALAVRAS_DA_SAIDA[saida].titulo} ${PALAVRAS_DA_SAIDA[saida].explicacao}`.toLowerCase();
      expect(texto).not.toContain("verificado");
      expect(texto).not.toContain("aprovado");
      expect(texto).not.toContain("confirmado");
    }
  });

  it("o que se pede ao vendedor sai sem repetições e só do que segura", () => {
    const decisao = decisaoCompleta();
    const { aRever } = decisao.paraOVendedor;
    expect(new Set(aRever).size).toBe(aRever.length);

    const camposQueSeguram = new Set(
      decisao.razoes.filter((r: Razao) => r.segura).map((r: Razao) => r.campo)
    );
    for (const campo of aRever) expect(camposQueSeguram.has(campo)).toBe(true);
  });
});
