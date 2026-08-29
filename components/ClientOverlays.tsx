"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ScrollToTop = dynamic(() => import("@/components/ScrollToTop"), { ssr: false });
const CookieConsent = dynamic(() => import("@/components/CookieConsent"), { ssr: false });
const NewsletterPopup = dynamic(() => import("@/components/NewsletterPopup"), { ssr: false });
const PushNotificationPrompt = dynamic(() => import("@/components/PushNotificationPrompt"), {
  ssr: false,
});
const WhatsAppButton = dynamic(() => import("@/components/WhatsAppButton"), { ssr: false });
const AnalyticsScripts = dynamic(() => import("@/components/AnalyticsScripts"), { ssr: false });
const Analytics = dynamic(() => import("@/components/Analytics"), { ssr: false });
const ServiceWorkerRegistration = dynamic(() => import("@/components/ServiceWorkerRegistration"), {
  ssr: false,
});
function DeferredNewsletterPopup() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("newsletter-dismissed");
      const subscribed = localStorage.getItem("newsletter-subscribed");
      if (dismissed || subscribed) return;
    } catch {}
    const timer = setTimeout(() => setReady(true), 30_000);
    return () => clearTimeout(timer);
  }, []);
  if (!ready) return null;
  return <NewsletterPopup />;
}

export default function ClientOverlays() {
  return (
    <>
      <ScrollToTop />
      <CookieConsent />
      <DeferredNewsletterPopup />
      <PushNotificationPrompt />
      <WhatsAppButton />
      <ServiceWorkerRegistration />
      <Analytics />
      <AnalyticsScripts />
    </>
  );
}
