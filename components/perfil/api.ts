/**
 * A costura para a camada de dados do perfil.
 *
 * ── O que isto é, e porquê ────────────────────────────────────────────────
 *
 * A coluna `user_profiles.avatar_url` existe e nunca ninguém lhe escreveu. As
 * rotas que a lêem e lhe escrevem estão a ser feitas do outro lado, e este
 * ficheiro é o **único sítio** deste ramo que sabe os endereços delas. Foi
 * escrito para elas existirem: quando existirem, não há uma linha de interface
 * para mudar; enquanto não existirem, tudo o que este módulo faz é responder
 * «não há retrato», que é exactamente o que o ecrã já sabe desenhar.
 *
 * É a mesma ideia que o `fundirMensagens` é para o tempo real, e está escrita
 * pela mesma razão: **um caminho de dados, não dois**. Se amanhã o retrato
 * chegar por outro lado, chega por aqui.
 *
 * ── Porque é que uma rota que não existe não pode ser um erro no ecrã ─────
 *
 * Um `404` desta rota não é um problema de quem está a ver a página: é uma
 * metade do produto que ainda não aterrou. Escrever «não foi possível carregar
 * o seu perfil» a alguém que não pediu nada seria dar-lhe um erro que ele não
 * pode resolver. Por isso o `lerPerfil` devolve `null` em silêncio quando a
 * rota não está lá, e o ecrã desenha as iniciais — que é o que desenharia de
 * qualquer maneira a quem não tem fotografia.
 *
 * O que **não** fica em silêncio é uma gravação: quem carregou em «Guardar»
 * pediu alguma coisa e tem de saber se resultou.
 */

export interface Perfil {
  nome: string | null;
  avatarUrl: string | null;
}

export const ROTA_PERFIL = "/api/perfil";
export const ROTA_AVATAR = "/api/perfil/avatar";

/** O erro que se mostra, já com um código que o ecrã traduz. */
export class ErroDePerfil extends Error {
  constructor(
    public codigo: "rede" | "sessao" | "grande-demais" | "servidor" | "indisponivel",
    public detalhe?: string
  ) {
    super(codigo);
    this.name = "ErroDePerfil";
  }
}

function perfilDaResposta(dados: unknown): Perfil {
  const p = (dados as { perfil?: Record<string, unknown> } | null)?.perfil ?? dados;
  const o = (p ?? {}) as Record<string, unknown>;
  return {
    nome: typeof o.nome === "string" ? o.nome : null,
    avatarUrl: typeof o.avatarUrl === "string" ? o.avatarUrl : null,
  };
}

/**
 * O perfil de quem tem sessão. `null` quando não há sessão **ou** quando a
 * rota ainda não existe — os dois casos desenham o mesmo ecrã.
 */
export async function lerPerfil(sinal?: AbortSignal): Promise<Perfil | null> {
  try {
    const res = await fetch(ROTA_PERFIL, {
      signal: sinal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return perfilDaResposta(await res.json());
  } catch {
    return null;
  }
}

function erroDaResposta(res: Response): ErroDePerfil {
  if (res.status === 401 || res.status === 403) return new ErroDePerfil("sessao");
  if (res.status === 413) return new ErroDePerfil("grande-demais");
  if (res.status === 404 || res.status === 501) return new ErroDePerfil("indisponivel");
  return new ErroDePerfil("servidor", String(res.status));
}

/**
 * Gravar o retrato.
 *
 * Vai por `XMLHttpRequest` e não por `fetch` por uma razão só, e é a que o
 * pedido do dono nomeia: **o progresso da subida**. O `fetch` não o sabe dizer
 * — a resposta pode ser lida em fatias, o corpo que se envia não —, e quem
 * carrega uma fotografia de 12MP num telemóvel com rede fraca fica a olhar
 * para um botão parado durante segundos. Um `upload.onprogress` custa vinte
 * linhas e é a diferença entre «está a acontecer» e «isto bloqueou».
 */
export function gravarAvatar(
  ficheiro: Blob,
  opcoes: { aoProgredir?: (fraccao: number) => void; sinal?: AbortSignal } = {}
): Promise<Perfil> {
  return new Promise((resolver, rejeitar) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ROTA_AVATAR);
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opcoes.aoProgredir) opcoes.aoProgredir(e.loaded / e.total);
    };
    xhr.onerror = () => rejeitar(new ErroDePerfil("rede"));
    xhr.ontimeout = () => rejeitar(new ErroDePerfil("rede"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        /* Cem por cento só quando o servidor responde. A barra a chegar ao fim
           enquanto ainda se espera é a barra a mentir — e é o instante em que
           quem está à espera decide se a página bloqueou. */
        opcoes.aoProgredir?.(1);
        resolver(perfilDaResposta(xhr.response));
      } else {
        rejeitar(erroDaResposta(new Response(null, { status: xhr.status })));
      }
    };

    opcoes.sinal?.addEventListener("abort", () => xhr.abort(), { once: true });

    const corpo = new FormData();
    corpo.append("avatar", ficheiro, "avatar.webp");
    xhr.send(corpo);
  });
}

/** Apagar o retrato. Devolve o perfil como ficou. */
export async function apagarAvatar(): Promise<Perfil> {
  let res: Response;
  try {
    res = await fetch(ROTA_AVATAR, { method: "DELETE" });
  } catch {
    throw new ErroDePerfil("rede");
  }
  if (!res.ok) throw erroDaResposta(res);
  return perfilDaResposta(await res.json().catch(() => null));
}
