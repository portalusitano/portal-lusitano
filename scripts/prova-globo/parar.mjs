#!/usr/bin/env node
/**
 * Deitar abaixo o que ficou de pé de uma corrida anterior.
 *
 *   node scripts/prova-globo/parar.mjs
 *
 * Um `pkill -f "node server.js"` não serve, e custou meia hora a descobrir
 * porquê: o servidor do `output: standalone` **muda o nome do processo** para
 * `next-server`, e por isso não aparece em nenhuma procura pelo comando que o
 * lançou. Um servidor esquecido a servir a construção anterior é a pior avaria
 * possível numa medida A/B — responde 200, parece vivo, e o que se mede é o
 * código antigo.
 *
 * Quem se procura é quem **tem a porta**, que é a única coisa que não mente.
 * Lê-se do `/proc`, sem depender do `ss` nem do `lsof` estarem instalados.
 */

import { readFileSync, readdirSync, readlinkSync } from "node:fs";

import { PORTA_BASE, PORTA_SITE } from "./banca.mjs";

/** Os inodes dos sockets à escuta nestas portas. */
function sockets(portas) {
  const querido = new Set(portas.map((p) => p.toString(16).toUpperCase().padStart(4, "0")));
  const achados = [];
  for (const ficheiro of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let texto = "";
    try {
      texto = readFileSync(ficheiro, "utf8");
    } catch {
      continue;
    }
    for (const linha of texto.split("\n").slice(1)) {
      const c = linha.trim().split(/\s+/);
      if (c.length < 10) continue;
      const porta = c[1].split(":")[1];
      // 0A = LISTEN
      if (c[3] === "0A" && querido.has(porta)) achados.push({ porta: parseInt(porta, 16), inode: c[9] });
    }
  }
  return achados;
}

/** Que processo tem este socket aberto. */
function donoDoSocket(inode) {
  for (const pid of readdirSync("/proc")) {
    if (!/^\d+$/.test(pid)) continue;
    let fds;
    try {
      fds = readdirSync(`/proc/${pid}/fd`);
    } catch {
      continue;
    }
    for (const fd of fds) {
      try {
        if (readlinkSync(`/proc/${pid}/fd/${fd}`) === `socket:[${inode}]`) return Number(pid);
      } catch {
        /* o processo saiu entretanto */
      }
    }
  }
  return null;
}

export function libertarPortas(portas = [PORTA_BASE, PORTA_SITE]) {
  const mortos = [];
  for (const { porta, inode } of sockets(portas)) {
    const pid = donoDoSocket(inode);
    if (!pid || pid === process.pid) continue;
    let nome = "";
    try {
      nome = readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ").trim().slice(0, 60);
    } catch {
      /* já saiu */
    }
    try {
      process.kill(pid, "SIGKILL");
      mortos.push({ porta, pid, nome });
    } catch {
      /* já saiu */
    }
  }
  return mortos;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mortos = libertarPortas();
  if (!mortos.length) process.stderr.write("nada de pé nas portas da prova\n");
  for (const m of mortos) process.stderr.write(`porta ${m.porta}: morto ${m.pid} (${m.nome})\n`);
}
