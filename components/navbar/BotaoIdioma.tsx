import { memo } from "react";

const CODIGOS = ["pt", "en", "es"] as const;
type Codigo = (typeof CODIGOS)[number];

const NOME: Record<Codigo, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

/**
 * A escolha de língua, em três siglas.
 *
 * Era **um** botão que rodava pt → en → es. Mostrava as três siglas e dava uma
 * só acção: para ir de português a espanhol carregava-se duas vezes, e nada no
 * ecrã dizia que era assim. Três hipóteses à vista e um comando só é uma
 * promessa que a peça não cumpre — agora cada sigla é o seu próprio botão e
 * leva à sua língua num toque.
 *
 * **O que se move é a pastilha, não o texto.** Ela desliza para a sigla
 * escolhida com um `translateX`, que é a única propriedade que o browser anima
 * no compositor — e é o movimento que diz «foi para ali», que um simples
 * acender de cor não diz. As três casas são de largura igual (grelha de três
 * colunas), e por isso a pastilha desloca-se em múltiplos exactos de 100% sem
 * ninguém ter de medir nada no layout.
 *
 * A sigla activa é branca, e mais nada. O `CLAUDE.md` é explícito: sobre
 * preto, quem assinala uma escolha é o contraste, e o acento é do tamanho de
 * um ícone — gastá-lo aqui era gastá-lo em toda a navegação.
 */
export const BotaoIdioma = memo(function BotaoIdioma({
  language,
  rotulo,
  onEscolher,
  className = "",
}: {
  language: string;
  /** O nome do grupo, já traduzido. Vem de fora porque este ficheiro é
   *  cromado partilhado e há um teste que proíbe texto escrito à mão aqui —
   *  e com razão: um `aria-label` em português é o que um leitor de ecrã
   *  anuncia a quem está a ler o site em inglês. */
  rotulo: string;
  onEscolher: (codigo: Codigo) => void;
  className?: string;
}) {
  const activo = Math.max(0, CODIGOS.indexOf(language as Codigo));

  return (
    <div
      role="group"
      aria-label={rotulo}
      className={`idiomas ${className}`}
      style={{ "--idioma": activo } as React.CSSProperties}
    >
      {/* A pastilha vive fora dos botões e por baixo deles: assim desliza de
          um para o outro em vez de acender num e apagar no anterior. */}
      <span aria-hidden="true" className="idiomas__pastilha" />
      {CODIGOS.map((codigo) => (
        <button
          key={codigo}
          type="button"
          onClick={() => onEscolher(codigo)}
          // `aria-pressed` e não `aria-current`: são três alternativas de que
          // uma está escolhida, que é exactamente o que um grupo de botões de
          // estado descreve.
          aria-pressed={language === codigo}
          // A sigla lê-se «PT» e ninguém sabe o que é; o nome da língua está
          // aqui para quem ouve a página em vez de a ver.
          aria-label={NOME[codigo]}
          className="idiomas__opcao rotulo"
        >
          {codigo.toUpperCase()}
        </button>
      ))}
    </div>
  );
});
