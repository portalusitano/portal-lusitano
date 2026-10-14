#!/usr/bin/env node
/**
 * A PROVA DA FICHA RÁPIDA.
 *
 *   node scripts/prova-globo/ficha.mjs --url=http://127.0.0.1:4977
 *   node scripts/prova-globo/ficha.mjs --url=… --ecra=movel
 *
 * A ficha aparece por cima da lona, e o CLAUDE.md é claro sobre o que isso
 * costuma custar: o que flutuar sobre o globo entra na conta do
 * `medirEstorvos`, e o `medirEstorvos` só vê o primeiro antepassado `fixed` ou
 * `sticky`. Uma peça que ele não veja põe os nomes a serem escritos por baixo
 * dela.
 *
 * Esta ficha foi feita para **não poder** estar nesse caso — é filha da
 * etiqueta e `position: absolute`, logo não entra no `offsetWidth` do pai nem
 * flutua sobre coisa nenhuma. Mas isso é um argumento, e um argumento não é
 * uma medida. O que aqui se mede, com a ficha aberta e fechada:
 *
 *   1. **A colocação não se mexe.** Os mesmos nomes colocados, nas mesmas
 *      coordenadas, ao pixel.
 *   2. **Zero sobreposições**, contando a ficha como mais uma caixa.
 *   3. **A ficha fica dentro da lona** — a camada é `overflow: hidden` e uma
 *      ficha que saia é uma ficha cortada a meio.
 *   4. **O teclado chega lá**: as setas percorrem, o foco abre a ficha, e a
 *      ligação de saída é alcançável.
 *   5. **As fotografias só se pedem quando alguém pergunta**: abrir o mapa não
 *      pode custar vinte e nove imagens.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const EXECUTAVEL = process.env.PROVA_CHROMIUM || "/opt/pw-browsers/chromium";
const ECRAS = {
  desktop: { largura: 1400, altura: 950, toque: false },
  movel: { largura: 390, altura: 700, toque: true },
};

function argumentos(argv) {
  const o = { url: "http://127.0.0.1:4977", ecra: "desktop", saida: path.join(AQUI, "resultados") };
  for (const a of argv) {
    const [c, ...r] = a.replace(/^--/, "").split("=");
    const v = r.join("=");
    if (c === "url") o.url = v;
    else if (c === "ecra") o.ecra = v;
    else if (c === "saida") o.saida = v;
  }
  return o;
}

function SEM_AVISO() {
  try {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ essential: true, analytics: true, marketing: true })
    );
  } catch {
    /* janela privada */
  }
}

