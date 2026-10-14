/**
 * O que segura um anúncio, o que não segura, e o vizinho quase igual de cada
 * caso.
 *
 * Um teste que só mostra o caso que dispara prova metade: prova que a regra
 * existe, não prova onde é que ela acaba. E é onde ela acaba que decide se este
 * sistema serve para alguma coisa — uma regra generosa de mais enche a fila de
 * criadores honestos, e quem revê aprende a carimbar sem olhar. Por isso cada
 * regra aqui aparece duas vezes: o caso que a dispara e o caso ao lado, o mais
 * parecido que se consegue montar, que não a dispara.
 *
 * O par mais importante do ficheiro é o do `progenitor_mais_novo`: o **mesmo
 * tipo de achado**, com os mesmos números, a mudar só a natureza — porque num
 * a identidade vem de um número de registo e no outro de um nome que se repete
 * entre gerações. Um segura, o outro não.
 */

import { describe, expect, it } from "vitest";

import { reunirCoerencia, type Achado as AchadoDeCoerencia } from "@/lib/documentos/coerencia";
import { decidirSobreOAnuncio, type Razao } from "@/lib/documentos/decisao";
import { reunirForense, type Achado as AchadoForense } from "@/lib/documentos/forense";
import type { Sinal } from "@/lib/documentos/sinais";
import type { FactoDoStudBook } from "@/lib/documentos/stud-book";
import type { SinalFotografiaParecida } from "@/lib/fotos/sinais";

import { esqueleto, montarJpeg, montarPdfComRemate } from "./documentos-forense-ficheiros";

// ─── Corpos de prova ─────────────────────────────────────────────────────────

const IMPOSSIVEL: AchadoDeCoerencia = {
  tipo: "nascimento_no_futuro",
  natureza: "impossivel",
  cavalos: ["c1"],
  dataNascimento: "2030-01-01",
  hoje: "2026-09-04",
};

/**
 * Um cavalo de 36 anos. Existe, e são-no com orgulho.
 */
const IMPROVAVEL: AchadoDeCoerencia = {
  tipo: "longevidade_invulgar",
  natureza: "improvavel",
  cavalos: ["c1"],
  dataNascimento: "1990-01-01",
  anos: 36,
};

/** O pai nasceu depois do filho, e quem os liga é um número de registo. */
const PAI_MAIS_NOVO_POR_REGISTO: AchadoDeCoerencia = {
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
};

/**
 * Os mesmos números, e quem os liga é um nome. O `abrandar` do `coerencia/` já
 * desceu isto a improvável, porque o que está incerto é a ligação e não a
 * biologia: no livro de origem do Lusitano dá-se ao potro o nome do avô.
 */
const PAI_MAIS_NOVO_POR_NOME: AchadoDeCoerencia = {
  ...PAI_MAIS_NOVO_POR_REGISTO,
  natureza: "improvavel",
  identidade: { chave: "ZIMBRO", base: "nome" },
};

const DOCUMENTO_REPETIDO: Sinal = {
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
};

const MICROCHIP_REPETIDO: Sinal = {
  tipo: "microchip_repetido",
  chave: "620015004471234",
  anuncios: [
    { cavaloId: "c1", vendedor: "u1", valor: "620015004471234" },
    { cavaloId: "c2", vendedor: "u2", valor: "620 015 004471234" },
  ],
};

const APSL_INDISPONIVEL: FactoDoStudBook = {
  tipo: "consulta_por_confirmar",
  cavaloId: "c1",
  estado: "indisponivel",
  motivo: "sem_resposta",
  tentativas: 2,
};

const APSL_DESLIGADA: FactoDoStudBook = {
  tipo: "consulta_por_confirmar",
  cavaloId: "c1",
  estado: "desligado",
  tentativas: 0,
};

const APSL_SEM_IDENTIFICADOR: FactoDoStudBook = {
  tipo: "consulta_por_confirmar",
  cavaloId: "c1",
  estado: "sem_identificador",
  tentativas: 0,
};

const APSL_NUNCA_CONSULTADA: FactoDoStudBook = {
  tipo: "consulta_por_confirmar",
  cavaloId: "c1",
  estado: "nunca_consultado",
  tentativas: 0,
};

