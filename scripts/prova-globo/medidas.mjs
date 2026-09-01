/**
 * As medidas.
 *
 * Cada uma devolve um objecto simples, que vai inteiro para o JSON e resumido
 * para o relatório. Nenhuma decide se o resultado é bom: quem julga é o
 * `relatorio.mjs`, com os limiares todos escritos num sítio só. Uma medida que
 * já veio julgada não deixa mudar de opinião sem voltar a correr o browser.
 *
 * O que é comparável e o que não é, dito uma vez para não se repetir em cada
 * função: **o WebGL aqui é software** (swiftshader). Milissegundos por quadro
 * não dizem nada sobre a máquina de ninguém. O que dizem é como é que duas
 * construções se portam **na mesma máquina, com o mesmo aparato**. Já as
 * contagens — pares de alfinetes a menos de 12px, pixéis que acertam no nome
 * errado, chamadas de desenho em repouso — são absolutas e valem por si.
 */

import { contadores, esperarRepouso, prepararGlobo, zerar } from "./navegador.mjs";
import { DESCREVER_FOCO, LER_ETIQUETAS, LER_VISTA, VARRER } from "./sondas.mjs";
import {
  aglomeracao,
  centrosDoVarrimento,
  concordancia,
  estatistica,
  fraccaoDentro,
  pontariaPorAlfinete,
  refinarCentros,
  sobreposicoes,
} from "./geometria.mjs";

/* Há um nó de mancha por ponto, e quase todos estão apagados à espera de vez:
   `opacity: 0` e `pointer-events: none`. Apanhar o primeiro do DOM apanhava um
   desses — o clique ia parar a um algarismo que ninguém vê, não acontecia nada,
   e o relatório dizia que carregar numa mancha não faz nada. Dizia mal: o que
   não fazia nada era a prova. */
const MANCHA_VISIVEL = ".globo-mancha:not([data-oculta]) .globo-mancha__chip";

/** Onde é que a caixa do globo está, em coordenadas da janela. */
async function caixaDoGlobo(pagina) {
  return pagina.evaluate(() => {
    const camada = document.querySelector(".globo-etiquetas");
    const r = camada.parentElement.getBoundingClientRect();
    return { x: r.left, y: r.top, l: r.width, a: r.height };
  });
}

/** Um instantâneo dos erros, para se saber quais são os desta medida. */
function marcarErros(registo) {
  const antes = {
    consola: registo.consola.length,
    pagina: registo.pagina.length,
    rede: registo.rede.length,
  };
  return () => ({
    consola: registo.consola.slice(antes.consola),
    pagina: registo.pagina.slice(antes.pagina),
    rede: registo.rede.slice(antes.rede),
  });
}

/** Um varrimento completo, já reduzido a alfinetes e a pontaria. */
async function medirAlfinetes(pagina, { passo }) {
  const bruto = await pagina.evaluate(VARRER, { passo });
  if (!bruto) return null;
  const { centros: brutos, raioComum } = centrosDoVarrimento(bruto);
  const raio = raioComum ?? 15;
  const centros = refinarCentros(bruto, brutos, raio);
  const pontaria = pontariaPorAlfinete(bruto, centros, raio);
  return {
    passo,
    lona: bruto.lona,
    msVarrimento: Math.round(bruto.ms),
    raioDeToque: raioComum,
    centros,
    /* A prova do próprio instrumento: com estas posições, o teste de acerto
       do componente reproduz-se? Se não reproduzir, os números que saem daqui
       não valem, e é melhor sabê-lo pelo relatório do que descobri-lo depois. */
    concordancia: concordancia(bruto, centros, raio),
    imprecisos: centros.filter((c) => !c.preciso && !c.afinado).length,
    afinados: centros.filter((c) => c.afinado).length,
    aglomeracao: aglomeracao(centros),
    pontaria: {
      porAlfinete: pontaria,
      areaCerta: estatistica(pontaria.map((p) => p.areaCerta)),
      comErro: pontaria.filter((p) => p.errado > 0).length,
      semNada: pontaria.filter((p) => p.certo === 0).length,
      fraccaoErradaMax: Math.max(0, ...pontaria.map((p) => p.fraccaoErrada)),
    },
  };
}

/* ── 1. Repouso: o que se lê quando o globo pousa ───────────────────────── */

