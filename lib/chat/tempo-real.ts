/**
 * A ligação que faz o chat parecer um chat.
 *
 * ── A decisão, com os números que a sustentam ───────────────────────────────
 *
 * Havia duas hipóteses: sondar o servidor de tempos a tempos, ou receber a
 * mensagem quando ela é escrita (Postgres changes na `marketplace_mensagens`).
 *
 * **Latência.** Numa sondagem de período `T`, quem escreve chega num instante
 * uniforme dentro do intervalo, logo a espera mediana é `T/2` e a pior é `T`.
 * Com o `T = 60s` que aqui estava, a mediana era **trinta segundos** — e é
 * exactamente essa a queixa do dono do produto, dita de outra maneira: «só
 * aparece se a outra pessoa recarregar». Para uma mediana de dois segundos
 * seria preciso `T = 4s`.
 *
 * **E `T = 4s` não cabe.** O `middleware.ts` deixa passar 60 pedidos por
 * minuto por IP em tudo o que seja `/api/*` (Upstash, janela deslizante). Uma
 * sondagem de 4 segundos são 15 pedidos por minuto **por separador aberto**, só
 * para o distintivo. Dois separadores e o fio aberto passam de metade do
 * orçamento; uma casa com duas pessoas atrás do mesmo IP fica a 429 a navegar
 * no site. A sondagem rápida não é cara em servidor — é cara no orçamento que
 * já está escrito noutro ficheiro.
 *
 * **Custo em repouso.** Uma página aberta e parada: com sondagem, um pedido
 * HTTP por período, para sempre, com os cabeçalhos e o cookie de sessão a
 * cada um. Com esta ligação, um WebSocket e uma pulsação — e nem isso quando o
 * separador está escondido, porque aí desliga-se. O `CLAUDE.md` é explícito
 * quanto a trabalho contínuo em repouso, e é essa regra que manda aqui.
 *
 * **Quem decide quem recebe o quê é a RLS.** O Realtime avalia a política de
 * SELECT de cada subscritor contra cada linha antes de lha entregar. O filtro
 * por `destinatario_id` é economia — evita que o servidor avalie a política de
 * toda a gente ligada contra todas as mensagens do site —, **não** é a
 * segurança: subscrever com o filtro de outra pessoa devolve zero linhas, e
 * isso está provado contra um PostgreSQL local em
 * `__tests__/lib/chat-rls.sql.test.ts`.
 *
 * ── E porque é que a sondagem não desapareceu de todo ───────────────────────
 *
 * Um WebSocket não chega a toda a gente: há redes de empresa e intermediários
 * que o cortam. Sem rede de recurso, quem estiver nessas redes fica com um
 * chat que **nunca** se actualiza e sem nada no ecrã a dizê-lo — que é pior do
 * que a espera de um minuto que havia antes. A sondagem fica, mas só entra
 * quando a subscrição falha, e com recuo (5s, 15s, 30s, 60s, e daí para a
 * frente de minuto a minuto), e também ela pára com o separador escondido.
 *
 * ── O que este módulo **não** faz ───────────────────────────────────────────
 *
 * Não fala com o DOM, não importa React e não sabe o que é o Supabase: recebe
 * as três coisas de fora (o cliente, o relógio, a fonte de visibilidade). É o
 * que permite que os números acima sejam verificados por um teste em vez de
 * serem uma afirmação.
 */

