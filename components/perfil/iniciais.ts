/**
 * As letras que ficam no lugar de uma fotografia que não existe.
 *
 * ── Porque é que isto não é um rectângulo cinzento ────────────────────────
 *
 * O `CLAUDE.md` escreve a regra para a ficha rápida do globo — «sem `foto_capa`
 * não há fotografia nem um rectângulo cinzento a fingir uma» — e a caixa de
 * entrada aplica-a à fotografia do anúncio. Medido a 390×700 e a 1400×950, nas
 * trinta conversas do banco de ensaio: **zero linhas mostravam seja o que for
 * sobre a pessoa** que escreveu, e o nome assentava em **duas abcissas
 * diferentes** — 16px nas oito linhas sem fotografia do anúncio, 72px nas
 * vinte e duas com. Uma coluna de nomes com dois começos não é uma coluna.
 *
 * Um retrato resolve as duas coisas ao mesmo tempo: diz quem é, e dá a todas
 * as linhas a mesma sangria. Mas só se **quem não tem fotografia** também
 * ganhar alguma coisa — senão trocava-se uma coluna torta por outra.
 *
 * ── O que se escreve quando não há fotografia ─────────────────────────────
 *
 * Iniciais, sobre uma superfície do sistema. **Nada de cores geradas por
 * hash**: este site tem um acento e não uma paleta, e doze discos de doze
 * cores numa coluna seriam a segunda paleta que o `CLAUDE.md` recusa.
 *
 * ── E o caso que obrigou a pensar: «Comprador interessado» ────────────────
 *
 * O `nomeOutraParte` inventa um rótulo quando a pessoa não tem nome na base —
 * «Comprador interessado» ou «Vendedor». Nas trinta conversas do banco isso
 * são **seis linhas**. As iniciais disso davam **«CI»**, que se lê como a
 * sigla de uma empresa e não como uma pessoa: duas letras maiúsculas dentro de
 * um disco são um logótipo, e afirmar «CI» sobre alguém cujo nome não se sabe
 * é escrever um dado que não existe. Pior ainda, as quatro conversas com
 * «Comprador interessado» ficariam **todas com o mesmo disco «CI»** — quatro
 * pessoas diferentes com o mesmo carimbo, que é a única coisa que um retrato
 * não pode fazer.
 *
 * Por isso: **um rótulo não é um nome, e um rótulo não dá iniciais.** Quem não
 * tem nome fica com o ícone de pessoa — que não afirma nada — e o rótulo
 * continua escrito por extenso ao lado, onde sempre esteve e onde se lê.
 *
 * Quem decide se um nome é um rótulo é o `eRotuloSemNome`, que **deriva** os
 * rótulos do próprio `nomeOutraParte` em vez de os copiar. Copiá-los seria
 * fixar em dois sítios uma frase que só tem dono num — e no dia em que a
 * camada de dados lhe mexesse, isto continuaria a comparar contra o texto
 * antigo, em silêncio, que é o modo de falhar que este ficheiro existe para
 * evitar.
 */

/**
 * Um caractere que conta como letra de inicial.
 *
 * Não é `/\w/`: «Ângela» começa por uma letra que o `\w` não conhece, e o
 * banco de ensaio tem nomes com acentos e um que começa por emoji. `\p{L}`
 * apanha as letras de qualquer alfabeto e deixa de fora pontuação, algarismos
 * e emoji — que é exactamente o que se quer saltar.
 */
const LETRA = /\p{L}/u;

/**
 * Partículas que não dão inicial.
 *
 * «João Maria de Bragança e Sousa» não é «JS» por causa do «e» final, e
 * «Herdade dos Currais» não é «HD». Um nome português tem partículas no meio, e
 * a inicial que interessa é a da primeira palavra com peso — que é como estes
 * nomes se abreviam em papel.
 */
const PARTICULAS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "del",
  "la",
  "las",
  "los",
  "y",
  "van",
  "von",
  "der",
  "di",
  "el",
  "of",
  "the",
]);

/** A primeira letra de uma palavra, em maiúscula — ou `null` se não tiver. */
function primeiraLetra(palavra: string): string | null {
  for (const c of palavra) {
    if (LETRA.test(c)) return c.toLocaleUpperCase("pt-PT");
  }
  return null;
}

/**
 * As iniciais de um nome: uma ou duas letras, ou `null` quando não há nome.
 *
 * `null` não é um erro — é a resposta honesta a «que letras é que este nome
 * dá?» quando o que se recebeu não é um nome. Quem chama desenha o ícone de
 * pessoa nesse caso.
 */
export function iniciaisDe(nome: string | null | undefined): string | null {
  if (!nome) return null;

  const palavras = nome
    .trim()
    .split(/[\s ]+/)
    .filter(Boolean);
  if (palavras.length === 0) return null;

  /* As que contam: as que têm letra e não são partículas. Se ficarem zero —
     um nome que seja só «de» ou só emoji — cai-se para as que têm letra, e
     depois para `null`. */
  const comLetra = palavras.filter((p) => LETRA.test(p));
  if (comLetra.length === 0) return null;

  const fortes = comLetra.filter((p) => !PARTICULAS.has(p.toLocaleLowerCase("pt-PT")));
  const uteis = fortes.length > 0 ? fortes : comLetra;

  const primeira = primeiraLetra(uteis[0]);
  if (!primeira) return null;
  if (uteis.length === 1) return primeira;

  /* A segunda letra é a do **último** apelido, não a da segunda palavra: é
     assim que um nome se abrevia, e é o que distingue duas pessoas com o
     mesmo primeiro nome. */
  const ultima = primeiraLetra(uteis[uteis.length - 1]);
  return ultima ? primeira + ultima : primeira;
}

/**
 * É isto um nome de pessoa, ou o rótulo que a camada de dados inventa para
 * quem não tem nome?
 *
 * Os rótulos vêm do `nomeOutraParte` e são obtidos **chamando-o** com os dois
 * nomes a nulo, que é a situação que os produz. Assim, se a camada de dados
 * mudar a frase, isto acompanha-a sem ninguém se lembrar de vir cá.
 */
export function eRotuloSemNome(
  nome: string | null | undefined,
  rotulos: ReadonlySet<string>
): boolean {
  if (!nome) return true;
  return rotulos.has(nome.trim());
}
