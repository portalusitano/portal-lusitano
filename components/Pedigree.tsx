/**
 * A genealogia declarada de um cavalo anunciado.
 *
 * ## O que estava aqui, e porque é que saiu
 *
 * Este componente inventava. Não por descuido de estilo — inventava dados:
 *
 * - Os **quatro avós eram literais escritos no código** — «Zimbro» e «Xarola»
 *   com o ferro VEIGA, «Uivador» e «Toleirona» com o ferro ANDRADE — e
 *   apareciam iguais na ficha de **todos** os cavalos do site. Quem abrisse
 *   dois anúncios via a mesma árvore duas vezes, com dois cavalos diferentes
 *   pendurados nela. São nomes de linhagens que existem a sério, atribuídos a
 *   cavalos que nada têm a ver com elas.
 * - Os **números de registo do pai e da mãe eram fixos** — `LUS-2938` e
 *   `LUS-1102` — com um comentário no código a dizer «Número de Registo
 *   Fictício para visual». Um número de registo fictício numa ficha de venda
 *   não é visual: é uma identificação falsa ao lado de um preço.
 * - Por baixo, a ficha escrevia «Dados verificados via Stud-Book Digital».
 *   Nada neste site consulta stud-book nenhum.
 *
 * ## A regra que ficou
 *
 * **Escreve-se o que o vendedor declarou, e nada mais.** Um antepassado sem
 * nome nem número não desenha caixa nenhuma — uma caixa com «Não registado»
 * ainda afirma que ali há um lugar preenchido na árvore. Uma geração inteira
 * em branco não aparece.
 *
 * A ascendência a sério vive em `cavalos_venda_ascendentes`, uma linha por
 * antepassado identificada pelo caminho (`pai`, `mae`, `pai.pai`, …), e traz o
 * número de registo que o vendedor escreveu. É de lá que vêm os avós quando os
 * há. As colunas `pai` e `mae` de `cavalos_venda` continuam a servir de recurso
 * para os anúncios anteriores a essa tabela.
 *
 * E há o rodapé, que é a parte que não se pode perder: **isto é uma
 * declaração**. Sem ele o desenho de árvore, com as suas linhas e caixas,
 * lê-se como um documento.
 */

/** O caminho de um antepassado a partir do exemplar. */
export type CaminhoAscendente = "pai" | "mae" | "pai.pai" | "pai.mae" | "mae.pai" | "mae.mae";

export interface Ascendente {
  caminho: string;
  nome?: string | null;
  registo?: string | null;
}

interface CartaoAscendenteProps {
  rotulo: string;
  nome: string;
  registo?: string | null;
  femea?: boolean;
}

function CartaoAscendente({ rotulo, nome, registo, femea = false }: CartaoAscendenteProps) {
  return (
    <div
      className={`relative min-w-[150px] border p-3 transition-colors duration-200 ${
        femea
          ? "border-[var(--border-soft)] bg-[var(--background)]/30"
          : "border-[var(--border)] bg-[var(--background)]/60"
      } hover:border-[var(--border-hover)]`}
    >
      <span className="rotulo mb-1 block">{rotulo}</span>
      <p className="truncate text-sm font-normal text-[var(--foreground)]">{nome}</p>
      {/* O número de registo só se escreve quando existe. O «N/A» que aqui
          estava era um lugar vazio a fingir-se de campo preenchido. */}
      {registo ? <p className="meta mt-1 font-mono tabular-nums">{registo}</p> : null}
    </div>
  );
}

interface PedigreeProps {
  cavalo: {
    nome_cavalo: string;
    pai?: string | null;
    mae?: string | null;
  };
  /**
   * A ascendência declarada, de `cavalos_venda_ascendentes`. Vazia nos anúncios
   * anteriores a essa tabela — nesse caso o pai e a mãe vêm das colunas soltas
   * e não há avós para mostrar, porque não há avós guardados.
   */
  ascendentes?: readonly Ascendente[];
}

/** Texto aparado, ou `null`. Vazio é ausência. */
function limpar(valor: string | null | undefined): string | null {
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  return t === "" ? null : t;
}

