/**
 * A consulta ao stud-book da APSL: o que se pergunta, o que pode responder, e
 * o que disso se guarda.
 *
 * ## Porque é que este módulo existe
 *
 * O `components/vender-cavalo/registo-apsl.ts` diz, por escrito, que a única
 * verificação de existência possível hoje é perguntar à nossa própria base. A
 * investigação em `docs/verificacao-documental.md` mudou uma parte disso: a
 * APSL **tem** consulta pública ao stud-book, gratuita e sem registo, que
 * pesquisa por nome, NIN, microchip e UELN. E — o que torna a coisa viável —
 * o Livro Genealógico do Puro Sangue Lusitano é **um só em todo o mundo**,
 * pertence ao Estado português e é gerido pela APSL. As associações
 * estrangeiras não têm livro próprio. Uma integração cobre a raça inteira,
 * incluindo os cerca de 50% que nascem fora de Portugal.
 *
 * ## As quatro regras que não se negoceiam
 *
 * 1. **Nada disto recusa um anúncio.** A saída são factos com ids, ao lado do
 *    que o vendedor declarou, para quem revê ler. Não há nota, percentagem,
 *    semáforo nem veredicto — a mesma fronteira que o `sinais.ts` protege com
 *    um teste, e que aqui se protege com outro.
 * 2. **Uma ausência de resposta nunca é uma acusação.** A APSL estar em baixo,
 *    o formato da página ter mudado ou o nosso tecto diário ter-se esgotado
 *    são problemas nossos, não do vendedor. O anúncio fica «por confirmar» e
 *    tenta-se mais tarde. Isto é a regra mais importante de todas e está
 *    repetida em cada ficheiro desta directoria, de propósito.
 * 3. **Um número que a APSL não conhece também não é uma acusação.** Um erro
 *    de transcrição, um cavalo estrangeiro por inscrever, um número antigo e
 *    uma falsificação produzem todos o mesmo silêncio, e nós não os sabemos
 *    distinguir. É `desconhecido`, vai para revisão humana, e mais nada.
 * 4. **Nunca se mostra o inverso.** «Confirmado no Livro Genealógico» só
 *    quando a APSL confirmou. Nunca «não consta», que é uma afirmação sobre um
 *    cavalo que não temos como sustentar.
 *
 * ## O que se guarda, e o que se deita fora
 *
 * A resposta da APSL traz dados de terceiros sobre pessoas — o criador e o
 * proprietário actual — e traz a descendência do animal. Nada disso é preciso
 * para confrontar com um anúncio. O `reduzirParaGuardar` é a peneira, e
 * escreve os campos que ficam **um a um** em vez de apagar os que saem: assim
 * um campo novo no analisador não entra na base por distracção de quem o
 * acrescentou.
 */

/**
 * Por que identificador se perguntou.
 *
 * Interessa guardar porque muda a leitura de um `desconhecido`: um NIN que a
 * APSL não conhece diz mais do que um microchip copiado à mão de um passaporte
 * fotografado ao contrário.
 */
export const IDENTIFICADORES_DE_CONSULTA = ["numero_registo", "ueln", "microchip"] as const;
export type IdentificadorDeConsulta = (typeof IDENTIFICADORES_DE_CONSULTA)[number];

/**
 * Por que ordem se tenta.
 *
 * O NIN primeiro por ser a chave da própria APSL — é o número que eles
 * atribuíram e por que arrumam o livro. O UELN a seguir, que é impresso e
 * vitalício. O microchip por último: é tão único como o UELN, mas é o que mais
 * vezes chega a este site copiado à mão de uma fotografia.
 */
export const ORDEM_DOS_IDENTIFICADORES: readonly IdentificadorDeConsulta[] = [
  "numero_registo",
  "ueln",
  "microchip",
];

/** O que se leva à consulta. É o que o anúncio declara, tal e qual. */
export interface PedidoDeConsulta {
  /** `registro_apsl` no anúncio — o NIN. */
  numeroRegisto?: string | null;
  /** `passaporte_equino` no anúncio — é onde o UELN assenta. */
  ueln?: string | null;
  microchip?: string | null;
}

/**
 * O cavalo tal como a APSL o descreve.
 *
 * **Todos os campos são opcionais**, e não por preguiça: uma resposta que traga
 * só o nome e a data de nascimento é uma resposta útil, e um analisador que
 * exigisse os sete campos deitaria fora respostas boas por causa de um campo
 * que a página não mostra.
 *
 * O `criador` é lido porque a página o traz e porque foi pedido que o
 * analisador o soubesse extrair — mas **não é guardado nem cruzado**. É o nome
 * de uma pessoa ou de uma casa, é dado de terceiro, e o campo do anúncio a que
 * corresponderia (`coudelaria_origem`) é texto livre onde ninguém escreve o
 * mesmo duas vezes. Cruzá-lo dava divergências a mais sobre uma coisa que não
 * identifica cavalo nenhum.
 */
export interface RegistoNoStudBook {
  nome?: string;
  /** Normalizada para `AAAA-MM-DD`. Ver `analisador.ts`. */
  dataNascimento?: string;
  pelagem?: string;
  /** O NIN, tal como a APSL o escreve. */
  numeroRegisto?: string;
  /** Lido, nunca guardado. Ver o comentário acima. */
  criador?: string;
  pai?: string;
  mae?: string;
}

/**
 * O que fica na base.
 *
 * É o `RegistoNoStudBook` sem o `criador`. O tipo é derivado e não copiado para
 * que acrescentar um campo ao analisador seja uma decisão consciente sobre o
 * que se guarda, e não um efeito lateral.
 */
