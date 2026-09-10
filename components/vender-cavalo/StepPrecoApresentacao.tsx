"use client";

import { useMemo, useState, useCallback } from "react";
import { Euro, Camera, X, Upload, ImagePlus } from "lucide-react";
import type { StepProps, FormData as DadosFormulario } from "@/components/vender-cavalo/types";
import {
  disponibilidades,
  MIN_IMAGES,
  regioesPT,
  duracoesTrialOpcoes,
  motivosVenda,
} from "@/components/vender-cavalo/data";
import { eGaranhao } from "@/components/vender-cavalo/campos";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import Seleccao from "@/components/ui/Seleccao";
import Seccao from "@/components/vender-cavalo/Seccao";
import SimNao from "@/components/vender-cavalo/SimNao";
import { ErroDoCampo, classeCampo, useFaltas } from "@/components/vender-cavalo/campos-com-erro";
import EscolherFicheiro from "@/components/vender-cavalo/EscolherFicheiro";
import {
  ApontamentoDoCampo,
  atributosCampo,
  ligarCampo,
} from "@/components/vender-cavalo/apontamentos";

interface StepPrecoApresentacaoProps extends StepProps {
  imagens: File[];
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  maxImages: number;
}

/**
 * Preço, condições e apresentação.
 *
 * Vinte e dois campos em três secções. As doze condições de venda estavam numa
 * gaveta com a nota «Opcional. Troca, trial, transporte, exportação, visitas»,
 * e onze delas eram caixas de selecção — o mesmo defeito de sempre: uma caixa
 * por marcar em «aceita troca» não distingue quem não aceita de quem não leu.
 *
 * Duas destas perguntas só existem para um garanhão, e uma terceira só depois
 * de alguém dizer que aceita período de prova. O catálogo em `campos.ts`
 * marca-as com `exigidoQuando` pela mesma razão pela qual estão aqui dentro de
 * um `&&`: exigir uma resposta a uma pergunta que não está no ecrã tranca o
 * formulário sem dar maneira de o destrancar.
 */