export async function medirRepouso(ctx) {
  const { pagina, registo, passo } = ctx;
  const erros = marcarErros(registo);
  const repouso = await esperarRepouso(pagina);
  const ler = await pagina.evaluate(LER_ETIQUETAS);
  const alfinetes = await medirAlfinetes(pagina, { passo });

  const lidas = ler.etiquetas.filter((e) => !e.oculta && e.opacidade > 0.55);
  const lona = { x: 0, y: 0, l: ler.caixa.l, a: ler.caixa.a };

  /* Sobreposições: os nomes entre si, e os nomes contra os algarismos das
     manchas. Este segundo par é o que costuma escapar — a colocação dos nomes
     corre primeiro e as manchas só depois, com as sobras. */
  const caixasNomes = lidas.map((e) => e.caixa);
  const caixasManchas = ler.manchas.filter((m) => !m.oculta).map((m) => m.chipCaixa ?? m.caixa);
  const entreNomes = sobreposicoes(caixasNomes);
  const nomesContraManchas = [];
  for (let i = 0; i < caixasNomes.length; i++) {
    for (let j = 0; j < caixasManchas.length; j++) {
      const area = sobreposicoes([caixasNomes[i], caixasManchas[j]]);
      if (area.length) nomesContraManchas.push({ nome: lidas[i].titulo, area: area[0].area });
    }
  }

  const foraDaLona = [
    ...lidas.map((e) => ({ que: `nome ${e.titulo}`, dentro: fraccaoDentro(e.caixa, lona) })),
    ...ler.manchas
      .filter((m) => !m.oculta && m.chipCaixa)
      .map((m) => ({ que: `mancha ${m.quantos}`, dentro: fraccaoDentro(m.chipCaixa, lona) })),
  ].filter((x) => x.dentro < 0.999);

  /* Quantas coudelarias é que estão contadas algures — nome escrito ou
     algarismo de mancha. É a promessa que o componente faz por escrito. */
  /* Conferência do instrumento, por um caminho que não passa pelo varrimento.
     Um nome colocado está sempre a um afastamento fixo do alfinete dele, no
     lado que o `data-lado`/`data-vert` diz. Isso dá uma segunda estimativa da
     posição do ponto, feita a partir do DOM. Se as duas discordarem, é o banco
     que está errado — e mais vale saber isso pelo relatório do que descobrir
     mais tarde que se andou a medir o nada. */
  const AFAST = 10;
  const conferencia = [];
  if (alfinetes) {
    for (const e of ler.etiquetas) {
      if (e.oculta || e.opacidade <= 0.55 || !e.lado) continue;
      const c = alfinetes.centros.find((x) => x.indice === e.i);
      if (!c) continue;
      const x =
        e.lado === "direita"
          ? e.caixa.x - AFAST
          : e.lado === "esquerda"
            ? e.caixa.x + e.caixa.l + AFAST
            : e.caixa.x + e.caixa.l / 2;
      const y =
        e.vert === "cima"
          ? e.caixa.y + e.caixa.a + AFAST
          : e.vert === "baixo"
            ? e.caixa.y - AFAST
            : e.caixa.y + e.caixa.a / 2;
      conferencia.push(Math.hypot(x - c.x, y - c.y));
    }
  }

  /* Contar por **slug distinto**, e não somando `quantos` por etiqueta.
     Somar deixou de servir quando os alfinetes passaram a agrupar-se: a mesma
     coudelaria podia ser contada pela etiqueta do grupo e outra vez pela
     mancha, e o relatório chegou a dizer «17 de 16 coudelarias» — um
     absurdo aritmético que marcava como GRAVE uma versão que estava boa.
     Um instrumento que acusa o que está certo é pior do que nenhum, porque
     ensina a ignorá-lo.

     O slug é único por coudelaria e está no `href` de cada nome — os nomes
     soltos, os das pilhas e os das manchas são todos `<a href>` desde que
     carregar num nome passou a levar à ficha. */
  const porSlug = await pagina.evaluate(() => {
    const visivel = (e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return r.width > 1 && s.visibility !== "hidden" && parseFloat(s.opacity) > 0.05;
    };
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
      /* Alcançável = o nome está à vista, ou está dentro de uma mancha ou
         pilha que está à vista (a lista abre ao carregar, mas o algarismo
         que a abre está lá). */
      const dono = a.closest(".globo-etiqueta, .globo-mancha");
      if (dono ? visivel(dono) : visivel(a)) alcancaveis.add(s);
    }
    return { todos: todos.size, alcancaveis: alcancaveis.size };
  });

  return {
    repouso,
    caixa: ler.caixa,
    total: porSlug.todos,
    pontos: ler.etiquetas.length,
    nomesLidos: lidas.length,
    nomesAccionaveis: lidas.filter((e) => e.accionavel).length,
    naOrdemDeTabulacao: ler.etiquetas.filter((e) => !e.inerte).length,
    inertesVisiveis: ler.etiquetas.filter((e) => e.inerte && !e.oculta && e.opacidade > 0.55)
      .length,
    visiveisInertes: lidas.filter((e) => e.inerte).length,
    manchas: ler.manchas.filter((m) => !m.oculta).map((m) => m.quantos),
    contadas: porSlug.alcancaveis,
    entreNomes,
    nomesContraManchas,
    foraDaLona,
    cortados: lidas.filter((e) => e.cortadoNome).map((e) => e.titulo),
    curtos: lidas.filter((e) => e.curta).map((e) => e.titulo),
    fixosPorCima: ler.fixos,
    conferencia: estatistica(conferencia),
    alfinetes,
    erros: erros(),
  };
}

/* ── 2. Aglomeração por nível de aproximação ────────────────────────────── */

const NIVEIS = [0, 2, 4, 8];

