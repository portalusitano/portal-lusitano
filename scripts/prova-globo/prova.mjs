#!/usr/bin/env node
/**
 * PROVA DO GLOBO — um instrumento de medida, não uma suite de testes.
 *
 *   node scripts/prova-globo/prova.mjs --url=http://127.0.0.1:3000/mapa
 *
 * Não passa nem falha: mede. Escreve um relatório legível e um JSON ao lado,
 * e os dois juntos respondem à única pergunta que interessa a quem está a
 * mexer no globo — **isto melhorou ou piorou?**
 *
 *   node scripts/prova-globo/prova.mjs --comparar=antes.json,depois.json
 *
 * O que mede, e porquê cada coisa se mede assim, está em `medidas.mjs`. O que
 * é grave e o que é um aviso está em `relatorio.mjs`. O que é conta pura está
 * em `geometria.mjs`, que é o que os testes de unidade fixam.
 *
 * Opções:
 *   --url=…            a construção a medir (por omissão http://127.0.0.1:3000/mapa)
 *   --nome=…           etiqueta desta corrida (por omissão a data e a hora)
 *   --saida=…          onde escrever (por omissão scripts/prova-globo/resultados)
 *   --ecras=…          desktop,movel (por omissão os dois)
 *   --passo=N          passo do varrimento em pixéis (por omissão 3)
 *   --repeticoes=N     quantas vezes medir o núcleo, para saber a variação (2)
 *   --so=…             medir só estas: repouso,aglomeracao,alvo,percursos,
 *                      fluidez,teclado,janela,robustez,escolha
 *   --parado           correr com `prefers-reduced-motion: reduce`
 *   --comparar=a,b     não mede nada: compara dois JSON já escritos
 *   --ajuda
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ECRAS, EXECUTAVEL, abrirNavegador, abrirPagina, prepararGlobo } from "./navegador.mjs";
import {
  medirAglomeracao,
  medirAlvoFoge,
  medirEscolha,
  medirFluidez,
  medirJanelaUtil,
  medirPercursos,
  medirRepouso,
  medirRobustez,
  medirTeclado,
} from "./medidas.mjs";
import { compararCorridas, escreverRelatorio, grandezas } from "./relatorio.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));

function lerArgumentos(argv) {
  const o = {
    url: "http://127.0.0.1:3000/mapa",
    nome: null,
    saida: path.join(AQUI, "resultados"),
    ecras: ["desktop", "movel"],
    passo: 3,
    repeticoes: 2,
    so: null,
    parado: false,
    comparar: null,
    ajuda: false,
  };
  for (const a of argv) {
    const [chave, ...resto] = a.replace(/^--/, "").split("=");
    const valor = resto.join("=");
    if (chave === "url") o.url = valor;
    else if (chave === "nome") o.nome = valor;
    else if (chave === "saida") o.saida = valor;
    else if (chave === "ecras") o.ecras = valor.split(",").filter(Boolean);
    else if (chave === "passo") o.passo = Number(valor);
    else if (chave === "repeticoes") o.repeticoes = Number(valor);
    else if (chave === "so") o.so = valor.split(",").filter(Boolean);
    else if (chave === "parado") o.parado = true;
    else if (chave === "comparar") o.comparar = valor.split(",");
    else if (chave === "ajuda" || chave === "help" || chave === "h") o.ajuda = true;
  }
  return o;
}

const AJUDA = `
PROVA DO GLOBO

  node scripts/prova-globo/prova.mjs --url=http://127.0.0.1:3000/mapa
  node scripts/prova-globo/prova.mjs --comparar=resultados/a.json,resultados/b.json

  --url=…          a construção a medir
  --nome=…         etiqueta desta corrida
  --saida=…        onde escrever o relatório e o JSON
  --ecras=…        desktop,movel
  --passo=N        passo do varrimento em pixéis (3)
  --repeticoes=N   quantas vezes medir o núcleo, para saber a variação (2)
  --so=…           repouso,aglomeracao,alvo,percursos,fluidez,teclado,janela,robustez,escolha
  --parado         correr com prefers-reduced-motion: reduce
`;

/** Corre uma medida e não deixa que uma falha dela leve a corrida toda. */
async function tentar(nome, fn) {
  try {
    return await fn();
  } catch (e) {
    process.stderr.write(`  ! ${nome} falhou: ${e?.message ?? e}\n`);
    return { falhou: String(e?.message ?? e).slice(0, 400) };
  }
}

