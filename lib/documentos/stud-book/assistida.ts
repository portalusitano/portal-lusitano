/**
 * A consulta assistida: o que uma pessoa viu no Livro Genealógico.
 *
 * ## Porque é que isto existe
 *
 * A 4 de Setembro de 2026 o dono do site abriu a consulta pública da APSL e
 * mostrou-a: **há um reCAPTCHA no formulário**. Um CAPTCHA não é uma omissão
 * nem uma opinião — é o operador a dizer, na linguagem técnica mais clara que
 * existe, que aquele formulário é para pessoas. Não se contorna, e o
 * `STUD_BOOK_APSL_ACTIVO` fica em baixo até haver acordo com a APSL e com a
 * Ruralbit, que é quem faz o software (`docs/verificacao-documental.md`, § 8).
 *
 * O que fica em cima é isto. Quem consulta é **uma pessoa** — um administrador
 * a usar um formulário público como qualquer cidadão —, e o painel guarda o
 * que ela viu. O registo enche-se na mesma, um cavalo de cada vez, cada um por
 * causa de alguém que o submeteu.
 *
 * ## ██ O que este ficheiro não faz ██
 *
 * **Não há aqui um `fetch`.** Nem um, nem escondido atrás de uma abstracção.
 * Este módulo é uma função pura que transforma «o que a pessoa respondeu» na
 * linha que se guarda; quem abre a página da APSL é o browser do
 * administrador, com um clique dele, e a resposta volta a este lado escrita à
 * mão. Se um dia alguém for tentado a poupar-lhe o clique, isso é a consulta
 * automática — que tem um interruptor, um ritmo e um ficheiro próprio, e que
 * está desligada por uma razão que não é técnica.
 *
 * **Não escreve `verificado` em documento nenhum.** A palavra continua a ter
 * um só sítio: `POST /api/admin/documentos/[id]/verificar`, com o nome de quem
 * carregou. Saber que um número consta do Livro Genealógico é matéria para
 * quem revê ler antes de decidir — não é a decisão.
 *
 * ## As três respostas, e porque são três e não duas
 *
 * - **«Consta»** → `confirmado`. A pessoa viu o cavalo na resposta da APSL.
 * - **«Não consta»** → `desconhecido`. A APSL respondeu e não o tem. Continua
 *   a **não ser uma acusação**: um erro de transcrição, um cavalo estrangeiro
 *   por inscrever e um número antigo produzem todos este mesmo silêncio.
 * - **«Não consegui ver»** → `indisponivel`, com o motivo `nao_se_conseguiu_ver`.
 *
 * A terceira é a que sustenta as outras duas. Sem ela, uma pessoa apressada
 * que não conseguiu abrir a página tinha de escolher entre mentir e não
 * responder — e a que escolhesse «não consta» estaria a escrever no registo,
 * com o nome dela, uma afirmação sobre um cavalo que nunca chegou a ver. É a
 * mesma fronteira que o `contrato.ts` protege do lado da máquina, do lado de
 * cá da pessoa.
 */

import { chaveDoIdentificador } from "../indice-conhecido";
import { normalizarData } from "./analisador";
import {
  reduzirParaGuardar,
  type ConsultaGuardada,
  type IdentificadorDeConsulta,
  type RegistoNoStudBook,
  type ResultadoDaConsulta,
} from "./contrato";

/**
 * A porta da consulta pública, e é uma porta — não é o motor.
 *
 * O endereço está documentado nas duas línguas em
 * `docs/verificacao-documental.md`, § 2, e é a página que a própria APSL
 * publica; o Estado descreve o mesmo serviço no gov.pt, em ficha própria.
 *
 * **Não leva o número no endereço**, e a razão é a mesma que mantém o
 * interruptor em baixo: o endereço do motor de pesquisa e os nomes dos
 * parâmetros nunca foram observados — está escrito, na mesma secção, «não
 * consegui saber». Inventar um `?nin=…` era mandar quem revê para uma página
 * de erro, ou pior, para uma pesquisa que não é a que ele pensa que é. Por
 * isso o painel faz o que uma pessoa faria: abre a página e põe-lhe o número
 * na área de transferência, para colar no campo.
 */
export const PAGINA_PUBLICA_DO_STUD_BOOK =
  "https://www.cavalo-lusitano.com/pt/stud-book/acesso-publico-ao-stud-book";

/** O campo do formulário da APSL onde os três números se escrevem — é um só. */
export const CAMPO_DA_PESQUISA = "NIN / Chip / UELN";

/** O que quem revê pode responder. Três, e não há uma quarta. */
export const RESPOSTAS_ASSISTIDAS = ["consta", "nao_consta", "nao_consegui_ver"] as const;
export type RespostaAssistida = (typeof RESPOSTAS_ASSISTIDAS)[number];

export function respostaAssistidaValida(valor: unknown): valor is RespostaAssistida {
  return typeof valor === "string" && (RESPOSTAS_ASSISTIDAS as readonly string[]).includes(valor);
}

