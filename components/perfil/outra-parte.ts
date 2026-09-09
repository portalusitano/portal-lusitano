import { nomeOutraParte } from "@/lib/marketplace-chat";
import { eRotuloSemNome } from "./iniciais";

/**
 * O nome da outra parte, só quando é mesmo um nome.
 *
 * O `nomeOutraParte` da camada de dados nunca devolve vazio: quando a pessoa
 * não tem nome na base, inventa «Comprador interessado» ou «Vendedor». Isso é
 * a coisa certa para o **texto** — é o que se escreve na linha, e escreve-se —
 * e a coisa errada para as **iniciais**, pelas razões escritas no `iniciais.ts`.
 *
 * Os rótulos são obtidos **chamando** o `nomeOutraParte` com os dois nomes a
 * nulo, que é a situação que os produz. Copiá-los para aqui fixaria em dois
 * sítios uma frase que só tem dono num, e no dia em que a camada de dados lhe
 * mexesse isto continuaria a comparar contra o texto antigo, em silêncio.
 */
const ROTULOS: ReadonlySet<string> = new Set([
  nomeOutraParte("comprador", null, null),
  nomeOutraParte("vendedor", null, null),
]);

/** O nome para as iniciais, ou `null` quando o que há é um rótulo. */
export function nomeParaRetrato(outraParte: string | null | undefined): string | null {
  return eRotuloSemNome(outraParte, ROTULOS) ? null : (outraParte ?? null);
}

/**
 * O retrato da outra parte, quando a camada de dados o trouxer.
 *
 * A conversa ainda não traz este campo — a rota está a ser feita do outro lado
 * — e por isso lê-se com cuidado em vez de se declarar no tipo: enquanto não
 * vier, todas as conversas desenham iniciais, que é o que desenhariam de
 * qualquer maneira. No dia em que vier, não há uma linha de interface para
 * mudar.
 */
export function retratoDaOutraParte(c: { outraParteAvatar?: string | null }): string | null {
  return typeof c.outraParteAvatar === "string" && c.outraParteAvatar.length > 0
    ? c.outraParteAvatar
    : null;
}
