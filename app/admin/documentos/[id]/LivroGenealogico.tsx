"use client";

/**
 * A consulta assistida ao Livro Genealógico, do lado de quem revê.
 *
 * ## O que esta secção é, e o que não é
 *
 * É um sítio para **ir ver** e para **escrever o que se viu**. Não consulta
 * nada: o botão abre a página pública da APSL no browser de quem revê e
 * põe-lhe o número na área de transferência, porque a consulta pública tem um
 * reCAPTCHA e um CAPTCHA é o operador a dizer que aquele formulário é para
 * pessoas. O resto do painel é um formulário de três respostas.
 *
 * ## As três regras que esta secção cumpre à letra
 *
 * 1. **Só `consta` é um facto verde.** «Não consta» e «não se conseguiu saber»
 *    ficam a cinzento como tudo o resto, e não a vermelho: um erro de
 *    transcrição, um cavalo estrangeiro por inscrever, um número antigo e uma
 *    falsificação produzem todos o mesmo silêncio, e nós não os sabemos
 *    distinguir. Pintar esse silêncio de vermelho era escolher uma das quatro
 *    explicações e mostrá-la a quem está prestes a decidir.
 * 2. **Nada aqui decide.** Não há nesta secção nenhum caminho que verifique ou
 *    recuse um documento. Os botões da decisão continuam onde estavam, na
 *    coluna do confronto, e o que se regista aqui vai para outra tabela.
 * 3. **Uma resposta escreve-se com um nome.** O e-mail de quem carrega fica na
 *    linha, e a base recusa-a sem ele. É a mesma conta que o `verificado_por`
 *    paga do lado do documento: uma observação sem autor é indistinguível de
 *    uma que um programa escreveu.
 */

