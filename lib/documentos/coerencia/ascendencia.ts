/**
 * A ascendência, contra si própria e contra o resto da base.
 *
 * ## Porque é que isto é a verificação de maior alcance que este site tem
 *
 * Não se pode perguntar à APSL se um cavalo está registado. Mas **um pedigree
 * inventado quase nunca é biologicamente coerente**, e isso vê-se sem sair
 * daqui: quem preenche seis caixas de antepassados a copiar nomes de catálogos
 * acaba, com frequência, a pôr o mesmo cavalo em duas posições que se excluem,
 * ou a dar como pai um garanhão que está anunciado ao lado com uma data de
 * nascimento mais recente do que a do filho.
 *
 * Todas as perguntas deste ficheiro se respondem com o que já está na base.
 * Nenhuma pede um serviço que não temos, e nenhuma recusa nada: o que sai são
 * factos, e quem decide é uma pessoa.
 *
 * ## As seis perguntas
 *
 * 1. **O pai e a mãe são mais velhos do que o filho?** É a mais óbvia e é
 *    exactamente a que um pedigree inventado falha. Só se consegue responder
 *    quando o antepassado **também está anunciado** — a tabela dos ascendentes
 *    guarda nome e registo e não guarda datas.
 * 2. **A mesma égua tem dois filhos demasiado juntos?** Se dois anúncios dão a
 *    mesma mãe e as datas de nascimento distam menos do que uma gestação, um
 *    dos dois está errado.
 * 3. **Algum cavalo é seu próprio antepassado?** Ou dentro da árvore de um
 *    anúncio, ou o próprio exemplar a aparecer na sua própria ascendência.
 * 4. **A mesma identidade ocupa uma posição de pai e uma de mãe?** Isso não
 *    precisa de saber o sexo de ninguém para ser impossível: o mesmo animal
 *    teria de ser os dois.
 * 5. **O sexo do antepassado cabe na posição?** Quando o antepassado está
 *    anunciado e a linha diz «Égua», uma posição de pai não é dele.
 * 6. **O mesmo registo com dois nomes, o mesmo nome com dois registos?** Um dos
 *    dois está errado, e é verificável sem sair da nossa base.
 *
 * ## Duas fronteiras que valem mais do que as regras
 *
 * **Cruzar anúncios pelo nome é diferente de os cruzar pelo registo.** No livro
 * de origem do Lusitano os nomes repetem-se — entre gerações, entre coudelarias
 * e de propósito, porque dar ao potro o nome do avô é costume. Por isso:
 *
 * - A pergunta 1 (**o pai é mais novo do que o filho**) só se faz por
 *   **registo**. Ela diz, na prática, «o senhor inventou o pai», e fundá-la num
 *   nome repetido é acusar por causa de uma homonímia.
 * - A pergunta 2 (**dois partos juntos**) faz-se também por nome, e é seguro
 *   que assim seja: o peso da prova está no intervalo entre as duas datas, e
 *   não no nome. Duas éguas homónimas com filhos a quarenta dias de distância é
 *   uma coincidência sobre uma coincidência.
 * - As perguntas 3 a 6 fazem-se pelas duas bases, e uma identidade fundada só
 *   no nome nunca sobe a `impossivel` — é o que `abrandar` garante.
 *
 * **A consanguinidade legítima não é um achado.** O mesmo avô dos dois lados
 * (`pai.pai` igual a `mae.pai`) é criação em linha, é corrente na raça e não
 * dispara nada. O garanhão que é ao mesmo tempo pai e avô materno — cobriu a
 * própria filha — também não: é consanguinidade estreita e continua a ser
 * possível. Só se levanta a mão nas posições que **não podem coexistir**: as de
 * sexo oposto, e as em que um cavalo seria antepassado de si próprio pela mesma
 * linha.
 */

