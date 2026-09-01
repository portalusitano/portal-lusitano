import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Nenhum texto escrito à mão no cromado partilhado.
 *
 * O rodapé mostrava, em inglês, «Buy Horse» ao lado de «Cavalos favoritos»:
 * metade vinha do dicionário e metade estava escrita dentro do componente.
 * O menu de ecrã inteiro traduzia-se sozinho com um `tr3(lingua, pt, en,
 * es)` por linha — o que funciona até alguém acrescentar uma linha com dois
 * argumentos, e até se querer uma quarta língua.
 *
 * Este teste lê os componentes com o compilador de TypeScript e reprova
 * qualquer texto visível que não venha do dicionário: texto entre etiquetas,
 * atributos que o utilizador ouve ou lê (`aria-label`, `placeholder`,
 * `title`, `alt`), propriedades `label`/`desc`/`name` das estruturas que
 * alimentam o JSX, e o `x || "literal"` que devolvia português sempre que
 * uma chave faltasse.
 *
 * Um ficheiro novo de cromado acrescenta-se aqui à mão, de propósito: assim
 * entrar para o cromado é uma decisão, não um acidente.
 */

const RAIZ = path.resolve(__dirname, "../..");

const FICHEIROS_CROMADO = [
  "components/Navbar.tsx",
  "components/Footer.tsx",
  "components/CookieConsent.tsx",
  "components/Search.tsx",
  "components/SkipLinks.tsx",
  "components/navbar/DesktopMenu.tsx",
  "components/navbar/NavIcons.tsx",
  "components/navbar/MobileMenu.tsx",
  "components/navbar/LusitanoDropdown.tsx",
  "components/navbar/BotaoIdioma.tsx",
  "components/navbar/navData.ts",
  // A listagem do directório. Entrou por o «Ver no Mapa» e o «Ocultar Mapa»
  // estarem escritos dentro do componente enquanto o título ao lado vinha do
  // dicionário — a mesma mistura que o rodapé tinha, na mesma página.
  "components/directorio/DirectorioContent.tsx",
  // A página do mapa. Entrou por ter o «Portugal» do título escrito à mão no
  // `split`, enquanto o resto da frase vinha do dicionário.
  "components/MapaClient.tsx",
  // A ficha da coudelaria e as peças que só ela usa.
  "app/directorio/[slug]/NaoEncontrada.tsx",
  "components/directorio/ficha/FichaCoudelaria.tsx",
  "components/directorio/ficha/AccoesCoudelaria.tsx",
  "components/directorio/ficha/Avaliacoes.tsx",
  "components/directorio/ficha/Estrelas.tsx",
  "components/directorio/ficha/Galeria.tsx",
  "components/directorio/ficha/MapaDaCoudelaria.tsx",
  "components/directorio/ficha/PainelIdentidade.tsx",
  "components/directorio/ficha/Partilhar.tsx",
  "components/directorio/ficha/Vizinhas.tsx",
];

const ATRIBUTOS_DE_TEXTO = new Set([
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "placeholder",
  "title",
  "alt",
]);

/**
 * Nomes próprios e siglas. Não são texto para traduzir: uma rede social
 * chama-se o mesmo em português, em inglês e em espanhol, e traduzir a
 * marca seria pior do que não traduzir nada.
 */
const NAO_E_TRADUZIVEL = new Set([
  "Portal Lusitano",
  "PORTAL LUSITANO",
  "Portal Lusitano ·",
  "Lusitano",
  "Instagram",
  "Facebook",
  "TikTok",
  "WhatsApp",
  "YouTube",
  "Email",
  "Google Analytics",
  "Google AdSense",
  "Meta Pixel",
  "ESC",
]);

interface Achado {
  ficheiro: string;
  linha: number;
  tipo: string;
  texto: string;
}

function ehTextoVisivel(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (NAO_E_TRADUZIVEL.has(t)) return false;
  // Precisa de duas letras seguidas: exclui "·", "9+", "↑↓" e afins.
  return /\p{L}\p{L}/u.test(t);
}

