import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Desativar em desenvolvimento
  enabled: process.env.NODE_ENV === "production",

  // Performance Monitoring
  tracesSampleRate: 0.1,

  // Ignorar erros comuns
  ignoreErrors: ["Network request failed", "Failed to fetch", "ECONNREFUSED", "ENOTFOUND"],
});
