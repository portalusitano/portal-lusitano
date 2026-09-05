"use client";

import { useMemo } from "react";
import { CheckCircle, FileText } from "lucide-react";
import type { StepProps, Documentos, DocumentType } from "@/components/vender-cavalo/types";
import { linhagensPrincipais } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Seccao from "@/components/vender-cavalo/Seccao";
import { ErroDoCampo, classeCampo, useFaltas } from "@/components/vender-cavalo/campos-com-erro";
import { atributosCampo, ligarCampo } from "@/components/vender-cavalo/apontamentos";
import EscolherFicheiro from "@/components/vender-cavalo/EscolherFicheiro";

interface StepLinhagemProps extends StepProps {
  documentos: Documentos;
  onDocUpload: (type: DocumentType, file: File) => void;
}

/**
 * A ascendência.
 *
 * Catorze campos, e os doze da terceira geração estavam atrás de uma gaveta
 * com a nota «Opcional. Enriquece o pedigree que aparece no anúncio». Saiu a
 * gaveta e saiu a nota; o que fica no lugar é onde ir buscar o que se pede,
 * que é a informação que a nota devia ter dado desde sempre: **está tudo no
 * Livro Azul que se anexa no fim desta mesma página**, e por isso a ordem em
 * que as coisas aparecem no ecrã é a ordem em que se lêem no documento.
 *
 * Os campos dos avós ganharam `<label>` a sério. Eram doze `<input>` com um
 * `placeholder` a fazer de rótulo — «Nome», «Nº Registo» — debaixo de um
 * parágrafo solto: um `placeholder` desaparece quando se escreve, não é lido
 * como rótulo por um leitor de ecrã, e num campo obrigatório isso quer dizer
 * que quem lá chegar pelo resumo de erros não sabe onde está.
 */
