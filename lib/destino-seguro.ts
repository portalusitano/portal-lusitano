/**
 * Valida o destino de um regresso de autenticação.
 *
 * O valor vem do URL e é concatenado ao origin. Sem validação, um `next`
 * como `//exemplo.com` dá `https://portal-lusitano.pt//exemplo.com`, que o
 * browser lê como protocolo-relativo e segue para fora do site — um
 * redireccionamento aberto, que é o que se usa para levar alguém a uma
 * página de login falsa logo a seguir a ter entrado na verdadeira.
 *
 * Só passa um caminho absoluto deste site: começa por uma barra, e só uma.
 * A contrabarra entra na conta porque há browsers que a normalizam para
 * barra antes de resolver o URL.
 */
export function destinoSeguro(pedido: string | null, omissao = "/"): string {
  if (!pedido) return omissao;
  if (!pedido.startsWith("/")) return omissao;
  if (pedido.startsWith("//") || pedido.startsWith("/\\")) return omissao;
  return pedido;
}
