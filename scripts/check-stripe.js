#!/usr/bin/env node

/**
 * Script para verificar se o Stripe está configurado corretamente
 * Executar: node scripts/check-stripe.js
 */

require("dotenv").config({ path: ".env.local" });

const checks = {
  passed: [],
  failed: [],
  warnings: [],
};

console.log("\n╔════════════════════════════════════════════════════════════════╗");
console.log("║          🔍 VERIFICAÇÃO DE CONFIGURAÇÃO DO STRIPE             ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

// 1. Check STRIPE_SECRET_KEY
console.log("1️⃣  Verificando STRIPE_SECRET_KEY...");
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  checks.failed.push("❌ STRIPE_SECRET_KEY não encontrada no .env.local");
} else if (secretKey.includes("SUBSTITUI")) {
  checks.failed.push("❌ STRIPE_SECRET_KEY ainda tem valor placeholder");
} else if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
  checks.failed.push("❌ STRIPE_SECRET_KEY formato inválido");
} else {
  if (secretKey.startsWith("sk_test_")) {
    checks.passed.push("✅ STRIPE_SECRET_KEY configurada (Test Mode)");
  } else {
    checks.passed.push("✅ STRIPE_SECRET_KEY configurada (Live Mode)");
    checks.warnings.push("⚠️  Estás em LIVE MODE! Certifica-te que é intencional.");
  }
}

// 2. Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
console.log("2️⃣  Verificando NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY...");
const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!pubKey) {
  checks.failed.push("❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não encontrada");
} else if (pubKey.includes("SUBSTITUI")) {
  checks.failed.push("❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ainda tem valor placeholder");
} else if (!pubKey.startsWith("pk_test_") && !pubKey.startsWith("pk_live_")) {
  checks.failed.push("❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY formato inválido");
} else {
  checks.passed.push("✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY configurada");
}

// 3. Check STRIPE_WEBHOOK_SECRET
console.log("3️⃣  Verificando STRIPE_WEBHOOK_SECRET...");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  checks.warnings.push("⚠️  STRIPE_WEBHOOK_SECRET não configurado (opcional para dev local)");
} else if (webhookSecret.includes("SUBSTITUI")) {
  checks.warnings.push("⚠️  STRIPE_WEBHOOK_SECRET ainda tem valor placeholder");
} else if (!webhookSecret.startsWith("whsec_")) {
  checks.failed.push("❌ STRIPE_WEBHOOK_SECRET formato inválido");
} else {
  checks.passed.push("✅ STRIPE_WEBHOOK_SECRET configurado");
}

// 4. Check Price IDs
console.log("4️⃣  Verificando Price IDs...");
const priceIds = {
  "Aficionado Monthly": process.env.STRIPE_PRICE_AFICIONADO_MONTHLY,
  "Aficionado Yearly": process.env.STRIPE_PRICE_AFICIONADO_YEARLY,
  "Criador Monthly": process.env.STRIPE_PRICE_CRIADOR_MONTHLY,
  "Criador Yearly": process.env.STRIPE_PRICE_CRIADOR_YEARLY,
  "Elite Monthly": process.env.STRIPE_PRICE_ELITE_MONTHLY,
  "Elite Yearly": process.env.STRIPE_PRICE_ELITE_YEARLY,
};

let missingPrices = 0;
let placeholderPrices = 0;
let validPrices = 0;

Object.entries(priceIds).forEach(([name, priceId]) => {
  if (!priceId) {
    missingPrices++;
  } else if (priceId.includes("SUBSTITUI")) {
    placeholderPrices++;
  } else if (!priceId.startsWith("price_")) {
    checks.failed.push(`❌ ${name}: formato inválido (${priceId})`);
  } else {
    validPrices++;
  }
});

if (missingPrices > 0) {
  checks.failed.push(`❌ ${missingPrices} Price IDs em falta`);
}
if (placeholderPrices > 0) {
  checks.failed.push(`❌ ${placeholderPrices} Price IDs ainda têm placeholder`);
}
if (validPrices === 6) {
  checks.passed.push("✅ Todos os 6 Price IDs configurados");
} else if (validPrices > 0) {
  checks.warnings.push(`⚠️  Apenas ${validPrices}/6 Price IDs válidos`);
}

// 5. Check NEXT_PUBLIC_SITE_URL
console.log("5️⃣  Verificando NEXT_PUBLIC_SITE_URL...");
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (!siteUrl) {
  checks.failed.push("❌ NEXT_PUBLIC_SITE_URL não configurado");
} else {
  checks.passed.push(`✅ NEXT_PUBLIC_SITE_URL: ${siteUrl}`);
}

// 6. Check RESEND_API_KEY (bonus)
console.log("6️⃣  Verificando RESEND_API_KEY (emails)...");
const resendKey = process.env.RESEND_API_KEY;
if (!resendKey) {
  checks.warnings.push("⚠️  RESEND_API_KEY não configurado (emails não funcionarão)");
} else if (!resendKey.startsWith("re_")) {
  checks.failed.push("❌ RESEND_API_KEY formato inválido");
} else {
  checks.passed.push("✅ RESEND_API_KEY configurado");
}

// Print Results
console.log("\n╔════════════════════════════════════════════════════════════════╗");
console.log("║                        📊 RESULTADOS                           ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

if (checks.passed.length > 0) {
  console.log("✅ PASSOU:\n");
  checks.passed.forEach((msg) => console.log("   " + msg));
  console.log("");
}

if (checks.warnings.length > 0) {
  console.log("⚠️  AVISOS:\n");
  checks.warnings.forEach((msg) => console.log("   " + msg));
  console.log("");
}

if (checks.failed.length > 0) {
  console.log("❌ FALHOU:\n");
  checks.failed.forEach((msg) => console.log("   " + msg));
  console.log("");
}

// Final verdict
console.log("╔════════════════════════════════════════════════════════════════╗");
if (checks.failed.length === 0 && checks.warnings.length === 0) {
  console.log("║  ✅ PERFEITO! Stripe está 100% configurado!                   ║");
  console.log("║  🚀 Podes iniciar: npm run dev                                ║");
} else if (checks.failed.length === 0) {
  console.log("║  ⚠️  QUASE LÁ! Apenas avisos (pode funcionar)                 ║");
  console.log("║  📝 Revê os avisos acima                                      ║");
} else {
  console.log("║  ❌ CONFIGURAÇÃO INCOMPLETA                                   ║");
  console.log("║  📖 Ver instruções em: STRIPE_SETUP.md                        ║");
}
console.log("╚════════════════════════════════════════════════════════════════╝\n");

// Exit code
process.exit(checks.failed.length > 0 ? 1 : 0);
