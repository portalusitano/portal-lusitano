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
import { errosDeInspeccao, type MensagensInspeccao } from "@/components/vender-cavalo/inspeccao";
import { useInspeccao } from "@/components/vender-cavalo/usar-inspeccao";
import { useRegistoApsl } from "@/components/vender-cavalo/usar-registo-apsl";
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
  /**
   * O que o resumo do topo mostra.
   *
   * Vive à parte dos `errors` porque as duas coisas respondem a perguntas
   * diferentes. O `errors` é «o que está errado agora», e é ele que acende o
   * campo e escreve a frase por baixo — e passou a encher-se também ao sair de
   * um campo, que é quando a pessoa ainda está a pensar naquilo.
   *
   * O resumo é «o que te impediu de avançar quando carregaste em Continuar»,
   * e tem de continuar a ser só isso. Ele é `role="alert"` com
   * `aria-live="assertive"`: pô-lo a aparecer a cada `blur` fazia um leitor de
   * ecrã interromper quem escreve para lhe ler a lista inteira, e punha um
   * bloco vermelho no topo da página por causa de um campo que a pessoa acabou
   * de largar e já vê assinalado ao lado.
   */
  const [resumo, setResumo] = useState<ErroCampo[]>([]);
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

  /**
   * As frases da inspecção. Vivem ao lado das da validação e pela mesma razão:
   * a camada que decide não sabe de línguas, e as três línguas escrevem-se
   * uma vez só, aqui.
   */
  const mensagensInspeccao: MensagensInspeccao = useMemo(
    () => ({
      microchipComprimento: (faltam) =>
        faltam > 0
          ? tr(
              `Um microchip tem 15 algarismos — faltam ${faltam}.`,
              `A microchip has 15 digits — ${faltam} missing.`,
              `Un microchip tiene 15 dígitos — faltan ${faltam}.`
            )
          : tr(
              `Um microchip tem 15 algarismos — há ${-faltam} a mais.`,
              `A microchip has 15 digits — ${-faltam} too many.`,
              `Un microchip tiene 15 dígitos — hay ${-faltam} de más.`
            ),
      microchipNaoNumerico: tr(
        "O microchip é só algarismos. Com letras, o número que tem à frente é outro — talvez o do passaporte.",
        "A microchip is digits only. With letters, that is another number — the passport, perhaps.",
        "El microchip son sólo dígitos. Con letras, ése es otro número — quizá el del pasaporte."
      ),
      microchipPrefixo: tr(
        "Os três primeiros algarismos são o código do país (620 em Portugal) ou 900–999 do fabricante. Confirme o início.",
        "The first three digits are the country code (620 in Portugal) or 900–999 for a manufacturer. Check the start.",
        "Los tres primeros dígitos son el código de país (620 en Portugal) o 900–999 del fabricante. Compruebe el inicio."
      ),
      microchipRepetido: tr(
        "Quinze algarismos iguais não são um microchip.",
        "Fifteen identical digits are not a microchip.",
        "Quince dígitos iguales no son un microchip."
      ),
      nifComprimento: tr(
        "O NIF tem nove algarismos.",
        "A Portuguese tax number has nine digits.",
        "El NIF tiene nueve dígitos."
      ),
      nifControlo: tr(
        "Este NIF não fecha — o último algarismo é de controlo e não bate certo com os outros oito.",
        "This tax number does not check out — the last digit is a checksum and does not match the other eight.",
        "Este NIF no cuadra — el último dígito es de control y no coincide con los otros ocho."
      ),
      nifSingularEmpresa: tr(
        "Escolheu vender como empresa mas o NIF é de pessoa singular. A factura sai com este nome.",
        "You are selling as a business but this tax number belongs to an individual. The invoice will use it.",
        "Vende como empresa pero el NIF es de persona física. La factura saldrá con éste."
      ),
      nifColectivoParticular: tr(
        "Escolheu vender como particular mas o NIF é de pessoa colectiva. Confirme qual deles quer na factura.",
        "You are selling as a private individual but this is a company tax number. Check which you want on the invoice.",
        "Vende como particular pero el NIF es de persona jurídica. Compruebe cuál quiere en la factura."
      ),
      telefoneInvalido: tr(
        "Um número português é 9 seguido de 1, 2, 3 ou 6 e mais sete algarismos, ou um fixo com nove a começar por 2.",
        "A Portuguese number is 9 followed by 1, 2, 3 or 6 and seven more digits, or a nine-digit landline starting with 2.",
        "Un número portugués es 9 seguido de 1, 2, 3 o 6 y siete dígitos más, o un fijo de nueve que empieza por 2."
      ),
      telefoneInternacional: tr(
        "Este número não tem algarismos que cheguem. Inclua o indicativo do país.",
        "That number has too few digits. Include the country code.",
        "Ese número no tiene dígitos suficientes. Incluya el prefijo del país."
      ),
      emailDominio: (sugerido) =>
        tr(
          `Quis dizer ${sugerido}? A confirmação da compra vai por email.`,
          `Did you mean ${sugerido}? The purchase confirmation goes by email.`,
          `¿Quiso decir ${sugerido}? La confirmación de la compra va por email.`
        ),
      alturaEmMaos: (cm) =>
        tr(
          `Isso parecem mãos, e a caixa pede centímetros — dá ${cm}cm.`,
          `That looks like hands, and this box asks for centimetres — that is ${cm}cm.`,
          `Eso parecen manos, y la casilla pide centímetros — son ${cm}cm.`
        ),
      alturaImpossivel: tr(
        "A altura vai em centímetros, ao garrote.",
        "Height goes in centimetres, at the withers.",
        "La altura va en centímetros, a la cruz."
      ),
      alturaInvulgar: tr(
        "Um Lusitano adulto anda pelos 150–170cm. Confirme se é mesmo esta.",
        "An adult Lusitano is usually 150–170cm. Please confirm.",
        "Un Lusitano adulto ronda los 150–170cm. Confirme si es ésta."
      ),
      pesoImpossivel: tr(
        "O peso vai em quilogramas.",
        "Weight goes in kilograms.",
        "El peso va en kilogramos."
      ),
      pesoInvulgar: tr(
        "Um Lusitano adulto anda pelos 400–650kg. Confirme se é mesmo este.",
        "An adult Lusitano is usually 400–650kg. Please confirm.",
        "Un Lusitano adulto ronda los 400–650kg. Confirme si es éste."
      ),
      precoZeroAMenos: tr(
        "Para um PSL registado isto é muito baixo — faltou um zero?",
        "That is very low for a registered PSL — is a zero missing?",
        "Para un PSL registrado es muy bajo — ¿falta un cero?"
      ),
      precoBaixo: tr(
        "É um preço baixo para um PSL registado. Confirme antes de publicar.",
        "That is a low price for a registered PSL. Please check before publishing.",
        "Es un precio bajo para un PSL registrado. Compruébelo antes de publicar."
      ),
      precoAlto: tr(
        "É um preço muito alto. Confirme o número de zeros.",
        "That is a very high price. Please check the zeros.",
        "Es un precio muy alto. Compruebe los ceros."
      ),
      pontuacaoForaDaEscala: tr(
        "A pontuação morfológica é numa escala até 100.",
        "The conformation score runs on a scale up to 100.",
        "La puntuación morfológica va en una escala hasta 100."
      ),
      pontuacaoInvulgar: tr(
        "As pontuações atribuídas andam quase sempre entre 60 e 80. Confirme.",
        "Awarded scores are almost always between 60 and 80. Please check.",
        "Las puntuaciones otorgadas suelen estar entre 60 y 80. Compruébelo."
      ),
      registoCurto: tr(
        "Um número de registo tem mais do que dois caracteres.",
        "A registration number has more than two characters.",
        "Un número de registro tiene más de dos caracteres."
      ),
      registoRepetido: tr(
        "Isto é o mesmo caractere repetido, não um número de registo.",
        "That is one character repeated, not a registration number.",
        "Eso es un mismo carácter repetido, no un número de registro."
      ),
      registoEONome: tr(
        "Aqui vai o número do Livro Azul, não o nome do cavalo.",
        "This box takes the stud-book number, not the horse's name.",
        "Aquí va el número del Libro Azul, no el nombre del caballo."
      ),
      registoSemAlgarismos: tr(
        "Não tem um único algarismo. Confirme que copiou o número certo.",
        "There is not a single digit in it. Check you copied the right number.",
        "No tiene ni un dígito. Compruebe que copió el número correcto."
      ),
      registoDuplicado: tr(
        "Já há um anúncio com este número de registo. Se o cavalo é o mesmo, não precisa de o publicar outra vez.",
        "There is already a listing with this registration number. If it is the same horse, no need to publish it twice.",
        "Ya hay un anuncio con este número de registro. Si es el mismo caballo, no hace falta publicarlo otra vez."
      ),
      videoNaoReconhecido: tr(
        "Só reconhecemos YouTube e Vimeo — o resto fica como ligação e não como vídeo no anúncio.",
        "We recognise YouTube and Vimeo only — anything else stays a link, not a video in the listing.",
        "Sólo reconocemos YouTube y Vimeo — el resto queda como enlace y no como vídeo en el anuncio."
      ),
      treinoCedoDemais: (idade) =>
        tr(
          `Com ${idade} anos ainda não há desbaste. Confirme a data de nascimento ou o nível.`,
          `At ${idade} a horse is not yet started. Check the date of birth or the level.`,
          `Con ${idade} años aún no hay doma. Compruebe la fecha de nacimiento o el nivel.`
        ),
      treinoAltaEscolaCedo: (idade) =>
        tr(
          `Alta Escola com ${idade} anos é muito cedo. Confirme a data de nascimento ou o nível.`,
          `High School at ${idade} is very early. Check the date of birth or the level.`,
          `Alta Escuela con ${idade} años es muy pronto. Compruebe la fecha de nacimiento o el nivel.`
        ),
      treinoPotroTarde: (idade) =>
        tr(
          `Um cavalo de ${idade} anos ainda sem desbaste é raro. Confirme.`,
          `A ${idade}-year-old still unbroken is rare. Please confirm.`,
          `Un caballo de ${idade} años aún sin domar es raro. Confirme.`
        ),
    }),
    [tr]
  );

  // ---- A inspecção de cada campo ------------------------------------------
  // O número de registo é o único que precisa de perguntar a um servidor, e
  // por isso tem estado próprio; o resultado dele entra na inspecção como
  // contexto, para que a mensagem do duplicado saia do mesmo sítio que as
  // outras e não de um canto à parte da página.
  const registoApsl = useRegistoApsl();
  const inspeccao = useInspeccao(formData, mensagensInspeccao, {
    registoDuplicado: registoApsl.duplicado,
  });

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
    setResumo([]);
    setRascunhoReposto(null);
  };

  // ---- Campos -------------------------------------------------------------
  const updateField = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Um erro que já foi corrigido não fica no ecrã à espera do próximo
    // «Continuar»: quem escreve no campo apaga a queixa sobre ele.
    const semEste = (lista: ErroCampo[]) =>
      lista.some((e) => e.campo === field) ? lista.filter((e) => e.campo !== field) : lista;
    setErrors(semEste);
    setResumo(semEste);
    // E um campo que está a ser corrigido cala-se enquanto o está. Sem isto,
    // corrigir um email a partir do meio da palavra dá uma mensagem diferente
    // a cada tecla — que é exactamente o que não se quer fazer a quem escreve.
    if (typeof value === "string") inspeccao.aoEscrever(String(field), value);
    if (field === "numero_registo") registoApsl.esquecer();
  };

  /**
   * Os quatro momentos de um campo, montados uma vez e passados a todos os
   * passos. É aqui que se cumpre a regra do «ao sair do campo, não ao
   * submeter»: quem acabou de escrever ainda está a pensar naquilo.
   */
  const accoesDeCampo = useMemo(
    () => ({
      aoFocar: inspeccao.aoFocar,
      aoSair: (campo: string) => {
        inspeccao.aoSair(campo);
        // Um apontamento de nível `erro` aparece no instante em que se sai do
        // campo, e não à espera do botão. Os avisos e as sugestões não passam
        // por aqui: mostra-os o próprio campo, e nenhum deles trava nada.
        const erro = inspeccao.erroDe(campo);
        if (erro) {
          setErrors((antes) => [
            ...antes.filter((e) => e.campo !== campo),
            { campo, mensagem: erro.mensagem },
          ]);
        }
        // A única verificação de existência possível hoje é contra a nossa
        // própria base, e faz-se aqui — ao sair do campo, não a cada tecla.
        if (campo === "numero_registo") {
          registoApsl.verificar(formData.numero_registo, formData.nome);
        }
      },
      aoEscolher: inspeccao.marcarTocado,
      aoAceitar: (campo: string, valor: string) => {
        updateField(campo as keyof FormData, valor);
        inspeccao.marcarTocado(campo);
      },
    }),
    // `updateField` é recriada a cada render de propósito — fecha sobre o
    // `inspeccao` desta passagem —, e por isso não entra nas dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspeccao, registoApsl, formData.numero_registo, formData.nome]
  );

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
    // Um apontamento de nível `erro` trava o passo onde o campo vive. Sem
    // isto, bastava não sair do campo para publicar um microchip de catorze
    // algarismos — e o que ficava guardado era lixo. Só entram os campos que
    // a validação ainda não acusou: dizer duas vezes a mesma coisa sobre o
    // mesmo campo é pior do que dizê-la uma.
    const daInspeccao = errosDeInspeccao(passo, inspeccao.todos).filter(
      (e) => !encontrados.some((j) => j.campo === e.campo)
    );
    const todos = [...encontrados, ...daInspeccao];
    setErrors(todos);
    setResumo(todos);
    return todos;
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
    if (resumo.length === 0) return;
    irPara(resumoDeErros.current, true);
  }, [resumo]);

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
    setResumo([]);
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
      const excesso = [{ campo: "fotografias", mensagem: t.vender_cavalo.error_max_images }];
      setErrors(excesso);
      setResumo(excesso);
      return;
    }
    setImagens((prev) => [...prev, ...files]);
    setErrors((prev) => prev.filter((erro) => erro.campo !== "fotografias"));
    setResumo((prev) => prev.filter((erro) => erro.campo !== "fotografias"));
  };

  const removeImage = (index: number) => {
    setImagens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocUpload = (type: DocumentType, file: File) => {
    setDocumentos((prev) => ({ ...prev, [type]: file }));
    if (type === "livroAzul") {
      setErrors((prev) => prev.filter((e) => e.campo !== "livro_azul"));
      setResumo((prev) => prev.filter((e) => e.campo !== "livro_azul"));
    }
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
  const apontamentos = inspeccao.visiveis;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 sm:pt-24 md:pt-32 pb-32 px-4 sm:px-6 md:px-12">
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
        <FormErrors ref={resumoDeErros} erros={resumo} />

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
                apontamentos={apontamentos}
                campo={accoesDeCampo}
              />
              <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <StepIdentificacao
                  formData={formData}
                  updateField={updateField}
                  erros={errosPorCampo}
                  apontamentos={apontamentos}
                  campo={accoesDeCampo}
                  registoApsl={registoApsl.estado}
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
                apontamentos={apontamentos}
                campo={accoesDeCampo}
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
                  apontamentos={apontamentos}
                  campo={accoesDeCampo}
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
              apontamentos={apontamentos}
              campo={accoesDeCampo}
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
                if (aceite) {
                  setErrors((prev) => prev.filter((e) => e.campo !== "termos_aceites"));
                  setResumo((prev) => prev.filter((e) => e.campo !== "termos_aceites"));
                }
              }}
              loading={loading}
              erros={errosPorCampo}
            />
          )}
        </div>

        <FormNavigation step={step} onPrev={prevStep} />
      </form>
    </div>
  );
}
