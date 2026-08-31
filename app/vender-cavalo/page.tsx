"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import type { FormData, Documentos, DocumentType } from "@/components/vender-cavalo/types";
import {
  initialFormData,
  TOTAL_STEPS,
  MIN_IMAGES,
  MIN_DESCRIPTION_LENGTH,
} from "@/components/vender-cavalo/data";
import { LISTING_TIERS } from "@/lib/listing-tiers";
import PageHeader from "@/components/vender-cavalo/PageHeader";
import PricingBanner from "@/components/vender-cavalo/PricingBanner";
import HowItWorks from "@/components/vender-cavalo/HowItWorks";
import StepIndicator from "@/components/vender-cavalo/StepIndicator";
import FormErrors from "@/components/vender-cavalo/FormErrors";
import FormNavigation from "@/components/vender-cavalo/FormNavigation";
import StepProprietario from "@/components/vender-cavalo/StepProprietario";
import StepIdentificacao from "@/components/vender-cavalo/StepIdentificacao";
import StepLinhagem from "@/components/vender-cavalo/StepLinhagem";
import StepTreinoSaude from "@/components/vender-cavalo/StepTreinoSaude";
import StepPrecoApresentacao from "@/components/vender-cavalo/StepPrecoApresentacao";
import StepPagamento from "@/components/vender-cavalo/StepPagamento";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

const AUTOSAVE_KEY = "vender-cavalo-draft";

