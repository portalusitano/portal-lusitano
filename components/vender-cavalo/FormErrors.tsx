"use client";

import { forwardRef, useMemo } from "react";
import { ListChecks, ArrowRight } from "lucide-react";
import type { ErroCampo } from "@/components/vender-cavalo/validacao";
import {
  indiceDaLingua,
  nomeDoCampo,
  seccaoDoCampo,
  tituloDaSeccao,
} from "@/components/vender-cavalo/seccoes";
import NumeroQueAssenta from "@/components/ui/NumeroQueAssenta";
import { duracaoDoToken } from "@/lib/curvas-css";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

interface FormErrorsProps {
  erros: ErroCampo[];
}

/**
 * O que falta neste passo, no topo do passo.
 *
 * **O que estava mal.** Vinte e sete linhas vermelhas sublinhadas, todas do
 * mesmo peso, todas a dizer a mesma frase menos uma palavra: «Falta preencher:
 * NIF.», «Falta escolher: Tipo de vendedor.», «Falta responder: …». Medido:
 * 765px de painel e vinte e nove elementos vermelhos no primeiro ecrã. Três
 * defeitos, e são independentes um do outro:
 *
 * 1. **Vinte e sete alarmes ao mesmo tempo são zero alarmes.** Com tudo do
 *    mesmo peso não há nenhuma primeira, e sem uma primeira não há por onde
 *    começar — o painel descrevia o problema em vez de dar um caminho.
 * 2. **Nada daquilo estava errado.** Estava por fazer. O vermelho é a cor de
 *    «respondeu e a resposta não serve»; gastá-lo em «ainda não chegou aqui»
 *    ensina a ignorá-lo, e no dia em que um email vier sem arroba a cor já não
 *    vale nada. Quem separa os dois é agora o `campos-com-erro.tsx`.
 * 3. **A frase dizia o nome do campo duas vezes** — uma no verbo, que é o
 *    mesmo em todas, e outra no rótulo que está logo abaixo, no próprio campo.
 *    O que sobra de útil em «Falta preencher: NIF.» é «NIF».
 *
 * **O que ficou.** Três respostas a três perguntas de quem está a preencher:
 *
 * - **Quantas faltam** — um número, grande, branco, em fita de algarismos
 *   (`NumeroQueAssenta`). Não é vermelho porque não é uma acusação: é uma
 *   conta. E desce sozinha à medida que se responde, porque a página tira do
 *   resumo o campo em que se escreveu — é o mesmo dado a mexer-se, não um
 *   segundo contador montado só para a animação.
 * - **Onde** — as secções, com a conta de cada uma. É o mapa: «faltam sete na
 *   identificação oficial e três no contacto» diz mais do que dez nomes em
 *   fila, e cabe em duas linhas.
 * - **Por onde começar** — um botão, o primeiro do painel, com o nome do
 *   primeiro campo em falta. Há sempre um sítio óbvio onde carregar.
 *
 * A lista dos nomes fica, porque tirá-la seria tirar o caminho directo a cada
 * campo — mas **agrupada por secção e em pastilhas**, que é a forma que o site
 * já usa para «escolha um destes». Vinte e sete pastilhas em quatro grupos
 * leem-se como um índice; vinte e sete linhas sublinhadas leem-se como uma
 * parede.
 *
 * O que **não** mudou, e foi medido para não regredir: cada nome leva o foco
 * ao campo, e o painel recebe o foco quando aparece (em computador aparecia
 * 1302px acima do que estava no ecrã, porque o botão fica no fim de uma página
 * de três ecrãs; em telemóvel 1452px abaixo da dobra, porque o botão vive numa
 * barra fixa — nos dois casos carregar em «Continuar» não fazia nada visível).
 */