async function medirEcra(navegador, opcoes, nome) {
  const quer = (m) => !opcoes.so || opcoes.so.includes(m);
  const { largura, altura } = ECRAS[nome];
  process.stderr.write(`\n▸ ${nome} (${largura}×${altura})\n`);

  /* O núcleo mede-se `repeticoes` vezes, cada uma numa página nova. É daqui
     que sai a variação: sem ela, um instrumento diz números sem dizer se são
     de fiar. As medidas que mexem no globo — percursos, robustez — correm uma
     vez só, na última sessão, porque deixam a página noutro estado. */
  const nucleos = [];
  let ultima = null;
  const repeticoes = Math.max(1, opcoes.repeticoes);

  for (let i = 0; i < repeticoes; i++) {
    if (ultima) await ultima.contexto.close();
    ultima = await abrirPagina(navegador, {
      url: opcoes.url,
      ecra: nome,
      parado: opcoes.parado,
    });
    await prepararGlobo(ultima.pagina);
    process.stderr.write(`  · repouso ${i + 1}/${repeticoes}\n`);
    nucleos.push(await tentar("repouso", () => medirRepouso({ ...ultima, passo: opcoes.passo })));
  }

  const ctx = {
    ...ultima,
    passo: opcoes.passo,
    navegador,
    url: opcoes.url,
    ecra: nome,
    abrir: abrirPagina,
  };
  const ecra = {
    nome,
    largura,
    altura,
    repouso: nucleos[nucleos.length - 1],
    nucleos,
  };

  if (quer("aglomeracao")) {
    process.stderr.write("  · aglomeração\n");
    ecra.aglomeracao = await tentar("aglomeracao", () => medirAglomeracao(ctx));
  }
  if (quer("fluidez")) {
    process.stderr.write("  · fluidez\n");
    ecra.fluidez = await tentar("fluidez", () => medirFluidez(ctx));
  }
  if (quer("teclado")) {
    process.stderr.write("  · teclado\n");
    ecra.teclado = await tentar("teclado", () => medirTeclado(ctx));
  }
  if (quer("alvo")) {
    process.stderr.write("  · alvo que foge\n");
    ecra.alvoFoge = await tentar("alvo", () => medirAlvoFoge(ctx));
  }
  if (quer("escolha")) {
    process.stderr.write("  · transição de escolha\n");
    ecra.escolha = await tentar("escolha", () => medirEscolha(ctx));
  }
  if (quer("percursos")) {
    process.stderr.write("  · percursos\n");
    ecra.percursos = await tentar("percursos", () => medirPercursos(ctx));
  }
  if (quer("robustez")) {
    process.stderr.write("  · robustez\n");
    ecra.robustez = await tentar("robustez", () => medirRobustez(ctx));
  }
  if (quer("janela")) {
    process.stderr.write("  · janela útil\n");
    ecra.janelaUtil = await tentar("janela", () => medirJanelaUtil(ctx));
  }

  await ultima.contexto.close();
  return ecra;
}

/** A variação entre repetições, grandeza a grandeza. */
function medirVariacao(ecras) {
  const saida = {};
  for (const e of ecras) {
    if (!e.nucleos || e.nucleos.length < 2) continue;
    const listas = e.nucleos.map((n) => grandezas({ repouso: n }));
    const nomes = Object.keys(listas[0]).filter((k) => listas.some((l) => l[k] !== null));
    saida[e.nome] = {
      repeticoes: e.nucleos,
      grandezas: nomes.map((k) => {
        const valores = listas.map((l) => l[k]);
        const numeros = valores.filter((v) => typeof v === "number");
        const amplitude = numeros.length ? Math.max(...numeros) - Math.min(...numeros) : 0;
        return {
          nome: k,
          valores,
          amplitude: Number(amplitude.toFixed(2)),
          estavel: amplitude === 0,
        };
      }),
    };
  }
  return saida;
}

async function principal() {
  const o = lerArgumentos(process.argv.slice(2));
  if (o.ajuda) {
    process.stdout.write(AJUDA);
    return;
  }

  if (o.comparar) {
    const [a, b] = await Promise.all(o.comparar.map((f) => readFile(f, "utf8")));
    process.stdout.write(compararCorridas(JSON.parse(a), JSON.parse(b)) + "\n");
    return;
  }

  const arranque = Date.now();
  const nome = o.nome ?? new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const navegador = await abrirNavegador();
  const ecras = [];
  try {
    for (const e of o.ecras) {
      if (!ECRAS[e]) {
        process.stderr.write(`  ! ecrã desconhecido: ${e}\n`);
        continue;
      }
      ecras.push(await medirEcra(navegador, o, e));
    }
  } finally {
    await navegador.close();
  }

  const corrida = {
    nome,
    url: o.url,
    quando: new Date().toISOString(),
    navegador: EXECUTAVEL,
    passo: o.passo,
    parado: o.parado,
    repeticoes: o.repeticoes,
    ms: Date.now() - arranque,
    ecras,
    variacao: medirVariacao(ecras),
  };

  await mkdir(o.saida, { recursive: true });
  const base = path.join(o.saida, nome);
  const texto = escreverRelatorio(corrida);
  await writeFile(`${base}.json`, JSON.stringify(corrida, null, 1));
  await writeFile(`${base}.txt`, texto + "\n");
  process.stdout.write(texto + "\n");
  process.stderr.write(`\n→ ${base}.txt\n→ ${base}.json\n`);
}

principal().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + "\n");
  process.exitCode = 1;
});