import {
  DIAS_DE_GEMEOS,
  DIAS_MINIMOS_ENTRE_PARTOS,
  MESES_IDADE_HABITUAL_DE_PROGENITOR,
  MESES_IDADE_MINIMA_DE_PROGENITOR,
} from "./biologia";
import {
  type Achado,
  type AchadoAntepassadoDeSiProprio,
  type AchadoNomeComDoisRegistos,
  type AchadoPapelContraditorio,
  type AchadoPartosDemasiadoJuntos,
  type AchadoProgenitorMaisNovo,
  type AchadoRegistoComDoisNomes,
  type AchadoSexoContraPapel,
  type AscendenteParaCoerencia,
  type CavaloParaCoerencia,
  type Identidade,
  type OcorrenciaDoAntepassado,
  abrandar,
  chaveDeGrupo,
  data,
  diasEntre,
  distintosOrdenados,
  eAntepassadoDe,
  identidadeDe,
  identidadesDoCavalo,
  mesesEntre,
  papelDoCaminho,
  porTexto,
} from "./achados";
import { chaveDeNome } from "@/lib/documentos/leitura/normalizar";
import { chaveRegistoApsl } from "@/components/vender-cavalo/registo-apsl";

/** O caminho com que o próprio cavalo do anúncio entra no índice de ocorrências. */
export const CAMINHO_DO_EXEMPLAR = "exemplar";

/** Quantos passos de geração há num caminho. `pai` é 1, `pai.pai` é 2. */
function geracoesDoCaminho(caminho: string): number {
  return caminho.split(".").length;
}

/** Os sexos que cada posição admite. Um castrado gerou antes de o ser. */
const SEXO_ADMITIDO: Readonly<Record<"pai" | "mae", readonly string[]>> = {
  pai: ["Garanhão", "Castrado"],
  mae: ["Égua"],
};

// ─── O índice ────────────────────────────────────────────────────────────────

/**
 * Onde cada identidade aparece, em toda a entrada.
 *
 * Os exemplares entram no índice ao lado dos antepassados, com o caminho
 * `exemplar` e sem papel. É o que permite reparar que o registo que num anúncio
 * é do cavalo à venda é, noutro, o registo de um avô com outro nome.
 */
function indexarOcorrencias(
  cavalos: readonly CavaloParaCoerencia[],
  ascendentes: readonly AscendenteParaCoerencia[]
): Map<string, { identidade: Identidade; ocorrencias: OcorrenciaDoAntepassado[] }> {
  const indice = new Map<
    string,
    { identidade: Identidade; ocorrencias: OcorrenciaDoAntepassado[] }
  >();

  const juntar = (identidade: Identidade | null, ocorrencia: OcorrenciaDoAntepassado) => {
    if (!identidade) return;
    const k = chaveDeGrupo(identidade);
    const grupo = indice.get(k);
    if (grupo) grupo.ocorrencias.push(ocorrencia);
    else indice.set(k, { identidade, ocorrencias: [ocorrencia] });
  };

  for (const a of ascendentes) {
    juntar(identidadeDe(a), {
      cavaloId: a.cavalo_id,
      caminho: a.caminho,
      papel: papelDoCaminho(a.caminho),
      nome: a.nome,
      registo: a.registo,
    });
  }

  for (const c of cavalos) {
    for (const identidade of identidadesDoCavalo(c)) {
      juntar(identidade, {
        cavaloId: c.id,
        caminho: CAMINHO_DO_EXEMPLAR,
        papel: null,
        nome: c.nome ?? c.nome_registo,
        registo: c.registro_apsl,
      });
    }
  }

  for (const grupo of indice.values()) {
    grupo.ocorrencias.sort(
      (a, b) => porTexto(a.cavaloId, b.cavaloId) || porTexto(a.caminho, b.caminho)
    );
  }
  return indice;
}

/** Os anúncios cujo **próprio** registo é esta chave. */
function cavalosPorRegisto(
  cavalos: readonly CavaloParaCoerencia[]
): Map<string, CavaloParaCoerencia[]> {
  const mapa = new Map<string, CavaloParaCoerencia[]>();
  for (const c of cavalos) {
    const chave = typeof c.registro_apsl === "string" ? chaveRegistoApsl(c.registro_apsl) : "";
    if (chave.length < 3) continue;
    const lista = mapa.get(chave);
    if (lista) lista.push(c);
    else mapa.set(chave, [c]);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => porTexto(a.id, b.id));
  return mapa;
}

// ─── 1. O antepassado mais novo do que o descendente ─────────────────────────

/**
 * Um antepassado que também está anunciado, e cuja data de nascimento não dá.
 *
 * O mínimo exigido cresce com a distância: cada geração precisa de pelo menos
 * `MESES_IDADE_MINIMA_DE_PROGENITOR` — um avô tem de estar dois desses à
 * frente do neto. Um antepassado **nascido depois** do descendente cai
 * naturalmente do lado impossível desta mesma conta, sem precisar de um caso à
 * parte.
 *
 * Só por registo. Ver a fronteira escrita no cabeçalho do ficheiro.
 */