import { useState } from "react";
import { BookOpen, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import {
  ROTULO_DA_RESPOSTA,
  ROTULO_DO_ESTADO_DA_CONSULTA,
  ROTULO_DO_IDENTIFICADOR,
  type StudBookNaFicha,
} from "../tipos";
import type { ConsultaGuardada } from "@/lib/documentos/stud-book/contrato";
import { RESPOSTAS_ASSISTIDAS, type RespostaAssistida } from "@/lib/documentos/stud-book/assistida";

/** Lê o erro de qualquer das duas convenções em jogo — a da API e a do middleware. */
function mensagemDeErro(corpo: unknown, alternativa: string): string {
  const c = corpo as { erro?: unknown; error?: unknown } | null;
  if (typeof c?.erro === "string") return c.erro;
  if (typeof c?.error === "string") return c.error;
  return alternativa;
}

export default function LivroGenealogico({
  documentoId,
  studBook,
}: {
  documentoId: string;
  studBook: StudBookNaFicha;
}) {
  const [registado, setRegistado] = useState<ConsultaGuardada | null>(studBook.registado);
  const [resposta, setResposta] = useState<RespostaAssistida | null>(null);
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [pelagem, setPelagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // O registo escreve-se por anúncio, e antes do pagamento não há anúncio
  // nenhum a que prender a resposta. A `chave` só vem do servidor nesse caso —
  // é ela que diz se se pode registar, e não uma segunda regra escrita aqui.
  const podeRegistar = studBook.chave !== null;

  async function copiar() {
    if (!studBook.valor) return;
    try {
      await navigator.clipboard.writeText(studBook.valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem área de transferência (permissão negada, contexto não seguro) o
      // número continua no ecrã, em mono e seleccionável. Não se avisa: quem
      // não conseguiu copiar já está a olhar para o que queria copiar.
    }
  }

  async function registar() {
    if (!resposta || !studBook.chave) return;
    setOcupado(true);
    setErro(null);
    try {
      const corpo: Record<string, unknown> = { resposta, chave: studBook.chave };
      if (resposta === "consta") corpo.visto = { nome, dataNascimento, pelagem };

      const r = await fetch(`/api/admin/documentos/${documentoId}/stud-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const json = await r.json().catch(() => null);
      if (!r.ok) throw new Error(mensagemDeErro(json, "Não foi possível registar a consulta."));

      setRegistado((json as { consulta: ConsultaGuardada }).consulta);
      setResposta(null);
      setNome("");
      setDataNascimento("");
      setPelagem("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registar a consulta.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="rotulo-forte mb-3 flex items-center gap-2">
        <BookOpen size={13} aria-hidden />O Livro Genealógico
      </h2>

      <div className="cartao p-5">
        {/* ── Porque é que a consulta é à mão ──────────────────────────────── */}
        <p className="meta max-w-prose">
          {studBook.automaticaLigada ? (
            <>
              A consulta automática está ligada. O que registar aqui é o que{" "}
              <strong className="text-[var(--foreground)]">você</strong> viu, e fica ao lado do que
              o pedido automático trouxer.
            </>
          ) : (
            <>
              A consulta pública da APSL tem um reCAPTCHA — é o operador a dizer que aquele
              formulário é para pessoas, e não se contorna. Por isso quem vai ver é você, como
              qualquer cidadão, e o portal guarda o que você viu. O registo enche-se na mesma.
            </>
          )}
        </p>

        {/* ── O número, e a porta ──────────────────────────────────────────── */}
        {studBook.valor && studBook.identificador ? (
          <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
            <span className="rotulo block">
              Procure por {ROTULO_DO_IDENTIFICADOR[studBook.identificador]}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg text-[var(--foreground-strong)] tabular-nums">
                {studBook.valor}
              </span>
              <button type="button" onClick={copiar} className="btn btn-subtil btn-sm">
                {copiado ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                {copiado ? "Copiado" : "Copiar"}
              </button>
              <a
                href={studBook.paginaPublica}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secundario btn-sm"
              >
                Abrir a consulta pública <ExternalLink size={11} aria-hidden />
              </a>
            </div>
            <p className="meta mt-3 max-w-prose">
              Cole no campo «{studBook.campoDaPesquisa}» — é um campo só para os três números. O
              endereço não leva o número consigo porque os parâmetros do motor de pesquisa nunca
              foram observados, e um endereço inventado levava-o a uma pesquisa que não é esta.
              {studBook.origemDoValor === "documento" && (
                <>
                  {" "}
                  Este número foi lido do ficheiro, não do anúncio: o anúncio ainda não existe
                  porque o documento sobe antes do pagamento.
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="meta mt-5 border-t border-[var(--border-soft)] pt-5">
            Não há aqui nenhum número por que perguntar — nem no anúncio, nem lido do ficheiro. Não
            é um defeito da submissão: é uma submissão sem número.
          </p>
        )}

        {/* ── O que já ficou registado ─────────────────────────────────────── */}
        {registado && (
          <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
            <span className="rotulo block">Já registado</span>
            <p
              className="mt-1 text-sm"
              style={{
                // Só o `confirmado` é um facto que autoriza dizer alguma coisa.
                // Os outros dois ficam com a cor do texto comum — ver a regra 1
                // no cabeçalho.
                color:
                  registado.estado === "confirmado" ? "var(--ok)" : "var(--foreground-secondary)",
              }}
            >
              {ROTULO_DO_ESTADO_DA_CONSULTA[registado.estado]}
            </p>
            <p className="meta mt-1">
              {registado.origem === "assistida"
                ? `Visto por ${registado.por ?? "—"}`
                : "Por consulta automática"}
              {registado.consultadoEm &&
                ` · ${new Date(registado.consultadoEm).toLocaleString("pt-PT")}`}
            </p>
            {registado.registo && (
              <dl className="meta mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
                {registado.registo.nome && (
                  <>
                    <dt>Nome no stud-book</dt>
                    <dd className="text-[var(--foreground-secondary)]">{registado.registo.nome}</dd>
                  </>
                )}
                {registado.registo.dataNascimento && (
                  <>
                    <dt>Data de nascimento</dt>
                    <dd className="font-mono text-[var(--foreground-secondary)]">
                      {registado.registo.dataNascimento}
                    </dd>
                  </>
                )}
                {registado.registo.pelagem && (
                  <>
                    <dt>Pelagem</dt>
                    <dd className="text-[var(--foreground-secondary)]">
                      {registado.registo.pelagem}
                    </dd>
                  </>
                )}
              </dl>
            )}
          </div>
        )}

        {/* ── A resposta ───────────────────────────────────────────────────
            Sem anúncio não se desenha o formulário. Três botões desligados que
            parecem ligados — a `.chip` não tem estado desactivado — são piores
            do que a frase que explica porque é que ainda não há onde escrever. */}
        {studBook.valor && !podeRegistar && (
          <p className="meta mt-5 max-w-prose border-t border-[var(--border-soft)] pt-5">
            A resposta ainda não tem onde ficar: o registo é por anúncio, e o anúncio nasce quando o
            pagamento passa. Consulte à mesma — o que vir ajuda a decidir aqui e agora, e quando o
            anúncio nascer esta secção passa a poder guardá-lo.
          </p>
        )}

        {studBook.valor && podeRegistar && (
          <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
            <span className="rotulo-forte mb-1 block">
              {registado ? "Voltou a ver? Registe outra vez" : "O que é que apareceu?"}
            </span>
            <p className="meta mb-3 max-w-prose">
              «Não consta» não é uma acusação: um erro de transcrição, um cavalo estrangeiro por
              inscrever e um número antigo dão todos o mesmo resultado. E se não conseguiu ver, diga
              isso — é a resposta que impede as outras duas de mentirem.
            </p>

            <div className="flex flex-wrap gap-2">
              {RESPOSTAS_ASSISTIDAS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={resposta === r}
                  disabled={ocupado}
                  onClick={() => setResposta(resposta === r ? null : r)}
                  // A `.chip` não tem estado desactivado, e um botão que parece
                  // carregável e não é lê-se como uma avaria. As utilidades do
                  // Tailwind estão numa camada posterior, logo ganham à classe.
                  className={`${resposta === r ? "chip chip-activo" : "chip"} disabled:cursor-default disabled:opacity-50`}
                >
                  {ROTULO_DA_RESPOSTA[r]}
                </button>
              ))}
            </div>

            {resposta === "consta" && (
              <div className="anim-crescer mt-4">
                <p className="meta mb-3 max-w-prose">
                  Se copiar o que está no ecrã da APSL, o portal passa a poder comparar com o que o
                  vendedor escreveu. É opcional — sem isto fica registado que consta, que já é uma
                  afirmação verdadeira e mais pequena.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="rotulo mb-1 block">Nome no stud-book</span>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      maxLength={120}
                      className="campo w-full"
                      placeholder="Opcional"
                    />
                  </label>
                  <label className="block">
                    <span className="rotulo mb-1 block">Data de nascimento</span>
                    <input
                      type="text"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      maxLength={120}
                      className="campo w-full font-mono"
                      placeholder="12/04/2019"
                    />
                  </label>
                  <label className="block">
                    <span className="rotulo mb-1 block">Pelagem</span>
                    <input
                      type="text"
                      value={pelagem}
                      onChange={(e) => setPelagem(e.target.value)}
                      maxLength={120}
                      className="campo w-full"
                      placeholder="Opcional"
                    />
                  </label>
                </div>
              </div>
            )}

            {resposta && (
              <div className="anim-crescer mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={registar}
                  disabled={ocupado}
                  className="btn btn-secundario"
                >
                  {ocupado ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                  ) : (
                    <Check size={13} aria-hidden />
                  )}
                  Registar «{ROTULO_DA_RESPOSTA[resposta]}»
                </button>
                <button
                  type="button"
                  onClick={() => setResposta(null)}
                  disabled={ocupado}
                  className="btn btn-subtil"
                >
                  Cancelar
                </button>
              </div>
            )}

            <p className="meta mt-4 max-w-prose">
              Isto não verifica o documento. O que se regista aqui é uma consulta ao Livro
              Genealógico, e vai para outro lado; a decisão sobre este documento continua a ser o
              botão lá em cima, com o seu nome.
            </p>

            {erro && (
              <p role="alert" className="meta mt-3" style={{ color: "var(--erro)" }}>
                {erro}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
