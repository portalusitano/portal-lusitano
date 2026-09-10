/**
 * Um número que assenta, algarismo a algarismo.
 *
 * Cada casa é uma fita com os dez algarismos empilhados, e o que se anima é a
 * posição da fita. Três razões para ser assim, e não um contador em
 * JavaScript a escrever texto a cada quadro:
 *
 *  1. **É uma transformação, logo corre no compositor.** Um contador em JS
 *     escreve no DOM sessenta vezes por segundo e cada escrita obriga a
 *     refazer o layout do bloco. Aqui não há um único quadro de trabalho na
 *     linha principal — o browser interpola o `translateY` sozinho.
 *  2. **Sem JavaScript lê-se na mesma.** A fita fica na posição final por
 *     omissão; só a classe `.js`, posta antes da primeira pintura, é que a
 *     manda começar em cima. Se o script falhar, aparece o número, não zeros.
 *  3. **Não é um ciclo.** Corre uma vez, quando o bloco entra no ecrã, e
 *     pára. O gatilho é o `.dentro` que o `ObservadorRevelar` põe no
 *     `[data-revelar]` acima — o mesmo idioma que os painéis escritos já
 *     usam, em vez de um segundo observador só para isto.
 *
 * Um ano não é uma quantidade, mas aqui não precisa de tratamento à parte:
 * todas as casas partem do zero e cada uma percorre a distância que lhe
 * compete, portanto 29 lê-se como uma contagem e 1648 lê-se como um ano a
 * fixar-se. É um mecanismo só, e por isso os três cartões da fila leem-se
 * como a mesma ideia.
 */

const ALGARISMOS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function NumeroQueAssenta({
  valor,
  className,
}: {
  /** O número, já escrito. Só os algarismos rolam; o resto passa como está. */
  valor: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {/* A fita tem dez algarismos por casa e um leitor de ecrã leria os dez.
          Quem se anuncia é o número inteiro, uma vez. */}
      <span className="sr-only">{valor}</span>
      <span aria-hidden="true" className="numero-assenta">
        {[...valor].map((caractere, indice) => {
          const algarismo = ALGARISMOS.indexOf(caractere);
          if (algarismo < 0) return <span key={indice}>{caractere}</span>;
          return (
            <span
              key={indice}
              className="numero-assenta__casa"
              style={
                {
                  "--algarismo": algarismo,
                  // As casas partem da esquerda, com o intervalo de uma
                  // grelha. Sem isto os quatro algarismos de um ano assentam
                  // todos no mesmo instante e lê-se como um corte, não como
                  // um mecanismo a parar.
                  "--ordem": indice,
                } as React.CSSProperties
              }
            >
              <span className="numero-assenta__fita">
                {ALGARISMOS.map((a) => (
                  <span key={a} className="numero-assenta__algarismo">
                    {a}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
