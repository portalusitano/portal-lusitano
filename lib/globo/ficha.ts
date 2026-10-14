/**
 * O que a etiqueta do globo escreve, e o que a ficha rápida mostra.
 *
 * Regras sobre os dados, não sobre o desenho — por isso vivem aqui e não
 * dentro do `GloboTerra`, e por isso se testam sem arrastar o three.js atrás.
 * O encurtamento dos nomes continua a ser um só e a viver no
 * `lib/nomes-globo`; aqui só se decide o que fazer com o resultado dele.
 */

import { preencher } from "./frases";
import { nomeCurto, sitioCurto } from "@/lib/nomes-globo";

/**
 * A localidade por baixo do nome vale a linha que ocupa?
 *
 * Não vale quando o nome já a diz. «Coudelaria do Cartaxo» com «Cartaxo»
 * sussurrado por baixo é a mesma palavra duas vezes, em dois tamanhos: não
 * acrescenta nada a quem lê, e ocupa a segunda linha inteira — que é a linha
 * que faz a diferença entre a etiqueta caber e não caber num vale apertado.
 *
 * A comparação é feita sobre o nome **inteiro** e não sobre o encurtado: o
 * `nomeCurto` corta o «Coudelaria de» à cabeça, e é justamente aí que a
 * localidade costuma estar agarrada.
 *
 * Compara-se sem acentos, sem maiúsculas e por palavras inteiras: «Vila
 * Viçosa» dentro de «Coudelaria de Vila Viçosa» é redundante, mas «Beja»
 * dentro de «Bejarano» não é a mesma palavra e a linha fica.
 */
export function localidadeRepetida(nome: string, localizacao: string): boolean {
  const sitio = sitioCurto(localizacao);
  if (!sitio) return true;
  const limpar = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const alvo = limpar(sitio);
  if (!alvo) return true;
  const palavras = limpar(nome).split(" ");
  const procuradas = alvo.split(" ");
  for (let i = 0; i + procuradas.length <= palavras.length; i++) {
    let igual = true;
    for (let k = 0; k < procuradas.length; k++) {
      if (palavras[i + k] !== procuradas[k]) {
        igual = false;
        break;
      }
    }
    if (igual) return true;
  }
  return false;
}

/** A segunda linha da etiqueta: a localidade, ou nada quando o nome já a diz. */
export function segundaLinha(nome: string, localizacao: string): string {
  return localidadeRepetida(nome, localizacao) ? "" : sitioCurto(localizacao);
}

/**
 * Os factos que a ficha rápida escreve em linha, por ordem de peso.
 *
 * **Nada se inventa.** Uma coudelaria sem `num_cavalos` não mostra um número,
 * e não mostra «—» nem «n/d»: mostra menos um facto. Um campo vazio a dizer
 * que está vazio ocupa o mesmo espaço que um facto e não é um.
 *
 * A região vem primeiro quando a localidade já está dita no nome ou na linha
 * de cima — não se repete um sítio para encher.
 */
export function factosDaFicha(c: {
  nome: string;
  localizacao: string;
  regiao?: string;
  num_cavalos?: number | null;
}): string[] {
  const factos: string[] = [];
  if (typeof c.num_cavalos === "number" && Number.isFinite(c.num_cavalos) && c.num_cavalos > 0) {
    factos.push(c.num_cavalos === 1 ? "1 cavalo" : `${c.num_cavalos} cavalos`);
  }
  const sitio = sitioCurto(c.localizacao);
  const regiao = (c.regiao ?? "").trim();
  /* A localidade só entra se a linha de cima não a levou; a região só entra
     se não for a mesma palavra que a localidade — «Alentejo · Alentejo» é
     ruído com ar de dado. */
  if (sitio && localidadeRepetida(c.nome, c.localizacao)) factos.push(sitio);
  if (regiao && regiao.toLowerCase() !== sitio.toLowerCase()) factos.push(regiao);
  return factos;
}

/**
 * A descrição, cortada onde uma frase acaba.
 *
 * Cortar a meio de uma palavra e pôr reticências dá a ler meia ideia e
 * anuncia que há mais — mas o «mais» está noutra página. Corta-se no fim da
 * última frase que couber; se nem a primeira couber, aí sim corta-se na
 * palavra, que é o mal menor.
 */