const APSL_DESCONHECIDO: FactoDoStudBook = {
  tipo: "registo_desconhecido",
  cavaloId: "c1",
  identificador: "numero_registo",
};

const APSL_CONFIRMADO: FactoDoStudBook = {
  tipo: "registo_confirmado",
  cavaloId: "c1",
  identificador: "numero_registo",
  registo: { nome: "Zimbro", dataNascimento: "2018-04-01" },
};

const APSL_DIVERGE: FactoDoStudBook = {
  tipo: "divergencia_com_o_stud_book",
  cavaloId: "c1",
  identificador: "numero_registo",
  divergencias: [{ campo: "data_nascimento", noAnuncio: "2019-05-02", noStudBook: "2014-03-11" }],
};

const FOTOGRAFIA_PARECIDA: SinalFotografiaParecida = {
  tipo: "fotografia_parecida",
  fotografias: [
    { cavaloId: "c1", url: "https://exemplo/1.jpg", vendedor: "u1", largura: 1600, altura: 1200 },
    { cavaloId: "c2", url: "https://exemplo/2.jpg", vendedor: "u2", largura: 800, altura: 600 },
  ],
  distanciaPhash: 2,
  distanciaDhash: 3,
  enquadramento: "inteira-inteira",
  vendedores: ["u1", "u2"],
  anunciosSemVendedor: [],
};

// ─── Ficheiros a sério, para o forense ───────────────────────────────────────

/** Um PDF com tinta branca desenhada por cima de texto que já lá estava. */
function forenseComTintaPorCima(): AchadoForense[] {
  const pdf = montarPdfComRemate(
    esqueleto(
      "BT /F1 10 Tf 100 700 Td (Microchip 620015004471234) Tj ET\n1 1 1 rg\n90 690 200 20 re\nf\n"
    )
  );
  return reunirForense(pdf, "application/pdf");
}

/** Um JPEG comum. O que ele dá são os achados que quase todos os ficheiros dão. */
function forenseComum(): AchadoForense[] {
  return reunirForense(montarJpeg({ largura: 800, altura: 600 }), "image/jpeg");
}

/** Um ficheiro vazio: não se examinou nada. É ausência, não é um achado. */
function forenseNaoExaminado(): AchadoForense[] {
  return reunirForense(new Uint8Array(0), "application/pdf");
}

function chaves(razoes: readonly Razao[]): string[] {
  return razoes.map((r) => r.chave);
}

// ─── Regra 1: só o impossível segura ─────────────────────────────────────────

describe("só o impossível segura o anúncio", () => {
  it("um pai nascido depois do filho põe o anúncio à espera de uma pessoa", () => {
    const decisao = decidirSobreOAnuncio({ coerencia: [IMPOSSIVEL] });
    expect(decisao.saida).toBe("espera_por_pessoa");
    expect(decisao.razoes.filter((r) => r.segura)).toHaveLength(1);
  });

  it("um cavalo de 36 anos não segura nada: é improvável, e existe", () => {
    const decisao = decidirSobreOAnuncio({ coerencia: [IMPROVAVEL] });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.razoes.every((r) => !r.segura)).toBe(true);
  });

  it("o mesmo achado segura por registo e não segura por nome", () => {
    // Este é o par que mais importa. Os números são os mesmos e a biologia é a
    // mesma; o que muda é por onde se reconheceu que as duas linhas falam do
    // mesmo cavalo. Um número de registo identifica; um nome que se repete de
    // geração em geração é um palpite, e um palpite não sustenta uma
    // impossibilidade.
    expect(decidirSobreOAnuncio({ coerencia: [PAI_MAIS_NOVO_POR_REGISTO] }).saida).toBe(
      "espera_por_pessoa"
    );
    expect(decidirSobreOAnuncio({ coerencia: [PAI_MAIS_NOVO_POR_NOME] }).saida).toBe(
      "segue_com_nota"
    );
  });

  it("nenhuma quantidade de improváveis chega a uma espera", () => {
    // Não há aqui nenhum limiar de contagem, e é de propósito: um limiar de
    // contagem é uma pontuação com outro nome.
    const muitos = [
      IMPROVAVEL,
      PAI_MAIS_NOVO_POR_NOME,
      IMPROVAVEL,
      IMPROVAVEL,
      PAI_MAIS_NOVO_POR_NOME,
    ];
    const decisao = decidirSobreOAnuncio({
      coerencia: muitos,
      sinais: [DOCUMENTO_REPETIDO, MICROCHIP_REPETIDO],
      studBook: [APSL_DESCONHECIDO, APSL_DIVERGE],
      fotografias: [FOTOGRAFIA_PARECIDA],
      forense: forenseComTintaPorCima(),
    });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.razoes.length).toBeGreaterThan(8);
  });

  it("basta um impossível no meio de tudo o resto", () => {
    const decisao = decidirSobreOAnuncio({
      coerencia: [IMPROVAVEL, IMPOSSIVEL, PAI_MAIS_NOVO_POR_NOME],
      sinais: [DOCUMENTO_REPETIDO],
    });
    expect(decisao.saida).toBe("espera_por_pessoa");
  });
});