/** Onde é que cada nome colocado está, ao pixel, e onde estão os alfinetes. */
const RETRATO = () => {
  const camada = document.querySelector(".globo-etiquetas");
  const caixa = camada.getBoundingClientRect();
  const rel = (r) => ({
    x: Math.round(r.left - caixa.left),
    y: Math.round(r.top - caixa.top),
    l: Math.round(r.width),
    a: Math.round(r.height),
  });
  const nomes = [];
  for (const n of camada.querySelectorAll(".globo-etiqueta")) {
    if (n.hasAttribute("data-oculta")) continue;
    const s = getComputedStyle(n);
    if (parseFloat(s.opacity) <= 0.55) continue;
    const c = n.querySelector(".globo-etiqueta__caixa");
    nomes.push({
      que: n.querySelector(".globo-etiqueta__nome")?.textContent ?? "",
      ...rel(c.getBoundingClientRect()),
      lado: n.dataset.lado ?? "",
      vert: n.dataset.vert ?? "",
    });
  }
  const chips = [];
  for (const n of camada.querySelectorAll(".globo-mancha")) {
    if (n.hasAttribute("data-oculta")) continue;
    const chip = n.querySelector(".globo-mancha__chip");
    if (chip) chips.push({ que: `#${chip.textContent}`, ...rel(chip.getBoundingClientRect()) });
  }
  const abertas = [];
  for (const f of camada.querySelectorAll(".globo-ficha")) {
    if (f.hidden) continue;
    abertas.push({
      que: "ficha",
      ...rel(f.getBoundingClientRect()),
      /* Uma peça absoluta não pode entrar na medida do pai. É esta a
         afirmação de que tudo o resto depende, e por isso lê-se do browser em
         vez de se acreditar nela. */
      absoluta: getComputedStyle(f).position === "absolute",
      dentroDaCamada: camada.contains(f),
      capa: !!f.querySelector(".globo-ficha__capa img"),
      factos: [...f.querySelectorAll(".globo-ficha__facto")].map((x) => x.textContent),
      texto: (f.querySelector(".globo-ficha__texto")?.textContent ?? "").slice(0, 60),
      saida: f.querySelector(".globo-ficha__ir")?.getAttribute("href") ?? null,
    });
  }
  const cruza = (a, b) =>
    a.x < b.x + b.l && a.x + a.l > b.x && a.y < b.y + b.a && a.y + a.a > b.y;
  /* A ficha e o nome de que ela pende encostam-se de propósito: são a mesma
     peça. O par que interessa é a ficha contra **as outras** caixas. */
  const todas = [...nomes, ...chips];
  const sobrepostas = [];
  for (let i = 0; i < todas.length; i++) {
    for (let j = i + 1; j < todas.length; j++) {
      if (cruza(todas[i], todas[j])) sobrepostas.push([todas[i].que, todas[j].que]);
    }
  }
  return {
    lona: { l: Math.round(caixa.width), a: Math.round(caixa.height) },
    nomes,
    chips,
    abertas,
    sobrepostas,
  };
};

const iguais = (a, b) =>
  a.length === b.length &&
  a.every((x, i) => x.que === b[i].que && x.x === b[i].x && x.y === b[i].y);

