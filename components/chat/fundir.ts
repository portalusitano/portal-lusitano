import type { ChatMensagem } from "@/lib/marketplace-chat";
import { eLocal, type MensagemNoEcra } from "./tipos";

/**
 * Juntar o que o servidor diz ao que já está no ecrã.
 *
 * Esta é a costura por onde o tempo real vai entrar. Hoje há duas fontes — a
 * leitura do fio e a resposta ao envio —, e amanhã haverá uma terceira que
 * empurra mensagens sem ninguém pedir. As três dizem a mesma coisa: «estas são
 * as mensagens que existem». O ecrã tem uma que elas não têm: a que ainda está
 * a caminho.
 *
 * Sem uma regra escrita, um eco do servidor sobre a minha própria mensagem
 * optimista escreve-a duas vezes — uma com o identificador local e outra com o
 * do servidor. Por isso a fusão faz duas coisas:
 *
 * 1. **Identificadores do servidor mandam.** Uma linha que já lá esteja é
 *    substituída pela do servidor, não duplicada.
 * 2. **Uma mensagem local desaparece quando o eco dela chega.** O eco não traz
 *    o identificador local — vem com o do servidor —, por isso reconhece-se
 *    pelo que se sabe: é minha, tem o mesmo corpo, e chegou dentro da janela
 *    em que o envio esteve a caminho.
 *
 * A janela é generosa (dois minutos) porque errar para o lado de apagar a
 * cópia local é inofensivo — a do servidor fica no lugar dela —, e errar para
 * o outro lado escreve a mesma frase duas vezes no ecrã de alguém.
 */

/** Dentro desta janela, uma mensagem minha com o mesmo corpo é o mesmo recado. */
export const JANELA_ECO_MS = 120_000;

/** A ordem é a da chegada; entre iguais, a que já cá estava fica à frente. */
function porInstante(a: MensagemNoEcra, b: MensagemNoEcra): number {
  const x = new Date(a.createdAt).getTime();
  const y = new Date(b.createdAt).getTime();
  if (x !== y) return x - y;
  // Uma local empatada com uma do servidor vai para o fim: é a mais recente
  // das duas em intenção, mesmo quando os relógios dizem o mesmo.
  return Number(eLocal(a)) - Number(eLocal(b));
}

export function fundirMensagens(
  actuais: MensagemNoEcra[],
  chegadas: ChatMensagem[]
): MensagemNoEcra[] {
  if (chegadas.length === 0) return actuais;

  const porId = new Map<string, MensagemNoEcra>();
  for (const m of actuais) porId.set(m.id, m);

  for (const nova of chegadas) {
    const jaCa = porId.get(nova.id);
    // O que o ecrã sabe e o servidor não — que a mensagem está a caminho —
    // deixa de ser verdade no instante em que o servidor a confirma.
    porId.set(nova.id, { ...jaCa, ...nova, aEnviar: false, falhou: false });
  }

  // As locais que já têm eco saem. Uma que falhou fica: não há eco nenhum a
  // caminho dela, e apagá-la seria apagar o que a pessoa escreveu.
  const doServidor = [...porId.values()].filter((m) => !eLocal(m));
  const sobrevivem = [...porId.values()].filter((m) => {
    if (!eLocal(m)) return true;
    if (m.falhou) return true;
    const t = new Date(m.createdAt).getTime();
    return !doServidor.some(
      (s) =>
        s.minha &&
        s.corpo === m.corpo &&
        Math.abs(new Date(s.createdAt).getTime() - t) <= JANELA_ECO_MS
    );
  });

  return sobrevivem.sort(porInstante);
}
