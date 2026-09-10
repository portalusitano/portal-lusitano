"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ligarAoChat, type ClienteTempoReal, type MensagemChegada } from "@/lib/chat/tempo-real";

/**
 * Quantas mensagens estão por ler, e quando é que isso muda.
 *
 * ── O que estava partido ────────────────────────────────────────────────────
 *
 * A contagem era sondada de sessenta em sessenta segundos, com um
 * `setInterval` sem uma única condição: corria com o separador escondido, com
 * a página fora do ecrã, e numa página parada durante uma hora eram sessenta
 * pedidos autenticados a devolver o mesmo número. E mesmo assim chegava tarde
 * — numa sondagem de período `T` a espera mediana é `T/2`, ou seja meio
 * minuto.
 *
 * Agora o servidor avisa. O porquê da escolha, com os números, está em
 * `lib/chat/tempo-real.ts`; o que fica deste lado é a política:
 *
 * - **Zero trabalho em repouso.** Sem sondagem periódica. Com o separador
 *   escondido nem o socket fica aberto.
 * - **Reconciliar em vez de confiar no evento.** O evento incrementa o
 *   distintivo na hora — é isso que o faz parecer instantâneo — e logo a
 *   seguir pergunta-se ao servidor o número verdadeiro. Um evento perdido
 *   custa um número momentaneamente errado, nunca um número errado para
 *   sempre.
 * - **Uma pergunta por rajada.** Cinco mensagens seguidas não são cinco
 *   pedidos: a reconciliação é adiada e junta-se.
 *
 * ── E porque é que a lista de mensagens também sai daqui ────────────────────
 *
 * O fio aberto precisa de saber da mesma chegada que o distintivo, e um
 * segundo socket para o mesmo utilizador seria duas ligações a receber as
 * mesmas linhas. Quem quiser ouvir subscreve com `aoChegarMensagem`, que
 * devolve como se larga.
 */

/** Espera antes de reconciliar, para juntar uma rajada num pedido só. */
const ESPERA_RECONCILIAR_MS = 300;

interface MensagensContextValue {
  /** Mensagens por ler em todas as conversas do utilizador. */
  porLer: number;
  /** Força uma nova contagem — usado depois de abrir uma conversa. */
  recarregar: () => void;
  /**
   * Avisa quando chega uma mensagem nova para este utilizador. Devolve a
   * função que larga o ouvinte.
   */
  aoChegarMensagem: (ouvinte: (mensagem: MensagemChegada) => void) => () => void;
  /**
   * Avisa quando uma mensagem **escrita por este utilizador** muda de estado —
   * é o que acende o «entregue» e o «lida» do lado de quem escreveu.
   */
  aoMudarEstado: (ouvinte: (mensagem: { id: string; conversaId: string }) => void) => () => void;
}

const MensagensContext = createContext<MensagensContextValue>({
  porLer: 0,
  recarregar: () => {},
  aoChegarMensagem: () => () => {},
  aoMudarEstado: () => () => {},
});

/* O cliente do Supabase entra por importação dinâmica, como no AuthProvider e
   pela mesma razão: quem nunca inicia sessão não paga o pacote. */
let clientePromise: Promise<ClienteTempoReal | null> | null = null;
async function clienteTempoReal(): Promise<ClienteTempoReal | null> {
  if (!clientePromise) {
    clientePromise = import("@/lib/supabase-browser")
      .then(({ createSupabaseBrowserClient }) => createSupabaseBrowserClient() as ClienteTempoReal)
      .catch(() => null);
  }
  return clientePromise;
}