/**
 * O que a pessoa copiou do ecrã da APSL, quando respondeu «consta».
 *
 * **Tudo opcional, e de propósito.** Exigir o nome e a data para se poder
 * responder «consta» punha um formulário de dois campos entre quem revê e a
 * resposta que interessa — e quem tem pressa preenche-o com o que já tem à
 * frente, que é o anúncio, e não com o que está no ecrã da APSL. Um
 * `confirmado` sem registo é uma afirmação mais pequena e verdadeira: consta.
 * Com o nome e a data, o `cruzarComStudBook` passa a ter contra o que
 * comparar, e é aí que a divergência aparece — mas isso é um bónus de quem
 * teve o cuidado, não um imposto sobre quem não teve.
 */
export interface VistoNoStudBook {
  nome?: string | null;
  /** Como estiver escrita no ecrã. Normaliza-se aqui; se não se ler, sai. */
  dataNascimento?: string | null;
  pelagem?: string | null;
}

export interface PedidoAssistido {
  resposta: RespostaAssistida;
  /** Por que número é que a pessoa procurou. */
  identificador: IdentificadorDeConsulta;
  /** O valor tal e qual, como está no anúncio ou no documento. */
  valor: string;
  /** O e-mail de quem foi ver. Sem autor não há observação. */
  por: string;
  /** Só faz sentido com «consta»; nos outros dois é ignorado. */
  visto?: VistoNoStudBook;
  /** O relógio, em ms. */
  agora?: number;
}

/** Um pedido que não se pode registar, e porquê. */
export type RecusaAssistida = "sem_autor" | "sem_identificador";

/**
 * O que a pessoa respondeu, na forma que a base guarda.
 *
 * Devolve a recusa em vez de lançar: quem chama é uma rota HTTP que tem de
 * traduzir cada caso num código diferente, e um `throw` obrigava-a a
 * distingui-los pela mensagem.
 */
export function consultaAssistida(pedido: PedidoAssistido):
  | { ok: true; resultado: ResultadoDaConsulta & Pick<ConsultaGuardada, "origem" | "por"> }
  | {
      ok: false;
      recusa: RecusaAssistida;
    } {
  const por = pedido.por.trim();
  if (por === "") return { ok: false, recusa: "sem_autor" };

  // A chave vem do `indice-conhecido`, que é onde vive a ideia de «é o mesmo
  // número» em todo o site. Se fosse calculada aqui, a resposta de uma pessoa
  // e a de um pedido nosso podiam cair em chaves diferentes para o mesmo
  // número — e o registo deixava de as reconhecer uma à outra.
  const chave = chaveDoIdentificador(pedido.identificador, pedido.valor);
  if (chave === null) return { ok: false, recusa: "sem_identificador" };

  const consultadoEm = new Date(pedido.agora ?? Date.now()).toISOString();
  const comum = {
    identificador: pedido.identificador,
    chave,
    consultadoEm,
    origem: "assistida" as const,
    por,
  };

  if (pedido.resposta === "nao_consegui_ver") {
    return {
      ok: true,
      resultado: { ...comum, estado: "indisponivel", motivo: "nao_se_conseguiu_ver" },
    };
  }

  if (pedido.resposta === "nao_consta") {
    return { ok: true, resultado: { ...comum, estado: "desconhecido" } };
  }

  const registo = registoDoQueSeViu(pedido.visto);
  return {
    ok: true,
    resultado:
      registo === undefined
        ? { ...comum, estado: "confirmado" }
        : { ...comum, estado: "confirmado", registo },
  };
}

/**
 * O que se copiou do ecrã, passado pela mesma peneira que a resposta da APSL.
 *
 * Passa pelo `reduzirParaGuardar` e não por um caminho próprio: é essa função
 * que decide o que da resposta da APSL entra na base, e ter dois caminhos com
 * duas ideias disso acabava com um deles a guardar um campo que o outro
 * recusa. Devolve `undefined` quando não sobrou nada — um registo vazio na
 * linha lê-se como «a APSL respondeu e não disse nada», que é falso: ninguém
 * lhe perguntou por escrito.
 */
function registoDoQueSeViu(visto: VistoNoStudBook | undefined) {
  if (!visto) return undefined;

  const bruto: RegistoNoStudBook = {};
  if (typeof visto.nome === "string" && visto.nome.trim() !== "") bruto.nome = visto.nome.trim();
  if (typeof visto.pelagem === "string" && visto.pelagem.trim() !== "") {
    bruto.pelagem = visto.pelagem.trim();
  }
  if (typeof visto.dataNascimento === "string" && visto.dataNascimento.trim() !== "") {
    // Uma data que não se lê deita-se fora em vez de ir para a base como texto
    // livre: o `cruzarComStudBook` compara datas normalizadas, e um
    // `12/13/2019` guardado tal e qual só sabe produzir uma divergência falsa.
    const normalizada = normalizarData(visto.dataNascimento);
    if (normalizada) bruto.dataNascimento = normalizada;
  }

  const registo = reduzirParaGuardar(bruto);
  return Object.keys(registo).length === 0 ? undefined : registo;
}
