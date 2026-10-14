import type { LinhaFicha } from "@/lib/coudelaria-ficha";

/**
 * A ficha técnica da coudelaria, composta em HTML — a receita «previews em
 * HTML, nunca capturas de ecrã»: uma tabela verdadeira a 10–11px, que pesa
 * zero e fica nítida em qualquer ecrã.
 *
 * Leva a costura de luz do cartão assinatura, mas **não** leva o
 * `.cartao-seco__esbatido`: esse gradiente dissolve os 40% de baixo do cartão
 * no preto, e aqui o que está em baixo é o horário e as linhagens — dados que
 * alguém veio ler. O esbatido é para quando o que desaparece é adorno.
 */
export default function PainelIdentidade({
  titulo,
  etiqueta,
  linhas,
}: {
  titulo: string;
  /** Canto direito do cabeçalho: a região, ou o que identifique o painel. */
  etiqueta?: string;
  linhas: LinhaFicha[];
}) {
  if (!linhas.length) return null;

  return (
    <div className="cartao-seco bg-[var(--background-card)]">
      <span className="cartao-seco__costura" aria-hidden="true" />
      <div className="relative px-5 pt-4 pb-5">
        <div className="cabeca-ui" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
          <span className="rotulo-forte">{titulo}</span>
          {etiqueta && <span className="font-mono text-[var(--foreground-muted)]">{etiqueta}</span>}
        </div>
        <dl className="m-0">
          {linhas.map((linha) => (
            <div
              key={linha.chave}
              className="linha-ui gap-4"
              style={{ gridTemplateColumns: "minmax(0,7rem) minmax(0,1fr)" }}
            >
              <dt className="rotulo truncate">{linha.rotulo}</dt>
              <dd
                className={`m-0 min-w-0 text-xs leading-snug text-[var(--foreground)] ${
                  linha.numerico ? "font-mono tabular-nums" : ""
                }`}
              >
                {linha.valor}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