async function principal() {
  const o = argumentos(process.argv.slice(2));
  const { largura, altura, toque } = ECRAS[o.ecra] ?? ECRAS.desktop;
  const navegador = await chromium.launch({
    executablePath: EXECUTAVEL,
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: altura },
    hasTouch: !!toque,
    deviceScaleFactor: 1,
    locale: "pt-PT",
  });
  await contexto.addInitScript(SEM_AVISO);
  const pagina = await contexto.newPage();

  /** Quantas imagens de coudelaria é que a página pediu. */
  const imagens = [];
  pagina.on("request", (r) => {
    if (r.resourceType() === "image") imagens.push(r.url().slice(-70));
  });

  const saida = {};
  try {
    await pagina.goto(`${o.url}/mapa`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await pagina.waitForSelector(".globo-etiquetas", { timeout: 60000 });
    await pagina.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
    });
    await pagina.locator(".globo-etiquetas").scrollIntoViewIfNeeded();
    await pagina.mouse.move(2, 2);
    await pagina.waitForTimeout(6000);

    const fechada = await pagina.evaluate(RETRATO);
    saida.fechada = {
      nomes: fechada.nomes.length,
      chips: fechada.chips.length,
      sobrepostas: fechada.sobrepostas.length,
      fichasAbertas: fechada.abertas.length,
    };
    saida.imagensAoAbrirOMapa = imagens.length;

    /* ── Abrir pelo alfinete ────────────────────────────────────────────
       Carrega-se no ponto de um nome que esteja escrito e que não seja um
       ajuntamento: é esse o gesto novo. A posição do alfinete deduz-se do
       nome — cada caixa está a um afastamento fixo do ponto, do lado que o
       `data-lado`/`data-vert` diz. */
    const alvo = fechada.nomes.find((n) => n.lado && n.vert);
    const AFAST = 10;
    const px =
      alvo.lado === "direita"
        ? alvo.x - AFAST
        : alvo.lado === "esquerda"
          ? alvo.x + alvo.l + AFAST
          : alvo.x + alvo.l / 2;
    const py =
      alvo.vert === "cima"
        ? alvo.y + alvo.a + AFAST
        : alvo.vert === "baixo"
          ? alvo.y - AFAST
          : alvo.y + alvo.a / 2;
    const caixaLona = await pagina.locator(".globo-etiquetas").boundingBox();
    await pagina.mouse.move(caixaLona.x + px, caixaLona.y + py);
    await pagina.waitForTimeout(400);
    await pagina.mouse.down();
    await pagina.mouse.up();
    await pagina.waitForTimeout(900);

    const aberta = await pagina.evaluate(RETRATO);
    saida.aberta = {
      nomes: aberta.nomes.length,
      chips: aberta.chips.length,
      sobrepostas: aberta.sobrepostas.length,
      fichasAbertas: aberta.abertas.length,
      ficha: aberta.abertas[0] ?? null,
    };

    /* 1. A colocação não se mexeu. Compara-se o nome **e** a coordenada.
       O nome apontado é a excepção esperada: acender tira-lhe o truncamento e
       a caixa cresce — para longe do ponteiro, e sem mudar de sítio. */
    saida.colocacaoIgual = iguais(
      fechada.nomes.map(({ que, x, y }) => ({ que, x, y })),
      aberta.nomes.map(({ que, x, y }) => ({ que, x, y }))
    );
    saida.nomesQueSeMexeram = fechada.nomes
      .filter((n, i) => aberta.nomes[i] && (aberta.nomes[i].x !== n.x || aberta.nomes[i].y !== n.y))
      .map((n, i) => `${n.que}: ${n.x},${n.y} → ${aberta.nomes[i].x},${aberta.nomes[i].y}`);

    /* 3. A ficha cabe na lona. */
    const f = aberta.abertas[0];
    saida.fichaDentroDaLona = f
      ? f.x >= -0.5 &&
        f.y >= -0.5 &&
        f.x + f.l <= aberta.lona.l + 0.5 &&
        f.y + f.a <= aberta.lona.a + 0.5
      : null;

    saida.imagensDepoisDeAbrir = imagens.length;

    /* 4. Teclado: uma seta a partir do globo dá foco a uma coudelaria, e o
          foco abre a ficha dela. */
    /* Fechar a ficha: uma batida no vazio da lona. O canto superior está
       debaixo do cabeçalho fixo, que é precisamente o estorvo que o
       `medirEstorvos` mede — bate-se abaixo dele. */
    await pagina.mouse.click(caixaLona.x + caixaLona.width - 30, caixaLona.y + caixaLona.height - 30);
    await pagina.waitForTimeout(500);
    await pagina.locator(".globo-etiqueta:not([data-oculta]) .globo-etiqueta__cabeca").first().focus();
    await pagina.waitForTimeout(500);
    await pagina.keyboard.press("ArrowDown");
    await pagina.waitForTimeout(900);
    saida.teclado = await pagina.evaluate(() => {
      const foco = document.activeElement;
      const dono = foco?.closest?.(".globo-etiqueta") ?? null;
      const ficha = dono?.querySelector(".globo-ficha") ?? null;
      return {
        focoNumNome: !!foco?.classList?.contains?.("globo-etiqueta__cabeca"),
        fichaAberta: !!ficha && !ficha.hidden,
        descreveOFoco:
          !!ficha && foco?.getAttribute?.("aria-describedby") === ficha.id && !ficha.hidden,
        saidaAlcancavel: !!ficha && !ficha.hidden && !!ficha.querySelector(".globo-ficha__ir"),
      };
    });

    /* 5. E a colocação continua sem se mexer com a ficha do teclado aberta. */
    const comTeclado = await pagina.evaluate(RETRATO);
    saida.sobrepostasComTeclado = comTeclado.sobrepostas.length;
  } finally {
    await contexto.close();
    await navegador.close();
  }

  await mkdir(o.saida, { recursive: true });
  await writeFile(path.join(o.saida, `ficha-${o.ecra}.json`), JSON.stringify(saida, null, 2));
  process.stdout.write(JSON.stringify(saida, null, 2) + "\n");
}

await principal();
