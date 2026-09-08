/**
 * O que a pesquisa do directório varre, e o que um cartão diz que é o sítio.
 *
 * Vive aqui e não em `lib/directorio-filtros` de propósito: o que este módulo
 * decide é **o que se lê no cartão e o que a caixa de texto encontra**, que é
 * assunto desta página. O `lib/` continua a mandar no que é estado de URL,
 * facetas e ordenação — este só lhe acrescenta o texto e a morada.
 *
 * As duas correcções que o justificam foram medidas sobre as vinte e nove
 * coudelarias verdadeiras, e estão escritas ao lado de cada função.
 */

import { aplicarFiltros, contem, normalizar } from "@/lib/directorio-filtros";
import type { CoudelariaListavel, FiltrosDirectorio } from "@/lib/directorio-filtros";
import { lerListaDeTexto } from "@/lib/coudelaria-ficha";
import { actividadesDe, type Actividade } from "@/lib/especialidades";

/** O que uma coudelaria tem de morada e de prosa, para a pesquisa. */
export interface Pesquisavel extends CoudelariaListavel {
  descricao?: string | null;
}

/**
 * As palavras que a **própria página escreve** em cada pastilha de
 * actividade, nas três línguas.
 *
 * **Escrever numa caixa de procura o que está escrito na pastilha ao lado
 * dela dava zero.** Medido sobre as vinte e nove, com os sete rótulos nas três
 * línguas — vinte e uma pastilhas ao todo: **treze devolviam zero
 * resultados** e dezassete devolviam um número diferente do que a pastilha
 * promete. Em inglês falhavam **seis das sete** («Working equitation» dá 8 na
 * pastilha e dava 0 escrita à mão) e em espanhol outras seis; a única que
 * escapava era «Dressage», e só porque se escreve igual em português.
 *
 * A causa: a pastilha filtra pela **actividade** — a taxonomia de
 * `lib/especialidades`, que junta «Toureio» com «Tauromaquia» e «Equitação de
 * Trabalho» com «Working Equitation» — e a procura varria só o **texto em
 * bruto** da base, que está todo em português e nunca diz «working
 * equitation». As duas metades da mesma página conheciam vocabulários
 * diferentes.
 *
 * É a mesma falha que este ficheiro já descreve para «coudelaria alentejo»:
 * **zero resultados com a resposta na base**, que é a pior coisa que uma
 * caixa de procura pode fazer, porque não há nada no ecrã a que culpar. Só
 * que aqui a palavra que não encontrava nada estava impressa a doze
 * centímetros de distância, na pastilha.
 *
 * Entram as três línguas e não só a que está escolhida, de propósito: o site
 * tem um selector de língua ao cimo e quem chega de fora escreve na sua —
 * um comprador espanhol a ver a página em português escreve «doma clásica».
 * Custa sete cadeias curtas.
 *
 * **Estão escritas à mão e não importadas do `locales/`**, e a razão é
 * medida: os três dicionários somam 366 KiB e este módulo é carregado pelo
 * componente de cliente do directório — importá-los para ir buscar catorze
 * palavras punha o dicionário inteiro no pacote da página. Quem impede a
 * deriva é um teste, que compara cada uma destas cadeias com a chave
 * `activity_*` dos três ficheiros.
 */
export const PALAVRAS_DA_ACTIVIDADE: Record<Actividade, string> = {
  criacao: "Criação Breeding Cría",
  dressage: "Dressage Doma clásica",
  trabalho: "Equitação de trabalho Working equitation Equitación de trabajo",
  toureio: "Toureio Mounted bullfighting Rejoneo",
  turismo: "Turismo Tourism",
  ensino: "Ensino e treino Teaching and training Enseñanza y doma",
  venda: "Venda e exportação Sales and export Venta y exportación",
};

/**
 * O texto por onde a pesquisa varre uma coudelaria.
 *
 * **A `descricao` entra, e o que ela compra hoje é zero — fica escrito assim
 * de propósito.** A primeira versão deste comentário afirmava que as colunas
 * `especialidades`, `linhagens` e `ano_fundacao` estavam vazias nas vinte e
 * nove e que a descrição era o único sítio onde vivia a linhagem e a
 * actividade. **Era falso**, e a causa é uma lição de método: o banco de
 * ensaio desta sessão servia um recorte pobre da tabela — doze colunas em vez
 * de vinte e oito —, e mediu-se contra ele em vez de contra os dados
 * verdadeiros. Nas vinte e nove a sério, `especialidades` e `linhagens` estão
 * preenchidas **29 em 29** e o `ano_fundacao` em 21.
 *
 * Medido outra vez, agora sobre os dados verdadeiros e com as funções destas
 * linhas, em dezasseis procuras: «turismo» dá 11 antes e 11 depois, «Veiga»
 * 24 e 24, «dressage» 21 e 21. A descrição não acrescenta um único resultado,
 * porque as palavras que alguém procura já estão nas colunas próprias.
 *
 * Fica na mesma, e a razão não é a que estava aqui escrita: é uma rede para a
 * linha a que faltem as colunas — uma coudelaria acabada de registar, com a
 * descrição escrita e as listas por preencher. Custa um `join` sobre um campo
 * que já estava carregado. O que **não** se pode fazer é continuar a chamar-lhe
 * a correcção que mais resultados devolve, porque não é: quem devolve
 * resultados é a regra dos termos, aqui em baixo.
 */
