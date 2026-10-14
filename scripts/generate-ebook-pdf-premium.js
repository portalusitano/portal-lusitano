/**
 * VERSÃO PREMIUM - Script para gerar PDF com design profissional
 *
 * Melhorias vs versão básica:
 * - CSS profissional com tipografia elegante
 * - Capa automática
 * - Índice clicável
 * - Headers/footers customizados
 * - Quebras de página inteligentes
 * - Boxes de destaque
 * - Cores Portal Lusitano
 *
 * Instalação:
 * npm install --save-dev md-to-pdf
 *
 * Uso:
 * node scripts/generate-ebook-pdf-premium.js
 */

const fs = require("fs");
const path = require("path");
const { mdToPdf } = require("md-to-pdf");

async function generatePremiumEbookPDF() {
  try {
    console.log("🎨 GERADOR PREMIUM DE PDF - Portal Lusitano\n");
    console.log("━".repeat(60));

    // Paths
    const markdownPath = path.join(
      __dirname,
      "../public/ebooks/04-INTRODUCAO-LUSITANO/EBOOK-COMPLETO.md"
    );
    const outputDir = path.join(__dirname, "../public/downloads");
    const outputPath = path.join(outputDir, "introducao-lusitano.pdf");

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log("✅ Pasta criada: public/downloads/\n");
    }

    // Read and prepare markdown
    let markdownContent = fs.readFileSync(markdownPath, "utf-8");

    // Add cover page
    const coverPage = `
<div class="cover-page">
  <div class="cover-ornament-top">━━━━━━━━━━━━━━━━━━━━━━</div>

  <div class="cover-subtitle">PORTAL LUSITANO PRO</div>

  <h1 class="cover-title">INTRODUÇÃO AO<br>CAVALO LUSITANO</h1>

  <div class="cover-tagline">O Guia Essencial Para Iniciantes</div>

  <div class="cover-ornament-bottom">━━━━━━━━━━━━━━━━━━━━━━</div>

  <div class="cover-footer">
    <p>30 Páginas de Conhecimento Premium</p>
    <p>© 2024 Portal Lusitano - Todos os direitos reservados</p>
  </div>
</div>

<div style="page-break-after: always;"></div>

---

`;

    // Add copyright/credits page
    const creditsPage = `
<div class="credits-page">
  <h2>Créditos e Informações Legais</h2>

  <p><strong>Autor:</strong> Equipa Portal Lusitano PRO</p>

  <p><strong>Edição:</strong> 1ª Edição, Janeiro 2024</p>

  <p><strong>Copyright:</strong> © 2024 Portal Lusitano. Todos os direitos reservados.</p>

  <p><strong>Distribuição:</strong> Este ebook é gratuito e pode ser partilhado livremente, desde que mantido na sua forma original sem modificações.</p>

  <p><strong>Contacto:</strong><br>
  Email: suporte@portal-lusitano.pt<br>
  Website: www.portal-lusitano.pt</p>

  <p><strong>Nota:</strong> As informações contidas neste ebook são fornecidas apenas para fins educacionais. Sempre consulte profissionais qualificados para questões específicas sobre cavalos.</p>
</div>

<div style="page-break-after: always;"></div>

---

`;

    // Prepend cover and credits to content
    markdownContent = coverPage + creditsPage + markdownContent;

    console.log("📖 Markdown processado");
    console.log("📄 Estimativa: ~35 páginas (com capa e créditos)\n");

    // Premium PDF configuration
    const pdfConfig = {
      dest: outputPath,
      pdf_options: {
        format: "A4",
        margin: {
          top: "30mm",
          right: "20mm",
          bottom: "30mm",
          left: "20mm",
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="width: 100%; font-size: 9px; padding: 8px 20px; color: #999; border-bottom: 1px solid #e0e0e0; font-family: 'Georgia', serif;">
            <div style="float: left;">Portal Lusitano PRO</div>
            <div style="float: right;">Introdução ao Cavalo Lusitano</div>
          </div>
        `,
        footerTemplate: `
          <div style="width: 100%; font-size: 9px; padding: 8px 20px; color: #999; border-top: 1px solid #e0e0e0; text-align: center; font-family: 'Georgia', serif;">
            <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
      },
      stylesheet: [
        `
          /* === IMPORTAR FONTES GOOGLE === */
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Open+Sans:wght@300;400;600&display=swap');

          /* === RESET E BASE === */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          @page {
            margin: 30mm 20mm;
          }

          body {
            font-family: 'Open Sans', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.7;
            color: #2d2d2d;
            max-width: 100%;
            margin: 0;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }

          /* === CAPA === */
          .cover-page {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #f8f8f8 0%, #ffffff 50%, #f8f8f8 100%);
            border: 3px solid #C5A059;
            padding: 60px 40px;
            page-break-after: always;
          }

          .cover-ornament-top,
          .cover-ornament-bottom {
            color: #C5A059;
            font-size: 14pt;
            letter-spacing: 2px;
            margin: 30px 0;
          }

          .cover-subtitle {
            font-size: 10pt;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: #8B6914;
            margin-bottom: 40px;
            font-weight: 600;
          }

          .cover-title {
            font-family: 'Cormorant Garamond', 'Georgia', serif;
            font-size: 52pt;
            font-weight: 700;
            color: #C5A059;
            line-height: 1.2;
            margin: 30px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
          }

          .cover-tagline {
            font-family: 'Cormorant Garamond', serif;
            font-size: 18pt;
            font-style: italic;
            color: #555;
            margin: 30px 0 50px 0;
          }

          .cover-footer {
            position: absolute;
            bottom: 60px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9pt;
            color: #999;
          }

          .cover-footer p {
            margin: 8px 0;
          }

          /* === PÁGINA DE CRÉDITOS === */
          .credits-page {
            page-break-after: always;
            padding: 60px 0;
          }

          .credits-page h2 {
            color: #C5A059;
            font-size: 22pt;
            margin-bottom: 30px;
            border-bottom: 2px solid #C5A059;
            padding-bottom: 10px;
          }

          .credits-page p {
            margin: 15px 0;
            line-height: 1.8;
          }

          /* === TIPOGRAFIA === */
          h1 {
            font-family: 'Cormorant Garamond', 'Georgia', serif;
            font-size: 36pt;
            font-weight: 700;
            color: #C5A059;
            text-align: center;
            margin: 50px 0 30px 0;
            page-break-before: always;
            page-break-after: avoid;
            border-bottom: 4px solid #C5A059;
            padding-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          h1:first-of-type {
            page-break-before: auto;
          }

          h2 {
            font-family: 'Cormorant Garamond', 'Georgia', serif;
            font-size: 24pt;
            font-weight: 600;
            color: #8B6914;
            margin: 35px 0 20px 0;
            page-break-after: avoid;
            border-left: 6px solid #C5A059;
            padding-left: 20px;
            line-height: 1.3;
          }

          h3 {
            font-family: 'Cormorant Garamond', serif;
            font-size: 18pt;
            font-weight: 600;
            color: #1a1a1a;
            margin: 28px 0 15px 0;
            page-break-after: avoid;
          }

          h3::before {
            content: "▸ ";
            color: #C5A059;
            margin-right: 8px;
          }

          h4 {
            font-size: 14pt;
            font-weight: 600;
            color: #333;
            margin: 20px 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 12pt;
          }

          /* === PARÁGRAFOS === */
          p {
            margin: 14px 0;
            text-align: justify;
            hyphens: auto;
            orphans: 3;
            widows: 3;
          }

          p:first-of-type::first-letter {
            font-size: 42pt;
            line-height: 1;
            float: left;
            margin: 0 8px 0 0;
            color: #C5A059;
            font-family: 'Cormorant Garamond', serif;
            font-weight: 700;
          }

          /* === LISTAS === */
          ul, ol {
            margin: 18px 0;
            padding-left: 35px;
          }

          li {
            margin: 10px 0;
            line-height: 1.7;
          }

          ul li {
            list-style: none;
            position: relative;
          }

          ul li::before {
            content: "■";
            color: #C5A059;
            font-weight: bold;
            position: absolute;
            left: -25px;
          }

          /* === ÊNFASE === */
          strong {
            color: #1a1a1a;
            font-weight: 600;
          }

          em {
            font-style: italic;
            color: #555;
          }

          /* === SEPARADORES === */
          hr {
            border: none;
            border-top: 3px double #C5A059;
            margin: 40px 0;
            opacity: 0.5;
          }

          /* === CITAÇÕES === */
          blockquote {
            border-left: 5px solid #C5A059;
            padding: 20px 25px;
            margin: 25px 0;
            font-style: italic;
            color: #555;
            background: #f9f9f9;
            border-radius: 0 8px 8px 0;
            position: relative;
          }

          blockquote::before {
            content: """;
            font-size: 60pt;
            color: #C5A059;
            opacity: 0.3;
            position: absolute;
            top: -10px;
            left: 15px;
            font-family: 'Cormorant Garamond', serif;
          }

          /* === TABELAS === */
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 25px 0;
            font-size: 10pt;
            page-break-inside: avoid;
          }

          th {
            background: linear-gradient(135deg, #C5A059 0%, #8B6914 100%);
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 12px;
            text-align: left;
            font-size: 9pt;
          }

          td {
            border: 1px solid #e0e0e0;
            padding: 10px 12px;
          }

          tr:nth-child(even) {
            background: #fafafa;
          }

          tr:hover {
            background: #f5f5f5;
          }

          /* === CÓDIGO === */
          code {
            background: #f4f4f4;
            padding: 3px 7px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            color: #d63384;
            border: 1px solid #e0e0e0;
          }

          /* === BOXES DE DESTAQUE === */
          .box-info,
          .box-warning,
          .box-tip {
            padding: 20px 25px;
            margin: 25px 0;
            border-radius: 8px;
            page-break-inside: avoid;
          }

          .box-info {
            background: #e7f3ff;
            border-left: 5px solid #2196F3;
          }

          .box-warning {
            background: #fff4e5;
            border-left: 5px solid #ff9800;
          }

          .box-tip {
            background: #e8f5e9;
            border-left: 5px solid #4caf50;
          }

          /* === LINKS === */
          a {
            color: #C5A059;
            text-decoration: none;
            border-bottom: 1px dotted #C5A059;
          }

          a:hover {
            border-bottom-style: solid;
          }

          /* === QUEBRAS DE PÁGINA === */
          h1, h2 {
            page-break-after: avoid;
          }

          h1 {
            page-break-before: always;
          }

          h1:first-of-type {
            page-break-before: auto;
          }

          p, li {
            orphans: 3;
            widows: 3;
          }

          /* === NUMERAÇÃO === */
          body {
            counter-reset: h1counter h2counter h3counter;
          }

          h1::before {
            counter-increment: h1counter;
            content: counter(h1counter) ". ";
          }

          /* === RODAPÉ ESPECIAL === */
          .end-note {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 3px solid #C5A059;
            text-align: center;
            font-style: italic;
            color: #666;
          }

          /* === CALL TO ACTION FINAL === */
          .cta-box {
            background: linear-gradient(135deg, #C5A059 0%, #8B6914 100%);
            color: white;
            padding: 30px;
            margin: 40px 0;
            text-align: center;
            border-radius: 12px;
            page-break-inside: avoid;
          }

          .cta-box h3 {
            color: white;
            border: none;
            padding: 0;
            margin-bottom: 15px;
          }

          .cta-box h3::before {
            content: "";
            margin: 0;
          }

          .cta-box p {
            text-align: center;
            margin: 10px 0;
            color: #fff;
          }
        `,
      ],
      launch_options: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
        ],
      },
    };

    console.log("⚙️  Configuração Premium:");
    console.log("   ✓ Fonte: Cormorant Garamond + Open Sans (Google Fonts)");
    console.log("   ✓ Capa automática com ornamentos");
    console.log("   ✓ Página de créditos profissional");
    console.log("   ✓ Headers/footers customizados");
    console.log("   ✓ Tipografia drop caps (primeira letra grande)");
    console.log("   ✓ Boxes de destaque coloridos");
    console.log("   ✓ Tabelas estilizadas");
    console.log("   ✓ Quebras de página inteligentes\n");

    console.log("🔄 A gerar PDF... (30-60 segundos)\n");

    const startTime = Date.now();

    await mdToPdf({ content: markdownContent }, pdfConfig);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log("✅ PDF PREMIUM criado com sucesso!\n");
    console.log("━".repeat(60));
    console.log("\n📍 Localização:", outputPath);

    const stats = fs.statSync(outputPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log("📊 Tamanho:", fileSizeInMB, "MB");
    console.log("⏱️  Tempo:", duration, "segundos\n");

    console.log("🎉 CONCLUÍDO!\n");
    console.log("Próximos passos:");
    console.log("1. Abrir: public/downloads/introducao-lusitano.pdf");
    console.log("2. Verificar qualidade (capa, tipografia, layout)");
    console.log("3. Testar em: http://localhost:3000/ebook-gratis");
    console.log("4. Se precisar ajustar, editar CSS acima e re-executar\n");
  } catch (error) {
    console.error("\n❌ ERRO ao gerar PDF:", error);
    console.error("\nSugestões de resolução:");
    console.error("1. Instalar: npm install --save-dev md-to-pdf");
    console.error("2. Verificar Node.js versão (mínimo v14)");
    console.error("3. Verificar espaço em disco disponível");
    console.error("4. Verificar permissões pasta public/downloads/\n");
    process.exit(1);
  }
}

// Execute
generatePremiumEbookPDF();