export function MensagensProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [contagem, setContagem] = useState(0);

  // Derivado em vez de reposto por efeito: sem sessão não há mensagens por
  // ler, e a contagem da sessão anterior não deve sobreviver ao logout.
  const porLer = user ? contagem : 0;

  /* O `recarregar` chama a contagem através de uma referência, e **não** através
     de um estado que faça o efeito correr outra vez.
     Com um contador de estado nas dependências, cada abertura de conversa
     desfazia a ligação e voltava a montá-la: um socket deitado fora e outro
     aberto para pedir um número. */
  const contarRef = useRef<() => void>(() => {});
  const recarregar = useCallback(() => contarRef.current(), []);

  /* Os ouvintes vivem numa referência e não no estado: acrescentar um não pode
     obrigar a árvore inteira a voltar a desenhar-se. */
  const ouvintesChegada = useRef(new Set<(m: MensagemChegada) => void>());
  const ouvintesEstado = useRef(new Set<(m: { id: string; conversaId: string }) => void>());

  const aoChegarMensagem = useCallback((ouvinte: (m: MensagemChegada) => void) => {
    ouvintesChegada.current.add(ouvinte);
    return () => {
      ouvintesChegada.current.delete(ouvinte);
    };
  }, []);

  const aoMudarEstado = useCallback((ouvinte: (m: { id: string; conversaId: string }) => void) => {
    ouvintesEstado.current.add(ouvinte);
    return () => {
      ouvintesEstado.current.delete(ouvinte);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelado = false;
    let porReconciliar: ReturnType<typeof setTimeout> | null = null;

    async function contar() {
      try {
        const resposta = await fetch("/api/conversas/por-ler", { cache: "no-store" });
        if (!resposta.ok) return;
        const dados = await resposta.json();
        if (!cancelado && typeof dados?.porLer === "number") {
          setContagem(dados.porLer);
        }
      } catch {
        // Sem rede o distintivo fica como está — não vale um erro visível.
      }
    }

    /* Uma rajada de mensagens é uma pergunta, não cinco. E a pergunta também é
       o que marca as mensagens como entregues do lado do servidor, por isso
       não se pode pura e simplesmente não a fazer. */
    function reconciliar() {
      if (porReconciliar) clearTimeout(porReconciliar);
      porReconciliar = setTimeout(() => {
        porReconciliar = null;
        void contar();
      }, ESPERA_RECONCILIAR_MS);
    }

    contarRef.current = reconciliar;
    void contar();

    const ligacao = ligarAoChat({
      utilizadorId: user.id,
      cliente: clienteTempoReal,
      aoChegar: (mensagem) => {
        if (cancelado) return;
        /* Sobe já. O número certo vem a seguir, da reconciliação; o que este
           mais um compra é o distintivo a mexer-se no instante em que a
           mensagem chega, que é a diferença entre um chat e um formulário. */
        setContagem((n) => n + 1);
        for (const ouvinte of ouvintesChegada.current) ouvinte(mensagem);
        reconciliar();
      },
      aoMudarEstado: (mensagem) => {
        if (cancelado) return;
        for (const ouvinte of ouvintesEstado.current) ouvinte(mensagem);
      },
      aoReconciliar: reconciliar,
      estaVisivel: () => typeof document === "undefined" || document.visibilityState !== "hidden",
      ouvirVisibilidade: (aoMudar) => {
        if (typeof document === "undefined") return () => {};
        document.addEventListener("visibilitychange", aoMudar);
        /* O `focus` continua a valer: voltar ao separador é o momento em que
           faz mais diferença o número estar certo, e há browsers em que ele
           chega antes do `visibilitychange`. */
        window.addEventListener("focus", aoMudar);
        return () => {
          document.removeEventListener("visibilitychange", aoMudar);
          window.removeEventListener("focus", aoMudar);
        };
      },
    });

    return () => {
      cancelado = true;
      contarRef.current = () => {};
      if (porReconciliar) clearTimeout(porReconciliar);
      ligacao.parar();
    };
  }, [user]);

  const valor = useMemo(
    () => ({ porLer, recarregar, aoChegarMensagem, aoMudarEstado }),
    [porLer, recarregar, aoChegarMensagem, aoMudarEstado]
  );

  return <MensagensContext.Provider value={valor}>{children}</MensagensContext.Provider>;
}

export function useMensagensPorLer() {
  return useContext(MensagensContext);
}
