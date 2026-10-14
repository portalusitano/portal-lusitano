"use client";

import { useMemo } from "react";
import { CheckCircle, FileText, Info } from "lucide-react";
import type {
  StepProps,
  Resposta,
  Documentos,
  DocumentType,
} from "@/components/vender-cavalo/types";
import {
  pelagens,
  coresOlhos,
  coresCasco,
  temperamentosOpcoes,
  coresCrina,
  paisesOpcoes,
} from "@/components/vender-cavalo/data";
import { idadeEmAnos } from "@/components/vender-cavalo/inspeccao";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Seccao from "@/components/vender-cavalo/Seccao";
import SimNao from "@/components/vender-cavalo/SimNao";
import EscolherFicheiro from "@/components/vender-cavalo/EscolherFicheiro";
import { ErroDoCampo, classeCampo, useFaltas } from "@/components/vender-cavalo/campos-com-erro";
import {
  ApontamentoDoCampo,
  atributosCampo,
  ligarCampo,
} from "@/components/vender-cavalo/apontamentos";
import type { RegistoVerificado } from "@/components/vender-cavalo/usar-registo-apsl";

/**
 * O cavalo.
 *
 * Dezanove campos em duas secções, e agora todos obrigatórios. O microchip
 * estava fora dos obrigatórios com uma razão escrita — são quinze algarismos
 * copiados à mão de um PDF que é anexado dois minutos depois — e essa razão
 * continua a ser verdade; o que mudou é que deixou de ser nossa a decisão.
 * O que se pode fazer, e se faz, é dizer no rótulo **onde** está cada número,
 * para que ninguém tenha de o procurar: o do Livro Azul, o do passaporte.
 *
 * A inspecção do microchip pela ISO 11784 não muda uma vírgula: obrigatório é
 * sobre estar preenchido, o aviso é sobre estar certo, e um campo obrigatório
 * continua a poder ter um aviso.
 *
 * **O Livro Azul passou a anexar-se aqui, antes das doze perguntas que ele
 * responde**, e não no fim do passo 2. Não é arrumação: a nota da secção de
 * baixo dizia, com todas as letras, «está tudo no Livro Azul e no passaporte,
 * **que anexa no passo seguinte**». Ou seja, o formulário mandava procurar um
 * documento, fazia-lhe doze perguntas de seguida, e só depois — passada a
 * ascendência, que são mais catorze perguntas do mesmo documento — é que o
 * pedia.
 *
 * Medido no banco de ensaio, do cabeçalho da secção que manda procurar o Livro
 * Azul até à caixa que o recebia: **1 558px a 1400×950 e 2 842px a 390×700, e
 * uma fronteira de passo pelo meio**. Depois de o anexo passar para cá, a
 * mesma distância é de **307px e 344px, dentro do mesmo ecrã**.
 *
 * Agora o documento chega primeiro e as perguntas vêm a seguir, que é a ordem
 * em que uma pessoa as consegue responder. Não é um campo novo nem um campo a
 * menos: é o mesmo anexo obrigatório, no sítio onde serve.
 */
interface StepIdentificacaoProps extends StepProps {
  /** Em que pé vai a consulta do número de registo à nossa base. */
  registoApsl: RegistoVerificado["estado"];
  documentos: Documentos;
  onDocUpload: (type: DocumentType, file: File) => void;
}

/**
 * O que se escreve na pontuação morfológica quando não há nenhuma.
 *
 * Fica em português nas três línguas de propósito: é o valor que vai para a
 * coluna `nivel_apsl` e daí para a ficha pública, que é escrita em português —
 * um anúncio com «Not graded» no meio de uma ficha portuguesa é um dado
 * traduzido a meio caminho, e a coluna não guarda a língua em que foi escrito.
 */
const NAO_CLASSIFICADO = "Não classificado";

