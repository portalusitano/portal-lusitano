/**
 * As formas canónicas com que se compara o documento e o formulário.
 *
 * «MAESTOSO XV», «Maestoso  XV» e «Maestoso-XV» são o mesmo nome escrito por
 * três pessoas diferentes, e tratá-los como três nomes seria levantar três
 * contradições onde não há nenhuma. O que aqui se tira — maiúsculas, acentos,
 * espaços a mais, pontuação — não distingue cavalos.
 */

/**
 * O mesmo texto sem acentos e em maiúsculas, **com exactamente o mesmo
 * comprimento**.
 *
 * O comprimento é o ponto todo. Os rótulos procuram-se nesta versão e os
 * valores recortam-se da original, e para isso os índices das duas têm de
 * coincidir caractere a caractere — um `normalize("NFD")` no texto inteiro
 * separa cada acento num caractere à parte e desalinha tudo o que vem a
 * seguir. Onde a conversão mudaria o comprimento (o «ß» que dá «SS», um
 * emoji que se parte ao meio), fica o caractere original: perder uma
 * maiúscula custa muito menos do que perder o alinhamento.
 */
export function aplanar(texto: string): string {
  let saida = "";
  for (const caractere of texto) {
    const base = [...caractere.normalize("NFD")][0] ?? caractere;
    const maiuscula = base.toUpperCase();
    if (maiuscula.length === caractere.length) saida += maiuscula;
    else if (base.length === caractere.length) saida += base;
    else saida += caractere;
  }
  return saida;
}

/**
 * A chave por que se comparam dois nomes de cavalo.
 *
 * Fica só letras e algarismos. Os espaços saem — e saem por uma razão que não
 * é de arrumação: o texto de um PDF é reconstruído a partir de posições, e
 * onde acaba uma palavra e começa outra é sempre uma estimativa. Fazer
 * depender uma acusação de falsidade de um espaço adivinhado seria construir
 * o aviso em cima da parte mais frágil de tudo isto.
 */
export function chaveDeNome(valor: string): string {
  return aplanar(valor).replace(/[^A-Z0-9]/g, "");
}
