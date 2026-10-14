/**
 * Gera `lib/paises-codigos.ts` — a lista de códigos ISO 3166-1 alpha-2.
 *
 * A lista sai do ICU que vem com o Node, e não de memória nenhuma: enumeram-se
 * os 676 pares de letras e ficam os que o ICU reconhece como região. A seguir
 * tiram-se duas famílias, cada uma com a sua razão:
 *
 *  - **supranacionais e reservados** (UE, Zona Euro, Nações Unidas, os `X*` de
 *    teste): não são países e não se pede a alguém que resida na União Europeia;
 *  - **extintos** (AN, DD, SU, YU, ZR…): o ICU traduz cada um para o nome do
 *    sucessor, portanto ficariam nomes repetidos na lista — «Alemanha» duas
 *    vezes, uma por DE e outra por DD.
 *
 * Corre-se com `npm run paises:gerar` quando o Node mudar de versão do ICU.
 */
import fs from "node:fs";

const SUPRANACIONAIS = [
  "EU",
  "EZ",
  "UN",
  "QO",
  "XA",
  "XB",
  "AC",
  "CP",
  "DG",
  "EA",
  "IC",
  "TA",
  "ZZ",
  "XX",
];
const EXTINTOS = [
  "AN",
  "BU",
  "CS",
  "DD",
  "FX",
  "NT",
  "SU",
  "TP",
  "YD",
  "YU",
  "ZR",
  "QU",
  "RH",
  "VD",
  "HV",
  "NH",
  "UK",
  "DY",
];

const en = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

const codigos = [];
for (let a = 65; a <= 90; a++) {
  for (let b = 65; b <= 90; b++) {
    const c = String.fromCharCode(a) + String.fromCharCode(b);
    if (!en.of(c)) continue;
    if (SUPRANACIONAIS.includes(c) || EXTINTOS.includes(c)) continue;
    codigos.push(c);
  }
}

// Dois códigos com o mesmo nome numa lista de escolha são um defeito: quem
// escolhe não sabe qual escolheu. Se acontecer, é para saber, não para calar.
const porNome = new Map();
for (const c of codigos) {
  const n = en.of(c);
  if (porNome.has(n)) {
    console.error(`nome repetido: ${porNome.get(n)} e ${c} dizem ambos "${n}"`);
    process.exit(1);
  }
  porNome.set(n, c);
}

const ficheiro = `// Gerado por \`npm run paises:gerar\`. Não editar à mão.
//
// Códigos ISO 3166-1 alpha-2, enumerados a partir do ICU do Node. O nome de
// cada um não vive aqui: é o \`Intl.DisplayNames\` que o traduz na língua de
// quem está a ler, e é por isso que este ficheiro tem ${codigos.length} linhas e não
// ${codigos.length * 3}.

export const CODIGOS_DE_PAIS = [
${codigos.map((c) => `  "${c}",`).join("\n")}
] as const;

export type CodigoDePais = (typeof CODIGOS_DE_PAIS)[number];
`;

fs.writeFileSync("lib/paises-codigos.ts", ficheiro);
console.log(`lib/paises-codigos.ts: ${codigos.length} países`);
