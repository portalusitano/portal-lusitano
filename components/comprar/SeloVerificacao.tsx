import type { SeloPublico } from "@/lib/documentos/selo-publico";

/**
 * O que a verificação de documentos diz ao comprador.
 *
 * ── Porque é branco e não dourado ──────────────────────────────────────────
 * O CLAUDE.md é explícito: estado é branco, o dourado é para o que é raro. Um
 * anúncio verificado não é um anúncio em destaque — é um anúncio cujo dado foi
 * confrontado. Usa o `.selo-forte`, que é o mesmo distintivo que a grelha usa,
 * e não se inventa aqui uma classe nova.
 *
 * ── Porque cada selo traz uma linha por baixo ──────────────────────────────
 * «Verificado» sozinho não é informação: é uma palavra que qualquer sítio
 * escreve sobre qualquer coisa. O que dá valor ao selo é dizer **quem** viu
 * **o quê** — e é essa frase que o comprador pode usar para pedir contas se o
 * cavalo não corresponder. Sem ela, o selo é decoração com ar de garantia.
 *
 * ── E porque não há selo de «não verificado» ───────────────────────────────
 * A ausência não se anuncia. A maior parte dos anúncios não tem documentação
 * enviada, e carimbar-lhes uma advertência transformaria o que é o estado
 * normal do site numa acusação. O `lib/documentos/selo-publico` explica a
 * mesma decisão do lado dos dados: um `false` não distingue «não enviou» de
 * «enviou e foi recusado», e essa indistinção é a funcionalidade.
 */
export default function SeloVerificacao({ selo }: { selo: SeloPublico }) {
  const linhas: { etiqueta: string; explicacao: string }[] = [];

  if (selo.documentacaoVerificada) {
    linhas.push({
      etiqueta: "Documentação verificada",
      explicacao:
        "O livro azul deste cavalo foi enviado ao portal e conferido por uma pessoa da nossa equipa.",
    });
  }
  if (selo.registoConfirmadoNoStudBook) {
    linhas.push({
      etiqueta: "Registo confirmado",
      explicacao:
        "O número de registo consta do Livro Genealógico do Cavalo Puro-Sangue Lusitano (APSL).",
    });
  }

  if (!linhas.length) return null;

  return (
    <section aria-labelledby="verificacao-heading" className="cartao p-5">
      <h2 id="verificacao-heading" className="rotulo mb-3">
        O que confirmámos
      </h2>
      <ul className="grid gap-3">
        {linhas.map((l) => (
          <li key={l.etiqueta}>
            <span className="selo selo-forte">{l.etiqueta}</span>
            <p className="meta mt-1.5">{l.explicacao}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