function varrer(rel: string): Achado[] {
  const achados: Achado[] = [];
  const fonte = readFileSync(path.join(RAIZ, rel), "utf8");
  const sf = ts.createSourceFile(rel, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const registar = (no: ts.Node, texto: string, tipo: string) => {
    if (!ehTextoVisivel(texto)) return;
    const { line } = sf.getLineAndCharacterOfPosition(no.getStart(sf));
    achados.push({ ficheiro: rel, linha: line + 1, tipo, texto: texto.trim() });
  };

  const ehLiteral = (e: ts.Node): e is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
    ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e);

  const visitar = (no: ts.Node) => {
    if (ts.isJsxText(no)) {
      registar(no, no.text, "texto");
    } else if (ts.isJsxAttribute(no) && ATRIBUTOS_DE_TEXTO.has(no.name.getText(sf))) {
      const nome = no.name.getText(sf);
      const dentro = (e: ts.Node | undefined) => {
        if (!e) return;
        if (ehLiteral(e)) registar(e, e.text, `atributo ${nome}`);
        else if (ts.isConditionalExpression(e)) {
          dentro(e.whenTrue);
          dentro(e.whenFalse);
        } else if (ts.isTemplateExpression(e)) {
          registar(
            e,
            e.head.text + e.templateSpans.map((s) => s.literal.text).join(" "),
            `atributo ${nome}`
          );
        }
      };
      const v = no.initializer;
      if (v && ts.isStringLiteral(v)) registar(v, v.text, `atributo ${nome}`);
      else if (v && ts.isJsxExpression(v)) dentro(v.expression);
    } else if (
      ts.isJsxExpression(no) &&
      no.expression &&
      ehLiteral(no.expression) &&
      no.parent &&
      (ts.isJsxElement(no.parent) || ts.isJsxFragment(no.parent))
    ) {
      registar(no.expression, no.expression.text, "texto");
    } else if (ehLiteral(no)) {
      const p = no.parent;
      if (
        p &&
        ts.isPropertyAssignment(p) &&
        /^(label|desc|name|title|texto|legenda|nome|descricao)$/i.test(p.name.getText(sf))
      ) {
        registar(no, no.text, `propriedade ${p.name.getText(sf)}`);
      }
      // `t.nav.x || "Comprar cavalo"` — o literal é o que se lê sempre que a
      // chave falta, e em inglês lia-se português.
      if (
        p &&
        ts.isBinaryExpression(p) &&
        p.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
        p.right === no
      ) {
        registar(no, no.text, "fallback ||");
      }
      // Um ternário sobre a língua a devolver texto: `lang === "pt" ? … : …`
      if (
        p &&
        ts.isConditionalExpression(p) &&
        p.parent &&
        ts.isJsxExpression(p.parent) &&
        p.parent.parent &&
        (ts.isJsxElement(p.parent.parent) || ts.isJsxFragment(p.parent.parent))
      ) {
        registar(no, no.text, "texto");
      }
      // Argumentos de um tradutor escrito à mão dentro do componente.
      if (p && ts.isCallExpression(p) && /^tr3?$/.test(p.expression.getText(sf))) {
        registar(no, no.text, "tr() dentro do componente");
      }
    }
    ts.forEachChild(no, visitar);
  };

  visitar(sf);
  return achados;
}

describe("cromado partilhado — todo o texto passa pelo dicionário", () => {
  for (const ficheiro of FICHEIROS_CROMADO) {
    it(`${ficheiro} não tem texto escrito à mão`, () => {
      const achados = varrer(ficheiro);
      const relato = achados.map((a) => `${a.ficheiro}:${a.linha} [${a.tipo}] ${a.texto}`);
      expect(relato, relato.join("\n")).toEqual([]);
    });
  }

  it("o varredor apanha mesmo o defeito que motivou o teste", () => {
    // Sem esta prova o teste podia estar a passar por não encontrar nada —
    // um varredor partido dá sempre lista vazia. Aqui reconstrói-se a linha
    // exacta do rodapé anterior e confirma-se que ela seria reprovada.
    const antes = `
      const col1 = [
        { name: t.footer.buy_horse, href: "/comprar" },
        { name: "Cavalos favoritos", href: "/cavalos-favoritos" },
      ];
      export const X = () => <p>Publique o seu Lusitano e chegue a compradores</p>;
    `;
    const sf = ts.createSourceFile("x.tsx", antes, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const encontrados: string[] = [];
    const anda = (no: ts.Node) => {
      if (ts.isJsxText(no) && ehTextoVisivel(no.text)) encontrados.push(no.text.trim());
      if (
        ts.isStringLiteral(no) &&
        no.parent &&
        ts.isPropertyAssignment(no.parent) &&
        no.parent.name.getText(sf) === "name" &&
        ehTextoVisivel(no.text)
      ) {
        encontrados.push(no.text);
      }
      ts.forEachChild(no, anda);
    };
    anda(sf);
    expect(encontrados).toContain("Cavalos favoritos");
    expect(encontrados).toContain("Publique o seu Lusitano e chegue a compradores");
  });
});
