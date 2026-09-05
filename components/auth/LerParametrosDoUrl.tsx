"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Lê do URL o que uma página de entrada precisa, e não desenha nada.
 *
 * ## Porque é que isto é um componente à parte
 *
 * As páginas de entrada são estáticas, e o `useSearchParams` **suspende**
 * durante a pré-renderização. Quem o chamasse arrastava consigo tudo o que
 * estivesse dentro da mesma fronteira de `<Suspense>` — e as fronteiras que lá
 * estavam não tinham `fallback` nenhum.
 *
 * O resultado, medido no HTML que o servidor mandava: **`/login` e `/registar`
 * com zero `<form>` e nenhum campo**. As duas páginas de entrada do site não
 * existiam sem JavaScript, e mesmo com JavaScript havia um instante em que o
 * cartão estava vazio à espera do primeiro pedaço de código.
 *
 * Não é um pormenor de acessibilidade: é a porta do site a não abrir enquanto
 * o JavaScript não chega — numa rede fraca, num telemóvel velho, ou com um
 * pedido perdido. É precisamente quem menos pode esperar.
 *
 * Isolado aqui, quem suspende é este componente, que não desenha nada. O
 * formulário fica fora da fronteira e é escrito pelo servidor, inteiro.
 *
 * ## A validação vive na `ler`, e não aqui
 *
 * O que se tira do URL é texto que a pessoa que abriu a página escolheu. Um
 * `?returnUrl=` com um endereço de fora levava alguém para lá no instante a
 * seguir a ter entrado — o truque com que se põe uma pessoa numa página de
 * login falsa logo depois de ela ter usado a verdadeira.
 *
 * Este componente não sabe o que cada página vai fazer com cada valor, e por
 * isso não decide por ela: recebe uma função pura e devolve o que ela disser.
 * Quem sabe o que é um destino é a página, e é lá que o `destinoSeguro` entra
 * — ao lado do valor que protege, e não numa camada genérica que amanhã
 * alguém contorna com uma chave nova.
 */
export default function LerParametrosDoUrl<T>({
  ler,
  aoLer,
}: {
  /** Pura, e chamada com o que está no URL. É aqui que se valida. */
  ler: (parametros: URLSearchParams) => T;
  /** Estável, senão isto relê a cada desenho. Usar `useCallback`. */
  aoLer: (valor: T) => void;
}) {
  const parametros = useSearchParams();

  useEffect(() => {
    aoLer(ler(parametros));
  }, [parametros, ler, aoLer]);

  return null;
}