export default function StepPrecoApresentacao(props: StepPrecoApresentacaoProps) {
  const {
    formData,
    updateField,
    imagens,
    onImageUpload,
    onRemoveImage,
    maxImages,
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
   * As fotografias não são um campo de `FormData` e por isso não estão no
   * catálogo. A resposta só está dada com o mínimo lá dentro: com uma foto de
   * três, o que falta é resposta e não uma correcção — quem passa das que o
   * plano permite é que tem um erro a sério, e esse continua a ser vermelho.
   */
  const erros = useFaltas(errosCrus, formData, { fotografias: imagens.length >= MIN_IMAGES });

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

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      // Simulate a change event using a synthetic-compatible approach
      const dataTransfer = new DataTransfer();
      files.forEach((f) => dataTransfer.items.add(f));
      const input = document.createElement("input");
      input.type = "file";
      Object.defineProperty(input, "files", { value: dataTransfer.files });
      onImageUpload({ target: input } as React.ChangeEvent<HTMLInputElement>);
    },
    [onImageUpload]
  );

  const descLength = formData.descricao.length;
  const descMin = 100;
  const descPercent = Math.min(100, Math.round((descLength / descMin) * 100));
  const descReached = descLength >= descMin;

  const pergunta = (id: keyof DadosFormulario, texto: string) => (
    <SimNao
      key={id}
      id={id}
      pergunta={texto}
      valor={formData[id] as "" | "sim" | "nao"}
      onChange={(v) => {
        updateField(id, v);
        campo.aoEscolher(id);
      }}
      erros={erros}
    />
  );

  const garanhao = eGaranhao(formData);

  return (
    <div className="bg-[var(--background-secondary)]/50 cartao p-6">
      <h2 className="text-xl mb-6">{t.vender_cavalo.step_price_title}</h2>

      <div className="space-y-8">
        <Seccao
          titulo={tr("Preço e onde está", "Price and where it is", "Precio y dónde está")}
          nota={tr(
            "É o que o cartão do anúncio mostra primeiro.",
            "This is what the listing card shows first.",
            "Es lo que la tarjeta del anuncio muestra primero."
          )}
          {...conta("preco")}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="preco"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.price_eur} *
              </label>
              <div className="relative">
                <Euro
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                />
                <input
                  id="preco"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={formData.preco}
                  onChange={(e) => updateField("preco", e.target.value)}
                  className={classeCampo(erros, "preco", "pl-12")}
                  placeholder="25000"
                  {...ligarCampo("preco", formData.preco, ligacao)}
                />
              </div>
              <ErroDoCampo erros={erros} campo="preco" />
              <ApontamentoDoCampo
                apontamentos={apontamentos}
                campo="preco"
                aoAceitar={campo.aoAceitar}
              />
            </div>
            <div>
              <label
                htmlFor="regiao"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Distrito / Região", "District / Region", "Distrito / Región")} *
              </label>
              <Seleccao
                id="regiao"
                value={formData.regiao}
                onChange={(e) => updateField("regiao", e.target.value)}
                className={classeCampo(erros, "regiao")}
                {...atributosCampo(erros, apontamentos, "regiao")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {regioesPT.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="regiao" />
            </div>
          </div>

          <div>
            <label
              htmlFor="localizacao"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {t.vender_cavalo.location} *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr("(localidade ou coudelaria)", "(town or stud farm)", "(localidad o criadero)")}
              </span>
            </label>
            <input
              id="localizacao"
              type="text"
              value={formData.localizacao}
              onChange={(e) => updateField("localizacao", e.target.value)}
              className={classeCampo(erros, "localizacao")}
              placeholder={t.vender_cavalo.placeholder_location}
              {...ligarCampo("localizacao", formData.localizacao, ligacao)}
            />
            <ErroDoCampo erros={erros} campo="localizacao" />
          </div>

          {pergunta("negociavel", t.vender_cavalo.price_negotiable as string)}
        </Seccao>

        <Seccao
          titulo={tr("Condições de venda", "Terms of sale", "Condiciones de venta")}
          nota={tr(
            "Troca, prova, transporte, exportação, visitas.",
            "Trade, trial, transport, export, viewings.",
            "Cambio, prueba, transporte, exportación, visitas."
          )}
          {...conta("condicoes")}
        >
          {pergunta("aceita_troca", t.vender_cavalo.accepts_trade as string)}
          {pergunta(
            "transporte_incluido",
            tr(
              "Transporte incluído no preço",
              "Transport included in price",
              "Transporte incluido en el precio"
            )
          )}
          {pergunta(
            "trial_possivel",
            tr(
              "Trial / Período de prova possível",
              "Trial period possible",
              "Período de prueba posible"
            )
          )}

          {formData.trial_possivel === "sim" && (
            <div>
              <label
                htmlFor="duracao_trial"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Duração do Trial", "Trial Duration", "Duración del Período de Prueba")} *
              </label>
              <Seleccao
                id="duracao_trial"
                value={formData.duracao_trial}
                onChange={(e) => updateField("duracao_trial", e.target.value)}
                className={classeCampo(erros, "duracao_trial")}
                {...atributosCampo(erros, apontamentos, "duracao_trial")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {duracoesTrialOpcoes.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="duracao_trial" />
            </div>
          )}

          {pergunta(
            "financiamento_possivel",
            tr(
              "Financiamento / pagamento parcelado disponível",
              "Financing / instalment payment available",
              "Financiación / pago a plazos disponible"
            )
          )}
          {pergunta(
            "exportacao_possivel",
            tr(
              "Exportação possível (documentação disponível)",
              "Export possible (documentation available)",
              "Exportación posible (documentación disponible)"
            )
          )}
          {pergunta(
            "acompanhamento_pos_venda",
            tr(
              "Acompanhamento pós-venda oferecido",
              "After-sales support offered",
              "Acompañamiento postventa ofrecido"
            )
          )}
          {pergunta(
            "internato_possivel",
            tr(
              "Internato possível durante a adaptação",
              "Livery possible during the handover",
              "Internado posible durante la adaptación"
            )
          )}
          {pergunta(
            "aulas_incluidas",
            tr(
              "Aulas de equitação incluídas na venda",
              "Riding lessons included in the sale",
              "Clases de equitación incluidas en la venta"
            )
          )}

          {garanhao &&
            pergunta(
              "disponivel_cobricao",
              tr("Disponível para cobrição", "Available for covering", "Disponible para cubrición")
            )}

          {garanhao && formData.disponivel_cobricao === "sim" && (
            <div>
              <label
                htmlFor="preco_cobricao"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Preço de Cobrição (€)", "Covering Fee (€)", "Precio de Cubrición (€)")} *
              </label>
              <div className="relative">
                <Euro
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                />
                <input
                  id="preco_cobricao"
                  type="number"
                  min={0}
                  value={formData.preco_cobricao}
                  onChange={(e) => updateField("preco_cobricao", e.target.value)}
                  className={classeCampo(erros, "preco_cobricao", "pl-12")}
                  placeholder="500"
                  {...ligarCampo("preco_cobricao", formData.preco_cobricao, ligacao)}
                />
              </div>
              <ErroDoCampo erros={erros} campo="preco_cobricao" />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="disponibilidade_visita"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.visit_availability} *
              </label>
              <Seleccao
                id="disponibilidade_visita"
                value={formData.disponibilidade_visita}
                onChange={(e) => updateField("disponibilidade_visita", e.target.value)}
                className={classeCampo(erros, "disponibilidade_visita")}
                {...atributosCampo(erros, apontamentos, "disponibilidade_visita")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {disponibilidades.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="disponibilidade_visita" />
            </div>
            <div>
              <label
                htmlFor="motivo_venda"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {tr("Motivo da Venda", "Reason for Sale", "Motivo de la Venta")} *
              </label>
              <Seleccao
                id="motivo_venda"
                value={formData.motivo_venda}
                onChange={(e) => updateField("motivo_venda", e.target.value)}
                className={classeCampo(erros, "motivo_venda")}
                {...atributosCampo(erros, apontamentos, "motivo_venda")}
              >
                <option value="">{t.vender_cavalo.select}</option>
                {(motivosVenda[language] || motivosVenda.pt).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Seleccao>
              <ErroDoCampo erros={erros} campo="motivo_venda" />
            </div>
          </div>

          <div>
            <label
              htmlFor="equipamento_incluido"
              className="block text-sm text-[var(--foreground-secondary)] mb-1"
            >
              {tr(
                "Equipamento Incluído na Venda",
                "Equipment Included in Sale",
                "Equipamiento Incluido en la Venta"
              )}{" "}
              *
              <span className="text-[var(--foreground-muted)] text-xs ml-1">
                {tr(
                  '(sela, cabeçada, mantas… "Nenhum" se não incluir nada)',
                  '(saddle, headcollar, rugs… "None" if nothing is included)',
                  '(silla, cabezada, mantas… "Ninguno" si no incluye nada)'
                )}
              </span>
            </label>
            <input
              id="equipamento_incluido"
              type="text"
              value={formData.equipamento_incluido}
              onChange={(e) => updateField("equipamento_incluido", e.target.value)}
              className={classeCampo(erros, "equipamento_incluido")}
              placeholder="Ex: Sela Pessoa + 2 mantas + cabeçada de couro"
              {...ligarCampo("equipamento_incluido", formData.equipamento_incluido, ligacao)}
            />
            <ErroDoCampo erros={erros} campo="equipamento_incluido" />
          </div>

          {pergunta(
            "aceita_visita_veterinario",
            tr(
              "Aceita exame de pré-compra por veterinário do comprador",
              "Accepts pre-purchase exam by the buyer's veterinarian",
              "Acepta examen de pre-compra por veterinario del comprador"
            )
          )}
        </Seccao>

        {/* Fotos */}
        <div className="border-t border-[var(--border)] pt-6" data-campo="fotografias">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
              <Camera size={16} className="text-[var(--foreground-muted)]" />
              {t.vender_cavalo.photos_title} *
            </h3>
            <span className="text-xs text-[var(--foreground-muted)] tabular-nums">
              {imagens.length}/{maxImages} &middot; {t.vender_cavalo.photos_min_req}
            </span>
          </div>
          <p className="text-xs text-[var(--foreground-muted)] mb-4">
            {t.vender_cavalo.photos_tip}
          </p>

          <ErroDoCampo erros={erros} campo="fotografias" />

          {/* Progresso de imagens */}
          <div className="h-1 bg-[var(--background-card)] rounded-full mb-4">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                imagens.length >= MIN_IMAGES ? "bg-[var(--ok)]" : "bg-[var(--foreground-muted)]"
              }`}
              style={{ width: `${Math.min(100, (imagens.length / MIN_IMAGES) * 100)}%` }}
            />
          </div>

          {/* Grid de pré-visualizações */}
          {imagens.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
              {imagens.map((img, i) => (
                <div
                  key={i}
                  className="aspect-square bg-[var(--background-card)] rounded-lg relative overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {/* Estava a `opacity-0` até haver hover: num telemóvel, que
                      não tem hover, não havia maneira de tirar uma fotografia
                      escolhida por engano. Agora vê-se sempre. */}
                  <button
                    type="button"
                    onClick={() => onRemoveImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-[var(--foreground-strong)] hover:bg-[var(--erro)] hover:text-black transition-colors touch-manipulation"
                    aria-label={`Remover foto ${i + 1}`}
                  >
                    <X size={12} />
                  </button>
                  {i === 0 && (
                    <span className="rotulo absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded">
                      {t.vender_cavalo.photo_main}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drag & drop area */}
          {imagens.length < maxImages && (
            <EscolherFicheiro
              texto={t.vender_cavalo.drag_or_click}
              aceita="image/*"
              multiplo
              aoEscolher={(ficheiros) =>
                onImageUpload({
                  target: { files: ficheiros },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              aoArrastar={{
                onDragOver: handleDragOver,
                onDragLeave: handleDragLeave,
                onDrop: handleDrop,
              }}
              className={`flex flex-col items-center justify-center gap-3 w-full py-8 border-2 border-dashed rounded-lg transition-all duration-200 touch-manipulation ${
                isDragging
                  ? "border-[var(--foreground-strong)] bg-[var(--elevate-1)]"
                  : "border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--background-card)]/50"
              }`}
            >
              <div className="w-10 h-10 border border-[var(--border)] rounded-lg flex items-center justify-center">
                {isDragging ? (
                  <ImagePlus
                    size={20}
                    className="text-[var(--foreground-muted)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Upload size={18} className="text-[var(--foreground-muted)]" aria-hidden="true" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {isDragging ? t.vender_cavalo.drop_here : t.vender_cavalo.drag_or_click}
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  JPG, PNG, WEBP &middot;{" "}
                  {t.vender_cavalo.max_images_hint.replace("{max}", String(maxImages))}
                </p>
              </div>
            </EscolherFicheiro>
          )}
        </div>

        <Seccao
          titulo={tr("Descrição e vídeos", "Description and videos", "Descripción y vídeos")}
          nota={tr(
            "Cem caracteres é o mínimo; dois vídeos são o que separa um anúncio de uma ficha.",
            "A hundred characters is the minimum; two videos are what separates a listing from a record.",
            "Cien caracteres es el mínimo; dos vídeos separan un anuncio de una ficha."
          )}
          {...conta("apresentacao")}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="descricao"
                className="block text-sm text-[var(--foreground-secondary)]"
              >
                {t.vender_cavalo.description} *
              </label>
              <span className="meta tabular-nums">
                {descLength}/{descMin}
              </span>
            </div>
            <textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => updateField("descricao", e.target.value)}
              className={classeCampo(erros, "descricao", "h-40 resize-none")}
              placeholder={t.vender_cavalo.placeholder_description}
              {...ligarCampo("descricao", formData.descricao, ligacao)}
            />
            <ErroDoCampo erros={erros} campo="descricao" />
            {/* Barra de progresso do texto */}
            <div className="mt-1.5 h-0.5 bg-[var(--background-card)] rounded-full">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  descReached ? "bg-[var(--ok)]" : "bg-[var(--foreground-muted)]/40"
                }`}
                style={{ width: `${descPercent}%` }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="videos_url"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.video_link} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">(vídeo 1)</span>
              </label>
              <input
                id="videos_url"
                type="url"
                value={formData.videos_url}
                onChange={(e) => updateField("videos_url", e.target.value)}
                className={classeCampo(erros, "videos_url")}
                placeholder="https://youtube.com/watch?v=..."
                {...ligarCampo("videos_url", formData.videos_url, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="videos_url" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="videos_url" />
            </div>
            <div>
              <label
                htmlFor="videos_url_2"
                className="block text-sm text-[var(--foreground-secondary)] mb-1"
              >
                {t.vender_cavalo.video_link} *
                <span className="text-[var(--foreground-muted)] text-xs ml-1">(vídeo 2)</span>
              </label>
              <input
                id="videos_url_2"
                type="url"
                value={formData.videos_url_2}
                onChange={(e) => updateField("videos_url_2", e.target.value)}
                className={classeCampo(erros, "videos_url_2")}
                placeholder="https://youtube.com/watch?v=..."
                {...ligarCampo("videos_url_2", formData.videos_url_2, ligacao)}
              />
              <ErroDoCampo erros={erros} campo="videos_url_2" />
              <ApontamentoDoCampo apontamentos={apontamentos} campo="videos_url_2" />
            </div>
          </div>
        </Seccao>
      </div>
    </div>
  );
}