const FormErrors = forwardRef<HTMLDivElement, FormErrorsProps>(function FormErrors({ erros }, ref) {
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);
  const lingua = indiceDaLingua(language);

  /**
   * As faltas arrumadas por secção, pela ordem em que aparecem na página.
   *
   * A ordem sai do `CAMPOS`, que é a ordem do formulário: um índice cuja ordem
   * não é a da página manda quem o lê saltar para cima e para baixo à procura,
   * e num passo de três ecrãs isso custa.
   */
  const grupos = useMemo(() => {
    const porSeccao = new Map<string, { campo: string; nome: string }[]>();
    for (const erro of erros) {
      const seccao = seccaoDoCampo(erro.campo) ?? "";
      // Um campo que o catálogo não conheça entra com a frase da validação:
      // uma frase comprida é melhor do que uma linha sem nome.
      const nome = nomeDoCampo(erro.campo, lingua) ?? erro.mensagem;
      const lista = porSeccao.get(seccao);
      if (lista) lista.push({ campo: erro.campo, nome });
      else porSeccao.set(seccao, [{ campo: erro.campo, nome }]);
    }
    return [...porSeccao.entries()].map(([chave, campos]) => ({
      chave,
      titulo: tituloDaSeccao(chave, lingua),
      campos,
    }));
  }, [erros, lingua]);

  /** As mesmas faltas em fila, na ordem do formulário. É o que a forma curta
   *  escreve, e sai do mesmo sítio para não haver duas ordens. */
  const todas = useMemo(() => grupos.flatMap((g) => g.campos), [grupos]);

  if (erros.length === 0) return null;

  const n = erros.length;
  const primeiro = erros[0];
  const nomeDoPrimeiro = nomeDoCampo(primeiro.campo, lingua) ?? primeiro.mensagem;

  /**
   * Duas formas, e a que se usa depende de quantas faltam.
   *
   * **Muitas — o mapa.** Uma secção por linha, com a conta de cada uma, e o
   * cabeçalho leva à primeira falta dela. Com vinte e sete nomes escritos um a
   * um, a lista deixa de ser uma lista e volta a ser a parede que este painel
   * existe para desfazer: medido em telemóvel, as vinte e sete pastilhas, cada
   * uma com os 44px de alvo de toque que o site exige, davam **938px de painel
   * num ecrã de 844** — mais do que um ecrã inteiro só de índice. E ninguém
   * escolhe o décimo nono nome de vinte e sete: carrega no botão de cima e
   * desce pelo formulário, que é onde os campos estão marcados um por um.
   *
   * **Poucas — a lista.** Aí os nomes valem ouro, porque são a resposta à
   * pergunta que sobra: «faltam três, onde estão?». Sete pastilhas são sete
   * destinos a um toque, e a secção deixa de fazer falta — não se pergunta
   * «onde» a uma lista que se lê inteira de uma vez. Agrupá-las por secção
   * custava um cabeçalho por cada, e o painel **crescia** ao responder-se: 326
   * para 433px de vinte e sete faltas para sete, que é o contrário do que um
   * painel destes deve fazer.
   *
   * O limiar é dez, que é o que ainda se percorre com os olhos sem contar. O
   * painel passa de mapa a lista e encolhe sozinho, sem que ninguém carregue
   * em nada.
   */
  const porNome = n <= 10;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="resumo-erros resumo-faltas mb-6 scroll-mt-24 focus:outline-none"
      role="alert"
      aria-live="assertive"
    >
      <p className="resumo-faltas__conta">
        <ListChecks size={18} className="flex-none" aria-hidden="true" />
        <span className="resumo-faltas__numero">
          <NumeroQueAssenta valor={String(n)} />
        </span>
        <span className="resumo-faltas__unidade">
          {n === 1
            ? tr(
                "resposta em falta neste passo",
                "answer missing in this step",
                "respuesta en falta en este paso"
              )
            : tr(
                "respostas em falta neste passo",
                "answers missing in this step",
                "respuestas en falta en este paso"
              )}
        </span>
      </p>

      {/* A frase que desfaz o mal-entendido, e é a única do painel. Sem ela um
          número grande sobre um contorno aceso continua a ler-se como uma
          repreensão — é o que a cor deixou de dizer, e alguém tem de o dizer. */}
      <p className="resumo-faltas__nota">
        {tr(
          "Nada está errado — só por responder. Comece por aqui:",
          "Nothing is wrong — these are simply unanswered. Start here:",
          "Nada está mal — solo sin responder. Empiece por aquí:"
        )}
      </p>

      {/* O primeiro botão do painel é o caminho para a primeira falta. É o
          primeiro no DOM e não só na página: quem navega por tabulação chega
          ao painel e a tecla seguinte já está no sítio onde é preciso ir.

          O nome do campo sozinho anunciava-se como «Nome completo, botão», que
          num leitor de ecrã é indistinguível do próprio campo. O verbo tem de
          estar no nome acessível: o «Comece por aqui:» que se lê acima é prosa
          solta, e não está ligado a este botão por nada. */}
      <button
        type="button"
        className="btn btn-primario btn-sm resumo-faltas__primeira"
        aria-label={tr(
          `Ir ao primeiro campo por responder: ${nomeDoPrimeiro}`,
          `Go to the first unanswered field: ${nomeDoPrimeiro}`,
          `Ir al primer campo sin responder: ${nomeDoPrimeiro}`
        )}
        onClick={() => irAoCampo(primeiro.campo)}
      >
        <span className="truncate">{nomeDoPrimeiro}</span>
        <ArrowRight size={14} className="flex-none" aria-hidden="true" />
      </button>

      {porNome ? (
        <ul className="resumo-faltas__campos resumo-faltas__campos--soltos">
          {todas.map((c) => (
            <li key={c.campo}>
              <button
                type="button"
                className="resumo-faltas__ir"
                aria-label={tr(`Ir a: ${c.nome}`, `Go to: ${c.nome}`, `Ir a: ${c.nome}`)}
                onClick={() => irAoCampo(c.campo)}
              >
                {c.nome}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="resumo-faltas__seccoes">
          {grupos.map((grupo) => (
            <li key={grupo.chave} className="resumo-faltas__seccao">
              {/* «Como o contactam, 3» não diz o que o 3 é nem o que o botão
                  faz. O nome acessível diz as duas coisas. */}
              <button
                type="button"
                className="resumo-faltas__cabeca resumo-faltas__cabeca--ir"
                aria-label={tr(
                  `${grupo.titulo}: ${grupo.campos.length} por responder`,
                  `${grupo.titulo}: ${grupo.campos.length} unanswered`,
                  `${grupo.titulo}: ${grupo.campos.length} sin responder`
                )}
                onClick={() => irAoCampo(grupo.campos[0].campo)}
              >
                <span className="rotulo">{grupo.titulo}</span>
                {/* A conta da secção vai em mono, como as outras contas do
                    formulário: são números a comparar entre linhas, e é isso
                    que os põe em coluna. */}
                <span className="resumo-faltas__saldo">{grupo.campos.length}</span>
                <ArrowRight size={13} className="flex-none" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

/**
 * Leva ao campo: rola até lá, põe-lhe o foco, e diz qual foi.
 *
 * **Onde é que o foco aterra**, que quase nunca é no elemento que tem o `id`.
 * Três casos, e os três medidos no browser:
 *
 * 1. Um `<Seleccao>` põe o `id` num `<select>` a sério que está escondido
 *    (1×1 px, `opacity: 0`) e mostra um botão. É o botão que recebe o foco.
 *    O `tabIndex >= 0` da primeira condição é o que exclui esse `<select>`, e
 *    **tem de continuar a excluí-lo**: ele tem `tabindex="-1"` mas também tem
 *    `offsetParent`, por isso qualquer teste mais permissivo o apanharia e
 *    mandaria o foco para um pixel invisível.
 * 2. Uma pergunta de sim ou não põe o `id` no texto da pergunta. O que se quer
 *    focar é a primeira das duas respostas — é lá que as setas do teclado
 *    servem para alguma coisa, e o leitor de ecrã lê a pergunta na mesma,
 *    porque o grupo é `aria-labelledby` para ela.
 * 3. As pastilhas e os anexos não têm `id` nenhum: são um bloco com
 *    `data-campo`, e o que lá dentro se foca é a primeira pastilha.
 *
 * Os casos 2 e 3 procuram-se a partir do bloco com `data-campo`, e não a
 * partir do elemento irmão. Medido: com a procura no irmão, carregar na linha
 * de uma das vinte e sete perguntas de sim ou não deixava o foco no próprio
 * botão do resumo — que num leitor de ecrã é não ter ido a lado nenhum.
 *
 * **E o percurso vê-se.** Entre carregar no nome e o campo aparecer no ecrã
 * não acontecia nada que dissesse *qual*: a página rolava e ficava lá, com
 * quarenta campos à vista e nenhum a dizer «fui eu». O `data-chegada` acende
 * uma vez o campo que recebeu o foco — o mesmo movimento e o mesmo token com
 * que o globo assinala a coudelaria escolhida, porque é a mesma afirmação:
 * _este, e mais nenhum_. Larga-se sozinho ao fim do dobro da duração, que é a
 * regra da cortina: se alguma coisa correr mal, o que não pode acontecer é
 * ficar um campo aceso para sempre. Com `prefers-reduced-motion` o CSS não
 * corre nada — o atributo fica, e não faz mal nenhum.
 */
function irAoCampo(campo: string) {
  const alvo =
    document.getElementById(campo) ||
    document.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
  if (!alvo) return;
  alvo.scrollIntoView({ block: "center", behavior: "smooth" });

  const contentor = alvo.closest<HTMLElement>("[data-campo]") ?? alvo.parentElement;
  const focavel =
    alvo.tabIndex >= 0 && alvo.offsetParent !== null
      ? alvo
      : contentor?.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not(.hidden), button, textarea'
        );
  focavel?.focus({ preventScroll: true });

  const aceso = alvo.closest<HTMLElement>("[data-campo]") ?? focavel ?? alvo;
  if (!aceso) return;
  for (const antigo of document.querySelectorAll("[data-chegada]")) {
    antigo.removeAttribute("data-chegada");
  }
  // Dois quadros: sem eles o atributo entra no mesmo quadro em que saiu do
  // elemento anterior e a animação não recomeça.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      aceso.setAttribute("data-chegada", "");
      // O dobro do `--d-drill`, lido do CSS e não copiado para aqui: um número
      // escrito à mão dentro de um componente é uma duração que ninguém
      // encontra e que ninguém muda quando as outras mudam.
      window.setTimeout(
        () => aceso.removeAttribute("data-chegada"),
        duracaoDoToken("--d-drill", 320) * 2
      );
    });
  });
}

export default FormErrors;