// ─── Regra 2: a APSL não segura nada quando não responde ─────────────────────

describe("a APSL calada não segura nem assinala coisa nenhuma", () => {
  it("indisponível não produz razão nenhuma", () => {
    const decisao = decidirSobreOAnuncio({ studBook: [APSL_INDISPONIVEL] });
    expect(decisao.saida).toBe("segue");
    expect(decisao.razoes).toEqual([]);
  });

  it("desligada, sem identificador e nunca consultada também não", () => {
    // O interruptor está em baixo por omissão, logo este facto sai hoje para
    // todos os anúncios do site. Se virasse razão, todos eram
    // `segue_com_nota` e a fila deixava de ter frente.
    for (const facto of [APSL_DESLIGADA, APSL_SEM_IDENTIFICADOR, APSL_NUNCA_CONSULTADA]) {
      const decisao = decidirSobreOAnuncio({ studBook: [facto] });
      expect(decisao.saida, facto.tipo).toBe("segue");
      expect(decisao.razoes).toEqual([]);
    }
  });

  it("um registo confirmado é boa notícia e não é coisa a olhar", () => {
    const decisao = decidirSobreOAnuncio({ studBook: [APSL_CONFIRMADO] });
    expect(decisao.saida).toBe("segue");
    expect(decisao.razoes).toEqual([]);
  });

  it("o vizinho que dispara: a APSL respondeu e não conhece o número", () => {
    const decisao = decidirSobreOAnuncio({ studBook: [APSL_DESCONHECIDO] });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(chaves(decisao.razoes)).toEqual(["registo_desconhecido"]);
    // E mesmo essa não é impeditiva: um silêncio não contradiz nada.
    expect(decisao.razoes[0].segura).toBe(false);
  });

  it("uma divergência com o stud-book é uma nota, nunca uma espera", () => {
    const decisao = decidirSobreOAnuncio({ studBook: [APSL_DIVERGE] });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.razoes[0].segura).toBe(false);
    expect(decisao.razoes[0].observacao).toContain("2014-03-11");
  });

  it("um desconhecido com o interruptor em baixo não soma nada", () => {
    // Os dois juntos continuam a valer o que o desconhecido vale sozinho.
    const decisao = decidirSobreOAnuncio({
      studBook: [APSL_DESCONHECIDO, APSL_INDISPONIVEL, APSL_DESLIGADA],
    });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.razoes).toHaveLength(1);
  });
});

// ─── Regra 5: ausência nunca segura, e quase nunca assinala ──────────────────

describe("ausência não é contradição", () => {
  it("uma entrada vazia sai «segue», e não «por confirmar»", () => {
    const decisao = decidirSobreOAnuncio({});
    expect(decisao.saida).toBe("segue");
    expect(decisao.razoes).toEqual([]);
  });

  it("um anúncio com metade dos campos vazios sai «segue»", () => {
    // De ponta a ponta, com o `reunirCoerencia` a sério: sem data de
    // nascimento, sem idade, sem altura, sem registo e sem ascendência não há
    // duas afirmações que se possam contradizer.
    const coerencia = reunirCoerencia({
      cavalos: [
        {
          id: "c1",
          data_nascimento: null,
          idade: null,
          sexo: null,
          altura: null,
          nome: "Zimbro",
          nome_registo: null,
          registro_apsl: null,
          status: "pending",
        },
      ],
      ascendentes: [],
      hoje: new Date("2026-09-04T00:00:00.000Z"),
    });
    expect(coerencia).toEqual([]);

    const decisao = decidirSobreOAnuncio({ coerencia });
    expect(decisao.saida).toBe("segue");
    expect(decisao.paraOVendedor.aRever).toEqual([]);
  });

  it("um ficheiro que ninguém conseguiu examinar não levanta a mão", () => {
    const achados = forenseNaoExaminado();
    expect(achados.map((a) => a.tipo)).toContain("nao_examinado");

    const decisao = decidirSobreOAnuncio({ forense: achados });
    expect(decisao.saida).toBe("segue");
    expect(decisao.razoes).toEqual([]);
  });
});

