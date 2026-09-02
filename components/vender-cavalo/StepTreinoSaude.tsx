"use client";

import { useMemo } from "react";
import { Upload, CheckCircle, Shield } from "lucide-react";
import type { StepProps, Documentos, DocumentType } from "@/components/vender-cavalo/types";
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
import Detalhes from "@/components/vender-cavalo/Detalhes";
import { ErroDoCampo, classeCampo } from "@/components/vender-cavalo/campos-com-erro";
import { ApontamentoDoCampo, atributosCampo } from "@/components/vender-cavalo/apontamentos";

interface StepTreinoSaudeProps extends StepProps {
  documentos: Documentos;
  onDocUpload: (type: DocumentType, file: File) => void;
  onToggleDisciplina: (disc: string) => void;
  onToggleUso: (uso: string) => void;
}

export default function StepTreinoSaude({
  formData,
  updateField,
  documentos,
  onDocUpload,
  onToggleDisciplina,
  onToggleUso,
  erros,
  apontamentos,
  campo,
}: StepTreinoSaudeProps) {
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_training_title}</h2>

      <div className="space-y-6">
        {/* Treino */}
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

        {/* As disciplinas são o que a grelha de anúncios filtra e o que o
            cartão mostra: ficam à vista. */}
        <div>
          <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
            {t.vender_cavalo.disciplines}
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
            )}
          </label>
          <Seleccao
            id="nivel_cavaleiro"
            value={formData.nivel_cavaleiro}
            onChange={(e) => updateField("nivel_cavaleiro", e.target.value)}
            className="campo"
          >
            <option value="">{t.vender_cavalo.select}</option>
            {(niveisCavaleiro[language] || niveisCavaleiro.pt).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Seleccao>
        </div>

        {/* Tudo o que não é o nível de treino, as disciplinas e o estado de
            saúde vive dentro de painéis fechados. Medido antes: 47 campos e
            15 caixas de selecção à entrada deste passo, 5,4 ecrãs de altura —
            e destes, dois é que travavam a passagem. */}
        <Detalhes
          titulo={tr(
            "Uso, competições e quem o monta",
            "Use, competitions and who rides it",
            "Uso, competiciones y quién lo monta"
          )}
          campos={6}
          nota={tr(
            "Opcional. Dá matéria ao texto do anúncio.",
            "Optional. Gives the listing text something to say.",
            "Opcional. Da materia al texto del anuncio."
          )}
        >
          <div className="space-y-4">
            {/* Uso Atual */}
            <div>
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                {tr("Uso Atual do Cavalo", "Current Horse Use", "Uso Actual del Caballo")}
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
            </div>

            <div>
              <label
                htmlFor="anos_treino"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Anos de Treino", "Training Years", "Años de Entrenamiento")}
                <span className="text-[var(--foreground-muted)] text-xs ml-1">
                  {tr("(anos em trabalho)", "(years in work)", "(años en trabajo)")}
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
                className="campo"
                placeholder="Ex: 5"
              />
            </div>

            {/* Treinador + Ginete */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="treinador_atual"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Treinador Atual", "Current Trainer", "Entrenador Actual")}
                  <span className="text-[var(--foreground-muted)] text-xs ml-1">
                    {tr("(opcional)", "(optional)", "(opcional)")}
                  </span>
                </label>
                <input
                  id="treinador_atual"
                  type="text"
                  value={formData.treinador_atual}
                  onChange={(e) => updateField("treinador_atual", e.target.value)}
                  className="campo"
                  placeholder="Nome do treinador"
                />
              </div>
              <div>
                <label
                  htmlFor="ginete_habitual"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Ginete Habitual", "Regular Rider", "Jinete Habitual")}
                  <span className="text-[var(--foreground-muted)] text-xs ml-1">
                    {tr("(opcional)", "(optional)", "(opcional)")}
                  </span>
                </label>
                <input
                  id="ginete_habitual"
                  type="text"
                  value={formData.ginete_habitual}
                  onChange={(e) => updateField("ginete_habitual", e.target.value)}
                  className="campo"
                  placeholder="Nome do cavaleiro habitual"
                />
              </div>
            </div>

            {/* Competições */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="competicoes"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {t.vender_cavalo.competitions}
                </label>
                <input
                  id="competicoes"
                  type="text"
                  value={formData.competicoes}
                  onChange={(e) => updateField("competicoes", e.target.value)}
                  className="campo"
                  placeholder={t.vender_cavalo.placeholder_competitions}
                />
              </div>
              <div>
                <label
                  htmlFor="premios"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {t.vender_cavalo.awards}
                </label>
                <input
                  id="premios"
                  type="text"
                  value={formData.premios}
                  onChange={(e) => updateField("premios", e.target.value)}
                  className="campo"
                  placeholder={t.vender_cavalo.placeholder_awards}
                />
              </div>
            </div>
          </div>
        </Detalhes>

        {/* Comportamento e Maneabilidade */}
        <Detalhes
          titulo={tr(
            "Comportamento e Maneabilidade",
            "Behaviour & Tractability",
            "Comportamiento y Manejabilidad"
          )}
          campos={8}
          nota={tr(
            "Opcional, e das mais valorizadas por quem compra.",
            "Optional, and among the most valued by buyers.",
            "Opcional, y de lo más valorado por quien compra."
          )}
        >
          <p className="text-xs text-[var(--foreground-muted)] mb-4">
            {tr(
              "Assinale as características confirmadas.",
              "Mark the confirmed characteristics.",
              "Marque las características confirmadas."
            )}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { id: "habituado_transporte", label: "Habituado a transporte (lorry/trailer)" },
              { id: "habituado_ferrador", label: "Bom com o ferrador" },
              { id: "habituado_veterinario", label: "Bom com o veterinário" },
              { id: "trabalha_em_grupo", label: "Trabalha bem em grupo" },
              { id: "trabalha_solto", label: "Trabalha solto / em liberdade" },
              { id: "trabalha_a_mao", label: "Trabalha à mão (longe / corda)" },
              { id: "habituado_campo", label: "Habituado a campo / exterior" },
              { id: "apto_criancas", label: "Apto para crianças / principiantes" },
            ].map(({ id, label }) => (
              <label
                key={id}
                htmlFor={id}
                className="flex items-center gap-3 cursor-pointer touch-manipulation"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={formData[id as keyof typeof formData] as boolean}
                  onChange={(e) => updateField(id as keyof typeof formData, e.target.checked)}
                  className="w-5 h-5 accent-[var(--foreground-strong)]"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </Detalhes>

        {/* Maneio */}
        <Detalhes
          titulo={tr("Maneio e Rotina", "Management & Routine", "Manejo y Rutina")}
          campos={5}
          nota={tr(
            "Opcional. Como vive e quanto trabalha.",
            "Optional. How it lives and how much it works.",
            "Opcional. Cómo vive y cuánto trabaja."
          )}
        >
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="regime_estabulacao"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Regime de Estabulação", "Stabling Regime", "Régimen de Estabulación")}
              </label>
              <Seleccao
                id="regime_estabulacao"
                value={formData.regime_estabulacao}
                onChange={(e) => updateField("regime_estabulacao", e.target.value)}
                className="campo"
              >
                <option value="">{tr("Selecionar", "Select", "Seleccionar")}</option>
                {(regimesEstabulacao[language] || regimesEstabulacao.pt).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Seleccao>
            </div>
            <div>
              <label
                htmlFor="tipo_alimentacao"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Tipo de Alimentação", "Feeding Type", "Tipo de Alimentación")}
              </label>
              <Seleccao
                id="tipo_alimentacao"
                value={formData.tipo_alimentacao}
                onChange={(e) => updateField("tipo_alimentacao", e.target.value)}
                className="campo"
              >
                <option value="">{tr("Selecionar", "Select", "Seleccionar")}</option>
                {(tiposAlimentacao[language] || tiposAlimentacao.pt).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Seleccao>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="horas_trabalho_semana"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr(
                "Horas de Trabalho por Semana",
                "Working Hours per Week",
                "Horas de Trabajo por Semana"
              )}
              <span className="text-[var(--foreground-muted)] text-xs ml-1">(horas/semana)</span>
            </label>
            <input
              id="horas_trabalho_semana"
              type="number"
              min={0}
              max={40}
              value={formData.horas_trabalho_semana}
              onChange={(e) => updateField("horas_trabalho_semana", e.target.value)}
              className="campo"
              placeholder="Ex: 5"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label
              htmlFor="teste_dna_realizado"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="teste_dna_realizado"
                type="checkbox"
                checked={formData.teste_dna_realizado}
                onChange={(e) => updateField("teste_dna_realizado", e.target.checked)}
                className="w-5 h-5 accent-[var(--foreground-strong)]"
              />
              <span className="text-sm">Teste de DNA realizado (parentesco verificado)</span>
            </label>
            <label
              htmlFor="seguro_equino"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="seguro_equino"
                type="checkbox"
                checked={formData.seguro_equino}
                onChange={(e) => updateField("seguro_equino", e.target.checked)}
                className="w-5 h-5 accent-[var(--foreground-strong)]"
              />
              <span className="text-sm">Seguro equino ativo</span>
            </label>
          </div>
        </Detalhes>

        {/* Saúde */}
        <div className="border-t border-[var(--border)] pt-6">
          <h3 className="text-sm font-medium text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Shield size={18} className="text-[var(--foreground-muted)]" />
            {t.vender_cavalo.health_status_section}
          </h3>

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

          <div className="mt-4 space-y-3">
            <label
              htmlFor="vacinacao_atualizada"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="vacinacao_atualizada"
                type="checkbox"
                checked={formData.vacinacao_atualizada}
                onChange={(e) => updateField("vacinacao_atualizada", e.target.checked)}
                className="w-5 h-5 accent-[var(--foreground-strong)]"
              />
              {/* Era obrigatória: um cavalo com a vacinação em atraso não podia
                  ser anunciado de todo, e a única saída era declarar o que não
                  era verdade para o formulário deixar passar. Continua a ser
                  perguntada; deixou de ser um portão. */}
              <span className="text-sm">{t.vender_cavalo.vaccination_updated}</span>
            </label>
            <label
              htmlFor="desparasitacao_atualizada"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="desparasitacao_atualizada"
                type="checkbox"
                checked={formData.desparasitacao_atualizada}
                onChange={(e) => updateField("desparasitacao_atualizada", e.target.checked)}
                className="w-5 h-5 accent-[var(--foreground-strong)]"
              />
              <span className="text-sm">{t.vender_cavalo.deworming_updated}</span>
            </label>
            <label
              htmlFor="exame_veterinario"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="exame_veterinario"
                type="checkbox"
                checked={formData.exame_veterinario}
                onChange={(e) => updateField("exame_veterinario", e.target.checked)}
                className="w-5 h-5 accent-[var(--foreground-strong)]"
              />
              <span className="text-sm">{t.vender_cavalo.vet_exam_available}</span>
            </label>
            <label
              htmlFor="radiografias_disponivel"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="radiografias_disponivel"
                type="checkbox"
                checked={formData.radiografias_disponivel}
                onChange={(e) => updateField("radiografias_disponivel", e.target.checked)}
                className="w-5 h-5 accent-[var(--foreground-strong)]"
              />
              <span className="text-sm">Radiografias disponíveis (membros / coluna)</span>
            </label>
            <label
              htmlFor="piroplasmose_testado"
              className="flex items-center gap-3 cursor-pointer touch-manipulation"
            >
              <input
                id="piroplasmose_testado"
                type="checkbox"
                checked={formData.piroplasmose_testado}
                onChange={(e) => updateField("piroplasmose_testado", e.target.checked)}
                className="w-5 h-5 accent-[var(--foreground-strong)]"
              />
              <span className="text-sm">Testado para Piroplasmose (negativo)</span>
            </label>
          </div>

          {/* Datas, veterinário, ferragem e histórico: dez campos que só o
              comprador que já está interessado vai ler, e nenhum deles trava
              a publicação. */}
          <div className="mt-4">
            <Detalhes
              titulo={tr(
                "Datas, veterinário e histórico clínico",
                "Dates, vet and clinical history",
                "Fechas, veterinario e historial clínico"
              )}
              campos={7}
              nota={tr(
                "Opcional. Responde de antemão às perguntas do comprador.",
                "Optional. Answers the buyer's questions up front.",
                "Opcional. Responde de antemano a las preguntas del comprador."
              )}
            >
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="data_ultima_vacinacao"
                    className="block text-sm text-[var(--foreground-secondary)] mb-1"
                  >
                    Data da Última Vacinação
                  </label>
                  <input
                    id="data_ultima_vacinacao"
                    type="date"
                    value={formData.data_ultima_vacinacao}
                    onChange={(e) => updateField("data_ultima_vacinacao", e.target.value)}
                    className="campo"
                  />
                </div>
                <div>
                  <label
                    htmlFor="data_ultima_desparasitacao"
                    className="block text-sm text-[var(--foreground-secondary)] mb-1"
                  >
                    Data da Última Desparasitação
                  </label>
                  <input
                    id="data_ultima_desparasitacao"
                    type="date"
                    value={formData.data_ultima_desparasitacao}
                    onChange={(e) => updateField("data_ultima_desparasitacao", e.target.value)}
                    className="campo"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="nome_veterinario"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  Médico Veterinário de Referência
                  <span className="text-[var(--foreground-muted)] text-xs ml-1">
                    (nome e contacto)
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

              {/* Ferragem */}
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="data_ultima_ferragem"
                    className="block text-sm text-[var(--foreground-secondary)] mb-1"
                  >
                    Data da Última Ferragem
                  </label>
                  <input
                    id="data_ultima_ferragem"
                    type="date"
                    value={formData.data_ultima_ferragem}
                    onChange={(e) => updateField("data_ultima_ferragem", e.target.value)}
                    className="campo"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tipo_ferragem"
                    className="block text-sm text-[var(--foreground-secondary)] mb-1"
                  >
                    {tr("Tipo de Ferragem", "Shoeing Type", "Tipo de Herraje")}
                  </label>
                  <Seleccao
                    id="tipo_ferragem"
                    value={formData.tipo_ferragem}
                    onChange={(e) => updateField("tipo_ferragem", e.target.value)}
                    className="campo"
                  >
                    <option value="">{tr("Selecionar", "Select", "Seleccionar")}</option>
                    {(tiposFerragemOpcoes[language] || tiposFerragemOpcoes.pt).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Seleccao>
                </div>
              </div>

              {/* Histórico de Lesões */}
              <div className="mt-4">
                <label
                  htmlFor="historico_lesoes"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  Histórico de Lesões / Cirurgias
                  <span className="text-[var(--foreground-muted)] text-xs ml-1">
                    (se aplicável)
                  </span>
                </label>
                <textarea
                  id="historico_lesoes"
                  value={formData.historico_lesoes}
                  onChange={(e) => updateField("historico_lesoes", e.target.value)}
                  className="campo h-20 resize-none"
                  placeholder="Ex: Cólica cirúrgica em 2021, totalmente recuperado. Sem lesões articulares."
                />
              </div>

              <div className="mt-4">
                <label
                  htmlFor="observacoes_saude"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {t.vender_cavalo.health_notes}
                </label>
                <textarea
                  id="observacoes_saude"
                  value={formData.observacoes_saude}
                  onChange={(e) => updateField("observacoes_saude", e.target.value)}
                  className="campo h-24 resize-none"
                  placeholder={t.vender_cavalo.placeholder_health_notes}
                />
              </div>
            </Detalhes>
          </div>

          {/* Upload Exame Veterinário */}
          {formData.exame_veterinario && (
            <div className="mt-4 bg-[var(--background-card)]/50 cartao p-4">
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
