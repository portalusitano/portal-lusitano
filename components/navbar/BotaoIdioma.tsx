import { memo } from "react";

const CODIGOS = ["pt", "en", "es"] as const;

/**
 * A escolha de língua, em três siglas.
 *
 * Uma só peça para a barra e para o menu de ecrã inteiro. O menu tinha antes
 * um botão de duas línguas — «Switch to English» / «Mudar para português» —
 * num site de três: em inglês oferecia português e levava a espanhol.
 *
 * O idioma activo distingue-se por ser o único aceso. O acento é do tamanho
 * de um ícone e aqui não assinala nada que o contraste não assinale melhor.
 */
export const BotaoIdioma = memo(function BotaoIdioma({
  language,
  rotulo,
  onToggle,
  className = "",
}: {
  language: string;
  rotulo: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rotulo rounded-full border border-transparent px-2.5 py-1 transition-colors hover:border-[var(--border-soft)] ${className}`}
      aria-label={rotulo}
    >
      {CODIGOS.map((codigo, i) => (
        <span key={codigo}>
          {i > 0 && (
            <span className="mx-1 opacity-25" aria-hidden="true">
              |
            </span>
          )}
          <span className={language === codigo ? "text-[var(--foreground-strong)]" : "opacity-55"}>
            {codigo.toUpperCase()}
          </span>
        </span>
      ))}
    </button>
  );
});