// ─── O ficheiro: o que é comum não põe ninguém à frente na fila ──────────────

describe("o que o ficheiro denuncia sobre si mesmo", () => {
  it("os metadados que quase todos os ficheiros têm não fazem uma razão", () => {
    const achados = forenseComum();
    expect(achados.length).toBeGreaterThan(0);

    const decisao = decidirSobreOAnuncio({ forense: achados });
    expect(decisao.saida).toBe("segue");
    expect(decisao.razoes).toEqual([]);
  });

  it("o vizinho que dispara: tinta opaca por cima de texto já desenhado", () => {
    const achados = forenseComTintaPorCima();
    expect(achados.map((a) => a.tipo)).toContain("pdf_tinta_por_cima_de_texto");

    const decisao = decidirSobreOAnuncio({ forense: achados });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(chaves(decisao.razoes)).toContain("pdf_tinta_por_cima_de_texto");
    // E não segura: um Livro Azul com uma tarja por cima de uma morada
    // continua a poder ser o Livro Azul daquele cavalo.
    expect(decisao.razoes.every((r) => !r.segura)).toBe(true);
  });

  it("o comum e o específico no mesmo ficheiro dão só o específico", () => {
    const decisao = decidirSobreOAnuncio({
      forense: [...forenseComTintaPorCima(), ...forenseComum()],
    });
    expect(decisao.razoes.length).toBeGreaterThan(0);
    for (const chave of chaves(decisao.razoes)) {
      expect([
        "pdf_tinta_por_cima_de_texto",
        "pdf_historico_de_edicao",
        "pdf_assinatura",
      ]).toContain(chave);
    }
  });
});

// ─── Os sinais entre anúncios e as fotografias ───────────────────────────────

describe("o que se vê ao cruzar com outros anúncios", () => {
  it("o mesmo ficheiro em dois anúncios é uma nota, nunca uma espera", () => {
    // É o sinal mais forte que este sistema tem, e mesmo assim tem leitura
    // inocente: o mesmo vendedor a anexar o ficheiro errado a um de dois
    // cavalos da mesma coudelaria.
    const decisao = decidirSobreOAnuncio({ sinais: [DOCUMENTO_REPETIDO] });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.razoes[0].segura).toBe(false);
    expect(decisao.razoes[0].cavalos).toEqual(["c1", "c2"]);
  });

  it("o mesmo microchip em dois anúncios em pé também não segura", () => {
    const decisao = decidirSobreOAnuncio({ sinais: [MICROCHIP_REPETIDO] });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.razoes[0].segura).toBe(false);
  });

  it("duas fotografias parecidas de contas diferentes são uma nota", () => {
    const decisao = decidirSobreOAnuncio({ fotografias: [FOTOGRAFIA_PARECIDA] });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.razoes[0].segura).toBe(false);
    expect(decisao.razoes[0].cavalos).toEqual(["c1", "c2"]);
    expect(decisao.razoes[0].observacao).toContain("64 bits");
  });

  it("uma contradição entre o documento e o formulário é uma nota", () => {
    // Um dos dois lados foi lido por uma máquina a partir da camada de texto de
    // um PDF. Duas afirmações em que uma é um palpite não são duas afirmações.
    const decisao = decidirSobreOAnuncio({
      conflitos: [
        { campo: "microchip", noFormulario: "620015004471234", noDocumento: "620015004479999" },
      ],
    });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.razoes[0].segura).toBe(false);
  });
});

// ─── A ordem e a estabilidade ────────────────────────────────────────────────

