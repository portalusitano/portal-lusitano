"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const STORAGE_KEY = "push-notification-preference";
const PAGE_COUNT_KEY = "push-notification-page-count";
const MIN_PAGES_BEFORE_PROMPT = 3;

const text = {
  pt: {
    message: "Quer receber notificações de novos cavalos e eventos?",
    accept: "Sim",
    dismiss: "Agora não",
    denied: "Notificações bloqueadas no navegador. Pode alterar nas definições.",
  },
  en: {
    message: "Want to receive notifications about new horses and events?",
    accept: "Yes",
    dismiss: "Not now",
    denied: "Notifications are blocked in your browser. You can change this in settings.",
  },
  es: {
    message: "¿Desea recibir notificaciones de nuevos caballos y eventos?",
    accept: "Sí",
    dismiss: "Ahora no",
    denied: "Notificaciones bloqueadas en el navegador. Puede cambiar en ajustes.",
  },
};

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  try {
    // In production, VAPID public key should come from an env variable.
    // For now we attempt subscription without applicationServerKey which works
    // for local testing. A real VAPID key will be needed before going live.
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
      ...(vapidPublicKey && {
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }),
    };

    const subscription = await registration.pushManager.subscribe(subscribeOptions);

    // Send subscription to our API
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    return true;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export default function PushNotificationPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDeniedMessage, setShowDeniedMessage] = useState(false);
  const { language } = useLanguage();
  const t = text[language];

  useEffect(() => {
    // Do not show if:
    // - No support for notifications
    // - User already responded
    // - Permission already granted or denied at browser level
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const preference = localStorage.getItem(STORAGE_KEY);
    if (preference) return;

    if (Notification.permission === "granted" || Notification.permission === "denied") return;

    // Increment page view count in sessionStorage
    const currentCount = parseInt(sessionStorage.getItem(PAGE_COUNT_KEY) || "0", 10) + 1;
    sessionStorage.setItem(PAGE_COUNT_KEY, String(currentCount));

    if (currentCount >= MIN_PAGES_BEFORE_PROMPT) {
      // Small delay so the banner does not appear instantly on page load
      const timer = setTimeout(() => {
        // Espera que o aviso de cookies esteja respondido: os dois ocupam a
        // mesma barra em baixo e sobrepunham-se.
        if (localStorage.getItem("cookie-consent")) setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = useCallback(async () => {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      localStorage.setItem(STORAGE_KEY, "accepted");

      // Attempt to subscribe via the service worker
      const registration = await navigator.serviceWorker.ready;
      await subscribeToPush(registration);

      setIsVisible(false);
    } else if (permission === "denied") {
      localStorage.setItem(STORAGE_KEY, "denied");
      setShowDeniedMessage(true);
      setTimeout(() => setIsVisible(false), 3000);
    } else {
      // "default" means dismissed without choosing -- let it appear again next session
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[9990] mx-auto max-w-6xl opacity-0 animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_forwards] lg:inset-x-6 lg:bottom-6"
      style={{ willChange: "transform, opacity", marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative rounded-[28px] border border-[var(--border-soft)] bg-[var(--background-elevated)] p-4 shadow-[0_12px_60px_rgba(0,0,0,0.8)] sm:p-5">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] lg:hidden"
          aria-label={language === "pt" ? "Fechar" : language === "es" ? "Cerrar" : "Close"}
        >
          <X size={16} aria-hidden="true" />
        </button>

        {showDeniedMessage ? (
          <p className="pr-8 text-sm leading-relaxed text-[var(--foreground-secondary)] lg:pr-0">
            {t.denied}
          </p>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
            <p className="flex-1 pr-8 text-sm leading-relaxed text-[var(--foreground-secondary)] lg:pr-0">
              {t.message}
            </p>

            <div className="flex shrink-0 gap-2.5">
              <button
                onClick={handleDismiss}
                className="btn btn-secundario flex-1 rounded-full lg:flex-none"
              >
                {t.dismiss}
              </button>
              <button
                onClick={handleAccept}
                className="btn btn-primario flex-1 rounded-full text-sm lg:flex-none"
              >
                {t.accept}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