export default function StepLinhagem(props: StepLinhagemProps) {
  const {
    formData,
    updateField,
    documentos,
    onDocUpload,
    erros: errosCrus,
    apontamentos,
    campo,
    conta,
  } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  /**
   * As faltas deste passo, separadas em duas: o que está por responder e o
   * que está respondido e mal. A régua é o `estaPreenchido` do catálogo — a
   * mesma que trava o botão e a mesma que conta «7 / 12» no cabeçalho da
   * secção —, e é ela que decide qual dos campos leva vermelho.
   *
   * O Livro Azul não é um campo de `FormData` e por isso não está no catálogo:
   * quem sabe se ele já lá está é este passo, e é ele que o diz. Sem isso um
   * anexo por escolher entrava como erro — a confusão que este trabalho
   * existe para desfazer.
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

  /** Os oito campos dos avós: quatro pares de nome e registo. */
  const avos = [
    {
      grupo: tr(
        "Avô Paterno (pai do pai)",
        "Paternal Grandfather (father's father)",
        "Abuelo Paterno (padre del padre)"
      ),
      nome: "avo_paterno_nome",
      registo: "avo_paterno_registo",
    },
    {
      grupo: tr(
        "Avó Paterna (mãe do pai)",
        "Paternal Grandmother (father's mother)",
        "Abuela Paterna (madre del padre)"
      ),
      nome: "avo_paterno_mae_nome",
      registo: "avo_paterno_mae_registo",
    },
    {
      grupo: tr(
        "Avô Materno (pai da mãe)",
        "Maternal Grandfather (mother's father)",
        "Abuelo Materno (padre de la madre)"
      ),
      nome: "avo_materno_nome",
      registo: "avo_materno_registo",
    },
    {
      grupo: tr(
        "Avó Materna (mãe da mãe)",
        "Maternal Grandmother (mother's mother)",
        "Abuela Materna (madre de la madre)"
      ),
      nome: "avo_materno_mae_nome",
      registo: "avo_materno_mae_registo",
    },
  ] as const;

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_lineage_title}</h2>

      <div className="space-y-8">
        <Seccao
          titulo={tr("Pai e mãe", "Sire and dam", "Padre y madre")}
          nota={tr(
            "Nome e número de registo dos dois, como estão no Livro Azul.",
            "Name and registration number of both, as on the Blue Book.",
            "Nombre y número de registro de ambos, como en el Libro Azul."
          )}
          {...conta("pais")}
        >
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
                {...ligarCampo("pai_nome", formData.pai_nome, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="pai_nome" />
            </div>
            <div>
              <label
                htmlFor="pai_registo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.sire_registration} *
              </label>
              <input
                id="pai_registo"
                type="text"
                value={formData.pai_registo}
                onChange={(e) => updateField("pai_registo", e.target.value)}
                className={classeCampo(erros, "pai_registo")}
                {...ligarCampo("pai_registo", formData.pai_registo, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="pai_registo" />
            </div>
          </div>

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
                {...ligarCampo("mae_nome", formData.mae_nome, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="mae_nome" />
            </div>
            <div>
              <label
                htmlFor="mae_registo"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.dam_registration} *
              </label>
              <input
                id="mae_registo"
                type="text"
                value={formData.mae_registo}
                onChange={(e) => updateField("mae_registo", e.target.value)}
                className={classeCampo(erros, "mae_registo")}
                {...ligarCampo("mae_registo", formData.mae_registo, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="mae_registo" />
            </div>
          </div>
        </Seccao>

        <Seccao
          titulo={tr(
            "Avós, linhagem e coudelaria de origem",
            "Grandparents, lineage and stud of origin",
            "Abuelos, linaje y criadero de origen"
          )}
          nota={tr(
            "A terceira geração está na mesma página do Livro Azul.",
            "The third generation is on the same page of the Blue Book.",
            "La tercera generación está en la misma página del Libro Azul."
          )}
          {...conta("avos")}
        >
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-6">
            {avos.map((avo) => (
              <div key={avo.nome} className="space-y-3">
                <p className="rotulo">{avo.grupo}</p>
                <div>
                  <label
                    htmlFor={avo.nome}
                    className="block text-sm text-[var(--foreground-secondary)] mb-1"
                  >
                    {tr("Nome", "Name", "Nombre")} *
                  </label>
                  <input
                    id={avo.nome}
                    type="text"
                    value={formData[avo.nome]}
                    onChange={(e) => updateField(avo.nome, e.target.value)}
                    className={classeCampo(erros, avo.nome)}
                    {...ligarCampo(avo.nome, formData[avo.nome], ligacao)}
                  />
                  <ErroDoCampo erros={erros} campo={avo.nome} />
                </div>
                <div>
                  <label
                    htmlFor={avo.registo}
                    className="block text-sm text-[var(--foreground-secondary)] mb-1"
                  >
                    {tr("Nº de Registo", "Registration No.", "Nº de Registro")} *
                  </label>
                  <input
                    id={avo.registo}
                    type="text"
                    value={formData[avo.registo]}
                    onChange={(e) => updateField(avo.registo, e.target.value)}
                    className={classeCampo(erros, avo.registo)}
                    {...ligarCampo(avo.registo, formData[avo.registo], ligacao)}
                  />
                  <ErroDoCampo erros={erros} campo={avo.registo} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="linhagem_principal"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Linhagem Principal", "Main Lineage", "Linaje Principal")} *
              </label>
              <Seleccao
                id="linhagem_principal"
                value={formData.linhagem_principal}
                onChange={(e) => updateField("linhagem_principal", e.target.value)}
                className={classeCampo(erros, "linhagem_principal")}
                {...atributosCampo(erros, apontamentos, "linhagem_principal")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {linhagensPrincipais.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="linhagem_principal" />
            </div>
            <div>
              <label
                htmlFor="coudelaria_origem"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.stud_origin} *
              </label>
              <input
                id="coudelaria_origem"
                type="text"
                value={formData.coudelaria_origem}
                onChange={(e) => updateField("coudelaria_origem", e.target.value)}
                className={classeCampo(erros, "coudelaria_origem")}
                placeholder={t.vender_cavalo.placeholder_stud_origin}
                {...ligarCampo("coudelaria_origem", formData.coudelaria_origem, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="coudelaria_origem" />
            </div>
          </div>
        </Seccao>

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
              <EscolherFicheiro
                texto={
                  documentos.livroAzul ? documentos.livroAzul.name : t.vender_cavalo.choose_file
                }
                falta={erros.livro_azul?.nivel}
                descritoPor={erros.livro_azul ? "erro-livro_azul" : undefined}
                aoEscolher={(f) => onDocUpload("livroAzul", f[0])}
              />
              <ErroDoCampo erros={erros} campo="livro_azul" />
            </div>

            {/* O passaporte continua a não travar o passo, e a razão é a mesma
                que já cá estava: quem publica um cavalo com Livro Azul tem o
                documento que prova a identidade. Não é um campo do formulário
                — é um segundo anexo do mesmo facto. */}
            <div className="bg-[var(--background-card)]/50 cartao p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t.vender_cavalo.equine_passport}</span>
                {documentos.passaporte && <CheckCircle size={18} className="text-[var(--ok)]" />}
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mb-3">
                {t.vender_cavalo.equine_passport_desc}
              </p>
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
        </div>
      </div>
    </div>
  );
}