function textoPesquisavel(c: Pesquisavel): string {
  return [
    c.nome,
    c.localizacao,
    c.regiao,
    c.descricao,
    ...lerListaDeTexto(c.especialidades),
    ...lerListaDeTexto(c.linhagens),
    // O que a pastilha desta coudelaria diz, nas três línguas.
    ...actividadesDe(c.especialidades).map((a) => PALAVRAS_DA_ACTIVIDADE[a]),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * O que se escreveu, partido em termos.
 *
 * Espaços a mais, à frente e atrás, não são termos.
 */
export function termosDe(procura: string): string[] {
  return procura.split(/\s+/).filter(Boolean);
}

/**
 * Todos os termos têm de aparecer — **cada um onde quiser**.
 *
 * A versão anterior colava os campos com um espaço e procurava a frase
 * inteira como um pedaço contíguo desse colar. Isso faz com que duas palavras
 * que estejam em campos diferentes nunca se encontrem: medido sobre as vinte
 * e nove, «coudelaria alentejo» dava 0 (e há treze no Alentejo com
 * «Coudelaria» no nome) e «alentejo dressage» dava 0 (e há uma). Quem procura
 * escreve duas palavras precisamente quando quer estreitar por dois eixos ao
 * mesmo tempo, e era aí que a caixa deixava de responder.
 *
 * Cada termo continua a ser procurado por **contenção** e não por palavra
 * inteira: é o que faz «veig» achar Veiga, e essa parte já estava certa.
 *
 * Medido sobre os dados verdadeiros, dezasseis procuras: **duas devolvem
 * mais, nenhuma devolve menos, zero resultados perdidos** — e as duas são
 * exactamente o caso de dois eixos, «coudelaria alentejo» (0 → 13) e
 * «alentejo dressage» (6 → 10). Duas em dezasseis parece pouco até se ver
 * qual é o antes: **zero resultados com a resposta na base**, que é a pior
 * falha que uma caixa de procura pode ter, porque não há nada no ecrã a que
 * culpar.
 */
export function corresponde(c: Pesquisavel, procura: string): boolean {
  const termos = termosDe(procura);
  if (termos.length === 0) return true;
  const texto = normalizar(textoPesquisavel(c));
  return termos.every((termo) => texto.includes(normalizar(termo)));
}

/**
 * Região **e** actividade **e** texto, que é a mesma acumulação de sempre.
 *
 * A região e a actividade continuam a ser decididas pelo `lib/`, que é quem
 * conhece a taxonomia; só o texto é que passa a ser decidido aqui. Passa-se
 * `search: ""` ao `aplicarFiltros` para ele não voltar a fazer a procura
 * antiga por cima desta — duas pesquisas na mesma lista dariam a mais
 * estreita das duas, que é a que se está a corrigir.
 */
export function estreitar<T extends Pesquisavel>(coudelarias: T[], f: FiltrosDirectorio): T[] {
  const porFaceta = aplicarFiltros(coudelarias, { ...f, search: "" });
  return f.search ? porFaceta.filter((c) => corresponde(c, f.search)) : porFaceta;
}

/** Um código postal português, com ou sem os três algarismos do fim. */
const CODIGO_POSTAL = /^\d{4}(-\d{3})?\s*/;

/**
 * A terra de uma morada — o que se escreve no cartão.
 *
 * **A linha do sítio era a morada inteira com a região colada ao fim, cortada
 * a uma linha.** Como a região vem em último lugar, era sempre ela a primeira
 * a desaparecer: medido nas vinte e nove, **9 de 24 cartões em computador e
 * 18 de 24 em telemóvel** ficavam sem região à vista — e a região é ao mesmo
 * tempo o eixo por que se filtra e a única coisa que deixa comparar dois
 * cartões de relance.
 *
 * Nas moradas compridas perdia-se também a terra, que é pior: o cartão da
 * Coudelaria Luís Folgado mostrava «Monte Mayor, EN 114 Km…» — sobrava o
 * número da estrada e Montemor-o-Novo não aparecia; o da Henrique Abecasis
 * mostrava «Quinta do Pilar, PT 366, 2050-041…» e Aveiras de Baixo ficava de
 * fora. O que sobrevivia ao corte era o que menos identifica o sítio.
 *
 * A regra é a da morada portuguesa: **a terra é o último componente**, sem o
 * código postal à frente. Verificada uma a uma sobre as vinte e nove — dá a
 * terra certa nas 29, das que são só «Alter do Chão» às que são
 * «Monte de Vila Formosa, Chança, 7440-201 Alter do Chão».
 *
 * Sobe-se pelos componentes de trás para a frente porque um deles pode ser só
 * um código postal: descartado esse, o que identifica está no anterior. E se
 * nada sobrar devolve-se a morada como veio — um cartão sem sítio é pior do
 * que um cartão com a morada comprida.
 *
 * O resto da morada não se perde: fica na ficha, que é onde se vai quando já
 * se escolheu e é preciso lá chegar.
 */
export function terraDe(localizacao: string | null | undefined): string {
  const bruto = (localizacao ?? "").trim();
  if (!bruto) return "";

  const partes = bruto.split(",");
  for (let i = partes.length - 1; i >= 0; i--) {
    const parte = partes[i].trim().replace(CODIGO_POSTAL, "").trim();
    // Um componente que não tem letras nenhumas não é uma terra: é um número
    // de porta, um quilómetro de estrada ou o resto de um código postal.
    if (parte && /\p{L}/u.test(parte)) return parte;
  }
  return bruto;
}

/* ── O que o cartão escreve como especialidade, e o que escreve como linhagem ─
 *
 * **A coluna `especialidades` tem lá dentro linhagens**, e o cartão escrevia-as
 * como se fossem actividades. Medido nas vinte e nove: **quatro** trazem uma
 * entrada «Linhagem …» — «Linhagem Andrade», «Linhagem Veiga», «Linhagem
 * Veiga e Andrade», «Linhagem Xaquiro».
 *
 * Isto não é uma opinião de arrumação: o `lib/especialidades` já escreveu que
 * estas quatro «não são especialidades — são linhagens, e há uma coluna
 * `linhagens` que já as guarda e já as mostra no cartão», e por isso deixou-as
 * de fora da taxonomia. Só que o cartão continuava a escrevê-las na linha das
 * especialidades, e o resultado via-se no ecrã: o cartão da Herdade do Azinhal
 * dizia «Linhagem Andrade, Equitação de Trabalho, Toureio, Conservação…» e,
 * duas linhas abaixo, «LINHAGENS · Andrade». **O mesmo dado escrito duas vezes
 * no mesmo cartão**, e a primeira das duas a gastar o lugar de uma
 * especialidade que ficou cortada pelas reticências.
 *
 * O que se faz não é apagar: é **mudar de sítio**. Três das quatro repetem uma
 * linhagem que a coluna própria já tem e desaparecem por serem repetidas; a
 * quarta — «Linhagem Xaquiro», na Coudelaria de Santa Margarida, cujas
 * linhagens são «Veiga, Andrade» — traz um nome que **não está em mais lado
 * nenhum do cartão**, e passa a estar na linha onde se procuram linhagens.
 * Apagá-la seria perder o dado; deixá-la onde estava era escrevê-la no sítio
 * errado.
 *
 * Medido depois, nas vinte e nove: **4 → 0** entradas «Linhagem …» na linha
 * das especialidades; das quatro, **três** repetiam um nome que a coluna
 * própria já escrevia duas linhas abaixo e **nenhuma** o repete agora; e zero
 * linhagens perdidas — as doze distintas de antes continuam as doze de agora,
 * mais «Xaquiro», que passou a ser lida como o que é.
 */

/* «Linhagem X», «Linhagens X», «Linhagem de X» — o prefixo, não o nome.
   O singular acaba em **m** e o plural em **ns**: um `linhagens?` escrito de
   corrida pede «linhagen» e não casa com uma única das quatro que a base tem.
   Apanhado pelos testes antes de sair daqui. */
const PREFIXO_LINHAGEM = /^linhage(?:m|ns)\s+(?:de\s+)?/i;

/** «Veiga e Andrade» são duas, não uma. Só o «e» português, que é o que há. */
function nomesDaLinhagem(bruto: string): string[] {
  return bruto
    .split(/\s+e\s+/i)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** As especialidades que o cartão escreve: as que são mesmo especialidades. */
export function especialidadesDoCartao(especialidades: unknown): string[] {
  return lerListaDeTexto(especialidades).filter((e) => !PREFIXO_LINHAGEM.test(e.trim()));
}

/**
 * As linhagens que o cartão escreve: a coluna própria, mais as que estavam
 * arrumadas na coluna errada e que ela ainda não diz.
 */
export function linhagensDoCartao(especialidades: unknown, linhagens: unknown): string[] {
  const saida = lerListaDeTexto(linhagens);
  const vistas = new Set(saida.map(normalizar));

  for (const e of lerListaDeTexto(especialidades)) {
    const bruto = e.trim();
    if (!PREFIXO_LINHAGEM.test(bruto)) continue;
    for (const nome of nomesDaLinhagem(bruto.replace(PREFIXO_LINHAGEM, ""))) {
      const chave = normalizar(nome);
      if (!chave || vistas.has(chave)) continue;
      vistas.add(chave);
      saida.push(nome);
    }
  }
  return saida;
}

/** Se a terra e a região dizem a mesma coisa, escreve-se uma vez. */
export function terraRepeteRegiao(terra: string, regiao: string | null | undefined): boolean {
  return Boolean(terra && regiao && contem(terra, regiao) && contem(regiao, terra));
}