describe("a ordem das razões", () => {
  it("o que segura vem primeiro", () => {
    const decisao = decidirSobreOAnuncio({
      sinais: [DOCUMENTO_REPETIDO],
      studBook: [APSL_DESCONHECIDO],
      coerencia: [IMPROVAVEL, IMPOSSIVEL],
    });
    expect(decisao.razoes[0].segura).toBe(true);
    expect(decisao.razoes.slice(1).every((r) => !r.segura)).toBe(true);
  });

  it("a mesma entrada dá sempre a mesma saída", () => {
    const entrada = {
      coerencia: [IMPROVAVEL, IMPOSSIVEL],
      sinais: [DOCUMENTO_REPETIDO, MICROCHIP_REPETIDO],
      studBook: [APSL_DIVERGE, APSL_DESCONHECIDO],
      fotografias: [FOTOGRAFIA_PARECIDA],
    };
    expect(decidirSobreOAnuncio(entrada)).toEqual(decidirSobreOAnuncio(entrada));
  });

  it("não mexe na entrada de quem a chamou", () => {
    const coerencia = [IMPROVAVEL, IMPOSSIVEL];
    decidirSobreOAnuncio({ coerencia });
    expect(coerencia).toEqual([IMPROVAVEL, IMPOSSIVEL]);
  });
});

// ─── O que se diz ao vendedor ────────────────────────────────────────────────

describe("o que o vendedor fica a saber", () => {
  it("«segue» e «segue com nota» dizem-lhe exactamente a mesma coisa", () => {
    // A diferença entre as duas é a ordem da fila de quem revê, e essa não é
    // assunto dele. Dizer-lhe «o seu anúncio tem notas» sem lhe poder dizer
    // quais — porque quase todas falam de anúncios de outras pessoas — era
    // preocupá-lo com uma coisa sobre a qual não pode fazer nada.
    const segue = decidirSobreOAnuncio({});
    const comNota = decidirSobreOAnuncio({ sinais: [DOCUMENTO_REPETIDO] });
    expect(segue.saida).toBe("segue");
    expect(comNota.saida).toBe("segue_com_nota");
    expect(comNota.paraOVendedor).toEqual(segue.paraOVendedor);
  });

  it("quem fica à espera sabe que está à espera e que não foi recusado", () => {
    const decisao = decidirSobreOAnuncio({ coerencia: [IMPOSSIVEL] });
    const texto = `${decisao.paraOVendedor.titulo} ${decisao.paraOVendedor.explicacao}`;
    expect(texto.toLowerCase()).toContain("à espera");
    expect(texto.toLowerCase()).toContain("não foi recusado");
  });

  it("diz-lhe qual é o campo, quando é um campo que ele pode corrigir", () => {
    const decisao = decidirSobreOAnuncio({ coerencia: [IMPOSSIVEL] });
    expect(decisao.paraOVendedor.aRever).toEqual(["data_nascimento"]);
  });

  it("não lhe pede nada quando a contradição envolve outro anúncio", () => {
    // O que estiver errado pode estar do outro lado, e ele não tem como o
    // corrigir. Mandá-lo rever um campo seu seria dizer-lhe que ele se enganou.
    const decisao = decidirSobreOAnuncio({ coerencia: [PAI_MAIS_NOVO_POR_REGISTO] });
    expect(decisao.saida).toBe("espera_por_pessoa");
    expect(decisao.paraOVendedor.aRever).toEqual([]);
  });

  it("não lhe pede para rever campos de razões que não seguram", () => {
    // O improvável aponta para `data_nascimento` e o impossível para `altura`
    // não existe — o que se prova aqui é que só o campo do que segura entra.
    const decisao = decidirSobreOAnuncio({ coerencia: [IMPROVAVEL] });
    expect(decisao.saida).toBe("segue_com_nota");
    expect(decisao.paraOVendedor.aRever).toEqual([]);
  });

  it("os campos saem sem repetições", () => {
    const decisao = decidirSobreOAnuncio({
      coerencia: [
        IMPOSSIVEL,
        {
          tipo: "nascimento_depois_do_historial",
          natureza: "impossivel",
          cavalos: ["c1"],
          dataNascimento: "2020-05-01",
          historial: [{ campo: "ultima_vacina", data: "2019-01-01" }],
        },
      ],
    });
    expect(decisao.paraOVendedor.aRever).toEqual(["data_nascimento"]);
  });
});
