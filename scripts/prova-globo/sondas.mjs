/**
 * As sondas — funções que correm **dentro da página**.
 *
 * Não podem fechar sobre nada deste ficheiro: o Playwright serializa-lhes o
 * código e o browser executa-o num mundo onde os `import` daqui não existem.
 * Por isso são todas auto-suficientes e recebem tudo por argumento.
 *
 * A sonda que carrega o resto é o **varrimento**. Os alfinetes são geometria
 * do WebGL: não há um nó no DOM em que se possa ler `getBoundingClientRect`.
 * O que há é o teste de acerto do próprio componente — o mesmo que decide se
 * o cursor vira mão e qual o nome que acende. Passeia-se um ponteiro sintético
 * por uma grelha e regista-se quem acendeu. Sai daí, de uma vez só, o mapa de
 * quem acerta onde (que é a medida da pontaria) e, por ajuste de círculo à
 * fronteira desse mapa, a posição de cada alfinete no ecrã (que é a medida da
 * aglomeração). Duas perguntas, uma leitura, e nenhuma delas calculada a
 * partir da latitude: é o que se vê que responde.
 */

/** Varre a lona com um ponteiro sintético e devolve o mapa de quem acerta onde. */
export function VARRER({ passo }) {
  const camada = document.querySelector(".globo-etiquetas");
  if (!camada) return null;
  const el = camada.parentElement;
  const r = el.getBoundingClientRect();
  const nx = Math.floor(r.width / passo) + 1;
  const ny = Math.floor(r.height / passo) + 1;
  const nos = Array.prototype.slice.call(camada.querySelectorAll(".globo-etiqueta"));
  const indice = new Map();
  for (let k = 0; k < nos.length; k++) indice.set(nos[k], k);
  const mapa = new Array(nx * ny).fill(-1);

  const mover = (x, y) =>
    el.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: "mouse",
        bubbles: false,
      })
    );

  const arranque = performance.now();
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      mover(r.left + i * passo, r.top + j * passo);
      const aceso = camada.querySelector(".globo-etiqueta[data-activo]");
      mapa[j * nx + i] = aceso ? (indice.has(aceso) ? indice.get(aceso) : -1) : -1;
    }
  }
  // Apagar o que ficou aceso: o varrimento não pode deixar o globo num estado
  // que a medida seguinte leia como se fosse o de repouso.
  mover(r.left - 500, r.top - 500);

  return {
    mapa,
    nx,
    ny,
    passo,
    ms: performance.now() - arranque,
    lona: { largura: r.width, altura: r.height },
  };
}

/** Tudo o que está escrito no globo, em coordenadas da caixa. */
export function LER_ETIQUETAS() {
  const camada = document.querySelector(".globo-etiquetas");
  if (!camada) return null;
  const el = camada.parentElement;
  const caixa = el.getBoundingClientRect();
  const lona = el.querySelector("canvas");
  const rel = (n) => {
    const r = n.getBoundingClientRect();
    return { x: r.left - caixa.left, y: r.top - caixa.top, l: r.width, a: r.height };
  };
  const cortado = (n) => !!n && n.scrollWidth > n.clientWidth + 1;

  const etiquetas = Array.prototype.map.call(camada.querySelectorAll(".globo-etiqueta"), (n, i) => {
    const cabeca = n.querySelector(".globo-etiqueta__cabeca");
    const nome = n.querySelector(".globo-etiqueta__nome");
    const local = n.querySelector(".globo-etiqueta__local");
    const conta = n.querySelector(".globo-etiqueta__conta");
    const membros = Array.prototype.map.call(
      n.querySelectorAll(".globo-etiqueta__membro"),
      (b) => b.title || b.textContent
    );
    return {
      i,
      titulo: nome ? nome.textContent : "",
      local: local ? local.textContent : "",
      completo: cabeca ? cabeca.title || cabeca.getAttribute("aria-label") || "" : "",
      grupo: n.hasAttribute("data-grupo"),
      destaque: n.hasAttribute("data-destaque"),
      membros,
      quantos: conta ? Number(conta.textContent) : 1,
      opacidade: Number(n.style.opacity || "0"),
      oculta: n.hasAttribute("data-oculta"),
      inerte: n.hasAttribute("inert"),
      curta: n.hasAttribute("data-curto"),
      aberta: n.hasAttribute("data-aberto"),
      activa: n.hasAttribute("data-activo"),
      lado: n.dataset.lado || "",
      vert: n.dataset.vert || "",
      accionavel: !!cabeca && cabeca.tagName === "BUTTON",
      caixa: rel(n),
      cabecaCaixa: cabeca ? rel(cabeca) : null,
      cortadoNome: cortado(nome),
      cortadoLocal: cortado(local),
    };
  });

  const manchas = Array.prototype.map
    .call(camada.querySelectorAll(".globo-mancha"), (n, i) => {
      const chip = n.querySelector(".globo-mancha__chip");
      return {
        i,
        quantos: Number(n.dataset.conta || "0"),
        opacidade: Number(n.style.opacity || "0"),
        oculta: n.hasAttribute("data-oculta"),
        aberta: n.hasAttribute("data-aberta"),
        titulo: (n.querySelector(".globo-mancha__titulo") || {}).textContent || "",
        membros: Array.prototype.map.call(
          n.querySelectorAll(".globo-mancha__membro"),
          (b) => b.title || b.textContent
        ),
        caixa: rel(n),
        chipCaixa: chip ? rel(chip) : null,
      };
    })
    .filter((m) => m.opacidade > 0 || m.quantos > 0);

  const comandos = Array.prototype.map.call(el.querySelectorAll(".globo-comando"), (b) => ({
    rotulo: b.getAttribute("aria-label"),
    desactivado: b.disabled,
    caixa: rel(b),
  }));

  /* Quem está fixo por cima da lona. O motor pergunta ao browser com
     `elementFromPoint`; a prova pergunta o mesmo, e assim mede o que o motor
     devia ter visto sem precisar de saber que classes é que os outros
     componentes usam. */
  const fixos = [];
  const vistos = new Set();
  const passos = 9;
  for (let k = 0; k <= passos; k++) {
    const x = caixa.left + (caixa.width * k) / passos;
    for (const y of [caixa.top + 2, caixa.bottom - 2]) {
      let n = document.elementFromPoint(Math.min(x, caixa.right - 1), y);
      while (n && n !== document.body) {
        if (getComputedStyle(n).position === "fixed") {
          // Um estorvo por elemento, e não um por sondagem: vinte sondagens
          // no mesmo painel dão vinte linhas iguais no relatório e um número
          // de nomes tapados vinte vezes maior do que a verdade.
          if (!vistos.has(n)) {
            vistos.add(n);
            const r = n.getBoundingClientRect();
            fixos.push({
              classe: (n.id ? "#" + n.id + " " : "") + String(n.className).slice(0, 70),
              caixa: { x: r.left - caixa.left, y: r.top - caixa.top, l: r.width, a: r.height },
            });
          }
          break;
        }
        n = n.parentElement;
      }
    }
  }

  return {
    caixa: { l: caixa.width, a: caixa.height },
    lona: lona ? rel(lona) : null,
    etiquetas,
    manchas,
    comandos,
    fixos,
    janela: { l: window.innerWidth, a: window.innerHeight },
    modal: !!document.querySelector('[role="dialog"][aria-modal="true"]'),
    caminho: location.pathname + location.search,
  };
}

