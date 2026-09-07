import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader"] });
for (const [nome, w, h] of [["desktop", 1280, 900], ["telemovel", 390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: "pt-PT" })).newPage();
  await p.goto("http://localhost:3955/mapa", { waitUntil: "networkidle" });
  await p.waitForTimeout(7000);
  const lona = await p.locator("canvas").first().boundingBox().catch(() => null);
  const nomes = await p.locator(".globo-etiqueta, [class*='etiqueta']").count().catch(() => -1);
  console.log(`${nome}: lona ${lona ? Math.round(lona.width)+"x"+Math.round(lona.height) : "SEM LONA"} de ${w}x${h} | etiquetas ${nomes}`);
  const antes = await p.evaluate(() => window.scrollY);
  await p.mouse.move(w/2, h/2);
  await p.mouse.wheel(0, 600);
  await p.waitForTimeout(600);
  const depois = await p.evaluate(() => window.scrollY);
  const podeDescer = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log(`  roda sobre o globo: desceu ${Math.round(depois-antes)}px de ${Math.round(podeDescer)}`);
  await p.evaluate(() => window.scrollTo(0,0));
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/tiros/m-${nome}.png` });
  await p.close();
}
await b.close();
