#!/usr/bin/env node
/**
 * A PROVA DA CONTAGEM — «29 de 29, zero sobreposições», N carregamentos
 * seguidos.
 *
 *   node scripts/prova-globo/conta.mjs --n=40
 *   node scripts/prova-globo/conta.mjs --n=40 --ecra=movel --nome=depois
 *
 * O `prova.mjs` mede um carregamento com profundidade. Esta mede a **mesma
 * coisa muitas vezes**, e só isso, porque o defeito que persegue não aparece
 * sempre: 2 em 27 numa construção intocada. Um defeito intermitente medido uma
 * vez não é medido — é apanhado ou não.
 *
 * Por carregamento regista:
 *   - `contadas`  — coudelarias distintas alcançáveis no ecrã (nome escrito ou
 *                   algarismo de mancha que as inclui), pelo `slug` do `href`;
 *   - `sobrepostas` — pares de caixas que se cruzam, nomes e algarismos juntos;
 *   - `sobras` e `manchasCaidas` — quantas etiquetas não arranjaram lugar e
 *                   quantos ajuntamentos de sobras não arranjaram sítio para o
 *                   algarismo. É o par que aponta a causa.
 *
 * Levanta a banca e o site por si (ver `banca.mjs`) e fecha tudo no fim.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { levantarBanca, levantarSite, PORTA_BASE, PORTA_SITE, RAIZ } from "./banca.mjs";
import { TOTAL } from "./dados-falsos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const EXECUTAVEL = process.env.PROVA_CHROMIUM || "/opt/pw-browsers/chromium";
const ECRAS = {
  desktop: { largura: 1400, altura: 950, toque: false },
  movel: { largura: 390, altura: 700, toque: true },
};

function argumentos(argv) {
  const o = {
    n: 40,
    ecra: "desktop",
    nome: "conta",
    saida: path.join(AQUI, "resultados"),
    /* Com `--url` a prova não levanta nada: mede o que já lá está. Levantar e
       deitar abaixo um servidor dentro da própria prova é uma peça a mais para
       correr mal, e quando corre mal a corrida pára sem dizer porquê. */
    url: null,
  };
  for (const a of argv) {
    const [c, ...r] = a.replace(/^--/, "").split("=");
    const v = r.join("=");
    if (c === "n") o.n = Number(v);
    else if (c === "ecra") o.ecra = v;
    else if (c === "nome") o.nome = v;
    else if (c === "saida") o.saida = v;
    else if (c === "url") o.url = v;
  }
  return o;
}

/** Marca o consentimento antes da primeira pintura: o aviso não nasce. */
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

/**
 * O que o globo deixou no DOM, lido de fora.
 *
 * A contagem é por **slug distinto** e não pela soma dos `quantos`: a mesma
 * coudelaria pode estar num nome de grupo e outra vez numa mancha, e somar
 * dava contas acima do total — um instrumento que acusa o que está certo
 * ensina a ignorá-lo.
 */
