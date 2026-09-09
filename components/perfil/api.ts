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

/**
 * ── Uma palavra só, do lado do cano ──────────────────────────────────────
 *
 * Este ficheiro foi escrito para rotas que ainda não existiam, e escolheu
 * `avatar`; do outro lado escolheu-se `fotografia`. Nenhuma das metades estava
 * errada e nenhuma delas partiu: o `tsc` ficou verde, porque tudo isto se lê
 * com cuidado — a chave é opcional, um 404 é silêncio, e o ecrã sabe desenhar
 * a ausência. O que dava era **iniciais para sempre**, em toda a gente, sem um
 * erro em lado nenhum.
 *
 * Ganha o `fotografia`, e não por gosto: é a palavra que o
 * `lib/perfil/contrato` e o `lib/chat/vista-publica` fixaram **por teste**,
 * com a razão de segurança escrita ao lado — e uma lista de chaves que existe
 * para nenhum contacto escapar não se reescreve por conveniência de quem a
 * consome. É também a palavra da casa: `foto_capa`, `foto_principal`.
 *
 * O `Avatar` continua a chamar-se `Avatar` do lado do desenho, que é o nome
 * certo para o círculo no ecrã. O que tem de ser uma palavra só é o **cano**.
 */
export interface Perfil {
  nome: string | null;
  fotografia: string | null;
}

export const ROTA_PERFIL = "/api/perfil";
export const ROTA_FOTOGRAFIA = "/api/perfil/fotografia";

/** O erro que se mostra, já com um código que o ecrã traduz. */
export class ErroDePerfil extends Error {
  constructor(
    public codigo: "rede" | "sessao" | "recusado" | "grande-demais" | "servidor" | "indisponivel",
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
    fotografia: typeof o.fotografia === "string" ? o.fotografia : null,
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
  /**
   * ── 401 e 403 não são a mesma frase ──────────────────────────────────
   *
   * Estavam juntos, e os dois escreviam «A sessão expirou. Volte a entrar e a
   * fotografia fica à sua espera.» Para o 401 isso é verdade e é o conselho
   * certo. Para o 403 é um beco: **o 403 é a resposta a quem está autenticado
   * e mesmo assim foi recusado** — o servidor sabe quem é e diz que não. Sair
   * e voltar a entrar dá exactamente a mesma recusa, e quem seguir o conselho
   * perde a sessão que tinha e volta ao mesmo sítio.
   *
   * Apanhado a exercitar o ecrã: um `403 {"error":"Forbidden: invalid
   * origin"}` — a guarda de origem do próprio site — escreveu «a sessão
   * expirou» a alguém cuja sessão estava perfeitamente viva.
   *
   * Um conselho que não pode resolver o problema é pior do que não dar
   * conselho nenhum: gasta a única acção que a pessoa tinha.
   */
  if (res.status === 401) return new ErroDePerfil("sessao");
  if (res.status === 403) return new ErroDePerfil("recusado");
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
export function gravarFotografia(
  ficheiro: Blob,
  opcoes: { aoProgredir?: (fraccao: number) => void; sinal?: AbortSignal } = {}
): Promise<Perfil> {
  return new Promise((resolver, rejeitar) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ROTA_FOTOGRAFIA);
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
    corpo.append("fotografia", ficheiro, "fotografia.webp");
    xhr.send(corpo);
  });
}

/** Apagar o retrato. Devolve o perfil como ficou. */
export async function apagarFotografia(): Promise<Perfil> {
  let res: Response;
  try {
    res = await fetch(ROTA_FOTOGRAFIA, { method: "DELETE" });
  } catch {
    throw new ErroDePerfil("rede");
  }
  if (!res.ok) throw erroDaResposta(res);
  return perfilDaResposta(await res.json().catch(() => null));
}
