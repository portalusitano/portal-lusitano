/**
 * Faz os módulos de `lib/documentos/` a partir dos dados oficiais.
 *
 *   npm run oficiais:gerar
 *
 * A fonte é `dados/oficiais/`, e a proveniência está no README de lá. Estes
 * dados **não se editam à mão nos ficheiros gerados**: edita-se o CSV e
 * corre-se isto.
 *
 * O gerador **falha alto** em vez de escrever qualquer coisa. Uma lista de
 * códigos com uma linha errada é pior do que não haver lista: recusa
 * passaportes verdadeiros, que é o erro caro deste sistema inteiro.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** CSV com aspas, porque os nomes das organizações trazem vírgulas e aspas. */
function lerCsv(caminho) {
  const texto = readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
  const linhas = [];
  let campo = "";
  let linha = [];
  let entreAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else entreAspas = false;
      } else campo += c;
    } else if (c === '"') entreAspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }

  const [cabecalho, ...resto] = linhas.filter((l) => l.length > 1);
  return resto.map((l) =>
    Object.fromEntries(cabecalho.map((h, i) => [h.trim(), (l[i] ?? "").trim()]))
  );
}

const aspas = (s) => JSON.stringify(s);

// ---------------------------------------------------------------------------
// As bases de dados do UELN
// ---------------------------------------------------------------------------

function gerarBasesUeln() {
  const linhas = lerCsv("dados/oficiais/ueln-bases.csv");
  const porCodigo = new Map();

  for (const { ueln_code: codigo, organisation: organizacao } of linhas) {
    if (!/^[0-9A-Z]{6}$/i.test(codigo)) {
      throw new Error(`código UELN com forma inesperada: ${aspas(codigo)}`);
    }
    const jaEsta = porCodigo.get(codigo);
    if (jaEsta && jaEsta !== organizacao) {
      // Duas organizações para o mesmo código quer dizer que a fonte tem um
      // erro, ou que a filtragem descrita no README deixou passar uma linha a
      // mais. Nenhum dos dois se resolve escolhendo um dos nomes.
      throw new Error(
        `o código ${codigo} tem dois nomes:\n  ${aspas(jaEsta)}\n  ${aspas(organizacao)}`
      );
    }
    porCodigo.set(codigo, organizacao);
  }

  const ordenados = [...porCodigo.entries()].sort(([a], [b]) => a.localeCompare(b));
  const apsl = ordenados.find(([c]) => c === "620003");
  if (!apsl) throw new Error("a APSL (620003) não está na lista — a fonte mudou?");

  const corpo = ordenados.map(([c, o]) => `  ${aspas(c)}: ${aspas(o)},`).join("\n");

  return `/* GERADO — não editar à mão.
 *
 * Fonte: \`dados/oficiais/ueln-bases.csv\`. Para mudar, edita-se o CSV e
 * corre-se \`npm run oficiais:gerar\`. A proveniência está em
 * \`dados/oficiais/README.md\`. */

/**
 * As bases de dados e stud-books que emitem números UELN.
 *
 * Um UELN tem quinze caracteres em três blocos:
 *
 * \`\`\`
 *   620  003  004471234
 *   └┬┘  └┬┘  └───┬───┘
 *    │    │       └── 9 caracteres: o número do animal nessa base
 *    │    └────────── 3 caracteres: **o código desta lista**
 *    └─────────────── 3 algarismos: o país, ISO 3166-1 numérico
 * \`\`\`
 *
 * O \`components/vender-cavalo/passaporte-ueln.ts\` dizia por escrito que não
 * validava o bloco do meio «porque a lista é mantida pelos organismos do UELN
 * e não a temos; inventar quais são os válidos seria recusar passaportes reais
 * por causa de uma lista adivinhada». Agora temos a lista.
 *
 * **Mas a regra não muda: desconhecido é desconhecido, nunca inválido.** Esta
 * lista tem ${ordenados.length} códigos e não é garantidamente completa nem
 * eterna — organizações novas entram, e a cópia que temos é de um dia. Um
 * código que aqui não esteja pode ser de uma base que existe; recusá-lo seria
 * repetir, com uma lista a sério, exactamente o erro que se evitou quando não
 * havia lista nenhuma.
 */
export const BASES_UELN: Readonly<Record<string, string>> = {
${corpo}
};

/** A APSL, que é quem gere o Livro Genealógico do Puro Sangue Lusitano. */
export const CODIGO_APSL = "620003";
`;
}

// ---------------------------------------------------------------------------
// Os rótulos do passaporte
// ---------------------------------------------------------------------------

const SEM_TRADUCAO = "(não impresso em francês)";

function gerarVocabulario() {
  const linhas = lerCsv("dados/oficiais/passaporte-anexo-ii.csv");
  const entradas = linhas.map((l) => ({
    campo: l.campo,
    fr: l.rotulo_frances === SEM_TRADUCAO ? null : l.rotulo_frances,
    en: l.rotulo_ingles,
    pt: l.rotulo_portugues,
    seccao: l.seccao_anexo_II,
  }));

  if (entradas.length < 50) throw new Error(`só ${entradas.length} rótulos — a fonte encolheu?`);
  for (const e of entradas) {
    if (!e.campo || !e.en || !e.pt || !e.seccao) {
      throw new Error(`rótulo incompleto: ${JSON.stringify(e)}`);
    }
  }

  const corpo = entradas
    .map(
      (e) =>
        `  {\n    campo: ${aspas(e.campo)},\n    fr: ${e.fr === null ? "null" : aspas(e.fr)},\n` +
        `    en: ${aspas(e.en)},\n    pt: ${aspas(e.pt)},\n    seccao: ${aspas(e.seccao)},\n  },`
    )
    .join("\n");

  return `/* GERADO — não editar à mão.
 *
 * Fonte: \`dados/oficiais/passaporte-anexo-ii.csv\`, transcrito do Anexo II do
 * Regulamento de Execução (UE) 2021/963. Para mudar, edita-se o CSV e corre-se
 * \`npm run oficiais:gerar\`. */

/**
 * O que um passaporte equino da União imprime, campo a campo.
 *
 * O leitor de documentos procurava rótulos **inferidos do que esses documentos
 * costumam imprimir**, e isso estava escrito no código como o ponto mais fraco
 * de todo o sistema de verificação. Estes vêm do regulamento.
 *
 * O \`fr\` é \`null\` nas linhas da Secção V: essa secção é o certificado
 * zootécnico e não aparece nas três línguas no mesmo documento.
 */
export interface RotuloDoPassaporte {
  /** O que o campo é, em português corrente. Não é o que vem impresso. */
  campo: string;
  fr: string | null;
  en: string;
  pt: string;
  /** Onde no Anexo II, para se poder ir confirmar. */
  seccao: string;
}

export const ROTULOS_DO_PASSAPORTE: readonly RotuloDoPassaporte[] = [
${corpo}
];
`;
}

writeFileSync(join(RAIZ, "lib/documentos/ueln-bases.ts"), gerarBasesUeln());
writeFileSync(join(RAIZ, "lib/documentos/vocabulario-passaporte.ts"), gerarVocabulario());
console.log("lib/documentos/ueln-bases.ts e vocabulario-passaporte.ts escritos");