const LER = () => {
  const camada = document.querySelector(".globo-etiquetas");
  if (!camada) return null;
  const caixa = camada.getBoundingClientRect();
  const visivel = (n) => {
    const r = n.getBoundingClientRect();
    const s = getComputedStyle(n);
    return r.width > 1 && s.visibility !== "hidden" && parseFloat(s.opacity) > 0.55;
  };
  const rel = (r) => ({
    x: r.left - caixa.left,
    y: r.top - caixa.top,
    l: r.width,
    a: r.height,
  });

  const nomes = [];
  for (const n of camada.querySelectorAll(".globo-etiqueta")) {
    if (n.hasAttribute("data-oculta") || !visivel(n)) continue;
    const c = n.querySelector(".globo-etiqueta__caixa") ?? n;
    nomes.push({ que: n.querySelector(".globo-etiqueta__nome")?.textContent ?? "", ...rel(c.getBoundingClientRect()) });
  }
  const chips = [];
  for (const n of camada.querySelectorAll(".globo-mancha")) {
    if (n.hasAttribute("data-oculta") || !visivel(n)) continue;
    const chip = n.querySelector(".globo-mancha__chip");
    if (!chip) continue;
    chips.push({ que: `mancha ${chip.textContent}`, ...rel(chip.getBoundingClientRect()) });
  }

  const cruza = (a, b) =>
    a.x < b.x + b.l && a.x + a.l > b.x && a.y < b.y + b.a && a.y + a.a > b.y;
  const todas = [...nomes, ...chips];
  const sobrepostas = [];
  for (let i = 0; i < todas.length; i++) {
    for (let j = i + 1; j < todas.length; j++) {
      if (cruza(todas[i], todas[j])) sobrepostas.push([todas[i].que, todas[j].que]);
    }
  }

  const slug = (a) => {
    const h = a.getAttribute("href") || "";
    const i = h.indexOf("/directorio/");
    return i < 0 ? null : h.slice(i + 12).split(/[?#]/)[0] || null;
  };
  const todos = new Set();
  const alcancaveis = new Set();
  for (const a of document.querySelectorAll('a[href*="/directorio/"]')) {
    const s = slug(a);
    if (!s) continue;
    todos.add(s);
    const dono = a.closest(".globo-etiqueta, .globo-mancha");
    if (dono ? visivel(dono) && !dono.hasAttribute("data-oculta") : visivel(a)) alcancaveis.add(s);
  }

  const d = window.__globoDiag ?? null;
  return {
    total: todos.size,
    contadas: alcancaveis.size,
    nomes: nomes.length,
    manchas: chips.length,
    sobrepostas,
    foraDaLona: [...nomes, ...chips].filter(
      (b) => b.x < -0.5 || b.y < -0.5 || b.x + b.l > caixa.width + 0.5 || b.y + b.a > caixa.height + 0.5
    ).length,
    diag: d && { sobras: d.sobras, manchasCaidas: d.manchasCaidas, semSitio: d.semSitio, topoUtil: d.topoUtil, baseUtil: d.baseUtil },
  };
};

/** Assinatura do desenho: espera-se que fique igual a si mesma. */
const ESTADO = () => {
  const p = [];
  for (const n of document.querySelectorAll(".globo-etiqueta, .globo-mancha")) {
    p.push(
      [
        n.style.transform,
        n.style.opacity,
        n.hasAttribute("data-oculta") ? "o" : "",
        n.dataset.conta || "",
      ].join("|")
    );
  }
  return p.join("\n");
};

async function esperarRepouso(pagina, { estaveis = 5, intervalo = 120, limite = 30000 } = {}) {
  const arranque = Date.now();
  let anterior = null;
  let seguidas = 0;
  for (;;) {
    const s = await pagina.evaluate(ESTADO);
    seguidas = s === anterior ? seguidas + 1 : 0;
    anterior = s;
    if (seguidas >= estaveis) return { repousou: true, ms: Date.now() - arranque };
    if (Date.now() - arranque > limite) return { repousou: false, ms: Date.now() - arranque };
    await pagina.waitForTimeout(intervalo);
  }
}

async function principal() {
  const o = argumentos(process.argv.slice(2));
  const { largura, altura, toque } = ECRAS[o.ecra] ?? ECRAS.desktop;

  const banca = o.url ? null : await levantarBanca(PORTA_BASE);
  let site = o.url
    ? { url: o.url, processo: { kill() {} } }
    : await levantarSite({ porta: PORTA_SITE, base: PORTA_BASE });
  const navegador = await chromium.launch({
    executablePath: EXECUTAVEL,
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });

  /* O servidor do standalone morre a meio de uma corrida longa, e quando
     morre leva a corrida atrás. Uma corrida de quarenta carregamentos não
     pode ficar refém disso: levanta-se outro e conta-se o carregamento
     perdido como perdido, que é um resultado e não um erro. */
  const ressuscitar = async () => {
    if (o.url) return;
    try {
      site.processo.kill("SIGKILL");
    } catch {
      /* já estava morto */
    }
    site = await levantarSite({ porta: PORTA_SITE, base: PORTA_BASE });
  };

  const corridas = [];
  const perdidos = [];
  try {
    for (let i = 0; i < o.n; i++) {
      /* Contexto novo por carregamento, e não `reload`: o defeito é de
         arranque, e um `reload` num contexto quente arranca de um sítio que
         ninguém que chega ao site tem. */
      const contexto = await navegador.newContext({
        viewport: { width: largura, height: altura },
        hasTouch: !!toque,
        deviceScaleFactor: 1,
        locale: "pt-PT",
      });
      await contexto.addInitScript(SEM_AVISO);
      const pagina = await contexto.newPage();
      const erros = [];
      pagina.on("pageerror", (e) => erros.push(String(e?.message ?? e).slice(0, 200)));
      try {
        await pagina.goto(`${site.url}/mapa`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await pagina.waitForSelector(".globo-etiquetas", { timeout: 60000 });
        await pagina.evaluate(async () => {
          if (document.fonts) await document.fonts.ready;
        });
        await pagina.locator(".globo-etiquetas").scrollIntoViewIfNeeded();
        await pagina.mouse.move(2, 2);
        const repouso = await esperarRepouso(pagina);
        const lido = await pagina.evaluate(LER);
        corridas.push({ i, repouso: repouso.repousou, ms: repouso.ms, erros, ...lido });
        const marca =
          lido.contadas === TOTAL && lido.sobrepostas.length === 0 && lido.foraDaLona === 0
            ? "·"
            : "X";
        process.stderr.write(
          `${marca} ${String(i + 1).padStart(3)} contadas ${lido.contadas}/${lido.total}` +
            ` nomes ${lido.nomes} manchas ${lido.manchas}` +
            ` sobrepostas ${lido.sobrepostas.length}` +
            (lido.diag
              ? ` sobras ${lido.diag.sobras} caídas ${lido.diag.manchasCaidas}`
              : "") +
            `\n`
        );
      } catch (erro) {
        perdidos.push({ i, erro: String(erro?.message ?? erro).slice(0, 160) });
        process.stderr.write(`? ${String(i + 1).padStart(3)} carregamento perdido — a levantar outro servidor\n`);
        await contexto.close().catch(() => {});
        await ressuscitar();
        i--;
        if (perdidos.length > o.n) throw erro;
        continue;
      } finally {
        await contexto.close().catch(() => {});
      }
    }
  } finally {
    await navegador.close();
    site.processo.kill("SIGKILL");
    banca?.close();
  }

  const boas = corridas.filter(
    (c) => c.contadas === TOTAL && c.sobrepostas.length === 0 && c.foraDaLona === 0
  );
  const resumo = {
    ecra: o.ecra,
    lona: `${largura}×${altura}`,
    total: TOTAL,
    corridas: corridas.length,
    carregamentosPerdidos: perdidos.length,
    perfeitas: boas.length,
    falhas: corridas.length - boas.length,
    contadasMin: Math.min(...corridas.map((c) => c.contadas)),
    contadasMax: Math.max(...corridas.map((c) => c.contadas)),
    sobreposicoesTotais: corridas.reduce((s, c) => s + c.sobrepostas.length, 0),
    foraDaLonaTotais: corridas.reduce((s, c) => s + c.foraDaLona, 0),
    manchasCaidasTotais: corridas.reduce((s, c) => s + (c.diag?.manchasCaidas ?? 0), 0),
    corridasComManchaCaida: corridas.filter((c) => (c.diag?.manchasCaidas ?? 0) > 0).length,
  };

  await mkdir(o.saida, { recursive: true });
  const ficheiro = path.join(o.saida, `${o.nome}-${o.ecra}.json`);
  await writeFile(ficheiro, JSON.stringify({ resumo, corridas, perdidos }, null, 2));

  process.stdout.write(
    `\n${o.nome} · ${o.ecra} ${resumo.lona} · ${resumo.corridas} carregamentos\n` +
      `  perfeitas          ${resumo.perfeitas}/${resumo.corridas}\n` +
      `  contadas           ${resumo.contadasMin}–${resumo.contadasMax} de ${TOTAL}\n` +
      `  sobreposições      ${resumo.sobreposicoesTotais}\n` +
      `  fora da lona       ${resumo.foraDaLonaTotais}\n` +
      `  manchas caídas     ${resumo.manchasCaidasTotais} (em ${resumo.corridasComManchaCaida} corridas)\n` +
      `  perdidos           ${resumo.carregamentosPerdidos} (servidor caído, repetidos)\n` +
      `  ${path.relative(RAIZ, ficheiro)}\n`
  );
  process.exitCode = resumo.falhas === 0 ? 0 : 1;
}

await principal();