function calcularIdade(dataNascimento: string): number {
  if (!dataNascimento) return 0;
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();
  if (
    mesAtual < mesNascimento ||
    (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
  ) {
    idade--;
  }
  return idade;
}

export default function VenderCavaloPage() {
  const { t, language } = useLanguage();
  const tr = createTranslator(language);
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [imagens, setImagens] = useState<File[]>([]);
  const [documentos, setDocumentos] = useState<Documentos>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState("standard");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);

  // Auto-restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.formData) setFormData(draft.formData);
        if (draft.step) setStep(draft.step);
        if (draft.selectedTier) setSelectedTier(draft.selectedTier);
        setRestored(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Auto-save draft to localStorage on changes
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ formData, step, selectedTier }));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [formData, step, selectedTier]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // Ignore
    }
  };

  const updateField = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDisciplina = (disc: string) => {
    setFormData((prev) => ({
      ...prev,
      disciplinas: prev.disciplinas.includes(disc)
        ? prev.disciplinas.filter((d) => d !== disc)
        : [...prev.disciplinas, disc],
    }));
  };

  const toggleUso = (uso: string) => {
    setFormData((prev) => ({
      ...prev,
      uso_atual: prev.uso_atual.includes(uso)
        ? prev.uso_atual.filter((u) => u !== uso)
        : [...prev.uso_atual, uso],
    }));
  };

  // Merged step validation: Step 1 = Owner+ID, Step 2 = Lineage+Health, Step 3 = Price, Step 4 = Payment
  const validateStep = (currentStep: number): boolean => {
    const newErrors: string[] = [];

    if (currentStep === 1) {
      // Owner info — apenas essenciais para contacto
      if (!formData.proprietario_nome) newErrors.push(t.form_validation.required_owner_name);
      if (!formData.proprietario_email) newErrors.push(t.form_validation.required_email);
      if (!formData.proprietario_telefone) newErrors.push(t.form_validation.required_phone);
      // NIF is optional (collected for invoicing later)
      // Horse ID — apenas o essencial
      if (!formData.nome) newErrors.push(t.form_validation.required_horse_name);
      if (!formData.nome_registo) newErrors.push(t.form_validation.required_registration_name);
      if (!formData.numero_registo) newErrors.push(t.form_validation.required_registration_number);
      if (!formData.microchip || formData.microchip.length < 15)
        newErrors.push(t.form_validation.required_microchip);
      if (!formData.data_nascimento) newErrors.push(t.form_validation.required_birth_date);
      if (!formData.sexo) newErrors.push(t.form_validation.required_sex);
      if (!formData.temperamento)
        newErrors.push(
          tr(
            "Selecione o temperamento do cavalo.",
            "Please select the horse's temperament.",
            "Por favor seleccione el temperamento del caballo."
          )
        );
    }

    if (currentStep === 2) {
      // Lineage
      if (!formData.pai_nome || !formData.pai_registo)
        newErrors.push(t.form_validation.required_sire);
      if (!formData.mae_nome || !formData.mae_registo)
        newErrors.push(t.form_validation.required_dam);
      if (!documentos.livroAzul) newErrors.push(t.form_validation.required_blue_book);
      // Training & Health
      if (!formData.nivel_treino) newErrors.push(t.form_validation.required_training_level);
      if (!formData.nivel_cavaleiro)
        newErrors.push(
          tr(
            "Selecione o nível de cavaleiro recomendado.",
            "Please select the recommended rider level.",
            "Por favor seleccione el nivel de jinete recomendado."
          )
        );
      if (!formData.estado_saude) newErrors.push(t.form_validation.required_health_status);
      if (!formData.vacinacao_atualizada) newErrors.push(t.form_validation.required_vaccination);
    }

    if (currentStep === 3) {
      if (!formData.preco) newErrors.push(t.form_validation.required_price);
      if (!formData.regiao)
        newErrors.push(
          tr(
            "Selecione o distrito / região do cavalo.",
            "Please select the horse's district / region.",
            "Por favor seleccione el distrito / región del caballo."
          )
        );
      if (!formData.localizacao) newErrors.push(t.vender_cavalo.error_location_required);
      if (!formData.descricao || formData.descricao.length < MIN_DESCRIPTION_LENGTH)
        newErrors.push(t.vender_cavalo.error_description_min);
      if (imagens.length < MIN_IMAGES) newErrors.push(t.vender_cavalo.error_photos_min);
    }

    if (currentStep === 4) {
      if (!termsAccepted) newErrors.push(t.vender_cavalo.error_terms_required);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (tierData.maxPhotos !== -1 && imagens.length + files.length > maxImages) {
      setErrors([t.vender_cavalo.error_max_images]);
      return;
    }
    setImagens((prev) => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImagens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocUpload = (type: DocumentType, file: File) => {
    setDocumentos((prev) => ({ ...prev, [type]: file }));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);

    try {
      // 1. Upload images to Supabase Storage first
      let imageUrls: string[] = [];
      if (imagens.length > 0) {
        const uploadFormData = new FormData();
        imagens.forEach((img) => uploadFormData.append("images", img));

        const uploadRes = await fetch("/api/vender-cavalo/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          throw new Error(
            uploadErr.error ||
              tr(
                "Erro ao fazer upload das imagens",
                "Error uploading images",
                "Error al subir las imágenes"
              )
          );
        }

        const { urls } = await uploadRes.json();
        imageUrls = urls as string[];
      }

      // 2. Create Stripe checkout session with image URLs
      const response = await fetch("/api/vender-cavalo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          formData: {
            proprietarioNome: formData.proprietario_nome,
            proprietarioEmail: formData.proprietario_email,
            proprietarioTelefone: formData.proprietario_telefone,
            proprietarioWhatsapp: formData.proprietario_whatsapp || formData.proprietario_telefone,
            nomeCavalo: formData.nome,
            nomeRegisto: formData.nome_registo,
            numeroRegisto: formData.numero_registo,
            microchip: formData.microchip,
            passaporteEquino: formData.passaporte_equino,
            peso: formData.peso,
            corOlhos: formData.cor_olhos,
            nivelApsl: formData.nivel_apsl,
            pai: formData.pai_nome,
            paiRegisto: formData.pai_registo,
            mae: formData.mae_nome,
            maeRegisto: formData.mae_registo,
            avoPaterno: formData.avo_paterno_nome,
            avoPaternoRegisto: formData.avo_paterno_registo,
            avoPaternoMae: formData.avo_paterno_mae_nome,
            avoPaternoMaeRegisto: formData.avo_paterno_mae_registo,
            avoMaterno: formData.avo_materno_nome,
            avoMaternoRegisto: formData.avo_materno_registo,
            avoMaternoMae: formData.avo_materno_mae_nome,
            avoMaternoMaeRegisto: formData.avo_materno_mae_registo,
            linhagemPrincipal: formData.linhagem_principal,
            coudelariaOrigem: formData.coudelaria_origem,
            dataNascimento: formData.data_nascimento,
            idade: calcularIdade(formData.data_nascimento),
            sexo: formData.sexo,
            pelagem: formData.pelagem,
            altura: formData.altura,
            temperamento: formData.temperamento,
            marcasDistintivas: formData.marcas_distintivas,
            corCasco: formData.cor_casco,
            provaAptidaoApsl: formData.prova_aptidao_apsl,
            nivelTreino: formData.nivel_treino,
            anosTreino: formData.anos_treino,
            nivelCavaleiro: formData.nivel_cavaleiro,
            treinadorAtual: formData.treinador_atual,
            gineteHabitual: formData.ginete_habitual,
            disciplinas: formData.disciplinas,
            competicoes: formData.competicoes,
            premios: formData.premios,
            habituadoTransporte: formData.habituado_transporte,
            habituadoFerrador: formData.habituado_ferrador,
            habituadoVeterinario: formData.habituado_veterinario,
            trabalhaEmGrupo: formData.trabalha_em_grupo,
            trabalhaSolto: formData.trabalha_solto,
            aptoCriancas: formData.apto_criancas,
            estadoSaude: formData.estado_saude,
            vacinacaoAtualizada: formData.vacinacao_atualizada,
            dataUltimaVacinacao: formData.data_ultima_vacinacao,
            desparasitacaoAtualizada: formData.desparasitacao_atualizada,
            dataUltimaDesparasitacao: formData.data_ultima_desparasitacao,
            exameVeterinario: formData.exame_veterinario,
            radiografiasDisponivel: formData.radiografias_disponivel,
            piroplasmoseTestado: formData.piroplasmose_testado,
            dataUltimaFerragem: formData.data_ultima_ferragem,
            tipoFerragem: formData.tipo_ferragem,
            nomeVeterinario: formData.nome_veterinario,
            historicoLesoes: formData.historico_lesoes,
            observacoesSaude: formData.observacoes_saude,
            preco: formData.preco,
            precoNegociavel: formData.negociavel,
            aceitaTroca: formData.aceita_troca,
            transporteIncluido: formData.transporte_incluido,
            trialPossivel: formData.trial_possivel,
            duracaoTrial: formData.duracao_trial,
            financiamentoPossivel: formData.financiamento_possivel,
            exportacaoPossivel: formData.exportacao_possivel,
            acompanhamentoPosVenda: formData.acompanhamento_pos_venda,
            internatoPossivel: formData.internato_possivel,
            aulasIncluidas: formData.aulas_incluidas,
            disponivelCobricao: formData.disponivel_cobricao,
            precoCobricao: formData.preco_cobricao,
            regiao: formData.regiao,
            localizacao: formData.localizacao,
            descricao: formData.descricao,
            videosUrl2: formData.videos_url_2,
            registoAPSL: formData.numero_registo,
            documentosEmDia: formData.vacinacao_atualizada && formData.desparasitacao_atualizada,
            imageUrls,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.vender_cavalo.error_checkout);
      }

      if (!data.url) {
        throw new Error(t.vender_cavalo.error_no_checkout_url);
      }

      // Clear draft on successful checkout redirect
      clearDraft();
      window.location.href = data.url;
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") console.error("[VenderCavalo]", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      showToast("error", t.vender_cavalo.error_payment.replace("{message}", message));
      setLoading(false);
    }
  };

  const tierData = LISTING_TIERS[selectedTier] || LISTING_TIERS.standard;
  const precoTotal = tierData.priceInCents / 100;
  const maxImages = tierData.maxPhotos === -1 ? 50 : tierData.maxPhotos;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 sm:pt-24 md:pt-32 pb-32 px-4 sm:px-6 md:px-12">
      <div data-revelar="" suppressHydrationWarning>
        <PageHeader />
      </div>
      <div
        data-revelar=""
        suppressHydrationWarning
        style={{ "--rdelay": "100ms" } as React.CSSProperties}
      >
        <HowItWorks />
      </div>
      <div
        data-revelar=""
        suppressHydrationWarning
        style={{ "--rdelay": "200ms" } as React.CSSProperties}
      >
        <PricingBanner selectedTier={selectedTier} onTierChange={setSelectedTier} />
      </div>

      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
      </div>

      {/* Auto-save indicator */}
      {restored && step === 1 && (
        <div className="max-w-3xl mx-auto mb-4">
          <div className="flex items-center justify-between bg-[var(--gold)]/10 border border-[var(--gold)]/20 px-4 py-2 text-sm">
            <span className="text-[var(--foreground-secondary)]">
              {(t.vender_cavalo as Record<string, string>)?.draft_restored ||
                "Rascunho restaurado automaticamente"}
            </span>
            <button
              onClick={() => {
                clearDraft();
                setFormData(initialFormData);
                setStep(1);
                setSelectedTier("standard");
                setRestored(false);
              }}
              className="text-[var(--gold)] text-xs uppercase tracking-wider hover:underline"
            >
              {(t.vender_cavalo as Record<string, string>)?.clear_draft || "Limpar"}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <FormErrors errors={errors} />

        {/* Step 1: Owner + Horse Identification (merged old steps 1+2) */}
        {step === 1 && (
          <>
            <StepProprietario formData={formData} updateField={updateField} />
            <div className="mt-8 pt-8 border-t border-[var(--border)]">
              <StepIdentificacao formData={formData} updateField={updateField} />
            </div>
          </>
        )}

        {/* Step 2: Lineage + Training/Health (merged old steps 3+4) */}
        {step === 2 && (
          <>
            <StepLinhagem
              formData={formData}
              updateField={updateField}
              documentos={documentos}
              onDocUpload={handleDocUpload}
            />
            <div className="mt-8 pt-8 border-t border-[var(--border)]">
              <StepTreinoSaude
                formData={formData}
                updateField={updateField}
                documentos={documentos}
                onDocUpload={handleDocUpload}
                onToggleDisciplina={toggleDisciplina}
                onToggleUso={toggleUso}
              />
            </div>
          </>
        )}

        {/* Step 3: Price & Presentation (old step 5) */}
        {step === 3 && (
          <StepPrecoApresentacao
            formData={formData}
            updateField={updateField}
            imagens={imagens}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            maxImages={maxImages}
          />
        )}

        {/* Step 4: Payment (old step 6) */}
        {step === 4 && (
          <StepPagamento
            formData={formData}
            imagens={imagens}
            selectedTier={selectedTier}
            termsAccepted={termsAccepted}
            onTermsChange={setTermsAccepted}
            loading={loading}
            onSubmit={handleSubmit}
          />
        )}

        <FormNavigation step={step} onPrev={prevStep} onNext={nextStep} />
      </div>
    </main>
  );
}