export async function medirAglomeracao(ctx) {
  const { pagina, registo, passo } = ctx;
  const erros = marcarErros(registo);
  const niveis = [];
  let cliques = 0;
  let chegouAoLimite = false;
  for (const alvo of NIVEIS) {
    while (cliques < alvo && !chegouAoLimite) {
      const botao = pagina.locator('.globo-comando[aria-label="Aproximar"]');
      /* O botão apaga-se no quadro a seguir ao clique que chega ao limite, e
         não no próprio. Perguntar antes de carregar não chega: entre a
         pergunta e o clique o botão pode ter-se apagado, e era aí que o
         Playwright ficava trinta segundos à espera de um botão que já nunca
         mais ia aceitar nada. Quem manda é o clique, com prazo curto. */
      try {
        await botao.click({ timeout: 3000 });
        cliques++;
      } catch {
        chegouAoLimite = true;
      }
      await pagina.waitForTimeout(120);
    }
    await esperarRepouso(pagina, { estaveis: 4 });
    const a = await medirAlfinetes(pagina, { passo });
    const vista = await pagina.evaluate(LER_VISTA);
    const ler = await pagina.evaluate(LER_ETIQUETAS);
    niveis.push({
      cliques,
      noLimite: vista.comandos.some((c) => c.rotulo === "Aproximar" && c.desactivado),
      nomesLidos: ler.etiquetas.filter((e) => !e.oculta && e.opacidade > 0.55).length,
      manchas: ler.manchas.filter((m) => !m.oculta).length,
      alfinetesNoEcra: a ? a.centros.length : 0,
      raioDeToque: a ? a.raioDeToque : null,
      pares: a ? a.aglomeracao.contagem : null,
      vizinhoMaisProximo: a ? a.aglomeracao.estatistica : null,
      piores: a ? a.aglomeracao.piores.slice(0, 5).map((p) => Number(p.d.toFixed(2))) : [],
    });
  }
  // Deixar a vista como se a encontrou: as medidas seguintes contam com ela.
  await pagina
    .locator('.globo-comando[aria-label="Repor a vista"]')
    .click({ timeout: 3000 })
    .catch(() => {});
  await esperarRepouso(pagina, { estaveis: 4 });
  return { niveis, erros: erros() };
}

/* ── 3. Percursos: onde é que um clique leva ────────────────────────────── */

/** O que mudou na página por causa de uma acção. */
async function consequencia(pagina, antes) {
  const depois = await pagina.evaluate(LER_VISTA);
  const foco = await pagina.evaluate(DESCREVER_FOCO);
  return {
    navegou: depois.caminho !== antes.caminho,
    caminho: depois.caminho,
    abriuJanela: depois.modal && !antes.modal,
    fechouJanela: !depois.modal && antes.modal,
    janelaDe: depois.tituloModal ? depois.tituloModal.trim().slice(0, 60) : null,
    abriuPilha: depois.pilhaAberta && !antes.pilhaAberta,
    abriuMancha: depois.manchaAberta && !antes.manchaAberta,
    fechouLista:
      (antes.pilhaAberta || antes.manchaAberta) && !depois.pilhaAberta && !depois.manchaAberta,
    foco: foco.vazio ? null : { classe: foco.classe, rotulo: foco.rotulo, tag: foco.tag },
  };
}

/**
 * Reconstrói uma página limpa: é mais barato do que desfazer o que se abriu.
 *
 * Vai ao endereço e não recarrega o que lá está: há casos — o «voltar» depois
 * de abrir a ficha — que deixam o browser noutro sítio, e recarregar esse
 * outro sítio recarregava o engano em vez de o desfazer.
 */
async function reiniciar(ctx) {
  await ctx.pagina.goto(ctx.url, { waitUntil: "domcontentloaded" });
  await prepararGlobo(ctx.pagina);
  await esperarRepouso(ctx.pagina);
}

