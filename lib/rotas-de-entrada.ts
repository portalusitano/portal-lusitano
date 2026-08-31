/**
 * Páginas de entrada no portal (login, registo, recuperação de palavra-passe).
 *
 * Correm sem a barra e sem o rodapé do site: são um ecrã só, com a marca ao
 * centro. Com a barra por cima ficavam duas marcas no mesmo ecrã, uma delas
 * a atravessar o painel de entrada.
 *
 * O prefixo de idioma (`/en`, `/es`) é retirado antes da comparação.
 */
const ENTRADAS = ["/login", "/registar", "/recuperar-senha"];

export function eRotaDeEntrada(caminho: string | null): boolean {
  if (!caminho) return false;
  const semIdioma = caminho.replace(/^\/(en|es)(?=\/|$)/, "") || "/";
  return ENTRADAS.some((r) => semIdioma === r || semIdioma.startsWith(`${r}/`));
}
