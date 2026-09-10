/**
 * A fechadura das rotas de `cron`.
 *
 * ## Porque é um módulo
 *
 * Estava copiada, byte a byte, em três rotas — `alertas`, `email-drip` e
 * `expiracao` —, e só o prefixo do registo mudava. Uma comparação em tempo
 * constante copiada quatro vezes é uma comparação que alguém há-de copiar mal
 * à quinta: basta trocar o `timingSafeEqual` por um `===` numa das cópias para
 * a rota ficar aberta a quem consiga medir o tempo da resposta, e as outras
 * três continuarem certas a esconder que essa está errada.
 *
 * ## O que se compara, e o que não é segredo
 *
 * O comprimento sai do `timingSafeEqual` de propósito — a função lança se os
 * dois `Buffer` tiverem tamanhos diferentes, e o comprimento de um cabeçalho
 * `Bearer` de formato fixo não é o que se está a proteger. O que se protege é
 * o segredo, e esse compara-se sempre inteiro.
 *
 * ## Sem `CRON_SECRET`, ninguém entra
 *
 * E responde-se 500, não 401: um segredo por configurar é uma avaria do
 * servidor, não uma tentativa falhada de quem chamou. Dizê-lo ao contrário
 * mandava quem está a montar o `cron` procurar o erro no sítio errado.
 */

import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";

export type Autorizacao = { ok: true } | { ok: false; resposta: NextResponse };

export function cronAutorizado(pedido: NextRequest, etiqueta: string): Autorizacao {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error(`[${etiqueta}] CRON_SECRET env var is not configured`);
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Server misconfiguration" }, { status: 500 }),
    };
  }

  const esperado = Buffer.from(`Bearer ${cronSecret}`);
  const recebido = Buffer.from(pedido.headers.get("authorization") || "");

  if (recebido.length !== esperado.length || !crypto.timingSafeEqual(recebido, esperado)) {
    logger.warn(`[${etiqueta}] Unauthorized cron request`);
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
