"use client";

import { useMemo } from "react";
import type { StepProps } from "@/components/vender-cavalo/types";
import { linhagensPrincipais } from "@/components/vender-cavalo/data";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Seccao from "@/components/vender-cavalo/Seccao";
import { ErroDoCampo, classeCampo, useFaltas } from "@/components/vender-cavalo/campos-com-erro";
import { atributosCampo, ligarCampo } from "@/components/vender-cavalo/apontamentos";

/**
 * A ascendência.
 *
 * Catorze campos, e os doze da terceira geração estavam atrás de uma gaveta
 * com a nota «Opcional. Enriquece o pedigree que aparece no anúncio». Saiu a
 * gaveta e saiu a nota; o que fica no lugar é onde ir buscar o que se pede,
 * que é a informação que a nota devia ter dado desde sempre: **está tudo no
 * Livro Azul**, e por isso a ordem em que as coisas aparecem no ecrã é a ordem
 * em que se lêem no documento.
 *
 * **O Livro Azul deixou de se anexar aqui.** Anexava-se no fim desta página —
 * ou seja **depois** das catorze perguntas que ele responde, e depois das doze
 * do passo anterior, onde a nota da secção dizia com todas as letras «está
 * tudo no Livro Azul e no passaporte, que anexa no passo seguinte». Vinte e
 * seis perguntas a mandar procurar um documento, e o documento só se pedia
 * depois delas. Passou para o passo 1, imediatamente antes da primeira
 * pergunta que precisa dele — ver `StepIdentificacao.tsx`.
 *
 * Os campos dos avós ganharam `<label>` a sério. Eram doze `<input>` com um
 * `placeholder` a fazer de rótulo — «Nome», «Nº Registo» — debaixo de um
 * parágrafo solto: um `placeholder` desaparece quando se escreve, não é lido
 * como rótulo por um leitor de ecrã, e num campo obrigatório isso quer dizer
 * que quem lá chegar pelo resumo de erros não sabe onde está.
 */
export default function StepLinhagem(props: StepProps) {
  const { formData, updateField, erros: errosCrus, apontamentos, campo, conta } = props;
  const { t, language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  /**
   * As faltas deste passo, separadas em duas: o que está por responder e o
   * que está respondido e mal. A régua é o `estaPreenchido` do catálogo — a
   * mesma que trava o botão e a mesma que conta «7 / 12» no cabeçalho da
   * secção —, e é ela que decide qual dos campos leva vermelho.
   *
   */
  const erros = useFaltas(errosCrus, formData);

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

        {/* **Eram três coisas debaixo de um cabeçalho com dois «e».** O
            próprio formulário já tinha aprendido isto noutro sítio: «um
            cabeçalho que precisa de um "e" para caber duas coisas está a dizer
            que ali estão duas secções». Aqui eram três — avós, linhagem e
            coudelaria de origem — e desde que a terceira geração passou a
            opcional deixaram de seguir a mesma regra, o que torna a mistura
            indefensável: a conta do cabeçalho dizia **«0 / 2» por cima de dez
            caixas**, porque só contava as duas que ainda são exigidas. Um
            número verdadeiro no sítio errado lê-se como um número errado. */}
        <Seccao
          titulo={tr(
            "Avós (terceira geração)",
            "Grandparents (third generation)",
            "Abuelos (tercera generación)"
          )}
          nota={tr(
            "A terceira geração está na mesma página do Livro Azul — e é a única parte do anúncio que se pode deixar em branco, porque nem todos os Livros Azuis a trazem.",
            "The third generation is on the same page of the Blue Book — and it is the only part of the listing you may leave blank, because not every Blue Book carries it.",
            "La tercera generación está en la misma página del Libro Azul — y es la única parte del anuncio que se puede dejar en blanco, porque no todos los Libros Azules la traen."
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
                    {tr("Nome", "Name", "Nombre")}{" "}
                    <span className="vc-opcional">
                      {tr("(opcional)", "(optional)", "(opcional)")}
                    </span>
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
                    {tr("Nº de Registo", "Registration No.", "Nº de Registro")}{" "}
                    <span className="vc-opcional">
                      {tr("(opcional)", "(optional)", "(opcional)")}
                    </span>
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
        </Seccao>

        <Seccao
          titulo={tr(
            "Linhagem e coudelaria de origem",
            "Lineage and stud of origin",
            "Linaje y criadero de origen"
          )}
          nota={tr(
            "As duas são obrigatórias, ao contrário dos avós.",
            "Both are required, unlike the grandparents above.",
            "Ambas son obligatorias, al contrario de los abuelos."
          )}
          {...conta("linhagem")}
        >
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
      </div>
    </div>
  );
}