export type RegistoGuardado = Omit<RegistoNoStudBook, "criador">;

/** Os campos que atravessam a peneira. Um campo novo tem de entrar aqui à mão. */
const CAMPOS_QUE_SE_GUARDAM = [
  "nome",
  "dataNascimento",
  "pelagem",
  "numeroRegisto",
  "pai",
  "mae",
] as const satisfies readonly (keyof RegistoGuardado)[];

/**
 * A peneira: fica o que serve para confrontar com o anúncio, sai o resto.
 *
 * Sai o `criador`, e nunca chega aqui o proprietário nem a descendência —
 * esses o analisador nem sequer os procura. Os campos vazios também saem, para
 * que uma linha na base não fique com meia dúzia de `undefined` a fingir que a
 * APSL respondeu alguma coisa sobre eles.
 */
export function reduzirParaGuardar(registo: RegistoNoStudBook): RegistoGuardado {
  const guardado: RegistoGuardado = {};
  for (const campo of CAMPOS_QUE_SE_GUARDAM) {
    const valor = registo[campo];
    if (typeof valor === "string" && valor.trim() !== "") guardado[campo] = valor.trim();
  }
  return guardado;
}

/**
 * Como acabou a consulta.
 *
 * - `confirmado` — a APSL devolveu um cavalo para este identificador. **O
 *   único estado que autoriza dizer seja o que for ao público.**
 * - `desconhecido` — a APSL respondeu e não conhece este identificador. Vai
 *   para revisão humana com o motivo escrito, e não é uma acusação.
 * - `indisponivel` — não se conseguiu saber. Fica «por confirmar» e tenta-se
 *   mais tarde. O `motivo` diz o que correu mal do **nosso** lado ou do lado da
 *   rede; nenhum deles diz nada sobre o cavalo.
 * - `desligado` — o interruptor está em baixo e **nenhum pedido saiu**. É o
 *   estado por omissão de todo o sistema enquanto o dono não acertar os termos
 *   de utilização com a APSL.
 * - `sem_identificador` — o anúncio não trouxe nada por que perguntar. Também
 *   não saiu pedido nenhum.
 */
export const ESTADOS_DA_CONSULTA = [
  "confirmado",
  "desconhecido",
  "indisponivel",
  "desligado",
  "sem_identificador",
] as const;
export type EstadoDaConsulta = (typeof ESTADOS_DA_CONSULTA)[number];

/**
 * Porque é que não se conseguiu saber.
 *
 * Nenhum destes é uma afirmação sobre o cavalo, e é por isso que estão todos
 * debaixo do mesmo estado: quem lê o painel não deve ter de decidir qual das
 * cinco falhas nossas é mais grave, porque nenhuma delas é do vendedor.
 */
export const MOTIVOS_DE_INDISPONIVEL = [
  /** Não houve resposta: rede em baixo, tempo esgotado, ligação cortada. */
  "sem_resposta",
  /** Houve resposta, mas não foi um 2xx. */
  "resposta_recusada",
  /** Houve resposta e o analisador não a reconheceu. Ver `analisador.ts`. */
  "formato_desconhecido",
  /** O nosso próprio tecto diário esgotou-se. */
  "tecto_diario",
  /** A vez na fila não chegava a tempo do orçamento da submissão. */
  "sem_vez_a_tempo",
] as const;
export type MotivoDeIndisponivel = (typeof MOTIVOS_DE_INDISPONIVEL)[number];

/**
 * O resultado de uma consulta, tal como se guarda com o anúncio.
 *
 * Repare-se no que **não** está aqui: não há um booleano `valido`, não há um
 * `bloquear`, não há uma nota. Há um estado, o identificador por que se
 * perguntou, e — só quando a APSL confirmou — o que ela devolveu, já peneirado.
 */
export interface ResultadoDaConsulta {
  estado: EstadoDaConsulta;
  /** Só com `indisponivel`. */
  motivo?: MotivoDeIndisponivel;
  /** Qual dos três identificadores se usou. Ausente quando não saiu pedido. */
  identificador?: IdentificadorDeConsulta;
  /**
   * A forma comparável do valor perguntado. É por esta chave que se sabe se o
   * vendedor mudou o número desde a última vez — e é só por isso que existe.
   */
  chave?: string;
  /** Só com `confirmado`, e já sem o criador. */
  registo?: RegistoGuardado;
  /** Quando se perguntou, em ISO. Ausente quando não saiu pedido. */
  consultadoEm?: string;
}

/**
 * O que fica guardado entre submissões, para não se voltar a perguntar o mesmo.
 *
 * É o resultado mais uma contagem de tentativas. A contagem existe por causa do
 * `indisponivel`: tentar mais tarde é a regra, tentar para sempre é uma forma
 * educada de martelar o servidor de outra pessoa.
 */
export interface ConsultaGuardada extends ResultadoDaConsulta {
  tentativas: number;
}

/**
 * A pergunta que o anúncio público pode fazer, e a única resposta que lhe
 * interessa.
 *
 * Está aqui, num sítio só, pela mesma razão que o `temDocumentacaoVerificada`
 * do `contrato.ts` está lá: para que nunca haja duas ideias de «confirmado no
 * Livro Genealógico» no mesmo site.
 *
 * E repare-se que não há função nenhuma para o inverso. Não é um esquecimento:
 * `desconhecido` e `indisponivel` são indistinguíveis do ponto de vista do
 * comprador, e nenhum dos dois autoriza dizer-lhe o que quer que seja.
 */
export function temRegistoConfirmadoNoStudBook(
  consulta: Pick<ConsultaGuardada, "estado"> | null | undefined
): boolean {
  return consulta?.estado === "confirmado";
}