export default function StepIdentificacao(props: StepIdentificacaoProps) {
  const {
    formData,
    updateField,
    erros: errosCrus,
    apontamentos,
    campo,
    registoApsl,
    conta,
    documentos,
    onDocUpload,
  } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  /**
   * As faltas deste passo, separadas em duas: o que está por responder e o
   * que está respondido e mal. A régua é o `estaPreenchido` do catálogo — a
   * mesma que trava o botão e a mesma que conta «7 / 12» no cabeçalho da
   * secção —, e é ela que decide qual dos campos leva vermelho.
   */
  const erros = useFaltas(errosCrus, formData, { livro_azul: Boolean(documentos.livroAzul) });

  /**
   * O que `ligarCampo` precisa de saber, montado uma vez.
   *
   * Era o objecto `props` inteiro. Deixou de poder ser: o `erros` que chega
   * nas props é a lista crua da validação, e o que os campos leem é a versão
   * já separada em «por responder» e «erro». Passar `props` aqui seria pintar
   * de vermelho, pela porta das traseiras, exactamente o que este trabalho
   * deixou de pintar.
   */
  const ligacao = { erros, apontamentos, campo };

  /**
   * A idade não é um campo: é uma conta sobre a data de nascimento.
   *
   * Já era calculada — vai no pedido do checkout desde sempre — mas nunca era
   * mostrada, e é a mostrá-la que ela serve para alguma coisa: quem escreve
   * `2109` em vez de `2019` não vê o engano na data, vê-o no «−83 anos» que
   * aparece ao lado. Um valor que se pode inferir de outro não se pergunta
   * duas vezes; escreve-se.
   */
  const idade = useMemo(() => idadeEmAnos(formData.data_nascimento), [formData.data_nascimento]);

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_id_title}</h2>

      <div className="painel-nota mb-6">
        <Info size={16} className="flex-none mt-0.5" aria-hidden="true" />
        <p>{t.vender_cavalo.apsl_notice}</p>
      </div>

      <div className="space-y-8">
        <Seccao
          titulo={tr("O que vai no anúncio", "What goes on the listing", "Lo que va en el anuncio")}
          nota={tr(
            "É isto que o comprador vê no cartão antes de abrir a ficha.",
            "This is what a buyer sees on the card before opening the listing.",
            "Esto es lo que el comprador ve en la tarjeta antes de abrir la ficha."
          )}
          {...conta("cavalo")}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nome"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.horse_name} *
              </label>
              <input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={(e) => updateField("nome", e.target.value)}
                className={classeCampo(erros, "nome")}
                placeholder={t.vender_cavalo.placeholder_horse_name}
                {...ligarCampo("nome", formData.nome, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="nome" />
            </div>
            <div>
              <label
                htmlFor="numero_registo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.registration_number} *
              </label>
              <input
                id="numero_registo"
                type="text"
                value={formData.numero_registo}
                onChange={(e) => updateField("numero_registo", e.target.value)}
                className={classeCampo(erros, "numero_registo")}
                placeholder={t.vender_cavalo.placeholder_registration_number}
                {...ligarCampo("numero_registo", formData.numero_registo, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="numero_registo" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="numero_registo" />
              {registoApsl === "a-verificar" && (
                <p className="apontamento apontamento--espera">
                  {tr(
                    "A verificar se já existe um anúncio com este número…",
                    "Checking whether a listing already uses this number…",
                    "Comprobando si ya hay un anuncio con este número…"
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="data_nascimento"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.birth_date} *
              </label>
              <input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => updateField("data_nascimento", e.target.value)}
                className={classeCampo(erros, "data_nascimento")}
                {...ligarCampo("data_nascimento", formData.data_nascimento, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="data_nascimento" />
              {idade !== null && idade >= 0 && (
                <p className="meta mt-1 tabular-nums">
                  {idade === 1
                    ? tr("1 ano", "1 year old", "1 año")
                    : tr(`${idade} anos`, `${idade} years old`, `${idade} años`)}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="sexo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.sex} *
              </label>
              <Seleccao
                id="sexo"
                value={formData.sexo}
                onChange={(e) => updateField("sexo", e.target.value)}
                className={classeCampo(erros, "sexo")}
                {...atributosCampo(erros, apontamentos, "sexo")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                <option value="Garanhão">{t.vender_cavalo.stallion}</option>
                <option value="Égua">{t.vender_cavalo.mare}</option>
                <option value="Castrado">{t.vender_cavalo.gelding}</option>
              </Seleccao>
              <ErroDoCampo erros={erros} campo="sexo" />
            </div>
            <div>
              <label
                htmlFor="pelagem"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.coat} *
              </label>
              <Seleccao
                id="pelagem"
                value={formData.pelagem}
                onChange={(e) => updateField("pelagem", e.target.value)}
                className={classeCampo(erros, "pelagem")}
                {...atributosCampo(erros, apontamentos, "pelagem")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {(pelagens[language] || pelagens.pt).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="pelagem" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="altura"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.height} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr("(cm, ao garrote)", "(cm, at the withers)", "(cm, a la cruz)")}
                </span>
              </label>
              <input
                id="altura"
                type="number"
                inputMode="numeric"
                value={formData.altura}
                onChange={(e) => updateField("altura", e.target.value)}
                className={classeCampo(erros, "altura")}
                placeholder={t.vender_cavalo.placeholder_height}
                min={100}
                max={220}
                {...ligarCampo("altura", formData.altura, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="altura" />
              <ApontamentoDoCampo
                apontamentos={apontamentos}
                campo="altura"
                aoAceitar={campo.aoAceitar}
              />
            </div>
            <div>
              <label
                htmlFor="temperamento"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Temperamento", "Temperament", "Temperamento")} *
              </label>
              <Seleccao
                id="temperamento"
                value={formData.temperamento}
                onChange={(e) => updateField("temperamento", e.target.value)}
                className={classeCampo(erros, "temperamento")}
                {...atributosCampo(erros, apontamentos, "temperamento")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {(temperamentosOpcoes[language] || temperamentosOpcoes.pt).map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="temperamento" />
            </div>
          </div>
        </Seccao>

        {/* ── O Livro Azul ────────────────────────────────────────────────
            Vem antes da secção que ele responde, e não depois dela nem no
            passo seguinte. O `data-campo` é o que permite ao resumo de erros
            no topo do passo vir ter aqui: um `<input type=file>` está
            escondido dentro da etiqueta e não serve de alvo. */}
        <div className="cartao p-4" data-campo="livro_azul">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="titulo-seccao flex items-center gap-2">
              <FileText size={16} className="text-[var(--foreground-muted)]" aria-hidden="true" />
              {t.vender_cavalo.blue_book} *
            </span>
            {documentos.livroAzul && (
              <CheckCircle size={18} className="flex-none text-[var(--ok)]" aria-hidden="true" />
            )}
          </div>
          <p className="vc-nota mb-3">
            {tr(
              "As doze respostas a seguir estão todas aqui dentro. Anexe-o primeiro e copie de lá.",
              "The twelve answers below are all in here. Attach it first and copy from it.",
              "Las doce respuestas siguientes están todas aquí. Adjúntelo primero y copie de él."
            )}
          </p>
          <EscolherFicheiro
            texto={documentos.livroAzul ? documentos.livroAzul.name : t.vender_cavalo.choose_file}
            falta={erros.livro_azul?.nivel}
            descritoPor={erros.livro_azul ? "erro-livro_azul" : undefined}
            aoEscolher={(f) => onDocUpload("livroAzul", f[0])}
          />
          <ErroDoCampo erros={erros} campo="livro_azul" />

          {/* O passaporte continua a não travar o passo, e a razão é a mesma
              que já cá estava: quem publica um cavalo com Livro Azul tem o
              documento que prova a identidade. Não é um campo do formulário —
              é um segundo anexo do mesmo facto. E está aqui porque o número
              que a caixa do passaporte pede, três perguntas abaixo, é o que
              vem escrito nele. */}
          <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
            <div className="flex items-center justify-between gap-3 mb-2">
              {/* `text-sm` no `--foreground`, como estava antes de mudar de
                  passo: é o rótulo de um controlo e não uma legenda. Com a
                  `.rotulo` media 3,45:1 sobre este cartão. */}
              <span className="text-sm font-medium">{t.vender_cavalo.equine_passport}</span>
              {documentos.passaporte && (
                <CheckCircle size={16} className="flex-none text-[var(--ok)]" aria-hidden="true" />
              )}
            </div>
            <p className="vc-nota mb-3">{t.vender_cavalo.equine_passport_desc}</p>
            <EscolherFicheiro
              texto={
                documentos.passaporte
                  ? documentos.passaporte.name
                  : t.vender_cavalo.choose_file_short
              }
              aoEscolher={(f) => onDocUpload("passaporte", f[0])}
            />
          </div>
        </div>

        <Seccao
          titulo={tr(
            "Identificação oficial e morfologia",
            "Official identification and conformation",
            "Identificación oficial y morfología"
          )}
          nota={tr(
            "Está tudo no Livro Azul e no passaporte, que acabou de anexar aqui em cima.",
            "All of it is on the Blue Book and passport you have just attached above.",
            "Todo está en el Libro Azul y el pasaporte que acaba de adjuntar arriba."
          )}
          {...conta("identificacao")}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nome_registo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.registration_name} *
              </label>
              <input
                id="nome_registo"
                type="text"
                value={formData.nome_registo}
                onChange={(e) => updateField("nome_registo", e.target.value)}
                className={classeCampo(erros, "nome_registo")}
                placeholder={t.vender_cavalo.placeholder_registration_name}
                {...ligarCampo("nome_registo", formData.nome_registo, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="nome_registo" />
            </div>
            <div>
              <label
                htmlFor="microchip"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.microchip_number} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    "(15 algarismos, no Livro Azul)",
                    "(15 digits, on the Blue Book)",
                    "(15 dígitos, en el Libro Azul)"
                  )}
                </span>
              </label>
              <input
                id="microchip"
                type="text"
                inputMode="numeric"
                maxLength={15}
                value={formData.microchip}
                onChange={(e) => updateField("microchip", e.target.value)}
                className={classeCampo(erros, "microchip")}
                placeholder={t.vender_cavalo.placeholder_microchip}
                {...ligarCampo("microchip", formData.microchip, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="microchip" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="microchip" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="passaporte_equino"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.passport_number} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    "(UELN: 15 caracteres, 620 em Portugal)",
                    "(UELN: 15 characters, 620 for Portugal)",
                    "(UELN: 15 caracteres, 620 en Portugal)"
                  )}
                </span>
              </label>
              <input
                id="passaporte_equino"
                type="text"
                value={formData.passaporte_equino}
                onChange={(e) => updateField("passaporte_equino", e.target.value)}
                className={classeCampo(erros, "passaporte_equino")}
                placeholder={t.vender_cavalo.placeholder_passport}
                {...ligarCampo("passaporte_equino", formData.passaporte_equino, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="passaporte_equino" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="passaporte_equino" />
            </div>
            <div>
              <label
                htmlFor="raca_confirmada"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Raça Confirmada", "Confirmed Breed", "Raza Confirmada")} *
              </label>
              <Seleccao
                id="raca_confirmada"
                value={formData.raca_confirmada}
                onChange={(e) => updateField("raca_confirmada", e.target.value)}
                className={classeCampo(erros, "raca_confirmada")}
                {...atributosCampo(erros, apontamentos, "raca_confirmada")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                <option value="PSL — Puro Sangue Lusitano">PSL — Puro Sangue Lusitano</option>
                <option value="Cruzado PSL (com passaporte)">Cruzado PSL (com passaporte)</option>
                <option value="PRE — Pura Raza Española">PRE — Pura Raza Española</option>
                <option value="Anglo-Lusitano">Anglo-Lusitano</option>
                <option value="Outro (com registo)">Outro (com registo)</option>
              </Seleccao>
              <ErroDoCampo erros={erros} campo="raca_confirmada" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pais_nascimento"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("País de Nascimento", "Country of Birth", "País de Nacimiento")} *
              </label>
              <Seleccao
                id="pais_nascimento"
                value={formData.pais_nascimento}
                onChange={(e) => updateField("pais_nascimento", e.target.value)}
                className={classeCampo(erros, "pais_nascimento")}
                {...atributosCampo(erros, apontamentos, "pais_nascimento")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {paisesOpcoes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="pais_nascimento" />
            </div>
            <div>
              <label
                htmlFor="peso"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Peso", "Weight", "Peso")} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">(kg)</span>
              </label>
              <input
                id="peso"
                type="number"
                inputMode="numeric"
                value={formData.peso}
                onChange={(e) => updateField("peso", e.target.value)}
                className={classeCampo(erros, "peso")}
                placeholder="500"
                min={50}
                max={1200}
                {...ligarCampo("peso", formData.peso, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="peso" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="peso" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="cor_olhos"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Cor dos Olhos", "Eye Color", "Color de Ojos")} *
              </label>
              <Seleccao
                id="cor_olhos"
                value={formData.cor_olhos}
                onChange={(e) => updateField("cor_olhos", e.target.value)}
                className={classeCampo(erros, "cor_olhos")}
                {...atributosCampo(erros, apontamentos, "cor_olhos")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {coresOlhos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="cor_olhos" />
            </div>
            <div>
              <label
                htmlFor="cor_crina"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Cor da Crina", "Mane Color", "Color de Crines")} *
              </label>
              <Seleccao
                id="cor_crina"
                value={formData.cor_crina}
                onChange={(e) => updateField("cor_crina", e.target.value)}
                className={classeCampo(erros, "cor_crina")}
                {...atributosCampo(erros, apontamentos, "cor_crina")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {coresCrina.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="cor_crina" />
            </div>
            <div>
              <label
                htmlFor="cor_casco"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Cor do Casco", "Hoof Color", "Color del Casco")} *
              </label>
              <Seleccao
                id="cor_casco"
                value={formData.cor_casco}
                onChange={(e) => updateField("cor_casco", e.target.value)}
                className={classeCampo(erros, "cor_casco")}
                {...atributosCampo(erros, apontamentos, "cor_casco")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {coresCasco.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="cor_casco" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="marcas_distintivas"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Marcas Distintivas", "Distinctive Markings", "Marcas Distintivas")} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    '(se não tiver nenhuma, escreva "Nenhuma")',
                    '(if there are none, write "None")',
                    '(si no tiene ninguna, escriba "Ninguna")'
                  )}
                </span>
              </label>
              <input
                id="marcas_distintivas"
                type="text"
                value={formData.marcas_distintivas}
                onChange={(e) => updateField("marcas_distintivas", e.target.value)}
                className={classeCampo(erros, "marcas_distintivas")}
                placeholder="Ex: Estrela na testa, meia-lua, meia no posterior esquerdo"
                {...ligarCampo("marcas_distintivas", formData.marcas_distintivas, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="marcas_distintivas" />
            </div>
            <div>
              <label
                htmlFor="nivel_apsl"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr(
                  "Pontuação Morfológica APSL",
                  "APSL Morphological Score",
                  "Puntuación Morfológica APSL"
                )}{" "}
                *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    "(no Livro Azul, se já foi a uma classificação)",
                    "(on the Blue Book, if it has been graded)",
                    "(en el Libro Azul, si ya fue a una calificación)"
                  )}
                </span>
                {/* ── «Não classificado» é uma resposta ────────────────────
                    Um cavalo só tem pontuação depois de ir a uma classificação
                    morfológica, e muitos nunca foram — um poldro nunca foi, por
                    definição. Este campo é obrigatório e era uma caixa de texto
                    livre com o exemplo «78.5 pontos — Muito Bom» e um aviso a
                    dizer que as pontuações «andam quase sempre entre 60 e 80»:
                    quem não tivesse nenhuma ficava com duas saídas, inventar um
                    número ou não publicar. As duas são más, e a primeira é pior
                    — é o formulário a pedir que se declare o que não é verdade,
                    que é exactamente a armadilha que as vinte e sete perguntas
                    de sim/não existem para não repetir («não» é uma resposta a
                    sério, e ainda não ter lido a pergunta não é).
                    Obrigatório continua a querer dizer **respondido**: o que
                    muda é que passa a haver a resposta certa para quem não tem
                    pontuação, e ela escreve-se com um toque em vez de nove
                    teclas. O botão desaparece assim que houver seja o que for
                    escrito na caixa. */}
                {!formData.nivel_apsl.trim() && (
                  <button
                    type="button"
                    className="btn btn-subtil btn-sm ml-2 align-baseline"
                    onClick={() => {
                      updateField("nivel_apsl", NAO_CLASSIFICADO);
                      campo.aoEscolher("nivel_apsl");
                    }}
                  >
                    {tr("nunca foi classificado", "never graded", "nunca fue calificado")}
                  </button>
                )}
              </label>
              <input
                id="nivel_apsl"
                type="text"
                value={formData.nivel_apsl}
                onChange={(e) => updateField("nivel_apsl", e.target.value)}
                className={classeCampo(erros, "nivel_apsl")}
                placeholder="Ex: 78.5 pontos — Muito Bom"
                {...ligarCampo("nivel_apsl", formData.nivel_apsl, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="nivel_apsl" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="nivel_apsl" />
            </div>
          </div>

          <SimNao
            id="prova_aptidao_apsl"
            pergunta={tr(
              "Prova de Aptidão APSL realizada",
              "APSL Aptitude Test completed",
              "Prueba de Aptitud APSL realizada"
            )}
            valor={formData.prova_aptidao_apsl}
            onChange={(v: Resposta) => {
              updateField("prova_aptidao_apsl", v);
              campo.aoEscolher("prova_aptidao_apsl");
            }}
            erros={erros}
          />
        </Seccao>
      </div>
    </div>
  );
}
