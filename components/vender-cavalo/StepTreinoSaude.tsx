"use client";

import { useMemo } from "react";
import { Upload, CheckCircle, Shield } from "lucide-react";
import type {
  StepProps,
  Documentos,
  DocumentType,
  FormData as DadosFormulario,
} from "@/components/vender-cavalo/types";
import {
  niveisTreino,
  disciplinasOpcoes,
  tiposFerragemOpcoes,
  niveisCavaleiro,
  usosAtuais,
  regimesEstabulacao,
  tiposAlimentacao,
} from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Seccao from "@/components/vender-cavalo/Seccao";
import SimNao from "@/components/vender-cavalo/SimNao";
import { ErroDoCampo, classeCampo } from "@/components/vender-cavalo/campos-com-erro";
import {
  ApontamentoDoCampo,
  atributosCampo,
  ligarCampo,
} from "@/components/vender-cavalo/apontamentos";

interface StepTreinoSaudeProps extends StepProps {
  documentos: Documentos;
  onDocUpload: (type: DocumentType, file: File) => void;
  onToggleDisciplina: (disc: string) => void;
  onToggleUso: (uso: string) => void;
}

/**
 * Treino, comportamento, maneio e saúde.
 *
 * Trinta e cinco campos em cinco secções abertas. Eram quatro gavetas fechadas
 * — «Uso, competições e quem o monta», «Comportamento e Maneabilidade»,
 * «Maneio e Rotina», «Datas, veterinário e histórico clínico» — todas com a
 * palavra «Opcional» na cabeça.
 *
 * **As vinte e uma caixas de selecção deste passo passaram a perguntas de sim
 * ou não** (ver `SimNao.tsx`). É aqui que a diferença se vê melhor: «bom com o
 * ferrador» era uma caixa, e uma caixa por marcar não distingue um cavalo
 * difícil de ferrar de um vendedor que ainda não leu a pergunta. Com a caixa,
 * tornar isto obrigatório seria obrigar toda a gente a declarar que o cavalo é
 * bom com o ferrador — que é exactamente o defeito que a vacinação obrigatória
 * tinha e que já custou uma correcção a este formulário.
 *
 * **`nome_veterinario` é o único campo do formulário que não é obrigatório**, e
 * a razão não é de gosto: é o nome de um terceiro que nunca consentiu em
 * aparecer num classificados. Ver `CAMPOS_VOLUNTARIOS` em `campos.ts`.
 */
