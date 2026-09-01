"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import type { FormData, Documentos, DocumentType } from "@/components/vender-cavalo/types";
import { initialFormData, TOTAL_STEPS } from "@/components/vender-cavalo/data";
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
import {
  validarPasso,
  type ErroCampo,
  type MensagensValidacao,
} from "@/components/vender-cavalo/validacao";
import { porCampo } from "@/components/vender-cavalo/campos-com-erro";
import {
  guardarRascunho,
  lerRascunho,
  limparRascunho,
  passoSeguro,
} from "@/components/vender-cavalo/rascunho";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

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
  const tr = useMemo(() => createTranslator(language), [language]);
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [imagens, setImagens] = useState<File[]>([]);
  const [documentos, setDocumentos] = useState<Documentos>({});
  const [errors, setErrors] = useState<ErroCampo[]>([]);
  const [selectedTier, setSelectedTier] = useState("standard");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rascunhoReposto, setRascunhoReposto] = useState<{ ficheiros: boolean } | null>(null);

  /** O topo do formulário. Ao mudar de passo é para aqui que se volta. */
  const topoDoFormulario = useRef<HTMLDivElement>(null);
  /** O resumo dos erros. Quando a validação falha é ele que recebe o foco. */
  const resumoDeErros = useRef<HTMLDivElement>(null);
  /** Já se restaurou? Serve para não gravar por cima do rascunho antes de o ler. */
  const jaLeuRascunho = useRef(false);

  const mensagens: MensagensValidacao = useMemo(
    () => ({
      nomeProprietario: t.form_validation.required_owner_name,
      email: t.form_validation.required_email,
      emailInvalido: tr(
        "O email parece ter uma gralha — confirme a arroba e o domínio.",
        "That email looks like a typo — check the @ and the domain.",
        "El email parece tener una errata — compruebe la arroba y el dominio."
      ),
      telefone: t.form_validation.required_phone,
      nomeCavalo: t.form_validation.required_horse_name,
      numeroRegisto: t.form_validation.required_registration_number,
      dataNascimento: t.form_validation.required_birth_date,
      dataNascimentoFutura: tr(
        "Confirme o ano de nascimento — a data indicada não é possível.",
        "Check the year of birth — that date is not possible.",
        "Compruebe el año de nacimiento — esa fecha no es posible."
      ),
      sexo: t.form_validation.required_sex,
      pelagem: t.form_validation.required_coat,
      pai: tr("Indique o nome do pai.", "Enter the sire's name.", "Indique el nombre del padre."),
      mae: tr("Indique o nome da mãe.", "Enter the dam's name.", "Indique el nombre de la madre."),
      livroAzul: t.form_validation.required_blue_book,
      nivelTreino: t.form_validation.required_training_level,
      estadoSaude: t.form_validation.required_health_status,
      preco: t.form_validation.required_price,
      precoInvalido: tr(
        "Indique um preço acima de zero.",
        "Enter a price above zero.",
        "Indique un precio superior a cero."
      ),
      regiao: tr(
        "Selecione o distrito / região do cavalo.",
        "Please select the horse's district / region.",
        "Por favor seleccione el distrito / región del caballo."
      ),
      localizacao: t.vender_cavalo.error_location_required,
      descricao: t.vender_cavalo.error_description_min,
      fotografias: t.vender_cavalo.error_photos_min,
      termos: t.vender_cavalo.error_terms_required,
    }),
    [t, tr]
  );

  // ---- Rascunho -----------------------------------------------------------
  // Ler antes de gravar. Sem esta ordem o primeiro `guardarRascunho` do
  // arranque escrevia o formulário vazio por cima do que lá estava.
  useEffect(() => {
    const { rascunho, perdeuFicheiros } = lerRascunho();
    if (rascunho) {
      setFormData({ ...initialFormData, ...rascunho.formData });
      // Não se devolve ninguém a um passo que ele não vai conseguir passar:
      // as fotografias e os documentos não sobrevivem ao rascunho.
      setStep(passoSeguro(rascunho));
      setSelectedTier(rascunho.plano);
      setRascunhoReposto({ ficheiros: perdeuFicheiros });
    }
    jaLeuRascunho.current = true;
  }, []);

  const guardar = useCallback(() => {
    if (!jaLeuRascunho.current) return;
    guardarRascunho({
      formData,
      passo: step,
      plano: selectedTier,
      fotografias: imagens.length,
      documentos: Object.keys(documentos).length,
    });
  }, [formData, step, selectedTier, imagens.length, documentos]);

  useEffect(() => {
    guardar();
  }, [guardar]);

  const recomecar = () => {
    limparRascunho();
    setFormData(initialFormData);
    setStep(1);
    setSelectedTier("standard");
    setImagens([]);
    setDocumentos({});
    setTermsAccepted(false);
    setErrors([]);
    setRascunhoReposto(null);
  };

  // ---- Campos -------------------------------------------------------------
  const updateField = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Um erro que já foi corrigido não fica no ecrã à espera do próximo
    // «Continuar»: quem escreve no campo apaga a queixa sobre ele.
    setErrors((prev) =>
      prev.some((e) => e.campo === field) ? prev.filter((e) => e.campo !== field) : prev
    );
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

  // ---- Passos -------------------------------------------------------------
  const validar = (passo: number): ErroCampo[] => {
    const encontrados = validarPasso(
      passo,
      { formData, documentos, imagens, termosAceites: termsAccepted },
      mensagens
    );
    setErrors(encontrados);
    return encontrados;
  };

  /**
   * Onde é que a pessoa fica depois de carregar num botão.
   *
   * Medido antes: com o passo 1 vazio, o resumo de erros aparecia 1302px acima
   * do ecrã em computador e 1452px abaixo da dobra em telemóvel — nos dois
   * casos, carregar em «Continuar» não fazia nada visível. E ao avançar de
   * passo a página ficava onde estava: o passo 2 abria a meio de si próprio,
   * com `scrollY` a 3455 numa página de 4872.
   */
  const irPara = (elemento: HTMLElement | null, foco = false) => {
    if (!elemento) return;
    // O `?.` não é decoração: o jsdom, onde os testes de unidade correm, não
    // implementa `scrollIntoView`, e sem ele voltar um passo atrás rebentava.
    elemento.scrollIntoView?.({ block: "start", behavior: "smooth" });
    if (foco) elemento.focus({ preventScroll: true });
  };

  /**
   * O resumo de erros só existe no DOM depois de haver erros para mostrar.
   *
   * Chamar-lhe o foco no mesmo instante em que se chama `setErrors` não
   * funciona: nessa altura o `ref` ainda é `null`, porque o React só monta o
   * resumo no render seguinte. Marca-se a intenção e vai-se lá no efeito, que
   * corre já com o elemento montado.
   */
  const levarAosErros = useRef(false);

  useEffect(() => {
    if (!levarAosErros.current) return;
    levarAosErros.current = false;
    if (errors.length === 0) return;
    irPara(resumoDeErros.current, true);
  }, [errors]);

  const nextStep = () => {
    const falhas = validar(step);
    if (falhas.length > 0) {
      levarAosErros.current = true;
      return;
    }
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    irPara(topoDoFormulario.current);
  };

  const prevStep = () => {
    setErrors([]);
    setStep((prev) => Math.max(prev - 1, 1));
    irPara(topoDoFormulario.current);
  };

  /** Enter num campo de texto avança o passo, como em qualquer formulário. */
  const aoSubmeter = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < TOTAL_STEPS) nextStep();
    else handleSubmit();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (tierData.maxPhotos !== -1 && imagens.length + files.length > maxImages) {
      setErrors([{ campo: "fotografias", mensagem: t.vender_cavalo.error_max_images }]);
      return;
    }
    setImagens((prev) => [...prev, ...files]);
    setErrors((prev) => prev.filter((erro) => erro.campo !== "fotografias"));
  };

  const removeImage = (index: number) => {
    setImagens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocUpload = (type: DocumentType, file: File) => {
    setDocumentos((prev) => ({ ...prev, [type]: file }));
    if (type === "livroAzul") setErrors((prev) => prev.filter((e) => e.campo !== "livro_azul"));
  };

  const handleSubmit = async () => {
    if (validar(4).length > 0) {
      levarAosErros.current = true;
      return;
    }

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
            proprietarioNif: formData.proprietario_nif,
            proprietarioMorada: formData.proprietario_morada,
            tipoProprietario: formData.tipo_proprietario,
            paisProprietario: formData.pais_proprietario,
            websiteCoudelaria: formData.website_coudelaria,
            nomeCavalo: formData.nome,
            nomeRegisto: formData.nome_registo,
            numeroRegisto: formData.numero_registo,
            microchip: formData.microchip,
            passaporteEquino: formData.passaporte_equino,
            racaConfirmada: formData.raca_confirmada,
            paisNascimento: formData.pais_nascimento,
            peso: formData.peso,
            corOlhos: formData.cor_olhos,
            corCrina: formData.cor_crina,
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
            // O anúncio publicado lê `linhagem`; o formulário chamava-lhe
            // `linhagemPrincipal` e mandava só esse nome, por isso a linhagem
            // nunca chegava ao anúncio. Vão os dois.
            linhagem: formData.linhagem_principal,
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
            usoAtual: formData.uso_atual,
            disciplinas: formData.disciplinas,
            competicoes: formData.competicoes,
            premios: formData.premios,
            habituadoTransporte: formData.habituado_transporte,
            habituadoFerrador: formData.habituado_ferrador,
            habituadoVeterinario: formData.habituado_veterinario,
            trabalhaEmGrupo: formData.trabalha_em_grupo,
            trabalhaSolto: formData.trabalha_solto,
            trabalhaAMao: formData.trabalha_a_mao,
            habituadoCampo: formData.habituado_campo,
            aptoCriancas: formData.apto_criancas,
            regimeEstabulacao: formData.regime_estabulacao,
            tipoAlimentacao: formData.tipo_alimentacao,
            horasTrabalhoSemana: formData.horas_trabalho_semana,
            testeDnaRealizado: formData.teste_dna_realizado,
            seguroEquino: formData.seguro_equino,
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
            disponibilidadeVisita: formData.disponibilidade_visita,
            motivoVenda: formData.motivo_venda,
            aceitaVisitaVeterinario: formData.aceita_visita_veterinario,
            equipamentoIncluido: formData.equipamento_incluido,
            regiao: formData.regiao,
            localizacao: formData.localizacao,
            descricao: formData.descricao,
            // O primeiro vídeo era pedido e nunca era enviado: só ia o
            // segundo. Quem punha um vídeo só perdia-o sempre.
            videosUrl: formData.videos_url,
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

      // O rascunho fica. Quem desiste no Stripe — ou a quem o cartão é
      // recusado — volta a esta página pelo `cancel_url`, e antes voltava
      // para um formulário vazio: tudo o que tinha escrito era apagado no
      // instante antes de sair. Quem apaga é a página de sucesso, que é o
      // único sítio onde se sabe que o anúncio existe.
      window.location.href = data.url;
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") console.error("[VenderCavalo]", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      showToast("error", t.vender_cavalo.error_payment.replace("{message}", message));
      setLoading(false);
    }
  };

  const tierData = LISTING_TIERS[selectedTier] || LISTING_TIERS.standard;
  const maxImages = tierData.maxPhotos === -1 ? 50 : tierData.maxPhotos;
  const errosPorCampo = useMemo(() => porCampo(errors), [errors]);

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

      <div ref={topoDoFormulario} className="max-w-3xl mx-auto scroll-mt-24">
        <StepIndicator currentStep={step} />
      </div>

      {/* O rascunho que voltou. Aparecia só no passo 1 — e como o rascunho
          também repõe o passo, quem o tinha deixado no passo 3 nunca via este
          aviso: o formulário aparecia preenchido sem explicação nenhuma. */}
      {rascunhoReposto && (
        <div className="max-w-3xl mx-auto mb-4">
          <div className="barra-rascunho">
            <div className="min-w-0">
              <p className="text-sm text-[var(--foreground-secondary)]">
                {(t.vender_cavalo as Record<string, string>)?.draft_restored ||
                  "Rascunho restaurado automaticamente"}
              </p>
              {rascunhoReposto.ficheiros && (
                <p className="meta mt-1">
                  {tr(
                    "As fotografias e os documentos não ficam guardados no rascunho — volte a escolhê-los.",
                    "Photos and documents are not kept in the draft — please choose them again.",
                    "Las fotografías y los documentos no se guardan en el borrador — vuelva a elegirlos."
                  )}
                </p>
              )}
            </div>
            <button type="button" onClick={recomecar} className="btn btn-subtil btn-sm flex-none">
              {tr("Recomeçar de novo", "Start over", "Empezar de nuevo")}
            </button>
          </div>
        </div>
      )}

      {/* Um formulário a sério. Eram noventa e quatro campos sem um único
          `<form>`: a tecla Enter não fazia nada, o `required` de cada campo
          não era verificado por ninguém, e não havia marco de formulário para
          quem navega com leitor de ecrã. */}
      <form className="max-w-3xl mx-auto" onSubmit={aoSubmeter} noValidate>
        <FormErrors ref={resumoDeErros} erros={errors} />

        {/* A troca de passo usa o movimento que o sistema já tem para trocar
            de vista, e a `key` é o que a faz voltar a correr. */}
        <div key={step} className="vista-troca">
          {/* Passo 1: proprietário + identificação */}
          {step === 1 && (
            <>
              <StepProprietario
                formData={formData}
                updateField={updateField}
                erros={errosPorCampo}
              />
              <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <StepIdentificacao
                  formData={formData}
                  updateField={updateField}
                  erros={errosPorCampo}
                />
              </div>
            </>
          )}

          {/* Passo 2: linhagem + treino e saúde */}
          {step === 2 && (
            <>
              <StepLinhagem
                formData={formData}
                updateField={updateField}
                documentos={documentos}
                onDocUpload={handleDocUpload}
                erros={errosPorCampo}
              />
              <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <StepTreinoSaude
                  formData={formData}
                  updateField={updateField}
                  documentos={documentos}
                  onDocUpload={handleDocUpload}
                  onToggleDisciplina={toggleDisciplina}
                  onToggleUso={toggleUso}
                  erros={errosPorCampo}
                />
              </div>
            </>
          )}

          {/* Passo 3: preço e apresentação */}
          {step === 3 && (
            <StepPrecoApresentacao
              formData={formData}
              updateField={updateField}
              imagens={imagens}
              onImageUpload={handleImageUpload}
              onRemoveImage={removeImage}
              maxImages={maxImages}
              erros={errosPorCampo}
            />
          )}

          {/* Passo 4: pagamento */}
          {step === 4 && (
            <StepPagamento
              formData={formData}
              imagens={imagens}
              selectedTier={selectedTier}
              termsAccepted={termsAccepted}
              onTermsChange={(aceite) => {
                setTermsAccepted(aceite);
                if (aceite) setErrors((prev) => prev.filter((e) => e.campo !== "termos_aceites"));
              }}
              loading={loading}
              erros={errosPorCampo}
            />
          )}
        </div>

        <FormNavigation step={step} onPrev={prevStep} />
      </form>
    </main>
  );
}