export function antepassadoMaisNovo(
  cavalos: readonly CavaloParaCoerencia[],
  ascendentes: readonly AscendenteParaCoerencia[]
): AchadoProgenitorMaisNovo[] {
  const porRegisto = cavalosPorRegisto(cavalos);
  const porId = new Map(cavalos.map((c) => [c.id, c]));
  const saida: AchadoProgenitorMaisNovo[] = [];

  for (const a of ascendentes) {
    const identidade = identidadeDe(a);
    if (!identidade || identidade.base !== "registo") continue;

    const descendente = porId.get(a.cavalo_id);
    const nascimentoDoDescendente = data(descendente?.data_nascimento ?? null);
    if (!descendente?.data_nascimento || !nascimentoDoDescendente) continue;

    for (const antepassado of porRegisto.get(identidade.chave) ?? []) {
      // O antepassado ser o próprio anúncio é outra pergunta, e tem o seu
      // achado: `antepassadoDeSiProprio`.
      if (antepassado.id === descendente.id) continue;
      const nascimentoDoAntepassado = data(antepassado.data_nascimento);
      if (!antepassado.data_nascimento || !nascimentoDoAntepassado) continue;

      const geracoes = geracoesDoCaminho(a.caminho);
      const meses = mesesEntre(nascimentoDoAntepassado, nascimentoDoDescendente);
      const minimo = geracoes * MESES_IDADE_MINIMA_DE_PROGENITOR;
      const habitual = geracoes * MESES_IDADE_HABITUAL_DE_PROGENITOR;
      if (meses >= habitual) continue;

      saida.push({
        tipo: "progenitor_mais_novo",
        natureza: meses < minimo ? "impossivel" : "improvavel",
        cavalos: distintosOrdenados([descendente.id, antepassado.id]),
        cavaloId: descendente.id,
        caminho: a.caminho,
        geracoes,
        identidade,
        cavaloDoProgenitor: antepassado.id,
        dataNascimento: descendente.data_nascimento,
        dataNascimentoDoProgenitor: antepassado.data_nascimento,
        mesesEntreOsNascimentos: meses,
        mesesMinimosExigidos: minimo,
      });
    }
  }

  return saida.sort(
    (a, b) =>
      porTexto(a.cavaloId, b.cavaloId) ||
      porTexto(a.caminho, b.caminho) ||
      porTexto(a.cavaloDoProgenitor, b.cavaloDoProgenitor)
  );
}

// ─── 2. Dois filhos da mesma égua demasiado juntos ───────────────────────────

/**
 * Dois anúncios que dão a mesma mãe e cujas datas de nascimento distam menos do
 * que uma gestação.
 *
 * É o sinal mais forte que se consegue construir sem sair da base — e mesmo
 * assim é **sempre um improvável**, porque a transferência de embriões existe:
 * o livro regista a mãe genética, e uma égua doadora pode ter dois filhos
 * registados com poucos meses entre eles. Ver `biologia.ts`.
 *
 * Dois potros nascidos no mesmo dia ou em dias seguidos são gémeos e não
 * produzem achado nenhum. Só conta a posição `mae` — a mãe directa —, porque é
 * dela que o intervalo entre partos fala; uma avó materna partilhada não diz
 * nada sobre datas de parto.
 */
