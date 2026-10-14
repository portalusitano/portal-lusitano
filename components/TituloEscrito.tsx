"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A segunda linha do título da página inicial, escrita letra a letra.
 *
 * ── Porquê, e o que custa ────────────────────────────────────────────────
 *
 * O `CLAUDE.md` conta que há **três ciclos infinitos em todo o site** e que
 * cada degrau custou uma razão escrita. Este é o quarto, e a razão é a mesma
 * que já vale para o terceiro — os painéis da página inicial: **o que se mexe
 * aqui é o conteúdo, não um adorno.** Um classificados cuja primeira frase
 * diz uma coisa só está a escolher, à cabeça, qual dos seus públicos serve; a
 * escrever por turnos, a mesma linha diz que o site tem cavalos **e**
 * coudelarias **e** poldros, sem gastar mais uma linha de página. Um adorno a
 * girar seria de recusar; isto é o inventário a apresentar-se.
 *
 * E respeita as mesmas travagens que os outros três, pelo mesmo `usePassoVivo`:
 * pára com o separador escondido, pára fora do ecrã, e **não arranca sequer**
 * com `prefers-reduced-motion` — nesse caso escreve-se a primeira frase inteira
 * e fica quieta, que é a leitura completa e não uma versão pobre.
 *
 * ── O acento vai no cursor, e é lá que ele cabe ──────────────────────────
 *
 * A referência que deu origem a isto punha a linha escrita a azul forte, que é
 * o acento da marca dela. Aqui não pode ser: a regra da casa é que o dourado é
 * **do tamanho de um ícone** e que gastá-lo numa superfície grande o deixa de
 * assinalar seja o que for. Quem dá ênfase à linha é o contraste — branco forte
 * contra o gradiente do resto do título —, e o dourado fica no **cursor**, que
 * tem dois pixéis de largura. É a mesma decisão que o ficheiro já tomou para o
 * alfinete do globo e para o sublinhado da navegação.
 *
 * ── Sem JavaScript lê-se na mesma ────────────────────────────────────────
 *
 * A primeira frase vai no HTML e o componente só a esconde e a repõe, como o
 * `<PainelEscrito>` faz. Quem não tiver JavaScript lê um título completo, e não
 * uma linha vazia com um cursor a piscar.
 */

/** Quanto tempo cada letra demora a aparecer, e quanto a frase fica de pé. */
const MS_POR_LETRA = 55;
const MS_A_APAGAR = 28;
const MS_PARADA = 1900;

export default function TituloEscrito({
  frases,
  className = "",
}: {
  /** A primeira é a que vai no HTML e a que fica com movimento reduzido. */
  frases: readonly string[];
  className?: string;
}) {
  const [texto, setTexto] = useState(frases[0]);
  const [aEscrever, setAEscrever] = useState(false);
  const alvo = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = alvo.current;
    if (!el || frases.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let relogio = 0;
    let aVista = false;
    let vivo = true;
    /* Começa-se a apagar a primeira frase, que já está escrita no HTML. */
    let indice = 0;
    let letras = frases[0].length;
    let aApagar = true;
    let aEsperar = false;

    const parar = () => {
      clearTimeout(relogio);
      relogio = 0;
    };

    const passo = () => {
      if (!vivo) return;
      const frase = frases[indice];

      if (aEsperar) {
        aEsperar = false;
        aApagar = true;
        agendar(MS_PARADA);
        return;
      }

      if (aApagar) {
        letras -= 1;
        if (letras <= 0) {
          /* Nunca se apaga até ao vazio: a linha desapareceria e o título
             saltava de altura. Fica a primeira letra da frase seguinte. */
          indice = (indice + 1) % frases.length;
          letras = 1;
          aApagar = false;
        }
      } else {
        letras += 1;
        if (letras >= frase.length) {
          letras = frase.length;
          aEsperar = true;
        }
      }

      setTexto(frases[indice].slice(0, letras));
      agendar(aEsperar ? 0 : aApagar ? MS_A_APAGAR : MS_POR_LETRA);
    };

    const agendar = (ms: number) => {
      parar();
      if (!aVista || document.hidden) return;
      relogio = window.setTimeout(passo, ms);
    };

    const arrancar = () => {
      if (relogio || !aVista || document.hidden) return;
      setAEscrever(true);
      agendar(MS_PARADA);
    };

    const observador = new IntersectionObserver(
      ([entrada]) => {
        aVista = entrada.isIntersecting;
        if (aVista) arrancar();
        else parar();
      },
      { threshold: 0 }
    );
    observador.observe(el);

    const aoMudarSeparador = () => (document.hidden ? parar() : arrancar());
    document.addEventListener("visibilitychange", aoMudarSeparador);

    return () => {
      vivo = false;
      observador.disconnect();
      document.removeEventListener("visibilitychange", aoMudarSeparador);
      parar();
    };
  }, [frases]);

  return (
    <span ref={alvo} className={className}>
      {/* A caixa reserva a largura da frase mais comprida, para o título não
          mudar de largura a cada letra e arrastar o que está por baixo. É um
          irmão invisível e não uma medida em JS: não custa uma leitura de
          layout e acerta sozinho quando a fonte carrega. */}
      <span className="titulo-escrito">
        <span aria-hidden="true" className="titulo-escrito__reserva">
          {frases.reduce((a, b) => (b.length > a.length ? b : a), "")}
        </span>
        <span className="titulo-escrito__texto" data-escrever={aEscrever ? "sim" : "nao"}>
          {texto}
        </span>
      </span>
    </span>
  );
}
