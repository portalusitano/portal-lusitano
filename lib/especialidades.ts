/**
 * As especialidades das coudelarias, arrumadas.
 *
 * A base tem **58 valores distintos para 29 coudelarias**, e **43 deles (74%)
 * aparecem uma única vez**. Escritos como estavam, davam uma parede de
 * pastilhas que enchia um telemóvel inteiro e onde três em cada quatro
 * escolhas devolviam uma coudelaria só. Isso não é filtrar — é a lista das
 * vinte e nove escrita de lado.
 *
 * E muitos eram a mesma coisa com nomes diferentes: «Toureio» e
 * «Tauromaquia»; «Equitação de Trabalho» e «Working Equitation», que é o
 * mesmo termo em duas línguas; oito maneiras de dizer turismo; sete de dizer
 * ensino. Havia ainda quatro «Linhagem …», que não são especialidades de
 * todo — há uma coluna `linhagens` para isso.
 *
 * O que se filtra passa a ser a **actividade**: o que aquela coudelaria faz e
 * que alguém possa querer. O texto original não se perde — continua a ser
 * pesquisável e a aparecer no cartão —, só deixa de mandar no filtro.
 *
 * Quem não encaixar em nada fica de fora do filtro em vez de criar uma
 * pastilha para si próprio. É uma escolha: um filtro é uma promessa de que
 * há mais do que um do outro lado.
 */

import { lerListaDeTexto } from "@/lib/coudelaria-ficha";

export const ACTIVIDADES = [
  "criacao",
  "dressage",
  "trabalho",
  "toureio",
  "turismo",
  "ensino",
  "venda",
] as const;

export type Actividade = (typeof ACTIVIDADES)[number];

/* A tabela é escrita à mão de propósito. Uma regra automática — por prefixo,
   por palavra comum — erraria em «Cavalos Pretos» (que é criação) e em
   «Cavalos a Penso» (que é um serviço), e ninguém daria por isso. */
const MAPA: Record<string, Actividade> = {
  // ── Criação, selecção e reprodução ──
  "criação de lusitanos": "criacao",
  criação: "criacao",
  "criação de qualidade": "criacao",
  "criação e selecção psl": "criacao",
  "selecção funcional": "criacao",
  "reprodução selectiva": "criacao",
  "reprodução assistida": "criacao",
  "reprodução equina": "criacao",
  "conservação genética": "criacao",
  "cavalos pretos": "criacao",
  "cavalos jovens": "criacao",
  "luso-warmblood": "criacao",
  "cruzamentos lusitano-warmblood": "criacao",

  // ── Dressage, incluindo a alta escola ──
  dressage: "dressage",
  "dressage clássico": "dressage",
  "dressage barroco": "dressage",
  "alta escola": "dressage",
  "alta performance": "dressage",
  "cavalos de desporto": "dressage",
  "modelo e andamentos": "dressage",
  saltos: "dressage",
  atrelagem: "dressage",
  "atrelagem de competição": "dressage",

  // ── Equitação de trabalho ──
  "equitação de trabalho": "trabalho",
  "working equitation": "trabalho",
  "equitação de tradição portuguesa": "trabalho",
  "equitação tradicional": "trabalho",

  // ── Toureio ──
  toureio: "toureio",
  tauromaquia: "toureio",

  // ── Turismo, estadias e visitas ──
  "turismo equestre": "turismo",
  "turismo rural": "turismo",
  "turismo cultural": "turismo",
  "férias equestres": "turismo",
  "férias a cavalo": "turismo",
  "passeios a cavalo": "turismo",
  "trail riding": "turismo",
  "experiências únicas": "turismo",
  enoturismo: "turismo",
  vinicultura: "turismo",
  "eventos corporativos": "turismo",

  // ── Ensino e treino ──
  ensino: "ensino",
  formação: "ensino",
  "escola de equitação": "ensino",
  "aulas de equitação": "ensino",
  treino: "ensino",
  estágios: "ensino",
  desbaste: "ensino",
  "coaching com cavalos": "ensino",
  "cavalos a penso": "ensino",

  // ── Venda e exportação ──
  exportação: "venda",
  "venda de cavalos": "venda",
};

/* Sete dos cinquenta e oito ficam de fora, e cada um por sua razão:
 *
 *   «Linhagem Andrade», «Linhagem Veiga», «Linhagem Veiga e Andrade» e
 *   «Linhagem Xaquiro» não são especialidades — são linhagens, e há uma
 *   coluna `linhagens` que já as guarda e já as mostra no cartão.
 *
 *   «Produção de Feno» e «Responsabilidade Ambiental» não são coisas que
 *   alguém procure numa coudelaria de Lusitanos.
 *
 *   «Lazer» aparece em três, e é o único que hesitei em deixar de fora. Nos
 *   dados, quem o usa é criador — «Cavalos Pretos, Dressage, Toureio, Lazer,
 *   Exportação» — o que sugere «cavalos de lazer», isto é, um tipo de cavalo
 *   produzido, e não uma actividade que se ofereça a quem visita. Como não
 *   consigo distingui-lo com segurança, fica fora: um filtro que mente sobre
 *   o que devolve é pior do que um filtro a menos. Se o dado vier a ser
 *   clarificado, entra numa linha.
 */

/** Normaliza para a chave da tabela: sem maiúsculas, sem espaço a mais. */
function chave(bruto: string): string {
  return bruto.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * A que actividades pertence uma coudelaria, sem repetições.
 * O que não encaixar é simplesmente ignorado.
 */
export function actividadesDe(especialidades: unknown): Actividade[] {
  /* `lerListaDeTexto` e não um `for` directo, e a razão é boa: a coluna é
     `jsonb` e há colunas nesta base que guardam uma **string** com JSON lá
     dentro em vez de um array — foi assim que a `cavalos_destaque` matou uma
     construção em produção.

     Aqui o sintoma seria pior porque é calado: um `for…of` sobre uma string
     percorre-a carácter a carácter, nenhum carácter bate certo na tabela, e
     a função devolve lista vazia. A coudelaria desaparecia de todos os
     filtros de actividade sem erro nenhum, sem aviso, e sem ninguém dar por
     isso. Um defeito que não faz barulho é o pior tipo. */
  const lista = lerListaDeTexto(especialidades);
  const vistas = new Set<Actividade>();
  for (const e of lista) {
    const a = MAPA[chave(e)];
    if (a) vistas.add(a);
  }
  // Devolve na ordem canónica, para a lista não dançar entre cartões.
  return ACTIVIDADES.filter((a) => vistas.has(a));
}

/** Uma coudelaria pertence a esta actividade? */
export function temActividade(especialidades: unknown, actividade: string): boolean {
  if (!actividade) return true;
  return actividadesDe(especialidades).includes(actividade as Actividade);
}

/** Quantas coudelarias há em cada actividade, pela ordem canónica, sem as vazias. */
export function contarActividades(
  coudelarias: readonly { especialidades?: unknown }[]
): { valor: Actividade; n: number }[] {
  const conta = new Map<Actividade, number>();
  for (const c of coudelarias) {
    for (const a of actividadesDe(c.especialidades)) {
      conta.set(a, (conta.get(a) ?? 0) + 1);
    }
  }
  return ACTIVIDADES.filter((a) => (conta.get(a) ?? 0) > 0).map((a) => ({
    valor: a,
    n: conta.get(a)!,
  }));
}
