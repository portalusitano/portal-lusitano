"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";

interface WhatsAppButtonProps {
  phone: string;
  name: string;
  preMessage?: string;
  context?: {
    type?: string; // 'vender_cavalo', 'publicidade', 'instagram', etc
    details?: string; // Detalhes adicionais do contexto
  };
  className?: string;
  variant?: "button" | "icon"; // Estilo do botão
}

export default function WhatsAppButton({
  phone,
  name,
  preMessage,
  context,
  className = "",
  variant = "button",
}: WhatsAppButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // Limpar e formatar número de telefone
  const cleanPhone = (phoneNumber: string): string => {
    // Remove todos os caracteres não numéricos
    let cleaned = phoneNumber.replace(/\D/g, "");

    // Se começa com 00351, converter para +351
    if (cleaned.startsWith("00351")) {
      cleaned = "351" + cleaned.slice(5);
    }
    // Se começa com 351 e tem 12 dígitos total, adicionar +
    else if (cleaned.startsWith("351") && cleaned.length === 12) {
      // Já está OK
    }
    // Se não tem código de país e tem 9 dígitos, adicionar +351
    else if (cleaned.length === 9) {
      cleaned = "351" + cleaned;
    }

    return cleaned;
  };

  // Gerar mensagem padrão baseada no contexto
  const generateDefaultMessage = (): string => {
    let message = `Olá ${name},\n\n`;

    if (context?.type) {
      switch (context.type) {
        case "vender_cavalo":
          message +=
            "Recebi o seu pedido de publicação de anúncio de cavalo no Portal Lusitano.\n\n";
          if (context.details) {
            message += `Detalhes: ${context.details}\n\n`;
          }
          message += "Como posso ajudar?\n\n";
          break;

        case "publicidade":
          message += "Recebi o seu pedido de orçamento para publicidade no Portal Lusitano.\n\n";
          if (context.details) {
            message += `Pacote solicitado: ${context.details}\n\n`;
          }
          message += "Podemos agendar uma chamada para discutir os detalhes?\n\n";
          break;

        case "instagram":
          message +=
            "Recebi o seu pedido de marketing no Instagram através do Portal Lusitano.\n\n";
          if (context.details) {
            message += `Pacote: ${context.details}\n\n`;
          }
          message += "Quando podemos começar?\n\n";
          break;

        default:
          message += "Recebi a sua mensagem através do Portal Lusitano.\n\n";
          message += "Como posso ajudar?\n\n";
      }
    } else if (preMessage) {
      message = preMessage;
    } else {
      message += "Recebi a sua mensagem através do Portal Lusitano.\n\nComo posso ajudar?\n\n";
    }

    message += "Cumprimentos,\nPortal Lusitano";

    return message;
  };

  // Abrir WhatsApp
  const openWhatsApp = (message?: string) => {
    const phoneNumber = cleanPhone(phone);
    const textToSend = message || generateDefaultMessage();
    const encodedText = encodeURIComponent(textToSend);

    // WhatsApp URL (funciona em desktop e mobile)
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedText}`;

    window.open(whatsappUrl, "_blank");
    setIsModalOpen(false);
  };

  // Botão simples
  if (variant === "icon") {
    return (
      <button
        onClick={() => setIsModalOpen(true)}
        className={`p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 rounded-lg transition-all ${className}`}
        title="Responder via WhatsApp"
      >
        <MessageCircle className="text-green-500" size={16} />
      </button>
    );
  }

  return (
    <>
      {/* Botão principal */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all ${className}`}
      >
        <MessageCircle size={16} />
        Responder via WhatsApp
      </button>

      {/* Modal de prévia da mensagem */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-secondary)] border border-white/10 rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <MessageCircle className="text-green-500" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Enviar Mensagem WhatsApp</h3>
                  <p className="text-sm text-gray-400">Para: {name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <MessageCircle className="text-gray-400" size={20} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mensagem (edite se necessário)
              </label>
              <textarea
                value={customMessage || generateDefaultMessage()}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-green-500 resize-none"
                rows={10}
              />
              <p className="text-xs text-gray-500 mt-2">
                📱 A mensagem será aberta no WhatsApp Web ou App (se estiver em mobile)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => openWhatsApp(customMessage || undefined)}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                Abrir WhatsApp
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-500">
                ⚠️ Certifique-se que o número de telefone{" "}
                <span className="font-mono font-bold">{cleanPhone(phone)}</span> está correto
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
