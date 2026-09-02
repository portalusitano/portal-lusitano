"use client";

import { useMemo } from "react";
import { Upload, CheckCircle, FileText } from "lucide-react";
import type { StepProps, Documentos, DocumentType } from "@/components/vender-cavalo/types";
import { linhagensPrincipais } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Detalhes from "@/components/vender-cavalo/Detalhes";
import { ErroDoCampo, classeCampo } from "@/components/vender-cavalo/campos-com-erro";
import { ligarCampo } from "@/components/vender-cavalo/apontamentos";

interface StepLinhagemProps extends StepProps {
  documentos: Documentos;
  onDocUpload: (type: DocumentType, file: File) => void;
}

export default function StepLinhagem(props: StepLinhagemProps) {
  const { formData, updateField, documentos, onDocUpload, erros } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_lineage_title}</h2>

      <div className="space-y-6">
        {/* Pai */}
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">
            {t.vender_cavalo.sire}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pai_nome"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.sire_name} *
              </label>
              <input
                id="pai_nome"
                type="text"
                value={formData.pai_nome}
                onChange={(e) => updateField("pai_nome", e.target.value)}
                className={classeCampo(erros, "pai_nome")}
                {...ligarCampo("pai_nome", formData.pai_nome, props)}
              />
              <ErroDoCampo erros={erros} campo="pai_nome" />
            </div>
            <div>
              <label
                htmlFor="pai_registo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.sire_registration}
              </label>
              <input
                id="pai_registo"
                type="text"
                value={formData.pai_registo}
                onChange={(e) => updateField("pai_registo", e.target.value)}
                className="campo"
              />
            </div>
          </div>
        </div>

        {/* Mãe */}
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">
            {t.vender_cavalo.dam}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="mae_nome"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.dam_name} *
              </label>
              <input
                id="mae_nome"
                type="text"
                value={formData.mae_nome}
                onChange={(e) => updateField("mae_nome", e.target.value)}
                className={classeCampo(erros, "mae_nome")}
                {...ligarCampo("mae_nome", formData.mae_nome, props)}
              />
              <ErroDoCampo erros={erros} campo="mae_nome" />
            </div>
            <div>
              <label
                htmlFor="mae_registo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.dam_registration}
              </label>
              <input
                id="mae_registo"
                type="text"
                value={formData.mae_registo}
                onChange={(e) => updateField("mae_registo", e.target.value)}
                className="campo"
              />
            </div>
          </div>
        </div>

        {/* Terceira geração e origem. Dez campos que estão todos no Livro Azul
            anexado aqui ao lado — quem quiser o pedigree escrito no anúncio
            abre-os; quem quiser publicar hoje passa ao lado. */}
        <Detalhes
          titulo={tr(
            "Avós, linhagem e coudelaria de origem",
            "Grandparents, lineage and stud of origin",
            "Abuelos, linaje y criadero de origen"
          )}
          campos={10}
          nota={tr(
            "Opcional. Enriquece o pedigree que aparece no anúncio.",
            "Optional. Enriches the pedigree shown on the listing.",
            "Opcional. Enriquece el pedigrí que aparece en el anuncio."
          )}
        >
          <div className="space-y-6">
            {/* Avós Paternos (3ª geração — lado do pai) */}
            <div>
              <h3 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">
                {tr(
                  "Avós Paternos (3ª geração — lado do pai)",
                  "Paternal Grandparents (3rd generation — father's side)",
                  "Abuelos Paternos (3ª generación — lado del padre)"
                )}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                    {tr(
                      "Avô Paterno (pai do pai)",
                      "Paternal Grandfather (father's father)",
                      "Abuelo Paterno (padre del padre)"
                    )}
                  </p>
                  <input
                    id="avo_paterno_nome"
                    type="text"
                    value={formData.avo_paterno_nome}
                    onChange={(e) => updateField("avo_paterno_nome", e.target.value)}
                    className="campo"
                    placeholder="Nome"
                  />
                  <input
                    id="avo_paterno_registo"
                    type="text"
                    value={formData.avo_paterno_registo}
                    onChange={(e) => updateField("avo_paterno_registo", e.target.value)}
                    className="campo"
                    placeholder="Nº Registo"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                    {tr(
                      "Avó Paterna (mãe do pai)",
                      "Paternal Grandmother (father's mother)",
                      "Abuela Paterna (madre del padre)"
                    )}
                  </p>
                  <input
                    id="avo_paterno_mae_nome"
                    type="text"
                    value={formData.avo_paterno_mae_nome}
                    onChange={(e) => updateField("avo_paterno_mae_nome", e.target.value)}
                    className="campo"
                    placeholder="Nome"
                  />
                  <input
                    id="avo_paterno_mae_registo"
                    type="text"
                    value={formData.avo_paterno_mae_registo}
                    onChange={(e) => updateField("avo_paterno_mae_registo", e.target.value)}
                    className="campo"
                    placeholder="Nº Registo"
                  />
                </div>
              </div>
            </div>

            {/* Avós Maternos (3ª geração — lado da mãe) */}
            <div>
              <h3 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">
                {tr(
                  "Avós Maternos (3ª geração — lado da mãe)",
                  "Maternal Grandparents (3rd generation — mother's side)",
                  "Abuelos Maternos (3ª generación — lado de la madre)"
                )}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                    {tr(
                      "Avô Materno (pai da mãe)",
                      "Maternal Grandfather (mother's father)",
                      "Abuelo Materno (padre de la madre)"
                    )}
                  </p>
                  <input
                    id="avo_materno_nome"
                    type="text"
                    value={formData.avo_materno_nome}
                    onChange={(e) => updateField("avo_materno_nome", e.target.value)}
                    className="campo"
                    placeholder="Nome"
                  />
                  <input
                    id="avo_materno_registo"
                    type="text"
                    value={formData.avo_materno_registo}
                    onChange={(e) => updateField("avo_materno_registo", e.target.value)}
                    className="campo"
                    placeholder="Nº Registo"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                    {tr(
                      "Avó Materna (mãe da mãe)",
                      "Maternal Grandmother (mother's mother)",
                      "Abuela Materna (madre de la madre)"
                    )}
                  </p>
                  <input
                    id="avo_materno_mae_nome"
                    type="text"
                    value={formData.avo_materno_mae_nome}
                    onChange={(e) => updateField("avo_materno_mae_nome", e.target.value)}
                    className="campo"
                    placeholder="Nome"
                  />
                  <input
                    id="avo_materno_mae_registo"
                    type="text"
                    value={formData.avo_materno_mae_registo}
                    onChange={(e) => updateField("avo_materno_mae_registo", e.target.value)}
                    className="campo"
                    placeholder="Nº Registo"
                  />
                </div>
              </div>
            </div>

            {/* Linhagem + Coudelaria */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="linhagem_principal"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {tr("Linhagem Principal", "Main Lineage", "Linaje Principal")}
                </label>
                <Seleccao
                  id="linhagem_principal"
                  value={formData.linhagem_principal}
                  onChange={(e) => updateField("linhagem_principal", e.target.value)}
                  className="campo"
                >
                  <option value="">{t.vender_cavalo.select}</option>
                  {linhagensPrincipais.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Seleccao>
              </div>
              <div>
                <label
                  htmlFor="coudelaria_origem"
                  className="block text-sm text-[var(--foreground-secondary)] mb-1"
                >
                  {t.vender_cavalo.stud_origin}
                </label>
                <input
                  id="coudelaria_origem"
                  type="text"
                  value={formData.coudelaria_origem}
                  onChange={(e) => updateField("coudelaria_origem", e.target.value)}
                  className="campo"
                  placeholder={t.vender_cavalo.placeholder_stud_origin}
                />
              </div>
            </div>
          </div>
        </Detalhes>

        {/* Upload Documentos */}
        <div className="border-t border-[var(--border)] pt-6">
          <h3 className="text-sm font-medium text-[var(--foreground)] mb-4 flex items-center gap-2">
            <FileText size={18} className="text-[var(--foreground-muted)]" />
            {t.vender_cavalo.required_docs_upload}
          </h3>

          <div className="space-y-4">
            {/* Livro Azul. O `data-campo` é o que permite ao resumo de erros
                no topo do passo vir ter aqui: um `<input type=file>` está
                escondido dentro da etiqueta e não serve de alvo. */}
            <div className="bg-[var(--background-card)]/50 cartao p-4" data-campo="livro_azul">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t.vender_cavalo.blue_book} *</span>
                {documentos.livroAzul && <CheckCircle size={18} className="text-[var(--ok)]" />}
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mb-3">
                {t.vender_cavalo.blue_book_desc}
              </p>
              <label
                className={`flex items-center justify-center gap-2 px-4 py-3 border border-dashed rounded-lg cursor-pointer transition-colors touch-manipulation ${
                  erros.livro_azul
                    ? "border-[var(--erro)]"
                    : "border-[var(--border)] hover:border-[var(--border-hover)]"
                }`}
              >
                <Upload size={18} className="text-[var(--foreground-muted)]" />
                <span className="text-sm text-[var(--foreground-secondary)]">
                  {documentos.livroAzul ? documentos.livroAzul.name : t.vender_cavalo.choose_file}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  aria-describedby={erros.livro_azul ? "erro-livro_azul" : undefined}
                  onChange={(e) =>
                    e.target.files?.[0] && onDocUpload("livroAzul", e.target.files[0])
                  }
                />
              </label>
              <ErroDoCampo erros={erros} campo="livro_azul" />
            </div>

            {/* Passaporte */}
            <div className="bg-[var(--background-card)]/50 cartao p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t.vender_cavalo.equine_passport}</span>
                {documentos.passaporte && <CheckCircle size={18} className="text-[var(--ok)]" />}
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mb-3">
                {t.vender_cavalo.equine_passport_desc}
              </p>
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--border-hover)] transition-colors touch-manipulation">
                <Upload size={18} className="text-[var(--foreground-muted)]" />
                <span className="text-sm text-[var(--foreground-secondary)]">
                  {documentos.passaporte
                    ? documentos.passaporte.name
                    : t.vender_cavalo.choose_file_short}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && onDocUpload("passaporte", e.target.files[0])
                  }
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
