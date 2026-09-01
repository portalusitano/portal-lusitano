/**
 * O aparato: abrir o browser, pôr a página num estado repetível, e contar o
 * que o componente não conta por si.
 *
 * Duas decisões que valem por todo o ficheiro:
 *
 * 1. **Nada se acrescenta ao componente.** As chamadas de desenho contam-se a
 *    envolver os métodos do WebGL antes de a página correr uma linha; os
 *    quadros contam-se a envolver o `requestAnimationFrame` e a só registar
 *    os que desenharam alguma coisa. O globo não sabe que está a ser medido,
 *    e por isso a medida continua a valer depois de ele mudar.
 *
 * 2. **O repouso mede-se, não se espera às cegas.** O globo tem uma entrada de
 *    2,6s, nomes que nascem escalonados até 1,1s depois, e um remedir quando a
 *    Geist chega. Um `waitForTimeout` calibrado à mão é uma aposta. Em vez
 *    disso lê-se a assinatura do DOM das etiquetas e das manchas de 120 em
 *    120ms e espera-se que ela fique igual a si mesma — e que não haja
 *    desenhos novos — durante várias leituras seguidas.
 */

import { chromium } from "playwright";

/** O binário que este ambiente tem; o que o Playwright pede por omissão não está instalado. */
export const EXECUTAVEL = process.env.PROVA_CHROMIUM || "/opt/pw-browsers/chromium";

/** WebGL por software: os tempos absolutos não valem nada, as comparações valem. */
export const ARGUMENTOS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"];

/**
 * Os dois ecrãs.
 *
 * O telemóvel leva `toque`: sem ele o browser anuncia um ponteiro fino, e as
 * regras de `@media (pointer: coarse)` — que são as que esticam os alvos de
 * toque e mudam o tamanho das caixas dos nomes — nunca chegam a valer. Medir
 * 390px com ponteiro de rato é medir um ecrã que não existe.
 */
export const ECRAS = {
  desktop: { largura: 1400, altura: 950, toque: false },
  movel: { largura: 390, altura: 700, toque: true },
};

/** Contadores instalados antes de a página correr. */
function INSTRUMENTOS() {
  const p = {
    desenhos: 0,
    quadros: [],
    /** Quantos quadros se guardam. Uma corrida longa não pode comer memória. */
    tecto: 20000,
  };
  window.__prova = p;

  const metodos = [
    "drawArrays",
    "drawElements",
    "drawArraysInstanced",
    "drawElementsInstanced",
    "drawRangeElements",
  ];
  for (const nome of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
    const ctor = window[nome];
    if (!ctor) continue;
    for (const m of metodos) {
      const original = ctor.prototype[m];
      if (typeof original !== "function") continue;
      ctor.prototype[m] = function (...args) {
        p.desenhos++;
        return original.apply(this, args);
      };
    }
  }

  /* Um quadro só conta se desenhou. Assim o contador é do globo e não de
     qualquer outra animação da página — e «zero desenhos em repouso» passa a
     ser uma afirmação verificável em vez de uma esperança. */
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    return raf(function (t) {
      const antes = p.desenhos;
      try {
        return cb(t);
      } finally {
        if (p.desenhos > antes && p.quadros.length < p.tecto) p.quadros.push(t);
      }
    });
  };
}

/** Marca o consentimento como dado, para o aviso não nascer. */
function SEM_AVISO() {
  try {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ essential: true, analytics: true, marketing: true })
    );
  } catch {
    /* Janela privada: o aviso aparece, e a prova da janela útil mede-o. */
  }
}

export async function abrirNavegador() {
  return chromium.launch({ executablePath: EXECUTAVEL, args: ARGUMENTOS });
}

/**
 * Uma página pronta a medir.
 *
 * `cookies: "aceites"` semeia o consentimento antes do primeiro pintar, o que
 * tira o aviso do caminho e torna a corrida repetível. `"por-responder"` deixa
 * o aviso nascer — é assim que se mede se o globo escreve nomes por baixo dele.
 */
