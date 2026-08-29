"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

/** De quanto em quanto tempo se volta a perguntar ao servidor. */
const INTERVALO_MS = 60_000;

interface MensagensContextValue {
  /** Mensagens por ler em todas as conversas do utilizador. */
  porLer: number;
  /** Força uma nova contagem — usado depois de abrir uma conversa. */
  recarregar: () => void;
}

const MensagensContext = createContext<MensagensContextValue>({
  porLer: 0,
  recarregar: () => {},
});

/**
 * Conta as mensagens por ler para o distintivo da navegação.
 *
 * Um chat sem aviso não é um chat: quem não sabe que recebeu uma mensagem não
 * volta cá para a ler, e do outro lado fica um comprador à espera. A contagem
 * é partilhada por toda a aplicação para que a barra do topo e a de baixo não
 * façam o mesmo pedido duas vezes.
 */
export function MensagensProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [contagem, setContagem] = useState(0);
  const [tick, setTick] = useState(0);

  // Derivado em vez de reposto por efeito: sem sessão não há mensagens por
  // ler, e a contagem da sessão anterior não deve sobreviver ao logout.
  const porLer = user ? contagem : 0;

  const recarregar = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!user) return;

    let cancelado = false;

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

    contar();

    // Voltar ao separador é o momento em que faz mais diferença estar certo.
    const aoFocar = () => contar();
    window.addEventListener("focus", aoFocar);
    const temporizador = window.setInterval(contar, INTERVALO_MS);

    return () => {
      cancelado = true;
      window.removeEventListener("focus", aoFocar);
      window.clearInterval(temporizador);
    };
  }, [user, tick]);

  const valor = useMemo(() => ({ porLer, recarregar }), [porLer, recarregar]);

  return <MensagensContext.Provider value={valor}>{children}</MensagensContext.Provider>;
}

export function useMensagensPorLer() {
  return useContext(MensagensContext);
}
