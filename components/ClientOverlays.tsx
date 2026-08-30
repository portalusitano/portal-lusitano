"use client";

import dynamic from "next/dynamic";

import { ObservadorRevelar } from "@/components/Revelar";

const ScrollToTop = dynamic(() => import("@/components/ScrollToTop"), { ssr: false });
const CookieConsent = dynamic(() => import("@/components/CookieConsent"), { ssr: false });
const PushNotificationPrompt = dynamic(() => import("@/components/PushNotificationPrompt"), {
  ssr: false,
});
const AnalyticsScripts = dynamic(() => import("@/components/AnalyticsScripts"), { ssr: false });
const Analytics = dynamic(() => import("@/components/Analytics"), { ssr: false });
const ServiceWorkerRegistration = dynamic(() => import("@/components/ServiceWorkerRegistration"), {
  ssr: false,
});

export default function ClientOverlays() {
  return (
    <>
      <ObservadorRevelar />
      <ScrollToTop />
      <CookieConsent />
      <PushNotificationPrompt />
      <ServiceWorkerRegistration />
      <Analytics />
      <AnalyticsScripts />
    </>
  );
}
