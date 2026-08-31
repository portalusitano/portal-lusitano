#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });

console.log("\n╔════════════════════════════════════════════════════════════════╗");
console.log("║           🔍 DIAGNÓSTICO DE WEBHOOKS STRIPE                    ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

// 1. Verificar variáveis de ambiente
console.log("1️⃣  Verificando variáveis de ambiente...\n");

const checks = {
  STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
  RESEND_API_KEY: !!process.env.RESEND_API_KEY,
  NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL,
};

Object.entries(checks).forEach(([key, value]) => {
  console.log(`   ${value ? "✅" : "❌"} ${key}: ${value ? "OK" : "FALTA"}`);
});

console.log("\n2️⃣  Webhook Secret:\n");
if (process.env.STRIPE_WEBHOOK_SECRET) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log(`   ${secret.substring(0, 15)}...`);

  if (secret.includes("SUBSTITUI")) {
    console.log("   ❌ ERRO: Webhook secret ainda é placeholder!");
    console.log('   ✅ SOLUÇÃO: Executar "stripe listen" e copiar o whsec_...\n');
  } else if (!secret.startsWith("whsec_")) {
    console.log("   ❌ ERRO: Webhook secret formato inválido!");
  } else {
    console.log("   ✅ Webhook secret parece válido\n");
  }
}

console.log("3️⃣  Instruções para verificar webhooks:\n");

console.log("═══════════════════════════════════════════════════════════════");
console.log("TERMINAL 1 - Stripe CLI:");
console.log("═══════════════════════════════════════════════════════════════");
console.log("stripe listen --forward-to localhost:3000/api/stripe/webhook");
console.log("");
console.log("Deve mostrar:");
console.log("> Ready! Your webhook signing secret is whsec_...");
console.log("> Waiting for webhooks...");
console.log("");
console.log("Quando fizer checkout, deve aparecer:");
console.log("2024-01-30 → checkout.session.completed [200]");
console.log("2024-01-30 → invoice.payment_succeeded [200]");
console.log("");

console.log("═══════════════════════════════════════════════════════════════");
console.log("TERMINAL 2 - Next.js:");
console.log("═══════════════════════════════════════════════════════════════");
console.log("npm run dev");
console.log("");
console.log("Quando receber webhook, deve mostrar:");
console.log("Checkout completed: cs_test_...");
console.log("Novo membro PRO: email@example.com - Plano: criador");
console.log("Emails enviados com sucesso para email@example.com");
console.log("");

console.log("═══════════════════════════════════════════════════════════════");
console.log("CHECKLIST:");
console.log("═══════════════════════════════════════════════════════════════");
console.log("[ ] Stripe CLI está a correr?");
console.log("[ ] Next.js está a correr?");
console.log("[ ] Reiniciou Next.js DEPOIS de adicionar webhook secret?");
console.log("[ ] Usou email: portal.lusitano2023@gmail.com no checkout?");
console.log("[ ] Completou o pagamento no Stripe?");
console.log("");

console.log("═══════════════════════════════════════════════════════════════");
console.log("SE OS WEBHOOKS NÃO APARECEM:");
console.log("═══════════════════════════════════════════════════════════════");
console.log("1. Parar Stripe CLI (Ctrl+C)");
console.log("2. Parar Next.js (Ctrl+C)");
console.log("3. Iniciar Stripe CLI novamente");
console.log("4. COPIAR o novo whsec_... para .env.local");
console.log("5. Iniciar Next.js novamente");
console.log("6. Tentar checkout de novo");
console.log("");

console.log("═══════════════════════════════════════════════════════════════\n");