export async function abrirPagina(
  navegador,
  { url, ecra = "desktop", parado = false, cookies = "aceites" } = {}
) {
  const { largura, altura, toque } = ECRAS[ecra] ?? ECRAS.desktop;
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: altura },
    hasTouch: !!toque,
    deviceScaleFactor: 1,
    reducedMotion: parado ? "reduce" : "no-preference",
    locale: "pt-PT",
  });

  await contexto.addInitScript(INSTRUMENTOS);
  if (cookies === "aceites") await contexto.addInitScript(SEM_AVISO);

  const pagina = await contexto.newPage();
  const registo = { consola: [], pagina: [], rede: [] };
  pagina.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      registo.consola.push({ tipo: m.type(), texto: m.text().slice(0, 400) });
    }
  });
  pagina.on("pageerror", (e) => registo.pagina.push(String(e?.message ?? e).slice(0, 400)));
  pagina.on("requestfailed", (r) => {
    const erro = r.failure()?.errorText ?? "";
    // O cancelamento de um pedido ao sair da página não é uma avaria.
    if (/ERR_ABORTED/.test(erro)) return;
    registo.rede.push({ url: r.url().slice(0, 200), erro });
  });

  await pagina.goto(url, { waitUntil: "domcontentloaded" });
  return { contexto, pagina, registo, ecra, largura, altura };
}

/** A camada de nomes. O pai dela é a caixa que ouve o ponteiro. */
export const CAMADA = ".globo-etiquetas";

/** Espera que o globo exista e o traz para dentro do ecrã. */
export async function prepararGlobo(pagina) {
  await pagina.waitForSelector(CAMADA, { timeout: 40000 });
  await pagina.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
  });
  await pagina.locator(CAMADA).scrollIntoViewIfNeeded();
  // O rato fica fora do globo: um ponteiro pousado num nome acende-o, e uma
  // etiqueta acesa é colocada primeiro que as outras — o quadro medido
  // deixaria de ser o quadro que qualquer pessoa vê ao chegar.
  await pagina.mouse.move(2, 2);
}

/**
 * Estado do desenho, para o teste de repouso.
 *
 * A assinatura inclui a opacidade e os `data-` e não inclui o número de
 * quadros: o que interessa é se o **desenho parou de mudar**, e não se o
 * relógio parou de bater.
 */
function ESTADO() {
  const partes = [];
  for (const n of document.querySelectorAll(".globo-etiqueta, .globo-mancha")) {
    partes.push(
      [
        n.className,
        n.style.transform,
        n.style.opacity,
        n.dataset.lado || "",
        n.dataset.vert || "",
        n.hasAttribute("data-curto") ? "c" : "",
        n.hasAttribute("data-oculta") ? "o" : "",
        n.hasAttribute("inert") ? "i" : "",
        n.dataset.conta || "",
      ].join("|")
    );
  }
  const lona = document.querySelector(".globo-etiquetas")?.parentElement?.querySelector("canvas");
  partes.push(lona ? lona.width + "x" + lona.height : "sem-lona");
  return { assinatura: partes.join("\n"), desenhos: window.__prova ? window.__prova.desenhos : 0 };
}

/**
 * Espera o repouso: assinatura igual e sem desenhos novos durante `estaveis`
 * leituras seguidas.
 *
 * Devolve quanto tempo levou e se chegou lá — um repouso que não chegou é um
 * resultado, não um erro: significa que alguma coisa está sempre a mexer.
 */
export async function esperarRepouso(
  pagina,
  { estaveis = 5, intervalo = 120, limite = 30000, minimo = 0 } = {}
) {
  const arranque = Date.now();
  let anterior = null;
  let desenhos = -1;
  let seguidas = 0;
  for (;;) {
    const estado = await pagina.evaluate(ESTADO);
    const decorrido = Date.now() - arranque;
    const igual = estado.assinatura === anterior && estado.desenhos === desenhos;
    seguidas = igual ? seguidas + 1 : 0;
    anterior = estado.assinatura;
    desenhos = estado.desenhos;
    if (seguidas >= estaveis && decorrido >= minimo) return { repousou: true, ms: decorrido };
    if (decorrido > limite) return { repousou: false, ms: decorrido };
    await pagina.waitForTimeout(intervalo);
  }
}

/** Zera os contadores. Todas as medidas de fluidez são diferenças. */
export async function zerar(pagina) {
  await pagina.evaluate(() => {
    window.__prova.desenhos = 0;
    window.__prova.quadros = [];
  });
}

/** Lê os contadores. */
export async function contadores(pagina) {
  return pagina.evaluate(() => ({
    desenhos: window.__prova.desenhos,
    quadros: window.__prova.quadros.slice(),
  }));
}
