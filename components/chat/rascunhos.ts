/**
 * O rascunho por acabar, guardado por conversa.
 *
 * ## O defeito que isto corrige, medido
 *
 * A caixa de texto era **uma só variável de estado para todas as conversas**, e
 * fechar o fio não lhe tocava. Medido nas duas vistas: escrever
 * «RASCUNHO-DO-XAQUIRO» no fio do Xaquiro, voltar atrás e abrir o fio do Zarco
 * da Broa punha o rascunho do Xaquiro na caixa do Zarco — pronto a ser enviado
 * à pessoa errada com um toque. O que parecia «o rascunho sobrevive» era o
 * rascunho a escorrer.
 *
 * Sobreviver é uma coisa boa; escorrer não é. As duas separam-se com uma
 * chave: o rascunho é **da conversa**, não da caixa.
 *
 * ## Porquê `sessionStorage`
 *
 * O `CLAUDE.md` diz que o armazenamento do browser serve para conveniências de
 * quem está a ver — um filtro guardado, um rascunho por enviar — e não para o
 * que tem de durar. É exactamente este caso. `session` e não `local` porque um
 * recado por acabar é da visita: reencontrá-lo dentro do mesmo separador é
 * ajudar, reencontrá-lo daqui a três semanas é ressuscitar uma conversa que a
 * pessoa já deu por encerrada.
 *
 * Todos os acessos vão dentro de um `try`: em janela privada, com os dados do
 * sítio bloqueados, ou numa captura de miniatura, o próprio acesso rebenta.
 */

const PREFIXO = "chat-rascunho:";

export function chaveDoRascunho(conversaId: string): string {
  return PREFIXO + conversaId;
}

export function lerRascunho(conversaId: string): string {
  try {
    return sessionStorage.getItem(chaveDoRascunho(conversaId)) ?? "";
  } catch {
    return "";
  }
}

export function guardarRascunho(conversaId: string, texto: string): void {
  try {
    if (texto.trim().length === 0) sessionStorage.removeItem(chaveDoRascunho(conversaId));
    else sessionStorage.setItem(chaveDoRascunho(conversaId), texto);
  } catch {
    // Sem armazenamento o rascunho vive só enquanto o fio estiver aberto, que
    // é o que acontecia antes disto existir.
  }
}

export function apagarRascunho(conversaId: string): void {
  try {
    sessionStorage.removeItem(chaveDoRascunho(conversaId));
  } catch {
    /* ver acima */
  }
}
