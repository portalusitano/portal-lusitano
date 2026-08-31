"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

/**
 * Lista de selecção desenhada por nós.
 *
 * O `<select>` nativo pinta a lista aberta com o widget do sistema — barra
 * azul, tipo de letra do sistema, cantos direitos — e não há CSS que lhe
 * chegue. Num site que é todo preto com hairlines frias, essa lista é a
 * única superfície que não obedece ao desenho, e vê-se.
 *
 * Fica cá dentro um `<select>` a sério, invisível mas presente no DOM: é
 * ele que submete o formulário e é ele que faz a validação nativa do
 * `required` (por isso não leva `display:none` — o browser recusa-se a
 * ancorar a mensagem de erro a um elemento que não existe na caixa).
 *
 * A API imita a do `<select>` de propósito — `value`, `onChange` com
 * `e.target.value`, filhos `<option>` — para as chamadas existentes
 * passarem a usá-la sem se reescreverem.
 */

type Opcao = { value: string; label: string; disabled?: boolean };

type Props = {
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  children: React.ReactNode;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/** Extrai `{value,label}` dos `<option>` filhos, incluindo os que vêm de arrays. */
function lerOpcoes(filhos: React.ReactNode): Opcao[] {
  const saida: Opcao[] = [];
  const percorrer = (nos: React.ReactNode) => {
    for (const no of Array.isArray(nos) ? nos : [nos]) {
      if (no === null || no === undefined || typeof no === "boolean") continue;
      if (Array.isArray(no)) {
        percorrer(no);
        continue;
      }
      if (typeof no !== "object" || !("props" in no)) continue;
      const elemento = no as React.ReactElement<{
        value?: string | number;
        children?: React.ReactNode;
        disabled?: boolean;
        label?: string;
      }>;
      if (elemento.type === "optgroup") {
        percorrer(elemento.props.children);
        continue;
      }
      if (elemento.type !== "option") continue;
      const texto = textoDe(elemento.props.children);
      saida.push({
        value: String(elemento.props.value ?? texto),
        label: texto,
        disabled: elemento.props.disabled,
      });
    }
  };
  percorrer(filhos);
  return saida;
}

function textoDe(no: React.ReactNode): string {
  if (no === null || no === undefined || typeof no === "boolean") return "";
  if (typeof no === "string" || typeof no === "number") return String(no);
  if (Array.isArray(no)) return no.map(textoDe).join("");
  if (typeof no === "object" && "props" in no) {
    return textoDe((no as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

export default function Seleccao({
  value,
  onChange,
  children,
  className = "campo",
  id,
  name,
  required,
  disabled,
  ...aria
}: Props) {
  const opcoes = useMemo(() => lerOpcoes(children), [children]);
  const idLista = useId();
  const nativo = useRef<HTMLSelectElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [caixa, setCaixa] = useState<{
    top: number;
    left: number;
    width: number;
    acima: boolean;
  } | null>(null);

  // Sem `value`, a lista guarda a escolha ela própria — como o `<select>` faz.
  const [valorInterno, setValorInterno] = useState<string | null>(null);
  const controlada = value !== undefined && value !== null;
  const valor = controlada ? String(value) : (valorInterno ?? opcoes[0]?.value ?? "");
  const escolhida = opcoes.find((o) => o.value === valor);

  const aoMudar: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    if (!controlada) setValorInterno(e.target.value);
    onChange?.(e);
  };
  const rotulo = escolhida?.label ?? opcoes[0]?.label ?? "";
  // Sem valor escolhido o rótulo é uma sugestão, não um dado.
  const vazio = valor === "";

  const posicionar = useCallback(() => {
    const alvo = botao.current;
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - r.bottom;
    const altura = Math.min(288, opcoes.length * 38 + 12);
    const acima = espacoAbaixo < altura + 16 && r.top > espacoAbaixo;
    setCaixa({
      top: acima ? r.top - 6 : r.bottom + 6,
      left: r.left,
      width: r.width,
      acima,
    });
  }, [opcoes.length]);

  useLayoutEffect(() => {
    if (!aberto) return;
    posicionar();
    const aoMexer = () => posicionar();
    window.addEventListener("scroll", aoMexer, true);
    window.addEventListener("resize", aoMexer);
    return () => {
      window.removeEventListener("scroll", aoMexer, true);
      window.removeEventListener("resize", aoMexer);
    };
  }, [aberto, posicionar]);

  // Fecha ao clicar fora ou ao sair com o teclado.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (botao.current?.contains(alvo) || lista.current?.contains(alvo)) return;
      setAberto(false);
    };
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [aberto]);

  // Mantém a opção activa à vista quando se navega com as setas.
  useEffect(() => {
    if (!aberto) return;
    lista.current
      ?.querySelector<HTMLElement>(`[data-indice="${activo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [aberto, activo]);

  const abrir = () => {
    if (disabled) return;
    const i = opcoes.findIndex((o) => o.value === valor);
    setActivo(i >= 0 ? i : 0);
    setAberto(true);
  };

  /* A escolha passa pelo `<select>` escondido: pomos-lhe o valor e disparamos
     um `change` verdadeiro. Assim o handler recebe o evento que sempre recebeu,
     com `e.target` a ser um elemento a sério — nenhuma chamada existente teve
     de mudar de tipo para passar a usar esta lista. */
  const escolher = (i: number) => {
    const opcao = opcoes[i];
    if (!opcao || opcao.disabled) return;
    const alvo = nativo.current;
    if (alvo && alvo.value !== opcao.value) {
      alvo.value = opcao.value;
      alvo.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setAberto(false);
    botao.current?.focus();
  };

  const procura = useRef({ texto: "", quando: 0 });

  const aoTeclar = (e: React.KeyboardEvent) => {
    const seguinte = (passo: number) => {
      e.preventDefault();
      if (!aberto) return abrir();
      setActivo((i) => {
        let j = i;
        for (let n = 0; n < opcoes.length; n++) {
          j = (j + passo + opcoes.length) % opcoes.length;
          if (!opcoes[j].disabled) return j;
        }
        return i;
      });
    };

    switch (e.key) {
      case "ArrowDown":
        return seguinte(1);
      case "ArrowUp":
        return seguinte(-1);
      case "Home":
        e.preventDefault();
        return setActivo(0);
      case "End":
        e.preventDefault();
        return setActivo(opcoes.length - 1);
      case "Enter":
      case " ":
        e.preventDefault();
        return aberto ? escolher(activo) : abrir();
      case "Escape":
        if (aberto) {
          e.preventDefault();
          setAberto(false);
        }
        return;
      case "Tab":
        setAberto(false);
        return;
      default:
        break;
    }

    // Escrever salta para a opção que começa por aquilo — como no nativo.
    if (e.key.length !== 1) return;
    const agora = Date.now();
    const texto =
      (agora - procura.current.quando < 600 ? procura.current.texto : "") + e.key.toLowerCase();
    procura.current = { texto, quando: agora };
    const i = opcoes.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(texto));
    if (i < 0) return;
    if (aberto) setActivo(i);
    else escolher(i);
  };

  return (
    <div className="seleccao">
      <select
        ref={nativo}
        className="seleccao__nativo"
        tabIndex={-1}
        aria-hidden="true"
        id={id}
        name={name ?? id}
        required={required}
        disabled={disabled}
        value={valor}
        onChange={aoMudar}
      >
        {children}
      </select>

      <button
        ref={botao}
        type="button"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={aoTeclar}
        className={`${className} seleccao__gatilho`}
        data-aberto={aberto || undefined}
        data-vazio={vazio || undefined}
        {...aria}
      >
        <span className="seleccao__rotulo">{rotulo}</span>
        <ChevronDown className="seleccao__seta" aria-hidden="true" />
      </button>

      {aberto && caixa
        ? createPortal(
            <div
              ref={lista}
              id={idLista}
              role="listbox"
              aria-activedescendant={`${idLista}-${activo}`}
              tabIndex={-1}
              className="seleccao__lista"
              data-acima={caixa.acima || undefined}
              style={{
                top: caixa.acima ? undefined : caixa.top,
                bottom: caixa.acima ? window.innerHeight - caixa.top : undefined,
                left: caixa.left,
                width: caixa.width,
              }}
              onKeyDown={aoTeclar}
            >
              {opcoes.map((o, i) => (
                <div
                  key={`${o.value}-${i}`}
                  id={`${idLista}-${i}`}
                  data-indice={i}
                  role="option"
                  aria-selected={o.value === valor}
                  aria-disabled={o.disabled || undefined}
                  className="seleccao__opcao"
                  data-activa={i === activo || undefined}
                  data-escolhida={o.value === valor || undefined}
                  onMouseEnter={() => !o.disabled && setActivo(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(i)}
                >
                  <span className="seleccao__texto">{o.label}</span>
                  {o.value === valor ? (
                    <Check className="seleccao__visto" aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
