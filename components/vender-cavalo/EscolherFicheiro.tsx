"use client";

import { useId, useRef } from "react";
import { Upload } from "lucide-react";
import type { NivelFalta } from "@/components/vender-cavalo/campos-com-erro";

interface EscolherFicheiroProps {
  /** O que se lê no botão: o nome do ficheiro escolhido, ou o convite. */
  texto: string;
  /**
   * O estado do anexo, quando ele está a travar o passo.
   *
   * Era um `comErro` de sim ou não, e pintava de vermelho um Livro Azul que
   * ainda não tinha sido escolhido — um documento por anexar não é um
   * documento errado. Agora são os dois níveis do formulário: `por-responder`
   * acende a hairline, `erro` — o anexo que não serve, uma fotografia a mais
   * do que o plano permite — é que fica vermelho.
   */
  falta?: NivelFalta;
  /** Onde está a explicação do erro, para o leitor de ecrã. */
  descritoPor?: string;
  aceita?: string;
  multiplo?: boolean;
  aoEscolher: (ficheiros: FileList) => void;
  /** O que vai dentro do alvo, quando é mais do que uma linha (as fotografias). */
  children?: React.ReactNode;
  className?: string;
  /** Arrastar e largar, para quem tem rato. */
  aoArrastar?: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

/**
 * O alvo de um anexo.
 *
 * Existe por causa de um defeito que só se viu ao percorrer o formulário com o
 * teclado, e que a decisão de tornar tudo obrigatório transformou de incómodo
 * em bloqueio: **o Livro Azul não se conseguia anexar sem rato.**
 *
 * O padrão que cá estava era o de sempre — um `<input type="file">` escondido
 * com `className="hidden"` dentro de um `<label>`. Com rato funciona: carregar
 * na etiqueta abre o selector. Com teclado não funciona de todo, e por duas
 * razões que se somam: um `<label>` não entra na ordem de tabulação, e um
 * `display: none` tira o `<input>` dela. Não há tecla nenhuma que chegue ali.
 * Enquanto o anexo era só um dos vinte portões isso era um defeito grave; com
 * o Livro Azul obrigatório e o resumo de erros a mandar as pessoas para ele, é
 * uma linha do resumo que não leva a lado nenhum — medido, e foi assim que
 * apareceu.
 *
 * O que fica é um `<button type="button">` a sério, que é focável, que responde
 * ao Enter e ao espaço sem que ninguém escreva um `onKeyDown`, e que se anuncia
 * como botão. O `<input>` continua escondido e continua a ser ele a guardar o
 * ficheiro; quem o abre é o `click()` do botão.
 */
export default function EscolherFicheiro({
  texto,
  falta,
  descritoPor,
  aceita = ".pdf,.jpg,.jpeg,.png",
  multiplo = false,
  aoEscolher,
  children,
  className,
  aoArrastar,
}: EscolherFicheiroProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const id = useId();

  const base = className
    ? className
    : `flex items-center justify-center gap-2 px-4 py-3 border border-dashed rounded-lg transition-colors touch-manipulation w-full ${
        falta === "erro"
          ? "border-[var(--erro)]"
          : falta === "por-responder"
            ? "border-[var(--border)]"
            : "border-[var(--border-soft)] hover:border-[var(--border-hover)]"
      }`;

  return (
    <>
      <button
        type="button"
        className={base}
        aria-describedby={descritoPor}
        onClick={() => entrada.current?.click()}
        {...aoArrastar}
      >
        {children ?? (
          <>
            <Upload size={18} className="text-[var(--foreground-muted)]" aria-hidden="true" />
            <span className="text-sm text-[var(--foreground-secondary)]">{texto}</span>
          </>
        )}
      </button>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept={aceita}
        multiple={multiplo}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) aoEscolher(e.target.files);
          // Sem isto, escolher o mesmo ficheiro duas vezes seguidas não
          // dispara `change` — o valor não mudou — e quem tirou uma
          // fotografia por engano e a voltou a escolher não via nada
          // acontecer.
          e.target.value = "";
        }}
      />
    </>
  );
}
