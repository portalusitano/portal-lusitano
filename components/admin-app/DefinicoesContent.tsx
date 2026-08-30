"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  RefreshCw,
  Mail,
  Bell,
  CreditCard,
  Globe,
  Share2,
  Zap,
  AlertCircle,
  CheckCircle2,
  Code,
  Eye,
  EyeOff,
  Database,
} from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: string | number | boolean | null;
  category: string;
  label: string;
  description: string | null;
  input_type: string;
  options: string[] | null;
  is_required: boolean;
  validation_regex: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface GroupedSettings {
  [category: string]: Setting[];
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email_templates: Mail,
  notifications: Bell,
  payment: CreditCard,
  metadata: Globe,
  social_media: Share2,
  general: Zap,
  analytics: Globe,
};

const CATEGORY_LABELS: Record<string, string> = {
  email_templates: "Templates de Email",
  notifications: "Notificações",
  payment: "Pagamentos",
  metadata: "Metadata do Site",
  social_media: "Redes Sociais",
  general: "Geral",
  analytics: "Analytics",
};

export default function DefinicoesContent() {
  const [_settings, setSettings] = useState<Setting[]>([]);
  const [grouped, setGrouped] = useState<GroupedSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("email_templates");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/definicoes");
      const data = await response.json();
      setSettings(data.settings || []);
      setGrouped(data.grouped || {});

      // Se não houver categoria ativa, usar a primeira disponível
      if (data.categories && data.categories.length > 0 && !activeCategory) {
        setActiveCategory(data.categories[0]);
      }
    } catch (_error) {
      void _error;
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, newValue: unknown) => {
    setEditedValues((prev) => ({
      ...prev,
      [key]: newValue,
    }));
  };

  const handleSave = async (setting: Setting) => {
    setSaving(setting.key);
    try {
      const valueToSave =
        editedValues[setting.key] !== undefined ? editedValues[setting.key] : setting.value;

      const response = await fetch(`/api/admin/definicoes/${setting.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: valueToSave }),
      });

      if (!response.ok) {
        throw new Error("Erro ao guardar");
      }

      // Atualizar localmente
      setSettings((prev) =>
        prev.map((s) => (s.key === setting.key ? { ...s, value: valueToSave } : s))
      );

      // Remover do editedValues
      setEditedValues((prev) => {
        const newEdited = { ...prev };
        delete newEdited[setting.key];
        return newEdited;
      });

      // Mostrar sucesso
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (_error) {
      void _error;
      alert("Erro ao guardar. Tente novamente.");
    } finally {
      setSaving(null);
    }
  };

  const renderInput = (setting: Setting) => {
    const currentValue =
      editedValues[setting.key] !== undefined ? editedValues[setting.key] : setting.value;

    const _hasChanges = editedValues[setting.key] !== undefined;

    switch (setting.input_type) {
      case "boolean":
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleValueChange(setting.key, { enabled: !currentValue.enabled })}
              className={`
                relative w-14 h-7 rounded-full transition-colors duration-200
                ${currentValue.enabled ? "bg-green-500" : "bg-gray-600"}
              `}
            >
              <div
                className={`
                  absolute top-1 left-1 w-5 h-5 rounded-full bg-white
                  transition-transform duration-200
                  ${currentValue.enabled ? "translate-x-7" : "translate-x-0"}
                `}
              />
            </button>
            <span className="text-sm text-gray-400">
              {currentValue.enabled ? "Ativado" : "Desativado"}
            </span>
          </div>
        );

      case "number":
        return (
          <input
            type="number"
            value={currentValue.value || 0}
            onChange={(e) => handleValueChange(setting.key, { value: parseFloat(e.target.value) })}
            className="w-full bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
          />
        );

      case "textarea":
        return (
          <textarea
            value={currentValue.value || ""}
            onChange={(e) => handleValueChange(setting.key, { value: e.target.value })}
            rows={4}
            className="w-full bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] resize-none"
          />
        );

      case "html":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Editor HTML</span>
            </div>
            <textarea
              value={currentValue.html || ""}
              onChange={(e) =>
                handleValueChange(setting.key, {
                  ...currentValue,
                  html: e.target.value,
                })
              }
              rows={8}
              className="w-full bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] font-mono text-sm resize-none"
            />
            {setting.key.includes("email") && (
              <input
                type="text"
                value={currentValue.subject || ""}
                onChange={(e) =>
                  handleValueChange(setting.key, {
                    ...currentValue,
                    subject: e.target.value,
                  })
                }
                placeholder="Assunto do email"
                className="w-full bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
              />
            )}
          </div>
        );

      case "json":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Formato JSON</span>
              </div>
              <button
                onClick={() =>
                  setShowJsonPreview((prev) => ({
                    ...prev,
                    [setting.key]: !prev[setting.key],
                  }))
                }
                className="text-sm text-[var(--gold)] hover:text-[var(--gold-hover)] flex items-center gap-1"
              >
                {showJsonPreview[setting.key] ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Esconder Preview
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Mostrar Preview
                  </>
                )}
              </button>
            </div>
            <textarea
              value={JSON.stringify(currentValue, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleValueChange(setting.key, parsed);
                } catch {
                  // Deixar o usuário continuar digitando mesmo com JSON inválido
                }
              }}
              rows={6}
              className="w-full bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)] font-mono text-sm resize-none"
            />
            {showJsonPreview[setting.key] && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <pre className="text-xs text-gray-300 overflow-x-auto">
                  {JSON.stringify(currentValue, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );

      case "email":
        return (
          <input
            type="email"
            value={currentValue.value || ""}
            onChange={(e) => handleValueChange(setting.key, { value: e.target.value })}
            className="w-full bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
            placeholder="exemplo@email.com"
          />
        );

      case "url":
        return (
          <input
            type="url"
            value={currentValue.value || ""}
            onChange={(e) => handleValueChange(setting.key, { value: e.target.value })}
            className="w-full bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
            placeholder="https://exemplo.com"
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={currentValue.value || ""}
            onChange={(e) => handleValueChange(setting.key, { value: e.target.value })}
            className="w-full bg-black/30 border border-white/10 px-4 py-2 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Sidebar de Categorias */}
      <div className="w-72 border-r border-white/5 bg-gradient-to-b from-[var(--background-secondary)] to-[var(--background)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-[var(--gold)]" />
          <h2 className="text-xl font-bold text-white">Definições</h2>
        </div>

        <nav className="space-y-2">
          {Object.keys(grouped).map((category) => {
            const Icon = CATEGORY_ICONS[category] || Settings;
            const count = grouped[category]?.length || 0;

            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200 text-left
                  ${
                    activeCategory === category
                      ? "bg-[var(--gold)] text-black font-semibold"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-sm">{CATEGORY_LABELS[category] || category}</span>
                <span className="text-xs opacity-60">{count}</span>
              </button>
            );
          })}
        </nav>

        {/* Separador */}
        <div className="mt-6 mb-4 border-t border-white/10 pt-4">
          <span className="text-xs text-gray-600 uppercase tracking-wider">Ferramentas</span>
        </div>

        <button
          onClick={() => setActiveCategory("backup")}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-lg
            transition-all duration-200 text-left
            ${
              activeCategory === "backup"
                ? "bg-[var(--gold)] text-black font-semibold"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }
          `}
        >
          <Database className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-sm">Backups</span>
        </button>

        {/* Botão Recarregar */}
        <button
          onClick={fetchSettings}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Recarregar</span>
        </button>
      </div>

      {/* Área de Conteúdo */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Notificação de Sucesso */}
        {showSuccess && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-green-400">Definição guardada com sucesso!</span>
          </div>
        )}

        {/* Lista de Definições da Categoria */}
        <div className="space-y-6">
          {grouped[activeCategory]?.map((setting) => {
            const hasChanges = editedValues[setting.key] !== undefined;
            const isSaving = saving === setting.key;

            return (
              <div key={setting.key} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{setting.label}</h3>
                      {setting.is_required && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    {setting.description && (
                      <p className="text-sm text-gray-400">{setting.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 font-mono">{setting.key}</p>
                  </div>

                  {hasChanges && (
                    <button
                      onClick={() => handleSave(setting)}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold rounded-lg transition-all disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                          A guardar...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Guardar
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="mt-4">{renderInput(setting)}</div>

                {setting.updated_at && (
                  <div className="mt-3 text-xs text-gray-500">
                    Última atualização: {new Date(setting.updated_at).toLocaleString("pt-PT")}
                    {setting.updated_by && ` por ${setting.updated_by}`}
                  </div>
                )}
              </div>
            );
          })}

          {(!grouped[activeCategory] || grouped[activeCategory].length === 0) && (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma definição encontrada nesta categoria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