async function primeiroSolto(pagina) {
  return pagina.evaluate(() => {
    for (const n of document.querySelectorAll(".globo-etiqueta")) {
      if (n.hasAttribute("data-grupo") || n.hasAttribute("data-oculta")) continue;
      if (Number(n.style.opacity || "0") <= 0.55) continue;
      const c = n.querySelector(".globo-etiqueta__cabeca");
      // A cabeça de um nome solto é um `<a href>` desde que carregar nela
      // leva à ficha; a de um ajuntamento continua a ser `<button>`, porque
      // não há ficha para onde ir. O banco tem de aceitar as duas.
      if (!c || (c.tagName !== "BUTTON" && c.tagName !== "A")) continue;
      const r = c.getBoundingClientRect();
      return { nome: c.title || c.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return null;
  });
}

export async function medirPercursos(ctx) {
  const { pagina, registo, passo } = ctx;
  const saida = [];

  const registar = async (nome, esperado, accao) => {
    const erros = marcarErros(registo);
    const antes = await pagina.evaluate(LER_VISTA);
    let falha = null;
    try {
      await accao();
    } catch (e) {
      falha = String(e?.message ?? e).slice(0, 200);
    }
    await pagina.waitForTimeout(400);
    const r = await consequencia(pagina, antes);
    saida.push({ nome, esperado, ...r, falha, erros: erros() });
  };

  // 1 e 2. Um nome solto, com o rato e com o teclado.
  await reiniciar(ctx);
  const solto = await primeiroSolto(pagina);
  await registar("nome solto, clique", "abre a ficha da coudelaria", async () => {
    if (!solto) throw new Error("nenhum nome solto legível");
    await pagina.mouse.click(solto.x, solto.y);
  });

  await reiniciar(ctx);
  const solto2 = await primeiroSolto(pagina);
  await registar("nome solto, Enter", "o mesmo que o clique", async () => {
    if (!solto2) throw new Error("nenhum nome solto legível");
    await pagina.mouse.move(solto2.x, solto2.y);
    await pagina.evaluate(() => {
      const n = document.querySelector(
        ".globo-etiqueta:not([data-grupo]):not([data-oculta]) .globo-etiqueta__cabeca"
      );
      if (n) n.focus();
    });
    await pagina.keyboard.press("Enter");
  });

  // 3. O alfinete, no ponto que o varrimento diz ser o centro dele.
  await reiniciar(ctx);
  const alfinetes = await medirAlfinetes(pagina, { passo });
  const caixa = await caixaDoGlobo(pagina);
  const alvo = alfinetes?.centros.find((c) => c.preciso) ?? alfinetes?.centros[0];
  await registar("alfinete, clique no centro", "abre a ficha da coudelaria", async () => {
    if (!alvo) throw new Error("nenhum alfinete recuperado");
    await pagina.mouse.click(caixa.x + alvo.x, caixa.y + alvo.y);
  });

  // 4 e 5. Uma pilha: a cabeça abre a lista, o membro abre a ficha.
  await reiniciar(ctx);
  const pilha = await pagina.evaluate(() => {
    const n = Array.prototype.find.call(
      document.querySelectorAll(".globo-etiqueta[data-grupo]:not([data-oculta])"),
      (x) => Number(x.style.opacity || "0") > 0.55
    );
    if (!n) return null;
    const c = n.querySelector(".globo-etiqueta__cabeca");
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await registar(
    "pilha, clique na cabeça",
    "abre a lista de nomes, sem sair da página",
    async () => {
      if (!pilha) throw new Error("nenhuma pilha visível");
      await pagina.mouse.click(pilha.x, pilha.y);
    }
  );
  await registar("pilha, clique num nome de dentro", "abre a ficha desse nome", async () => {
    const b = pagina.locator(".globo-etiqueta[data-aberto] .globo-etiqueta__membro").first();
    await b.click({ timeout: 4000 });
  });

  // 6 e 7. Uma mancha: o algarismo abre o painel, o membro abre a ficha.
  await reiniciar(ctx);
  await registar("mancha, clique no algarismo", "abre a lista, sem sair da página", async () => {
    await pagina.locator(MANCHA_VISIVEL).first().click({ timeout: 4000 });
  });
  await registar("mancha, clique num nome de dentro", "abre a ficha desse nome", async () => {
    await pagina
      .locator(".globo-mancha[data-aberta] .globo-mancha__membro")
      .first()
      .click({ timeout: 4000 });
  });

  // 8. O vazio.
  await reiniciar(ctx);
  await registar("lona vazia, clique", "não acontece nada", async () => {
    const c = await caixaDoGlobo(pagina);
    await pagina.mouse.click(c.x + 12, c.y + c.a - 12);
  });

  // 9. Os comandos.
  await registar("comando Aproximar", "aproxima e não abre nada", async () => {
    await pagina.locator('.globo-comando[aria-label="Aproximar"]').click();
  });

  await reiniciar(ctx);
  return { percursos: saida };
}

/* ── 4. Fluidez ─────────────────────────────────────────────────────────── */

/** Espera que o contador de desenhos deixe de subir, ou desiste ao fim de 4s. */
async function pararDeDesenhar(pagina, { estaveis = 3, intervalo = 200, limite = 4000 } = {}) {
  const arranque = Date.now();
  let anterior = -1;
  let seguidas = 0;
  for (;;) {
    const { desenhos } = await contadores(pagina);
    seguidas = desenhos === anterior ? seguidas + 1 : 0;
    anterior = desenhos;
    if (seguidas >= estaveis || Date.now() - arranque > limite) return;
    await pagina.waitForTimeout(intervalo);
  }
}

/** Intervalos entre quadros que desenharam, a partir das marcas do rAF. */
function intervalos(quadros) {
  const d = [];
  for (let i = 1; i < quadros.length; i++) d.push(quadros[i] - quadros[i - 1]);
  return d;
}

export async function medirFluidez(ctx) {
  const { pagina, registo } = ctx;
  // Página nova: a medida anterior pode ter deixado o globo aproximado, e um
  // arrasto sobre um enquadramento que não é o de repouso não se compara com
  // nada. É preciso que o ponto de partida seja sempre o mesmo.
  await reiniciar(ctx);
  const erros = marcarErros(registo);
  const caixa = await caixaDoGlobo(pagina);
  const cx = caixa.x + caixa.l / 2;
  const cy = caixa.y + caixa.a / 2;

  // Repouso: sem ninguém a mexer, o relógio tem de estar parado.
  await esperarRepouso(pagina);
  await zerar(pagina);
  await pagina.waitForTimeout(3000);
  const emRepouso = await contadores(pagina);

  // Arrasto.
  await zerar(pagina);
  await pagina.mouse.move(cx, cy);
  await pagina.mouse.down();
  const arranque = Date.now();
  for (let i = 0; i < 40; i++) {
    await pagina.mouse.move(cx + (i + 1) * 3, cy + Math.sin(i / 4) * 12);
  }
  await pagina.mouse.up();
  const msArrasto = Date.now() - arranque;
  const arrasto = await contadores(pagina);
  await esperarRepouso(pagina, { estaveis: 4 });

  // Aproximação com a roda.
  await zerar(pagina);
  await pagina.mouse.move(cx, cy);
  const arranqueZ = Date.now();
  for (let i = 0; i < 20; i++) await pagina.mouse.wheel(0, -120);
  const msZoom = Date.now() - arranqueZ;
  await pagina.waitForTimeout(600);
  const zoom = await contadores(pagina);
  await esperarRepouso(pagina, { estaveis: 4 });

  /* Fora do ecrã: o motor promete não desenhar. Rola-se a página até o globo
     sair e conta-se. Zero é a única resposta certa.

     Antes de zerar espera-se que o contador **pare**, e não um número de
     milissegundos escolhido a olho: o quadro que já estava pedido quando a
     página rolou chega depois, e contá-lo dava um falso positivo de trinta e
     três desenhos — um quadro exacto — de corrida para corrida. O que se
     quer saber é se continua a desenhar, não se acabou de desenhar. */
  await pagina.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await pararDeDesenhar(pagina);
  await zerar(pagina);
  await pagina.waitForTimeout(2500);
  const foraDoEcra = await contadores(pagina);
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await prepararGlobo(pagina);
  await esperarRepouso(pagina, { estaveis: 4 });

  // Separador escondido: a mesma promessa, por outro caminho.
  const outra = await pagina.context().newPage();
  await outra.goto("about:blank");
  await pararDeDesenhar(pagina);
  await zerar(pagina);
  await outra.bringToFront();
  await outra.waitForTimeout(2500);
  const escondido = await contadores(pagina);
  await pagina.bringToFront();
  await outra.close();
  await esperarRepouso(pagina, { estaveis: 4 });

  const resumo = (c, ms) => ({
    desenhos: c.desenhos,
    quadros: c.quadros.length,
    ms,
    intervalos: estatistica(intervalos(c.quadros)),
    quadrosPorSegundo: ms ? Number(((c.quadros.length * 1000) / ms).toFixed(1)) : null,
    desenhosPorQuadro: c.quadros.length ? Number((c.desenhos / c.quadros.length).toFixed(1)) : null,
  });

  return {
    nota: "swiftshader: os milissegundos só se comparam entre corridas na mesma máquina",
    emRepouso: { desenhos: emRepouso.desenhos, quadros: emRepouso.quadros.length, janelaMs: 3000 },
    foraDoEcra: {
      desenhos: foraDoEcra.desenhos,
      quadros: foraDoEcra.quadros.length,
      janelaMs: 2500,
    },
    escondido: {
      desenhos: escondido.desenhos,
      quadros: escondido.quadros.length,
      janelaMs: 2500,
    },
    arrasto: resumo(arrasto, msArrasto),
    zoom: resumo(zoom, msZoom),
    erros: erros(),
  };
}

/* ── 5. Teclado e leitor de ecrã ────────────────────────────────────────── */

export async function medirTeclado(ctx) {
  const { pagina, registo } = ctx;
  const erros = marcarErros(registo);
  await reiniciar(ctx);

  // Tabulação: entra-se pelo corpo e conta-se o que se alcança dentro do globo.
  await pagina.evaluate(() => {
    const camada = document.querySelector(".globo-etiquetas");
    camada.parentElement.scrollIntoView({ block: "center" });
    document.body.focus();
  });
  const percurso = [];
  let dentro = 0;
  for (let i = 0; i < 90; i++) {
    await pagina.keyboard.press("Tab");
    const f = await pagina.evaluate(DESCREVER_FOCO);
    if (f.vazio) continue;
    if (f.noGlobo) {
      dentro++;
      percurso.push({
        classe: f.classe,
        rotulo: (f.rotulo || "").slice(0, 40),
        dentroDaLona: f.dentroDaLona,
        opacidade: f.opacidadeEtiqueta,
        contorno: f.contorno,
      });
    } else if (dentro > 0) break;
  }

  // Setas: as vinte e nove, por latitude. Cada passo tem de trazer o nome à
  // vista antes de lhe dar o foco — é essa a promessa.
  const total = await pagina.evaluate(() => document.querySelectorAll(".globo-etiqueta").length);
  await pagina.evaluate(() => {
    const n = document.querySelector(".globo-etiqueta:not([data-oculta]) .globo-etiqueta__cabeca");
    if (n) n.focus();
  });
  await pagina.keyboard.press("Home");
  await pagina.waitForTimeout(300);
  const setas = [];
  const vistos = new Set();
  for (let i = 0; i < total + 2; i++) {
    const f = await pagina.evaluate(DESCREVER_FOCO);
    setas.push({
      rotulo: (f.rotulo || "").slice(0, 48),
      noGlobo: f.noGlobo,
      dentroDaLona: f.dentroDaLona,
      opacidade: f.opacidadeEtiqueta,
      oculta: f.ocultaEtiqueta,
    });
    if (f.rotulo) vistos.add(f.rotulo);
    await pagina.keyboard.press("ArrowDown");
    await pagina.waitForTimeout(180);
  }

  const perdidos = setas.filter((s) => !s.noGlobo).length;
  const invisiveis = setas.filter((s) => s.noGlobo && (s.oculta || (s.opacidade ?? 1) <= 0.55));
  const semContorno = percurso.filter((p) => !p.contorno.outline && !p.contorno.sombra);

  return {
    tabulacao: {
      paragens: percurso.length,
      comandos: percurso.filter((p) => /globo-comando/.test(p.classe)).length,
      nomes: percurso.filter((p) => /globo-etiqueta__cabeca/.test(p.classe)).length,
      membrosDeMancha: percurso.filter((p) => /globo-mancha__membro/.test(p.classe)).length,
      foraDaLona: percurso.filter((p) => p.dentroDaLona === false).length,
      semContorno: semContorno.length,
      percurso,
    },
    setas: {
      passos: setas.length,
      distintos: vistos.size,
      total,
      alcancouTodos: vistos.size >= total,
      focoPerdido: perdidos,
      comFocoInvisivel: invisiveis.length,
      detalhe: setas,
    },
    erros: erros(),
  };
}

/* ── 5b. O alvo foge ao ponteiro ─────────────────────────────────────────
 *
 * Um alvo que se mexe quando se aponta para ele não é um alvo: é um
 * passa-culpas. A medida é directa — lê-se a caixa do alvo, pousa-se o
 * ponteiro no meio dela, espera-se o tempo de um par de quadros e lê-se outra
 * vez. Se o ponto onde o dedo está já não pertence ao alvo, o clique seguinte
 * vai bater noutra coisa qualquer, e o utilizador não tem como saber porquê.
 *
 * Mede-se um de cada vez, com o ponteiro a sair para um canto entre medições:
 * apontar um altera a colocação de todos, e medir dois ao mesmo tempo era
 * medir a interferência em vez do efeito.
 */

export async function medirAlvoFoge(ctx) {
  const { pagina, registo } = ctx;
  const erros = marcarErros(registo);
  await reiniciar(ctx);

  const listar = () =>
    pagina.evaluate(() => {
      const saida = [];
      const cx = (n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left, y: r.top, l: r.width, a: r.height };
      };
      const etiquetas = document.querySelectorAll(".globo-etiqueta:not([data-oculta])");
      for (let i = 0; i < etiquetas.length; i++) {
        const n = etiquetas[i];
        if (Number(n.style.opacity || "0") <= 0.55) continue;
        const c = n.querySelector(".globo-etiqueta__cabeca");
        if (!c) continue;
        saida.push({ tipo: "nome", i, rotulo: (c.textContent || "").trim().slice(0, 32) });
      }
      const manchas = document.querySelectorAll(".globo-mancha:not([data-oculta])");
      for (let i = 0; i < manchas.length; i++) {
        saida.push({ tipo: "mancha", i, rotulo: manchas[i].dataset.conta + " coudelarias" });
      }
      void cx;
      return saida;
    });

  const caixaDe = (tipo, i) =>
    pagina.evaluate(
      ([t, k]) => {
        const sel =
          t === "nome" ? ".globo-etiqueta:not([data-oculta])" : ".globo-mancha:not([data-oculta])";
        const nos = document.querySelectorAll(sel);
        const n = nos[k];
        if (!n) return null;
        const alvo =
          t === "nome"
            ? n.querySelector(".globo-etiqueta__cabeca")
            : n.querySelector(".globo-mancha__chip");
        if (!alvo) return null;
        const r = alvo.getBoundingClientRect();
        return { x: r.left, y: r.top, l: r.width, a: r.height };
      },
      [tipo, i]
    );

  const alvos = await listar();
  const saida = [];
  for (const alvo of alvos) {
    const antes = await caixaDe(alvo.tipo, alvo.i);
    if (!antes || antes.l < 1) continue;
    const px = antes.x + antes.l / 2;
    const py = antes.y + antes.a / 2;
    await pagina.mouse.move(px, py);
    await pagina.waitForTimeout(350);
    const depois = await caixaDe(alvo.tipo, alvo.i);
    const sob = await pagina.evaluate(
      ([x, y]) => {
        const n = document.elementFromPoint(x, y);
        return n ? String(n.className || n.tagName).slice(0, 60) : null;
      },
      [px, py]
    );
    const dentro =
      !!depois &&
      px >= depois.x &&
      px <= depois.x + depois.l &&
      py >= depois.y &&
      py <= depois.y + depois.a;
    saida.push({
      ...alvo,
      deslocou: depois ? Math.hypot(depois.x - antes.x, depois.y - antes.y) : null,
      aindaSob: dentro,
      sob,
    });
    // Sair do caminho e deixar assentar: senão a medição seguinte herda a
    // agitação desta.
    await pagina.mouse.move(2, 2);
    await esperarRepouso(pagina, { estaveis: 3 });
  }

  const fugiram = saida.filter((s) => !s.aindaSob);
  return {
    alvos: saida,
    total: saida.length,
    fugiram: fugiram.length,
    fugiramNomes: fugiram.filter((s) => s.tipo === "nome").length,
    fugiramManchas: fugiram.filter((s) => s.tipo === "mancha").length,
    deslocamento: estatistica(saida.map((s) => s.deslocou ?? 0)),
    piores: [...saida].sort((a, b) => (b.deslocou ?? 0) - (a.deslocou ?? 0)).slice(0, 6),
    erros: erros(),
  };
}

/* ── 6. A janela útil, com o aviso de cookies por responder ─────────────── */

export async function medirJanelaUtil(ctx) {
  const { navegador, url, ecra, abrir } = ctx;
  const sessao = await abrir(navegador, { url, ecra, cookies: "por-responder" });
  const { pagina } = sessao;
  try {
    await prepararGlobo(pagina);
    await esperarRepouso(pagina);
    const ler = await pagina.evaluate(LER_ETIQUETAS);
    const lidas = ler.etiquetas.filter((e) => !e.oculta && e.opacidade > 0.55);
    const tapados = [];
    for (const f of ler.fixos) {
      for (const e of lidas) {
        const l =
          Math.min(e.caixa.x + e.caixa.l, f.caixa.x + f.caixa.l) - Math.max(e.caixa.x, f.caixa.x);
        const a =
          Math.min(e.caixa.y + e.caixa.a, f.caixa.y + f.caixa.a) - Math.max(e.caixa.y, f.caixa.y);
        if (l > 0 && a > 0)
          tapados.push({ nome: e.titulo, por: f.classe.slice(0, 50), area: l * a });
      }
    }
    /* E depois de responder? O que interessa não é só quanto é que o aviso
       tira — é se o que ele tirou volta. O motor volta a medir os estorvos a
       cada clique da página; esta é a prova de que essa rede apanha o caso
       para que foi feita. */
    let depois = null;
    const aviso = pagina.locator("#aviso-cookies");
    if (await aviso.count()) {
      const botoes = aviso.locator("button");
      for (const i of [1, 0]) {
        if ((await botoes.count()) <= i) continue;
        await botoes
          .nth(i)
          .click({ timeout: 5000 })
          .catch(() => {});
        await pagina.waitForTimeout(600);
        if (!(await aviso.count())) break;
      }
      await esperarRepouso(pagina, { estaveis: 4 });
      const l2 = await pagina.evaluate(LER_ETIQUETAS);
      depois = {
        avisoSaiu: l2.fixos.length === 0,
        nomesLidos: l2.etiquetas.filter((e) => !e.oculta && e.opacidade > 0.55).length,
        manchas: l2.manchas.filter((m) => !m.oculta).length,
      };
    }

    return {
      avisoPresente: ler.fixos.length > 0,
      fixos: ler.fixos.map((f) => ({ classe: f.classe.slice(0, 60), caixa: f.caixa })),
      nomesLidos: lidas.length,
      manchas: ler.manchas.filter((m) => !m.oculta).length,
      tapados,
      depoisDeResponder: depois,
    };
  } finally {
    await sessao.contexto.close();
  }
}

/* ── 7. Robustez: as coisas parvas ──────────────────────────────────────── */

export async function medirRobustez(ctx) {
  const casos = [];
  try {
    await correrRobustez(ctx, casos);
    return { casos };
  } catch (e) {
    /* Um caso que deixa a página irrecuperável não pode apagar os que já
       correram: o que se aprendeu até ali é a parte mais valiosa do relatório
       — a de que houve um caso que deixou a página irrecuperável. */
    return { casos, interrompido: String(e?.message ?? e).slice(0, 300) };
  }
}

async function correrRobustez(ctx, casos) {
  const { pagina, registo, passo } = ctx;

  const caso = async (nome, esperado, accao) => {
    const erros = marcarErros(registo);
    const antes = await pagina.evaluate(LER_VISTA);
    let falha = null;
    let extra = null;
    try {
      extra = await accao();
    } catch (e) {
      falha = String(e?.message ?? e).slice(0, 200);
    }
    await pagina.waitForTimeout(350);
    const r = await consequencia(pagina, antes);
    const vivo = await pagina.evaluate(() => !!document.querySelector(".globo-etiquetas"));
    casos.push({ nome, esperado, ...r, extra, vivo, falha, erros: erros() });
  };

  /** Reinicia sem deixar que uma página estragada acabe com a medida. */
  const limpar = async () => {
    try {
      await reiniciar(ctx);
      return true;
    } catch (e) {
      casos.push({
        nome: "recuperar a página",
        esperado: "o globo volta a montar depois do caso anterior",
        vivo: false,
        falha: String(e?.message ?? e).slice(0, 200),
        erros: { consola: [], pagina: [], rede: [] },
      });
      return false;
    }
  };

  // Dois cliques depressa no mesmo nome.
  await limpar();
  const solto = await primeiroSolto(pagina);
  await caso("dois cliques depressa num nome", "uma janela, não duas", async () => {
    if (!solto) throw new Error("nenhum nome legível");
    await pagina.mouse.click(solto.x, solto.y, { clickCount: 2, delay: 30 });
    return pagina.evaluate(
      () => document.querySelectorAll('[role="dialog"][aria-modal="true"]').length
    );
  });

  // Arrastar para fora da lona e largar lá fora.
  await limpar();
  await caso("arrastar para fora da lona e largar lá fora", "roda e não abre nada", async () => {
    const c = await caixaDoGlobo(pagina);
    await pagina.mouse.move(c.x + c.l / 2, c.y + c.a / 2);
    await pagina.mouse.down();
    for (let i = 0; i < 12; i++) await pagina.mouse.move(c.x + c.l / 2 + i * 40, c.y + c.a / 2);
    await pagina.mouse.up();
    return null;
  });

  // Aproximar até ao fim e continuar a rodar a roda.
  await limpar();
  await caso(
    "roda para além do limite de aproximação",
    "pára no limite e continua a responder",
    async () => {
      const c = await caixaDoGlobo(pagina);
      await pagina.mouse.move(c.x + c.l / 2, c.y + c.a / 2);
      for (let i = 0; i < 60; i++) await pagina.mouse.wheel(0, -120);
      await esperarRepouso(pagina, { estaveis: 4 });
      const antes = await medirAlfinetes(pagina, { passo });
      for (let i = 0; i < 20; i++) await pagina.mouse.wheel(0, -120);
      await esperarRepouso(pagina, { estaveis: 4 });
      const depois = await medirAlfinetes(pagina, { passo });
      const vista = await pagina.evaluate(LER_VISTA);
      return {
        noLimite: vista.comandos.some((c2) => c2.rotulo === "Aproximar" && c2.desactivado),
        alfinetesAntes: antes?.centros.length ?? 0,
        alfinetesDepois: depois?.centros.length ?? 0,
        mexeu: antes && depois ? antes.centros.length !== depois.centros.length : null,
      };
    }
  );

  // Redimensionar a janela com uma mancha aberta.
  await limpar();
  await caso(
    "redimensionar com uma mancha aberta",
    "a mancha fecha ou acompanha, sem ficar órfã",
    async () => {
      await pagina.locator(MANCHA_VISIVEL).first().click({ timeout: 4000 });
      await pagina.waitForTimeout(300);
      const v = pagina.viewportSize();
      await pagina.setViewportSize({ width: Math.round(v.width * 0.7), height: v.height });
      await esperarRepouso(pagina, { estaveis: 4 });
      const estado = await pagina.evaluate(() => {
        const m = document.querySelector(".globo-mancha[data-aberta]");
        if (!m) return { aberta: false };
        const camada = document.querySelector(".globo-etiquetas").parentElement;
        const r = m.getBoundingClientRect();
        const c = camada.getBoundingClientRect();
        return {
          aberta: true,
          dentro: r.left >= c.left - 1 && r.right <= c.right + 1,
          conta: m.dataset.conta,
        };
      });
      await pagina.setViewportSize(v);
      await esperarRepouso(pagina, { estaveis: 4 });
      return estado;
    }
  );

  // Teclas enquanto o globo ainda está a entrar.
  await pagina.reload({ waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".globo-etiquetas", { timeout: 40000 });
  await caso("teclas durante a entrada", "nada estoira e o globo continua vivo", async () => {
    await pagina.locator(".globo-etiquetas").scrollIntoViewIfNeeded();
    await pagina.evaluate(() => {
      const b = document.querySelector(".globo-comando");
      if (b) b.focus();
    });
    for (const k of ["+", "+", "-", "0", "Escape", "ArrowDown", "ArrowUp"]) {
      await pagina.keyboard.press(k);
      await pagina.waitForTimeout(60);
    }
    await esperarRepouso(pagina, { estaveis: 4 });
    return pagina.evaluate(
      () => document.querySelectorAll(".globo-etiqueta:not([data-oculta])").length
    );
  });

  // Clique enquanto o globo ainda está a entrar.
  await pagina.reload({ waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".globo-etiquetas", { timeout: 40000 });
  await caso("clique durante a entrada", "não abre uma ficha ao acaso", async () => {
    await pagina.locator(".globo-etiquetas").scrollIntoViewIfNeeded();
    const c = await caixaDoGlobo(pagina);
    await pagina.mouse.click(c.x + c.l / 2, c.y + c.a / 2);
    await esperarRepouso(pagina, { estaveis: 4 });
    return null;
  });

  // Trocar de vista e voltar: o globo desmonta e volta a montar.
  await limpar();
  await caso("trocar para lista e voltar ao globo", "o globo volta inteiro", async () => {
    /* Os dois chips estão num grupo só, e são o primeiro e o segundo por essa
       ordem. Escolhê-los pelo texto obrigava a saber a língua da página. */
    const chips = pagina.locator('[role="group"] > button[aria-pressed]');
    if ((await chips.count()) < 2) throw new Error("chips de vista não encontrados");
    // Ao topo primeiro: os chips vivem por baixo do cabeçalho fixo, e um
    // clique interceptado por ele não é o clique que se queria medir.
    await pagina.evaluate(() => window.scrollTo(0, 0));
    await pagina.waitForTimeout(300);
    await chips.nth(1).click({ timeout: 8000 });
    await pagina.waitForTimeout(900);
    await chips.nth(0).click({ timeout: 8000 });
    await pagina.waitForSelector(".globo-etiquetas", { timeout: 30000 });
    await prepararGlobo(pagina);
    await esperarRepouso(pagina);
    const ler = await pagina.evaluate(LER_ETIQUETAS);
    return {
      pontos: ler.etiquetas.length,
      nomes: ler.etiquetas.filter((e) => !e.oculta && e.opacidade > 0.55).length,
    };
  });

  // Voltar atrás depois de abrir a ficha.
  await limpar();
  await caso("abrir a ficha e carregar em «voltar»", "sai da ficha, não da página", async () => {
    const s = await primeiroSolto(pagina);
    if (!s) throw new Error("nenhum nome legível");
    await pagina.mouse.click(s.x, s.y);
    await pagina.waitForTimeout(400);
    const abriu = await pagina.evaluate(() => !!document.querySelector('[role="dialog"]'));
    await pagina.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
    await pagina.waitForTimeout(600);
    return { abriu, caminho: pagina.url() };
  });

  await limpar();
  return { casos };
}