/** Quem tem o foco, e se dá para o ver. */
export function DESCREVER_FOCO() {
  const n = document.activeElement;
  if (!n || n === document.body) return { vazio: true };
  const camada = document.querySelector(".globo-etiquetas");
  const el = camada ? camada.parentElement : null;
  const caixa = el ? el.getBoundingClientRect() : null;
  const r = n.getBoundingClientRect();
  const s = getComputedStyle(n);
  const etiqueta = n.closest ? n.closest(".globo-etiqueta") : null;
  return {
    vazio: false,
    tag: n.tagName,
    classe: String(n.className).slice(0, 120),
    rotulo: n.getAttribute("aria-label") || n.title || (n.textContent || "").trim().slice(0, 80),
    noGlobo: !!(el && el.contains(n)),
    caixa: caixa
      ? { x: r.left - caixa.left, y: r.top - caixa.top, l: r.width, a: r.height }
      : { x: r.left, y: r.top, l: r.width, a: r.height },
    dentroDaLona: caixa
      ? r.left >= caixa.left - 1 &&
        r.right <= caixa.right + 1 &&
        r.top >= caixa.top - 1 &&
        r.bottom <= caixa.bottom + 1
      : null,
    // O nome com foco só se lê se a etiqueta dele não estiver esbatida.
    opacidadeEtiqueta: etiqueta ? Number(etiqueta.style.opacity || "0") : null,
    ocultaEtiqueta: etiqueta ? etiqueta.hasAttribute("data-oculta") : null,
    /* Contorno visível: ou `outline` a sério, ou uma sombra que o substitua.
       Muitos sistemas de desenho trocam um pelo outro; contar só o `outline`
       dava um falso negativo em metade dos sítios. */
    contorno: {
      outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 ? s.outlineWidth : null,
      sombra: s.boxShadow && s.boxShadow !== "none" ? s.boxShadow.slice(0, 120) : null,
    },
  };
}

/** Estado da vista: aproximação, comandos e caminho. */
export function LER_VISTA() {
  const camada = document.querySelector(".globo-etiquetas");
  const el = camada ? camada.parentElement : null;
  return {
    comandos: el
      ? Array.prototype.map.call(el.querySelectorAll(".globo-comando"), (b) => ({
          rotulo: b.getAttribute("aria-label"),
          desactivado: b.disabled,
        }))
      : [],
    caminho: location.pathname + location.search,
    modal: !!document.querySelector('#mapa-janela-titulo, [role="dialog"][aria-modal="true"]'),
    tituloModal: (document.querySelector('[role="dialog"] h2, [role="dialog"] h3') || {})
      .textContent,
    /* Abrir uma pilha ou uma mancha não muda o endereço nem abre uma janela:
       sem estas duas, o relatório dizia «não acontece nada» a um caminho que
       acontece — e a diferença entre «não faz nada» e «faz outra coisa» é
       precisamente o que se quer medir. */
    pilhaAberta: !!document.querySelector(".globo-etiqueta[data-aberto]"),
    manchaAberta: !!document.querySelector(".globo-mancha[data-aberta]"),
  };
}