export default function StepTreinoSaude(props: StepTreinoSaudeProps) {
  const {
    formData,
    updateField,
    documentos,
    onDocUpload,
    onToggleDisciplina,
    onToggleUso,
    erros,
    apontamentos,
    campo,
    conta,
  } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  /** Uma pergunta de sim/não ligada a um campo, que é sempre a mesma ligação. */
  const pergunta = (id: keyof DadosFormulario, texto: string, nota?: string) => (
    <SimNao
      key={id}
      id={id}
      pergunta={texto}
      nota={nota}
      valor={formData[id] as "" | "sim" | "nao"}
      onChange={(v) => {
        updateField(id, v);
        campo.aoEscolher(id);
      }}
      erros={erros}
    />
  );

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_training_title}</h2>

      <div className="space-y-8">
        <Seccao
          titulo={tr("Treino e disciplinas", "Training and disciplines", "Doma y disciplinas")}
          nota={tr(
            "É por aqui que a grelha de anúncios filtra.",
            "This is what the listings grid filters on.",
            "Es por aquí que la parrilla de anuncios filtra."
          )}
          {...conta("treino")}
        >
          <div>
            <label
              htmlFor="nivel_treino"
              className="block text-sm text-[var(--foreground-secondary)] mb-2"
            >
              {t.vender_cavalo.training_level} *
            </label>
            <Seleccao
              id="nivel_treino"
              value={formData.nivel_treino}
              onChange={(e) => {
                updateField("nivel_treino", e.target.value);
                // Escolher é um acto acabado, e este nível é lido contra a data
                // de nascimento: a incoerência aparece na escolha, não no `blur`
                // — um `<Seleccao>` não tem nenhum de que se possa depender.
                campo.aoEscolher("nivel_treino");
              }}
              className={classeCampo(erros, "nivel_treino")}
              {...atributosCampo(erros, apontamentos, "nivel_treino")}
            >
              <option value="">{t.vender_cavalo.select}</option>
              {(niveisTreino[language] || niveisTreino.pt).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Seleccao>
            <ErroDoCampo erros={erros} campo="nivel_treino" />
            <ApontamentoDoCampo apontamentos={apontamentos} campo="nivel_treino" />
          </div>

          {/* Uma lista de pastilhas não tem `id` onde pôr o foco: o `data-campo`
              é o que traz o resumo de erros do topo até aqui. */}
          <div data-campo="disciplinas">
            <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
              {t.vender_cavalo.disciplines} *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr("(pelo menos uma)", "(at least one)", "(al menos una)")}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(disciplinasOpcoes[language] || disciplinasOpcoes.pt).map((disc) => (
                <button
                  key={disc}
                  type="button"
                  onClick={() => onToggleDisciplina(disc)}
                  className={`chip touch-manipulation ${
                    formData.disciplinas.includes(disc) ? "chip-activo" : ""
                  }`}
                  aria-pressed={formData.disciplinas.includes(disc)}
                >
                  {disc}
                </button>
              ))}
            </div>
            <ErroDoCampo erros={erros} campo="disciplinas" />
          </div>

          <div>
            <label
              htmlFor="nivel_cavaleiro"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr(
                "Nível de Cavaleiro Recomendado",
                "Recommended Rider Level",
                "Nivel de Jinete Recomendado"
              )}{" "}
              *
            </label>
            <Seleccao
              id="nivel_cavaleiro"
              value={formData.nivel_cavaleiro}
              onChange={(e) => updateField("nivel_cavaleiro", e.target.value)}
              className={classeCampo(erros, "nivel_cavaleiro")}
              {...atributosCampo(erros, apontamentos, "nivel_cavaleiro")}
            >
              <option value="">{t.vender_cavalo.select}</option>
              {(niveisCavaleiro[language] || niveisCavaleiro.pt).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Seleccao>
            <ErroDoCampo erros={erros} campo="nivel_cavaleiro" />
          </div>
        </Seccao>

        <Seccao
          titulo={tr(
            "Uso, competições e quem o monta",
            "Use, competitions and who rides it",
            "Uso, competiciones y quién lo monta"
          )}
          nota={tr(
            "É daqui que sai a matéria do texto do anúncio.",
            "This is what gives the listing text something to say.",
            "De aquí sale la materia del texto del anuncio."
          )}
          {...conta("uso")}
        >
          <div data-campo="uso_atual">
            <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
              {tr("Uso Atual do Cavalo", "Current Horse Use", "Uso Actual del Caballo")} *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr("(pelo menos um)", "(at least one)", "(al menos uno)")}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(usosAtuais[language] || usosAtuais.pt).map((uso) => (
                <button
                  key={uso}
                  type="button"
                  onClick={() => onToggleUso(uso)}
                  className={`chip touch-manipulation ${
                    formData.uso_atual.includes(uso) ? "chip-activo" : ""
                  }`}
                  aria-pressed={formData.uso_atual.includes(uso)}
                >
                  {uso}
                </button>
              ))}
            </div>
            <ErroDoCampo erros={erros} campo="uso_atual" />
          </div>

          <div>
            <label
              htmlFor="anos_treino"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr("Anos de Treino", "Training Years", "Años de Entrenamiento")} *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr(
                  "(anos em trabalho; 0 se ainda não foi desbastado)",
                  "(years in work; 0 if not yet started)",
                  "(años en trabajo; 0 si aún no fue domado)"
                )}
              </span>
            </label>
            <input
              id="anos_treino"
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              value={formData.anos_treino}
              onChange={(e) => updateField("anos_treino", e.target.value)}
              className={classeCampo(erros, "anos_treino")}
              placeholder="Ex: 5"
              {...ligarCampo("anos_treino", formData.anos_treino, props)}
            />
            <ErroDoCampo erros={erros} campo="anos_treino" />
            <ApontamentoDoCampo apontamentos={apontamentos} campo="anos_treino" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="treinador_atual"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Treinador Atual", "Current Trainer", "Entrenador Actual")} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    '("Nenhum" se não houver)',
                    '("None" if there is none)',
                    '("Ninguno" si no hay)'
                  )}
                </span>
              </label>
              <input
                id="treinador_atual"
                type="text"
                value={formData.treinador_atual}
                onChange={(e) => updateField("treinador_atual", e.target.value)}
                className={classeCampo(erros, "treinador_atual")}
                placeholder="Nome do treinador"
                {...ligarCampo("treinador_atual", formData.treinador_atual, props)}
              />
              <ErroDoCampo erros={erros} campo="treinador_atual" />
            </div>
            <div>
              <label
                htmlFor="ginete_habitual"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Ginete Habitual", "Regular Rider", "Jinete Habitual")} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    '("Nenhum" se não houver)',
                    '("None" if there is none)',
                    '("Ninguno" si no hay)'
                  )}
                </span>
              </label>
              <input
                id="ginete_habitual"
                type="text"
                value={formData.ginete_habitual}
                onChange={(e) => updateField("ginete_habitual", e.target.value)}
                className={classeCampo(erros, "ginete_habitual")}
                placeholder="Nome do cavaleiro habitual"
                {...ligarCampo("ginete_habitual", formData.ginete_habitual, props)}
              />
              <ErroDoCampo erros={erros} campo="ginete_habitual" />
            </div>
          </div>

          <div>
            <label
              htmlFor="competicoes"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.competitions} *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr(
                  '("Nenhuma" se nunca competiu)',
                  '("None" if it never competed)',
                  '("Ninguna" si nunca compitió)'
                )}
              </span>
            </label>
            <input
              id="competicoes"
              type="text"
              value={formData.competicoes}
              onChange={(e) => updateField("competicoes", e.target.value)}
              className={classeCampo(erros, "competicoes")}
              placeholder={t.vender_cavalo.placeholder_competitions}
              {...ligarCampo("competicoes", formData.competicoes, props)}
            />
            <ErroDoCampo erros={erros} campo="competicoes" />
          </div>

          {/* Era um `<input>` de uma linha, e a coluna na base é `text[]`.
              Quem escrevesse «Campeão Nacional, 2023» publicava **dois**
              prémios, e um deles chamava-se «2023» — o separador tinha de ser
              adivinhado porque a caixa não dava maneira de os separar. Um
              prémio por linha não se adivinha: quem escreve é que decide onde
              acaba um e começa o outro. */}
          <div>
            <label
              htmlFor="premios"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.awards} *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr(
                  '(um por linha; "Nenhum" se não houver)',
                  '(one per line; "None" if there are none)',
                  '(uno por línea; "Ninguno" si no hay)'
                )}
              </span>
            </label>
            <textarea
              id="premios"
              rows={3}
              value={formData.premios}
              onChange={(e) => updateField("premios", e.target.value)}
              className={classeCampo(erros, "premios", "h-24 resize-none")}
              placeholder={"Campeão Nacional, 2023\n2.º lugar Taça de Portugal, 2022"}
              {...ligarCampo("premios", formData.premios, props)}
            />
            <ErroDoCampo erros={erros} campo="premios" />
          </div>
        </Seccao>

        <Seccao
          titulo={tr(
            "Comportamento e Maneabilidade",
            "Behaviour & Tractability",
            "Comportamiento y Manejabilidad"
          )}
          nota={tr(
            "Das respostas mais valorizadas por quem compra — e «não» é uma resposta.",
            "Among the most valued answers for a buyer — and “no” is an answer.",
            "De lo más valorado por quien compra — y «no» es una respuesta."
          )}
          {...conta("comportamento")}
        >
          {pergunta(
            "habituado_transporte",
            tr(
              "Habituado a transporte (lorry / trailer)",
              "Used to transport (lorry / trailer)",
              "Habituado al transporte (camión / remolque)"
            )
          )}
          {pergunta(
            "habituado_ferrador",
            tr("Bom com o ferrador", "Good with the farrier", "Bueno con el herrador")
          )}
          {pergunta(
            "habituado_veterinario",
            tr("Bom com o veterinário", "Good with the vet", "Bueno con el veterinario")
          )}
          {pergunta(
            "trabalha_em_grupo",
            tr("Trabalha bem em grupo", "Works well in a group", "Trabaja bien en grupo")
          )}
          {pergunta(
            "trabalha_solto",
            tr(
              "Trabalha solto / em liberdade",
              "Works loose / at liberty",
              "Trabaja suelto / en libertad"
            )
          )}
          {pergunta(
            "trabalha_a_mao",
            tr(
              "Trabalha à mão (longe / corda)",
              "Works in hand (lunge / long rein)",
              "Trabaja a la mano (cuerda)"
            )
          )}
          {pergunta(
            "habituado_campo",
            tr(
              "Habituado a campo / exterior",
              "Used to turnout / outdoors",
              "Habituado al campo / exterior"
            )
          )}
          {pergunta(
            "apto_criancas",
            tr(
              "Apto para crianças / principiantes",
              "Suitable for children / beginners",
              "Apto para niños / principiantes"
            )
          )}
        </Seccao>

        <Seccao
          titulo={tr("Maneio e Rotina", "Management & Routine", "Manejo y Rutina")}
          nota={tr(
            "Como vive e quanto trabalha.",
            "How it lives and how much it works.",
            "Cómo vive y cuánto trabaja."
          )}
          {...conta("maneio")}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="regime_estabulacao"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Regime de Estabulação", "Stabling Regime", "Régimen de Estabulación")} *
              </label>
              <Seleccao
                id="regime_estabulacao"
                value={formData.regime_estabulacao}
                onChange={(e) => updateField("regime_estabulacao", e.target.value)}
                className={classeCampo(erros, "regime_estabulacao")}
                {...atributosCampo(erros, apontamentos, "regime_estabulacao")}
              >
                <option value="">{tr("Selecionar", "Select", "Seleccionar")}</option>
                {(regimesEstabulacao[language] || regimesEstabulacao.pt).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="regime_estabulacao" />
            </div>
            <div>
              <label
                htmlFor="tipo_alimentacao"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Tipo de Alimentação", "Feeding Type", "Tipo de Alimentación")} *
              </label>
              <Seleccao
                id="tipo_alimentacao"
                value={formData.tipo_alimentacao}
                onChange={(e) => updateField("tipo_alimentacao", e.target.value)}
                className={classeCampo(erros, "tipo_alimentacao")}
                {...atributosCampo(erros, apontamentos, "tipo_alimentacao")}
              >
                <option value="">{tr("Selecionar", "Select", "Seleccionar")}</option>
                {(tiposAlimentacao[language] || tiposAlimentacao.pt).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="tipo_alimentacao" />
            </div>
          </div>

          <div>
            <label
              htmlFor="horas_trabalho_semana"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr(
                "Horas de Trabalho por Semana",
                "Working Hours per Week",
                "Horas de Trabajo por Semana"
              )}{" "}
              *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr(
                  "(horas/semana; 0 se estiver parado)",
                  "(hours/week; 0 if resting)",
                  "(horas/semana; 0 si está parado)"
                )}
              </span>
            </label>
            <input
              id="horas_trabalho_semana"
              type="number"
              min={0}
              max={40}
              value={formData.horas_trabalho_semana}
              onChange={(e) => updateField("horas_trabalho_semana", e.target.value)}
              className={classeCampo(erros, "horas_trabalho_semana")}
              placeholder="Ex: 5"
              {...ligarCampo("horas_trabalho_semana", formData.horas_trabalho_semana, props)}
            />
            <ErroDoCampo erros={erros} campo="horas_trabalho_semana" />
          </div>

          {pergunta(
            "teste_dna_realizado",
            tr(
              "Teste de DNA realizado (parentesco verificado)",
              "DNA test done (parentage verified)",
              "Prueba de ADN realizada (parentesco verificado)"
            )
          )}
          {pergunta(
            "seguro_equino",
            tr("Seguro equino activo", "Equine insurance active", "Seguro equino activo")
          )}
        </Seccao>

        {/* Saúde */}
        <div className="border-t border-[var(--border)] pt-6 space-y-8">
          <h3 className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
            <Shield size={18} className="text-[var(--foreground-muted)]" />
            {t.vender_cavalo.health_status_section}
          </h3>

          <Seccao
            titulo={tr("Estado de saúde", "Health status", "Estado de salud")}
            nota={tr(
              "Nenhuma destas respostas impede a publicação — a vacinação em atraso também não.",
              "None of these answers blocks publishing — an overdue vaccination included.",
              "Ninguna de estas respuestas impide publicar — la vacunación atrasada tampoco."
            )}
            {...conta("saude")}
          >
            <div>
              <label
                htmlFor="estado_saude"
                className="block text-sm text-[var(--foreground-secondary)] mb-2"
              >
                {t.vender_cavalo.general_status} *
              </label>
              <Seleccao
                id="estado_saude"
                value={formData.estado_saude}
                onChange={(e) => updateField("estado_saude", e.target.value)}
                className={classeCampo(erros, "estado_saude")}
                {...atributosCampo(erros, apontamentos, "estado_saude")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                <option value="Excelente">{t.vender_cavalo.health_excellent}</option>
                <option value="Bom">{t.vender_cavalo.health_good}</option>
                <option value="Regular">{t.vender_cavalo.health_fair}</option>
              </Seleccao>
              <ErroDoCampo erros={erros} campo="estado_saude" />
            </div>

            {/* Era obrigatória a caixa **marcada**: um cavalo com a vacinação em
                atraso não podia ser anunciado de todo, e a única saída era
                declarar o que não era verdade. Continua obrigatória — mas o que
                se exige é uma **resposta**, e «não» é uma delas. É a diferença
                inteira entre este passo e o que ele era. */}
            {pergunta("vacinacao_atualizada", t.vender_cavalo.vaccination_updated as string)}
            {pergunta("desparasitacao_atualizada", t.vender_cavalo.deworming_updated as string)}
            {pergunta("exame_veterinario", t.vender_cavalo.vet_exam_available as string)}
            {pergunta(
              "radiografias_disponivel",
              tr(
                "Radiografias disponíveis (membros / coluna)",
                "Radiographs available (limbs / spine)",
                "Radiografías disponibles (miembros / columna)"
              )
            )}
            {pergunta(
              "piroplasmose_testado",
              tr(
                "Testado para piroplasmose (resultado negativo)",
                "Tested for piroplasmosis (negative result)",
                "Probado para piroplasmosis (resultado negativo)"
              )
            )}
          </Seccao>

          <Seccao
            titulo={tr(
              "Datas, ferragem e histórico clínico",
              "Dates, shoeing and clinical history",
              "Fechas, herraje e historial clínico"
            )}
            nota={tr(
              "Responde de antemão às perguntas que o comprador vai fazer.",
              "Answers the buyer's questions up front.",
              "Responde de antemano a las preguntas del comprador."
            )}
            {...conta("historico")}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              {/* As duas datas só são exigidas a quem disse que está em dia.
                  Um poldro que nunca foi vacinado não tem data nenhuma para
                  escrever, e exigi-la seria obrigá-lo a inventar uma. */}
              {formData.vacinacao_atualizada === "sim" && (
                <div>
                  <label
                    htmlFor="data_ultima_vacinacao"
                    className="block text-sm text-[var(--foreground-secondary)] mb-1"
                  >
                    {tr(
                      "Data da Última Vacinação",
                      "Date of Last Vaccination",
                      "Fecha de la Última Vacunación"
                    )}{" "}
                    *
                  </label>
                  <input
                    id="data_ultima_vacinacao"
                    type="date"
                    value={formData.data_ultima_vacinacao}
                    onChange={(e) => updateField("data_ultima_vacinacao", e.target.value)}
                    className={classeCampo(erros, "data_ultima_vacinacao")}
                    {...ligarCampo("data_ultima_vacinacao", formData.data_ultima_vacinacao, props)}
                  />
                  <ErroDoCampo erros={erros} campo="data_ultima_vacinacao" />
                  <ApontamentoDoCampo apontamentos={apontamentos} campo="data_ultima_vacinacao" />
                </div>
              )}
              {formData.desparasitacao_atualizada === "sim" && (
                <div>
                  <label
                    htmlFor="data_ultima_desparasitacao"
                    className="block text-sm text-[var(--foreground-secondary)] mb-1"
                  >
                    {tr(
                      "Data da Última Desparasitação",
                      "Date of Last Deworming",
                      "Fecha de la Última Desparasitación"
                    )}{" "}
                    *
                  </label>
                  <input
                    id="data_ultima_desparasitacao"
                    type="date"
                    value={formData.data_ultima_desparasitacao}
                    onChange={(e) => updateField("data_ultima_desparasitacao", e.target.value)}
                    className={classeCampo(erros, "data_ultima_desparasitacao")}
                    {...ligarCampo(
                      "data_ultima_desparasitacao",
                      formData.data_ultima_desparasitacao,
                      props
                    )}
                  />
                  <ErroDoCampo erros={erros} campo="data_ultima_desparasitacao" />
                  <ApontamentoDoCampo
                    apontamentos={apontamentos}
                    campo="data_ultima_desparasitacao"
                  />
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="data_ultima_ferragem"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr(
                    "Data da Última Ferragem ou Aparo",
                    "Date of Last Shoeing or Trim",
                    "Fecha del Último Herraje o Recorte"
                  )}{" "}
                  *
                  <span className="text-[var(--foreground-muted)] text-xs ml-1">
                    {tr(
                      "(um cavalo descalço tem data de aparo)",
                      "(a barefoot horse has a trimming date)",
                      "(un caballo descalzo tiene fecha de recorte)"
                    )}
                  </span>
                </label>
                <input
                  id="data_ultima_ferragem"
                  type="date"
                  value={formData.data_ultima_ferragem}
                  onChange={(e) => updateField("data_ultima_ferragem", e.target.value)}
                  className={classeCampo(erros, "data_ultima_ferragem")}
                  {...ligarCampo("data_ultima_ferragem", formData.data_ultima_ferragem, props)}
                />
                <ErroDoCampo erros={erros} campo="data_ultima_ferragem" />
                <ApontamentoDoCampo apontamentos={apontamentos} campo="data_ultima_ferragem" />
              </div>
              <div>
                <label
                  htmlFor="tipo_ferragem"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Tipo de Ferragem", "Shoeing Type", "Tipo de Herraje")} *
                </label>
                <Seleccao
                  id="tipo_ferragem"
                  value={formData.tipo_ferragem}
                  onChange={(e) => updateField("tipo_ferragem", e.target.value)}
                  className={classeCampo(erros, "tipo_ferragem")}
                  {...atributosCampo(erros, apontamentos, "tipo_ferragem")}
                >
                  <option value="">{tr("Selecionar", "Select", "Seleccionar")}</option>
                  {(tiposFerragemOpcoes[language] || tiposFerragemOpcoes.pt).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Seleccao>
                <ErroDoCampo erros={erros} campo="tipo_ferragem" />
              </div>
            </div>

            <div>
              <label
                htmlFor="historico_lesoes"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr(
                  "Histórico de Lesões / Cirurgias",
                  "Injury / Surgery History",
                  "Historial de Lesiones / Cirugías"
                )}{" "}
                *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    '("Nenhuma" é uma resposta, e vale mais do que a caixa em branco)',
                    '("None" is an answer, and it is worth more than a blank box)',
                    '("Ninguna" es una respuesta, y vale más que la casilla en blanco)'
                  )}
                </span>
              </label>
              <textarea
                id="historico_lesoes"
                value={formData.historico_lesoes}
                onChange={(e) => updateField("historico_lesoes", e.target.value)}
                className={classeCampo(erros, "historico_lesoes", "h-20 resize-none")}
                placeholder="Ex: Cólica cirúrgica em 2021, totalmente recuperado. Sem lesões articulares."
                {...ligarCampo("historico_lesoes", formData.historico_lesoes, props)}
              />
              <ErroDoCampo erros={erros} campo="historico_lesoes" />
            </div>

            <div>
              <label
                htmlFor="observacoes_saude"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.health_notes} *
              </label>
              <textarea
                id="observacoes_saude"
                value={formData.observacoes_saude}
                onChange={(e) => updateField("observacoes_saude", e.target.value)}
                className={classeCampo(erros, "observacoes_saude", "h-24 resize-none")}
                placeholder={t.vender_cavalo.placeholder_health_notes}
                {...ligarCampo("observacoes_saude", formData.observacoes_saude, props)}
              />
              <ErroDoCampo erros={erros} campo="observacoes_saude" />
            </div>

            {/* O único campo do formulário que não é obrigatório, e a razão
                está escrita: é o nome de um terceiro que não consentiu em ser
                publicado. Não leva asterisco e não trava nada. */}
            <div>
              <label
                htmlFor="nome_veterinario"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr(
                  "Médico Veterinário de Referência",
                  "Reference Veterinarian",
                  "Veterinario de Referencia"
                )}
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr(
                    "(só com autorização dele — não é obrigatório)",
                    "(only with their consent — not required)",
                    "(sólo con su autorización — no es obligatorio)"
                  )}
                </span>
              </label>
              <input
                id="nome_veterinario"
                type="text"
                value={formData.nome_veterinario}
                onChange={(e) => updateField("nome_veterinario", e.target.value)}
                className="campo"
                placeholder="Ex: Dr. João Silva — +351 912 345 678"
              />
            </div>
          </Seccao>

          {/* Upload Exame Veterinário */}
          {formData.exame_veterinario === "sim" && (
            <div className="bg-[var(--background-card)]/50 cartao p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t.vender_cavalo.vet_report}</span>
                {documentos.exameVet && <CheckCircle size={18} className="text-[var(--ok)]" />}
              </div>
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--border-hover)] transition-colors touch-manipulation">
                <Upload size={18} className="text-[var(--foreground-muted)]" />
                <span className="text-sm text-[var(--foreground-secondary)]">
                  {documentos.exameVet ? documentos.exameVet.name : t.vender_cavalo.attach_report}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && onDocUpload("exameVet", e.target.files[0])
                  }
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