/** O mínimo do cliente Realtime de que isto precisa. */
export interface CanalTempoReal {
  on(
    tipo: "postgres_changes",
    filtro: { event: string; schema: string; table: string; filter?: string },
    aoMudar: (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void
  ): CanalTempoReal;
  subscribe(aoMudarEstado?: (estado: string, erro?: unknown) => void): CanalTempoReal;
}

export interface ClienteTempoReal {
  channel(nome: string): CanalTempoReal;
  removeChannel(canal: CanalTempoReal): void;
}

/**
 * O recuo da sondagem de recurso, em milissegundos.
 *
 * Cinco segundos à primeira falha porque uma falha isolada costuma ser um
 * túnel a fechar-se e volta logo; um minuto no fim porque a partir daí a rede
 * é o que é e insistir de cinco em cinco segundos gasta bateria sem comprar
 * nada. O último valor repete-se para sempre.
 */
export const RECUO_MS = [5_000, 15_000, 30_000, 60_000] as const;

export function recuoNaTentativa(tentativa: number): number {
  const i = Math.min(Math.max(tentativa, 0), RECUO_MS.length - 1);
  return RECUO_MS[i];
}

export interface MensagemChegada {
  id: string;
  conversaId: string;
  remetenteId: string;
  createdAt: string;
}

export interface OpcoesLigacao {
  utilizadorId: string;
  /** Só se chama quando é preciso — uma página que nunca fica visível não abre socket. */
  cliente: () => Promise<ClienteTempoReal | null>;
  /** Uma mensagem nova para este utilizador. */
  aoChegar: (mensagem: MensagemChegada) => void;
  /** Uma mensagem **minha** mudou de estado (entregue ou lida). */
  aoMudarEstado?: (mensagem: { id: string; conversaId: string }) => void;
  /** Hora de voltar a perguntar ao servidor: à ligação, ao regressar, e na sondagem de recurso. */
  aoReconciliar: () => void;
  /** Diz se a página está visível. Injectada para os testes não precisarem de um browser. */
  estaVisivel: () => boolean;
  /** Regista o ouvinte de visibilidade e devolve como o largar. */
  ouvirVisibilidade: (aoMudar: () => void) => () => void;
  agendar?: (fn: () => void, ms: number) => number;
  cancelar?: (id: number) => void;
}

export interface Ligacao {
  parar: () => void;
  /** Só para os testes e para depurar: em que estado é que isto está. */
  estado: () => "parada" | "escondida" | "a-ligar" | "ligada" | "a-sondar";
}

const TABELA = "marketplace_mensagens";

export function ligarAoChat(opcoes: OpcoesLigacao): Ligacao {
  const agendar = opcoes.agendar ?? ((fn, ms) => setTimeout(fn, ms) as unknown as number);
  const cancelar = opcoes.cancelar ?? ((id) => clearTimeout(id));

  let parada = false;
  let estado: "parada" | "escondida" | "a-ligar" | "ligada" | "a-sondar" = "parada";
  let cliente: ClienteTempoReal | null = null;
  let canal: CanalTempoReal | null = null;
  let temporizador: number | null = null;
  /** Quantas voltas já deu a rede de recurso. Zero enquanto o socket estiver de pé. */
  let tentativas = 0;

  function limparTemporizador() {
    if (temporizador !== null) {
      cancelar(temporizador);
      temporizador = null;
    }
  }

  function largarCanal() {
    if (canal && cliente) {
      cliente.removeChannel(canal);
    }
    canal = null;
  }

  /**
   * A rede de recurso. Nunca corre com o separador escondido: uma página que
   * ninguém está a ver não precisa de saber de nada.
   *
   * Cada volta faz **duas** coisas — pergunta ao servidor, e volta a tentar
   * abrir o socket. A segunda é o que impede isto de ficar a sondar para
   * sempre por causa de um túnel que fechou durante dez segundos; assim que a
   * subscrição pega, o `SUBSCRIBED` apaga o temporizador e põe a conta a zero.
   */
  function passoDeRecurso() {
    if (parada || !opcoes.estaVisivel()) return;
    estado = "a-sondar";
    opcoes.aoReconciliar();
    limparTemporizador();

    const espera = recuoNaTentativa(tentativas);
    tentativas += 1;

    temporizador = agendar(() => {
      temporizador = null;
      if (!canal) void abrir();
      passoDeRecurso();
    }, espera);
  }

  async function abrir() {
    if (parada || canal) return;
    estado = "a-ligar";

    const c = await opcoes.cliente();
    /* Entre o pedido do cliente e a resposta, a página pode ter-se escondido ou
       o componente pode ter saído. Sem esta verificação ficava um socket aberto
       por um ecrã que já não existe. */
    if (parada || !opcoes.estaVisivel()) return;
    if (!c) {
      passoDeRecurso();
      return;
    }

    cliente = c;
    const novo = c.channel(`chat:${opcoes.utilizadorId}`);

    novo
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: TABELA,
          // O que me é dirigido, e mais nada. A RLS é que decide; isto só evita
          // que o servidor tenha de a avaliar contra o site inteiro.
          filter: `destinatario_id=eq.${opcoes.utilizadorId}`,
        },
        (payload) => {
          const linha = payload.new;
          if (!linha || typeof linha.id !== "string") return;
          opcoes.aoChegar({
            id: linha.id,
            conversaId: String(linha.conversa_id ?? ""),
            remetenteId: String(linha.remetente_id ?? ""),
            createdAt: String(linha.created_at ?? ""),
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: TABELA,
          // As **minhas** mensagens a mudarem de estado. É o que responde à
          // pergunta de quem escreveu — «chegou? já leu?» — sem uma sondagem
          // própria só para isso.
          filter: `remetente_id=eq.${opcoes.utilizadorId}`,
        },
        (payload) => {
          const linha = payload.new;
          if (!linha || typeof linha.id !== "string") return;
          opcoes.aoMudarEstado?.({ id: linha.id, conversaId: String(linha.conversa_id ?? "") });
        }
      )
      .subscribe((estadoDoCanal) => {
        if (parada) return;

        if (estadoDoCanal === "SUBSCRIBED") {
          estado = "ligada";
          tentativas = 0;
          limparTemporizador();
          /* A primeira coisa que se faz depois de ligar é perguntar. Entre o
             último pedido e a subscrição ficar de pé há uma janela, e uma
             mensagem que caia lá dentro não gera evento nenhum para nós. */
          opcoes.aoReconciliar();
          return;
        }

        if (
          estadoDoCanal === "CHANNEL_ERROR" ||
          estadoDoCanal === "TIMED_OUT" ||
          estadoDoCanal === "CLOSED"
        ) {
          largarCanal();
          if (parada || !opcoes.estaVisivel()) return;
          passoDeRecurso();
        }
      });

    canal = novo;
  }

  function aoMudarVisibilidade() {
    if (parada) return;

    if (!opcoes.estaVisivel()) {
      /* Escondido: larga-se tudo. Não é uma optimização de bateria, é a regra
         da casa — nada trabalha em repouso. */
      estado = "escondida";
      limparTemporizador();
      largarCanal();
      return;
    }

    /* De volta. Reconcilia-se **antes** de a subscrição estar de pé, porque o
       que se perdeu enquanto esteve escondido não vem por evento nenhum. */
    tentativas = 0;
    opcoes.aoReconciliar();
    void abrir();
  }

  const largarVisibilidade = opcoes.ouvirVisibilidade(aoMudarVisibilidade);

  if (opcoes.estaVisivel()) {
    void abrir();
  } else {
    estado = "escondida";
  }

  return {
    parar() {
      parada = true;
      estado = "parada";
      limparTemporizador();
      largarCanal();
      largarVisibilidade();
    },
    estado: () => estado,
  };
}