export function partosDemasiadoJuntos(
  cavalos: readonly CavaloParaCoerencia[],
  ascendentes: readonly AscendenteParaCoerencia[]
): AchadoPartosDemasiadoJuntos[] {
  const porId = new Map(cavalos.map((c) => [c.id, c]));
  const grupos = new Map<
    string,
    { identidade: Identidade; filhos: Map<string, { cavaloId: string; data: string; em: Date }> }
  >();

  for (const a of ascendentes) {
    if (a.caminho !== "mae") continue;
    const identidade = identidadeDe(a);
    if (!identidade) continue;
    const filho = porId.get(a.cavalo_id);
    const nascimento = data(filho?.data_nascimento ?? null);
    if (!filho?.data_nascimento || !nascimento) continue;

    const k = chaveDeGrupo(identidade);
    const grupo = grupos.get(k) ?? { identidade, filhos: new Map() };
    // O mesmo anúncio não entra duas vezes: a chave é o id do filho.
    grupo.filhos.set(filho.id, { cavaloId: filho.id, data: filho.data_nascimento, em: nascimento });
    grupos.set(k, grupo);
  }

  const saida: AchadoPartosDemasiadoJuntos[] = [];
  for (const { identidade, filhos } of grupos.values()) {
    const lista = [...filhos.values()].sort(
      (a, b) => a.em.getTime() - b.em.getTime() || porTexto(a.cavaloId, b.cavaloId)
    );
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const dias = diasEntre(lista[i].em, lista[j].em);
        if (dias <= DIAS_DE_GEMEOS) continue;
        if (dias >= DIAS_MINIMOS_ENTRE_PARTOS) continue;
        saida.push({
          tipo: "partos_demasiado_juntos",
          natureza: "improvavel",
          cavalos: distintosOrdenados([lista[i].cavaloId, lista[j].cavaloId]),
          mae: identidade,
          nascimentos: [
            { cavaloId: lista[i].cavaloId, data: lista[i].data },
            { cavaloId: lista[j].cavaloId, data: lista[j].data },
          ],
          dias,
        });
      }
    }
  }

  return saida.sort(
    (a, b) =>
      porTexto(chaveDeGrupo(a.mae), chaveDeGrupo(b.mae)) ||
      porTexto(a.nascimentos[0].cavaloId, b.nascimentos[0].cavaloId) ||
      porTexto(a.nascimentos[1].cavaloId, b.nascimentos[1].cavaloId)
  );
}

// ─── 3. Ser antepassado de si próprio ────────────────────────────────────────

/**
 * Um cavalo que consta da sua própria ascendência.
 *
 * Duas formas, e a mesma impossibilidade nas duas: o exemplar aparecer numa
 * posição da sua árvore, ou uma posição da árvore repetir-se numa posição que
 * a continua (`pai` igual a `pai.pai` — o pai é o seu próprio pai).
 *
 * `pai` igual a `mae.pai` **não** entra: são linhas diferentes, e o mesmo
 * garanhão nas duas é um garanhão que cobriu a própria filha. Estreito, e
 * possível.
 *
 * Por nome desce a improvável, e é essa a regra que impede o módulo de
 * transformar o costume de dar ao potro o nome do avô numa acusação.
 */
export function antepassadoDeSiProprio(
  cavalos: readonly CavaloParaCoerencia[],
  ascendentes: readonly AscendenteParaCoerencia[]
): AchadoAntepassadoDeSiProprio[] {
  const saida: AchadoAntepassadoDeSiProprio[] = [];

  for (const cavalo of [...cavalos].sort((a, b) => porTexto(a.id, b.id))) {
    const arvore = ascendentes.filter((a) => a.cavalo_id === cavalo.id);
    if (arvore.length === 0) continue;

    const doExemplar = new Set(identidadesDoCavalo(cavalo).map(chaveDeGrupo));
    const porIdentidade = new Map<string, { identidade: Identidade; caminhos: string[] }>();
    for (const a of arvore) {
      const identidade = identidadeDe(a);
      if (!identidade) continue;
      const k = chaveDeGrupo(identidade);
      const grupo = porIdentidade.get(k) ?? { identidade, caminhos: [] };
      grupo.caminhos.push(a.caminho);
      porIdentidade.set(k, grupo);
    }

    for (const [k, { identidade, caminhos }] of [...porIdentidade].sort(([a], [b]) =>
      porTexto(a, b)
    )) {
      const ordenados = distintosOrdenados(caminhos);
      const noExemplar = doExemplar.has(k);
      const naMesmaLinha = ordenados.some((curto) =>
        ordenados.some((longo) => eAntepassadoDe(curto, longo))
      );
      if (!noExemplar && !naMesmaLinha) continue;

      saida.push({
        tipo: "antepassado_de_si_proprio",
        natureza: abrandar("impossivel", identidade.base),
        cavalos: [cavalo.id],
        cavaloId: cavalo.id,
        identidade,
        caminhos: noExemplar ? [CAMINHO_DO_EXEMPLAR, ...ordenados] : ordenados,
      });
    }
  }

  return saida;
}

// ─── 4. A mesma identidade em posição de pai e de mãe ────────────────────────

/**
 * A mesma identidade numa posição de pai e numa de mãe.
 *
 * Não é preciso saber o sexo de ninguém: o mesmo animal teria de ser os dois.
 * Vale dentro do mesmo anúncio — quem escreveu o mesmo nome nas caixas do pai e
 * da mãe — e entre anúncios, onde o registo que aqui é do pai é ali da mãe.
 */