export function resumoDaFicha(descricao: string | null | undefined, tecto = 180): string {
  const texto = (descricao ?? "").replace(/\s+/g, " ").trim();
  if (!texto) return "";
  if (texto.length <= tecto) return texto;

  const corte = texto.slice(0, tecto + 1);
  const fim = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf("! "), corte.lastIndexOf("? "));
  if (fim > tecto * 0.4) return corte.slice(0, fim + 1).trim();

  const espaco = corte.lastIndexOf(" ");
  return `${corte.slice(0, espaco > 0 ? espaco : tecto).trim()}…`;
}

/**
 * O que um ponto que junta várias coudelarias escreve.
 *
 * ── Porque é que isto mudou ────────────────────────────────────────────────
 * O título era a terra e os nomes iam sussurrados por baixo, a 10px e com
 * reticências. Medido a 1400×950 com as vinte e nove verdadeiras: duas
 * etiquetas por carregamento acabavam em «…», e as duas eram destas. A linha
 * cortada era a única que trazia informação — «Vila Viçosa · Jupiter
 * Classical Dress…» — e o título por cima dela dizia «Vila Viçosa», que é ao
 * mesmo tempo a terra e o começo do primeiro nome. A mesma palavra em dois
 * tamanhos e em dois papéis diferentes, com a resposta cortada por baixo.
 *
 * A regra que o CLAUDE.md escreveu para as etiquetas de uma coudelaria vale
 * aqui pela mesma razão, palavra por palavra: «o que distingue duas
 * coudelarias da mesma vila é o nome delas, e o sítio já está dito pelo ponto
 * onde a etiqueta assenta».
 *
 * ── A regra ────────────────────────────────────────────────────────────────
 * **Duas**: uma por linha, as duas com o peso de um nome. Duas linhas contam-
 * -se de relance, e por isso o algarismo ao lado do título — que se lia
 * colado à terra, «Alter do Chão 2», como se fosse o número da porta —
 * deixa de ser preciso e sai do sistema.
 *
 * **Três ou mais**: já não cabem em linhas legíveis, e aí a conta é a
 * resposta honesta. O título passa a ser a conta e a terra desce para a
 * segunda linha, que é onde ela deixa de disputar o lugar aos nomes.
 *
 * A terra só se escreve quando é uma só, ou duas. A três já não há sítio
 * comum nenhum: dizer «Ribatejo» a um ponto que junta cinco das doze do
 * Ribatejo seria dizer uma coisa falsa em letra grande.
 */
export function linhasDoGrupo(
  membros: readonly { nome: string; localizacao: string }[],
  /**
   * «{n} coudelarias», na língua de quem está a ler.
   *
   * Entra por argumento e não sai de dentro daqui porque este módulo é puro e
   * não conhece dicionários — e porque a palavra que aqui estava escrita à mão
   * era portuguesa **também em inglês e em espanhol**. Medido nas três rotas:
   * num `/en/mapa` com a pílula já traduzida, quinze das vinte e nove
   * coudelarias só eram anunciadas por «coudelarias» a quem usa leitor de
   * ecrã. Quem tem o dicionário é o componente; a regra é deste ficheiro.
   */
  moldeDaConta: string
): {
  nomes: string[];
  conta: string;
  sitio: string;
} {
  const terras = [...new Set(membros.map((m) => sitioCurto(m.localizacao)).filter(Boolean))];
  const sitio = terras.length === 1 ? terras[0] : terras.length === 2 ? terras.join(" · ") : "";
  if (membros.length === 2) {
    /* A mesma regra da `segundaLinha`, aplicada ao par: se um dos dois nomes
       já diz a terra, a terra não volta a escrever-se por baixo. «Vila Viçosa
       / Jupiter Classical Dressage» com «Vila Viçosa» sussurrado em baixo é a
       mesma palavra em dois tamanhos — e quem lê o par já sabe onde está. */
    const dita = membros.some((m) => localidadeRepetida(m.nome, m.localizacao));
    return {
      nomes: membros.map((m) => nomeCurto(m.nome)),
      conta: "",
      sitio: dita ? "" : sitio,
    };
  }
  return { nomes: [], conta: preencher(moldeDaConta, { n: membros.length }), sitio };
}

/** O nome que a etiqueta escreve. Um só sítio, para não haver dois. */
export { nomeCurto, sitioCurto };
