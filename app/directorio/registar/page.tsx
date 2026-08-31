"use client";

import { useState } from "react";
import {
  Check,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  ArrowRight,
  Loader2,
  Zap,
} from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";

const especialidadesKeys = [
  "specialty_dressage",
  "specialty_alta_escola",
  "specialty_jumping",
  "specialty_working_equitation",
  "specialty_bullfighting",
  "specialty_leisure",
  "specialty_breeding",
  "specialty_training",
  "specialty_driving",
] as const;

const regioesKeys = [
  "region_ribatejo",
  "region_alentejo",
  "region_lisboa",
  "region_norte",
  "region_centro",
  "region_algarve",
  "region_acores",
  "region_madeira",
] as const;

export default function RegistarCoudelariaPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    localizacao: "",
    regiao: "",
    telefone: "",
    email: "",
    website: "",
    instagram: "",
    num_cavalos: "",
    especialidades: [] as string[],
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEspecialidadeToggle = (esp: string) => {
    if (formData.especialidades.includes(esp)) {
      setFormData({
        ...formData,
        especialidades: formData.especialidades.filter((e) => e !== esp),
      });
    } else {
      setFormData({
        ...formData,
        especialidades: [...formData.especialidades, esp],
      });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/coudelarias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStep(3); // Sucesso
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[DirectorioRegistar]", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
          <span className="text-xs uppercase tracking-wider text-[var(--gold)] block mb-4">
            {t.registar_coudelaria.directory_label}
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl text-[var(--foreground)] mb-4">
            {t.registar_coudelaria.title}
          </h1>
          <p className="text-[var(--foreground-secondary)] max-w-xl mx-auto">
            {t.registar_coudelaria.description}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s
                    ? "bg-[var(--gold)] text-black"
                    : "bg-[var(--background-card)] text-[var(--foreground-muted)]"
                }`}
              >
                {step > s ? <Check size={16} /> : s}
              </div>
              {s < 2 && (
                <div
                  className={`w-16 h-0.5 transition-colors ${
                    step > s ? "bg-[var(--gold)]" : "bg-[var(--background-card)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Informações */}
        {step === 1 && (
          <div className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
            <h2 className="text-2xl text-[var(--foreground)] mb-6 text-center">
              {t.registar_coudelaria.step_info_title}
            </h2>

            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Nome */}
              <div>
                <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                  {t.registar_coudelaria.field_name}
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder={t.registar_coudelaria.field_name_placeholder}
                  className="w-full bg-[var(--background-secondary)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                  {t.registar_coudelaria.field_description}
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  placeholder={t.registar_coudelaria.field_description_placeholder}
                  rows={4}
                  className="w-full bg-[var(--background-secondary)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none resize-none"
                  required
                />
              </div>

              {/* Localização */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                    {t.registar_coudelaria.field_location}
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                      size={18}
                    />
                    <input
                      type="text"
                      name="localizacao"
                      value={formData.localizacao}
                      onChange={handleInputChange}
                      placeholder={t.registar_coudelaria.field_location_placeholder}
                      className="w-full bg-[var(--background-secondary)] border border-[var(--border)] pl-10 pr-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                    {t.registar_coudelaria.field_region}
                  </label>
                  <select
                    name="regiao"
                    value={formData.regiao}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--background-secondary)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] focus:border-[var(--border-hover)] focus:outline-none"
                    required
                  >
                    <option value="">{t.registar_coudelaria.field_region_select}</option>
                    {regioesKeys.map((key) => (
                      <option key={key} value={key}>
                        {t.registar_coudelaria[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contactos */}
              <div className="pt-4 border-t border-[var(--border)]">
                <span className="text-[var(--gold)] text-sm font-medium mb-4 block">
                  {t.registar_coudelaria.contacts}
                </span>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                      {t.registar_coudelaria.field_phone}
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                        size={18}
                      />
                      <input
                        type="tel"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        placeholder="+351 912 345 678"
                        className="w-full bg-[var(--background-secondary)] border border-[var(--border)] pl-10 pr-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                      {t.registar_coudelaria.field_email}
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                        size={18}
                      />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="email@coudelaria.pt"
                        className="w-full bg-[var(--background-secondary)] border border-[var(--border)] pl-10 pr-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                      {t.registar_coudelaria.field_website}
                    </label>
                    <div className="relative">
                      <Globe
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                        size={18}
                      />
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://www.coudelaria.pt"
                        className="w-full bg-[var(--background-secondary)] border border-[var(--border)] pl-10 pr-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                      {t.registar_coudelaria.field_instagram}
                    </label>
                    <div className="relative">
                      <Instagram
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                        size={18}
                      />
                      <input
                        type="text"
                        name="instagram"
                        value={formData.instagram}
                        onChange={handleInputChange}
                        placeholder="@coudelaria"
                        className="w-full bg-[var(--background-secondary)] border border-[var(--border)] pl-10 pr-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Número de cavalos */}
              <div>
                <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                  {t.registar_coudelaria.field_num_horses}
                </label>
                <input
                  type="number"
                  name="num_cavalos"
                  value={formData.num_cavalos}
                  onChange={handleInputChange}
                  placeholder={t.registar_coudelaria.field_num_horses_placeholder}
                  className="w-full bg-[var(--background-secondary)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none"
                />
              </div>

              {/* Especialidades */}
              <div>
                <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                  {t.registar_coudelaria.field_specialties}
                </label>
                <div className="flex flex-wrap gap-2">
                  {especialidadesKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleEspecialidadeToggle(key)}
                      className={`px-3 py-2 text-sm transition-colors ${
                        formData.especialidades.includes(key)
                          ? "bg-[var(--gold)] text-black"
                          : "bg-[var(--background-card)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      {t.registar_coudelaria[key]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end pt-6">
                <button
                  onClick={() => setStep(2)}
                  disabled={
                    !formData.nome ||
                    !formData.descricao ||
                    !formData.localizacao ||
                    !formData.regiao
                  }
                  className="btn btn-acento px-8"
                >
                  {t.registar_coudelaria.btn_continue}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Confirmar */}
        {step === 2 && (
          <div className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
            <h2 className="text-2xl text-[var(--foreground)] mb-6 text-center">
              {t.registar_coudelaria.confirm_title}
            </h2>

            <div className="max-w-2xl mx-auto">
              {/* Resumo */}
              <div className="bg-[var(--background-secondary)]/50 border border-[var(--border)] p-6 mb-6">
                <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">
                  {t.registar_coudelaria.summary}
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">
                      {t.registar_coudelaria.summary_stud}
                    </span>
                    <span className="text-[var(--foreground)]">{formData.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">
                      {t.registar_coudelaria.summary_location}
                    </span>
                    <span className="text-[var(--foreground)]">
                      {formData.localizacao}, {formData.regiao}
                    </span>
                  </div>
                  {formData.telefone && (
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">
                        {t.registar_coudelaria.summary_phone}
                      </span>
                      <span className="text-[var(--foreground)]">{formData.telefone}</span>
                    </div>
                  )}
                  {formData.email && (
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">
                        {t.registar_coudelaria.summary_email}
                      </span>
                      <span className="text-[var(--foreground)]">{formData.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto badge */}
              <div className="flex items-center gap-2 text-green-500 text-sm mb-6">
                <Zap size={16} />
                <span>{t.registar_coudelaria.review_notice}</span>
              </div>

              {/* Botões */}
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                >
                  {t.registar_coudelaria.btn_back}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn btn-acento px-8"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      {t.registar_coudelaria.btn_processing}
                    </>
                  ) : (
                    <>
                      {t.registar_coudelaria.btn_register}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sucesso */}
        {step === 3 && (
          <div className="text-center opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="text-green-500" size={40} />
            </div>
            <h2 className="text-3xl text-[var(--foreground)] mb-4">
              {t.registar_coudelaria.success_title}
            </h2>
            <p className="text-[var(--foreground-secondary)] mb-8 max-w-md mx-auto">
              {t.registar_coudelaria.success_message}
            </p>
            <LocalizedLink
              href="/directorio"
              className="inline-flex items-center gap-2 bg-[var(--gold)] text-black px-8 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white transition-colors"
            >
              {t.registar_coudelaria.btn_view_directory}
              <ArrowRight size={18} />
            </LocalizedLink>
          </div>
        )}
      </div>
    </main>
  );
}