export function papelContraditorio(
  cavalos: readonly CavaloParaCoerencia[],
  ascendentes: readonly AscendenteParaCoerencia[]
): AchadoPapelContraditorio[] {
  const indice = indexarOcorrencias(cavalos, ascendentes);
  const saida: AchadoPapelContraditorio[] = [];

  const grupos = [...indice.entries()].sort(([a], [b]) => porTexto(a, b)).map(([, grupo]) => grupo);

  for (const { identidade, ocorrencias } of grupos) {
    const nasPosicoes = ocorrencias.filter((o) => o.papel !== null);
    const papeis = new Set(nasPosicoes.map((o) => o.papel));
    if (papeis.size < 2) continue;

    saida.push({
      tipo: "papel_contraditorio",
      natureza: abrandar("impossivel", identidade.base),
      cavalos: distintosOrdenados(nasPosicoes.map((o) => o.cavaloId)),
      identidade,
      ocorrencias: nasPosicoes,
    });
  }

  return saida;
}

// ─── 5. O sexo do antepassado contra a posição ───────────────────────────────

/**
 * Um antepassado que também está anunciado e cujo sexo não cabe na posição.
 *
 * Quem está na posição de pai é macho — e um castrado conta como macho, porque
 * gerou antes de o ser. Quem está na de mãe é fêmea. Só por registo: dizer que
 * o pai de um cavalo é uma égua por causa de um nome repetido seria o pior
 * género de falso alarme, porque soa a prova.
 */
export function sexoContraPapel(
  cavalos: readonly CavaloParaCoerencia[],
  ascendentes: readonly AscendenteParaCoerencia[]
): AchadoSexoContraPapel[] {
  const porRegisto = cavalosPorRegisto(cavalos);
  const saida: AchadoSexoContraPapel[] = [];

  for (const a of ascendentes) {
    const identidade = identidadeDe(a);
    if (!identidade || identidade.base !== "registo") continue;
    const papel = papelDoCaminho(a.caminho);
    if (!papel) continue;

    for (const anunciado of porRegisto.get(identidade.chave) ?? []) {
      if (anunciado.id === a.cavalo_id) continue;
      const sexo = anunciado.sexo;
      if (typeof sexo !== "string" || sexo.trim() === "") continue;
      if (SEXO_ADMITIDO[papel].includes(sexo)) continue;

      saida.push({
        tipo: "sexo_contra_papel",
        natureza: "impossivel",
        cavalos: distintosOrdenados([a.cavalo_id, anunciado.id]),
        cavaloId: a.cavalo_id,
        caminho: a.caminho,
        papel,
        identidade,
        cavaloDoAntepassado: anunciado.id,
        sexo,
      });
    }
  }

  return saida.sort(
    (a, b) =>
      porTexto(a.cavaloId, b.cavaloId) ||
      porTexto(a.caminho, b.caminho) ||
      porTexto(a.cavaloDoAntepassado, b.cavaloDoAntepassado)
  );
}

// ─── 6. O mesmo registo com dois nomes, e o inverso ──────────────────────────

/**
 * Nomes que continuam a ser dois depois de se deitar fora as variantes.
 *
 * «Zimbro» e «Zimbro do Vale» são o mesmo cavalo escrito com e sem a
 * coudelaria; a `chaveDeNome` tira os espaços mas não junta um ao outro, e sem
 * esta passagem cada uma dessas variações seria uma contradição. Por isso um
 * nome que **contém** outro não conta como nome novo.
 */
export function nomesRealmenteDistintos(nomes: readonly string[]): string[] {
  const ordenados = distintosOrdenados(nomes).sort((a, b) => a.length - b.length || porTexto(a, b));
  const guardados: string[] = [];
  for (const nome of ordenados) {
    if (guardados.some((g) => nome.includes(g) || g.includes(nome))) continue;
    guardados.push(nome);
  }
  return guardados.sort(porTexto);
}

/**
 * O mesmo número de registo escrito com dois nomes, e o mesmo nome com dois
 * números de registo.
 *
 * Um dos dois está errado nos dois casos, e é verificável sem sair da base. Os
 * dois ficam em **improvável**, e a razão é a mesma dos dois lados: os dois
 * lados são texto que vendedores diferentes escreveram à mão. Um número de
 * registo copiado com um algarismo trocado dá o mesmo achado que uma fraude, e
 * quem os distingue é uma pessoa com os dois anúncios abertos à frente. Fazer
 * disto um impedimento seria recusar o vendedor honesto que se enganou a
 * copiar.
 */
