/**
 * Os documentos da mesma submissão, uns contra os outros.
 *
 * ## O que já existe, e não se repete
 *
 * O `lib/documentos/leitura/cruzar.ts` já confronta **um** documento com o que
 * o vendedor escreveu no formulário, e guarda o resultado no `conflitos` da
 * linha; o `lib/documentos/sinais.ts` já junta esses conflitos numa fila. Nada
 * disso se refaz aqui.
 *
 * O que falta é o terceiro lado do triângulo: **os documentos entre si**. Uma
 * submissão traz um Livro Azul, um passaporte e às vezes um exame veterinário,
 * e cada um deles pode trazer o microchip lá dentro. Se o passaporte diz um
 * número e o Livro Azul diz outro, os dois não podem ser do mesmo cavalo — e
 * essa contradição não aparece em nenhum dos dois cruzamentos com o formulário,
 * porque **basta o formulário estar de acordo com um deles** para o outro
 * passar sem nota nenhuma.
 *
 * ## Como se compara
 *
 * Com as formas canónicas que cada campo já tem no site: o UELN pela do
 * `passaporte-ueln`, o microchip pela do `microchip-iso`, o registo pela do
 * `registo-apsl`, o nome pela do `normalizar`. Não se escreve aqui uma segunda
 * ideia de igualdade — duas normalizações do mesmo número são duas respostas
 * diferentes à mesma pergunta, e uma delas há-de estar errada.
 *
 * ## O que se recusa a dizer
 *
 * Um documento que não deu nenhum destes campos **não contradiz nada**. É o
 * caso normal: uma fotografia de telemóvel a um passaporte pousado numa mesa
 * não dá campo nenhum, e o contrato já o diz. Só há contradição quando dois
 * documentos trazem o **mesmo campo** com valores diferentes.
 *
 * E os identificadores ficam em `impossivel` enquanto o nome fica em
 * `improvavel`: um microchip é um número de quinze algarismos que ou é igual ou
 * não é, e um nome sai de uma camada de texto reconstruída a partir de posições
 * num PDF, onde a diferença entre dois documentos pode ser da leitura e não do
 * cavalo. Nem um nem outro recusa nada — nenhum destes achados tem campo de
 * formulário onde aterrar, e por isso nenhum chega a travar o passo de ninguém.
 */

import { chaveRegistoApsl } from "@/components/vender-cavalo/registo-apsl";
import { limparPassaporte } from "@/components/vender-cavalo/passaporte-ueln";
import { normalizarMicrochip } from "@/lib/microchip-iso";
import { chaveDeNome } from "@/lib/documentos/leitura/normalizar";
import type { Conflito } from "@/lib/documentos/contrato";

import {
  type AchadoContradicaoEntreDocumentos,
  type DocumentoParaCoerencia,
  type Natureza,
  distintosOrdenados,
  porTexto,
} from "./achados";

/**
 * Cada campo com a sua forma canónica e a natureza que uma divergência tem.
 *
 * A ordem é a de leitura, e é ela que ordena a saída.
 */
const CAMPOS: ReadonlyArray<{
  campo: Conflito["campo"];
  ler: (leitura: NonNullable<DocumentoParaCoerencia["leitura"]>) => string | undefined;
  chave: (valor: string) => string;
  natureza: Natureza;
}> = [
  {
    campo: "microchip",
    ler: (l) => l.microchip,
    chave: normalizarMicrochip,
    natureza: "impossivel",
  },
  { campo: "ueln", ler: (l) => l.ueln, chave: limparPassaporte, natureza: "impossivel" },
  {
    campo: "numero_registo",
    ler: (l) => l.numeroRegisto,
    chave: chaveRegistoApsl,
    natureza: "impossivel",
  },
  { campo: "nome", ler: (l) => l.nome, chave: chaveDeNome, natureza: "improvavel" },
];

/**
 * As contradições entre os documentos de cada submissão.
 *
 * Agrupa-se pela `referencia`, que é o que liga os ficheiros de uma submissão
 * enquanto o anúncio ainda não nasceu — e continua a ligá-los depois.
 */
export function contradicoesEntreDocumentos(
  documentos: readonly DocumentoParaCoerencia[]
): AchadoContradicaoEntreDocumentos[] {
  const porReferencia = new Map<string, DocumentoParaCoerencia[]>();
  for (const d of documentos) {
    if (typeof d.referencia !== "string" || d.referencia === "") continue;
    const lista = porReferencia.get(d.referencia);
    if (lista) lista.push(d);
    else porReferencia.set(d.referencia, [d]);
  }

  const saida: AchadoContradicaoEntreDocumentos[] = [];

  for (const [referencia, linhas] of [...porReferencia].sort(([a], [b]) => porTexto(a, b))) {
    const ordenadas = [...linhas].sort((a, b) => porTexto(a.id, b.id));

    for (const { campo, ler, chave, natureza } of CAMPOS) {
      const leituras: { documentoId: string; tipoDeDocumento: string; valor: string }[] = [];
      const chaves: string[] = [];

      for (const d of ordenadas) {
        if (!d.leitura) continue;
        const bruto = ler(d.leitura);
        if (typeof bruto !== "string" || bruto.trim() === "") continue;
        const k = chave(bruto);
        // Um valor que não normaliza para nada não contradiz nada. É a mesma
        // regra do `cruzar.ts`, e pela mesma razão.
        if (!k) continue;
        leituras.push({ documentoId: d.id, tipoDeDocumento: d.tipo, valor: bruto.trim() });
        chaves.push(k);
      }

      // Um documento sozinho não contradiz ninguém, e dois a dizer o mesmo
      // escrito de outra maneira também não.
      if (distintosOrdenados(chaves).length < 2) continue;

      saida.push({
        tipo: "contradicao_entre_documentos",
        natureza,
        // A submissão pode ainda não ter anúncio nenhum. Quando tem, é quem
        // chama que sabe qual — aqui a ligação é a referência.
        cavalos: [],
        referencia,
        campo,
        leituras,
      });
    }
  }

  return saida;
}