export default function Pedigree({ cavalo, ascendentes = [] }: PedigreeProps) {
  const porCaminho = new Map<string, Ascendente>();
  for (const a of ascendentes) {
    if (a && typeof a.caminho === "string") porCaminho.set(a.caminho, a);
  }

  /** O que se sabe de um antepassado, ou `null` se não se sabe nada dele. */
  function ler(caminho: CaminhoAscendente, recurso?: string | null) {
    const guardado = porCaminho.get(caminho);
    const nome = limpar(guardado?.nome) ?? limpar(recurso);
    const registo = limpar(guardado?.registo);
    if (!nome && !registo) return null;
    // Sem nome mas com registo, é o registo que identifica — e é o que se
    // mostra, em vez de um «Não registado» que apagava o único dado que havia.
    return { nome: nome ?? registo!, registo: nome ? registo : null };
  }

  const pai = ler("pai", cavalo.pai);
  const mae = ler("mae", cavalo.mae);
  const avos = {
    paiPai: ler("pai.pai"),
    paiMae: ler("pai.mae"),
    maePai: ler("mae.pai"),
    maeMae: ler("mae.mae"),
  };

  // Sem pai e sem mãe não há árvore. A ficha já só chama este componente
  // quando há um dos dois, mas o componente não confia nisso: um dia é chamado
  // de outro sítio.
  if (!pai && !mae) return null;

  const temAvosPaternos = Boolean(avos.paiPai || avos.paiMae);
  const temAvosMaternos = Boolean(avos.maePai || avos.maeMae);
  const temAvos = temAvosPaternos || temAvosMaternos;

  return (
    <div className="w-full border border-[var(--border-soft)] bg-[var(--background)]">
      <div className="w-full overflow-x-auto py-10">
        <div className="flex min-w-0 items-center justify-center gap-3 px-4 sm:gap-5 md:gap-8 md:px-8">
          {/* O exemplar */}
          <div className="relative border border-[var(--foreground-strong)] bg-[var(--elevate-1)] p-4 sm:p-6 min-w-[140px] sm:min-w-[190px]">
            <span className="rotulo mb-2 block">O exemplar</span>
            <h3 className="text-xl font-normal text-[var(--foreground)]">{cavalo.nome_cavalo}</h3>
          </div>

          <div className="h-px w-3 shrink-0 bg-[var(--border)] sm:w-5 md:w-10" aria-hidden="true" />

          {/* Pais */}
          <div className="flex flex-col gap-6 sm:gap-10">
            {pai && <CartaoAscendente rotulo="Pai" nome={pai.nome} registo={pai.registo} />}
            {mae && <CartaoAscendente rotulo="Mãe" nome={mae.nome} registo={mae.registo} femea />}
          </div>

          {/* Avós — só quando o vendedor os declarou. */}
          {temAvos && (
            <>
              <div
                className="h-px w-3 shrink-0 bg-[var(--border)] sm:w-5 md:w-8"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-6 sm:gap-10">
                <div className="flex flex-col gap-2">
                  {avos.paiPai && (
                    <CartaoAscendente
                      rotulo="Avô paterno"
                      nome={avos.paiPai.nome}
                      registo={avos.paiPai.registo}
                    />
                  )}
                  {avos.paiMae && (
                    <CartaoAscendente
                      rotulo="Avó paterna"
                      nome={avos.paiMae.nome}
                      registo={avos.paiMae.registo}
                      femea
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {avos.maePai && (
                    <CartaoAscendente
                      rotulo="Avô materno"
                      nome={avos.maePai.nome}
                      registo={avos.maePai.registo}
                    />
                  )}
                  {avos.maeMae && (
                    <CartaoAscendente
                      rotulo="Avó materna"
                      nome={avos.maeMae.nome}
                      registo={avos.maeMae.registo}
                      femea
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* A origem do dado, colada ao dado. Um desenho de árvore com caixas e
          linhas lê-se como um documento; esta linha é o que impede isso. */}
      <p className="meta border-t border-[var(--border-soft)] px-4 py-3 text-center">
        Genealogia declarada pelo vendedor. O Portal Lusitano não a confirma junto do Stud-Book.
      </p>
    </div>
  );
}