export function identificacoesDivergentes(
  cavalos: readonly CavaloParaCoerencia[],
  ascendentes: readonly AscendenteParaCoerencia[]
): (AchadoRegistoComDoisNomes | AchadoNomeComDoisRegistos)[] {
  const porRegisto = new Map<string, OcorrenciaDoAntepassado[]>();
  const porNome = new Map<string, OcorrenciaDoAntepassado[]>();

  const juntar = (
    mapa: Map<string, OcorrenciaDoAntepassado[]>,
    chave: string,
    o: OcorrenciaDoAntepassado
  ) => {
    const lista = mapa.get(chave);
    if (lista) lista.push(o);
    else mapa.set(chave, [o]);
  };

  const todas: OcorrenciaDoAntepassado[] = [
    ...ascendentes.map((a) => ({
      cavaloId: a.cavalo_id,
      caminho: a.caminho,
      papel: papelDoCaminho(a.caminho),
      nome: a.nome,
      registo: a.registo,
    })),
    ...cavalos.map((c) => ({
      cavaloId: c.id,
      caminho: CAMINHO_DO_EXEMPLAR,
      papel: null,
      nome: c.nome ?? c.nome_registo,
      registo: c.registro_apsl,
    })),
  ].sort((a, b) => porTexto(a.cavaloId, b.cavaloId) || porTexto(a.caminho, b.caminho));

  for (const o of todas) {
    const registo = typeof o.registo === "string" ? chaveRegistoApsl(o.registo) : "";
    const nome = typeof o.nome === "string" ? chaveDeNome(o.nome) : "";
    // Só as linhas que trazem **as duas** coisas podem denunciar uma
    // divergência entre elas. Uma linha só com nome não contradiz um registo.
    if (registo.length < 3 || nome.length < 3) continue;
    juntar(porRegisto, registo, o);
    juntar(porNome, nome, o);
  }

  const saida: (AchadoRegistoComDoisNomes | AchadoNomeComDoisRegistos)[] = [];

  for (const [registo, ocorrencias] of [...porRegisto].sort(([a], [b]) => porTexto(a, b))) {
    const nomes = nomesRealmenteDistintos(
      ocorrencias.map((o) => chaveDeNome(typeof o.nome === "string" ? o.nome : ""))
    );
    if (nomes.length < 2) continue;
    saida.push({
      tipo: "registo_com_dois_nomes",
      natureza: "improvavel",
      cavalos: distintosOrdenados(ocorrencias.map((o) => o.cavaloId)),
      registo,
      nomes,
      ocorrencias,
    });
  }

  for (const [nome, ocorrencias] of [...porNome].sort(([a], [b]) => porTexto(a, b))) {
    const registos = distintosOrdenados(
      ocorrencias.map((o) => chaveRegistoApsl(typeof o.registo === "string" ? o.registo : ""))
    );
    if (registos.length < 2) continue;
    saida.push({
      tipo: "nome_com_dois_registos",
      natureza: "improvavel",
      cavalos: distintosOrdenados(ocorrencias.map((o) => o.cavaloId)),
      nome,
      registos,
      ocorrencias,
    });
  }

  return saida;
}

// ─── Todas ───────────────────────────────────────────────────────────────────

/** Tudo o que a ascendência tem a dizer, pela ordem dos tipos. */
export function coerenciaDaAscendencia(
  cavalos: readonly CavaloParaCoerencia[],
  ascendentes: readonly AscendenteParaCoerencia[]
): Achado[] {
  const divergentes = identificacoesDivergentes(cavalos, ascendentes);
  return [
    ...antepassadoMaisNovo(cavalos, ascendentes),
    ...partosDemasiadoJuntos(cavalos, ascendentes),
    ...antepassadoDeSiProprio(cavalos, ascendentes),
    ...papelContraditorio(cavalos, ascendentes),
    ...sexoContraPapel(cavalos, ascendentes),
    ...divergentes.filter((d) => d.tipo === "registo_com_dois_nomes"),
    ...divergentes.filter((d) => d.tipo === "nome_com_dois_registos"),
  ];
}
