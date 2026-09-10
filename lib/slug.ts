/**
 * Um nome transformado num identificador de URL.
 *
 * Estava escrito à mão dentro de `app/api/coudelarias/route.ts`, e a rota de
 * administração — que também precisa dele, porque `coudelarias.slug` é
 * `NOT NULL UNIQUE` — não o tinha de todo: o `POST` do admin nunca escrevia
 * `slug`, e por isso nunca criou uma coudelaria.
 */
export function criarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // acentos
    .replace(/[^a-z0-9]+/g, "-") // tudo o resto vira hífen
    .replace(/^-+|-+$/g, ""); // sem hífens nas pontas
}
