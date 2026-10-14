/**
 * Script to convert the free ebook markdown to PDF
 *
 * Installation required:
 * npm install --save-dev md-to-pdf
 *
 * Run:
 * node scripts/generate-ebook-pdf.js
 */

const fs = require("fs");
const path = require("path");
const { mdToPdf } = require("md-to-pdf");

async function generateEbookPDF() {
  try {
    console.log("🚀 Iniciando conversão do ebook para PDF...\n");

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
      console.log("✅ Criada pasta: public/downloads/\n");
    }

    // Read markdown content
    const markdownContent = fs.readFileSync(markdownPath, "utf-8");

    console.log("📖 Markdown carregado:", markdownPath);
    console.log("📄 Páginas estimadas: ~30\n");

    // PDF configuration
    const pdfConfig = {
      dest: outputPath,
      pdf_options: {
        format: "A4",
        margin: {
          top: "25mm",
          right: "20mm",
          bottom: "25mm",
          left: "20mm",
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="width: 100%; font-size: 10px; padding: 5px 20px; color: #666; text-align: center;">
            <span>Portal Lusitano PRO</span>
          </div>
        `,
        footerTemplate: `
          <div style="width: 100%; font-size: 10px; padding: 5px 20px; color: #666; text-align: center;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
      },
      stylesheet: [
        // Custom CSS for professional look
        `
          @page {
            margin: 25mm 20mm;
          }

          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 100%;
            margin: 0 auto;
          }

          h1 {
            font-size: 32pt;
            font-weight: bold;
            color: #C5A059;
            text-align: center;
            margin: 40px 0 20px 0;
            page-break-before: always;
            border-bottom: 3px solid #C5A059;
            padding-bottom: 15px;
          }

          h1:first-of-type {
            page-break-before: auto;
            font-size: 42pt;
            margin-top: 80px;
          }

          h2 {
            font-size: 22pt;
            font-weight: bold;
            color: #8B6914;
            margin: 30px 0 15px 0;
            border-left: 5px solid #C5A059;
            padding-left: 15px;
          }

          h3 {
            font-size: 16pt;
            font-weight: bold;
            color: #333;
            margin: 25px 0 12px 0;
          }

          p {
            margin: 12px 0;
            text-align: justify;
          }

          ul, ol {
            margin: 15px 0;
            padding-left: 30px;
          }

          li {
            margin: 8px 0;
          }

          strong {
            color: #1a1a1a;
            font-weight: bold;
          }

          em {
            font-style: italic;
            color: #555;
          }

          hr {
            border: none;
            border-top: 2px solid #e0e0e0;
            margin: 30px 0;
          }

          blockquote {
            border-left: 4px solid #C5A059;
            padding-left: 20px;
            margin: 20px 0;
            font-style: italic;
            color: #555;
            background: #f9f9f9;
            padding: 15px 20px;
          }

          code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 11pt;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }

          th {
            background: #C5A059;
            color: white;
            font-weight: bold;
          }

          tr:nth-child(even) {
            background: #f9f9f9;
          }

          /* Cover page styling */
          .cover {
            text-align: center;
            padding: 100px 0;
          }

          /* Prevent widows and orphans */
          p, li {
            orphans: 3;
            widows: 3;
          }

          /* Page breaks */
          h1, h2 {
            page-break-after: avoid;
          }

          /* Links */
          a {
            color: #C5A059;
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }
        `,
      ],
      launch_options: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    };

    console.log("⚙️  Configurando PDF com estilo profissional...");
    console.log("   - Formato: A4");
    console.log("   - Margens: 25mm (top/bottom), 20mm (left/right)");
    console.log("   - Fonte: Georgia (serif)");
    console.log("   - Cores: Gold #C5A059\n");

    // Generate PDF
    console.log("🔄 A converter... (isto pode demorar 30-60 segundos)\n");

    const pdf = await mdToPdf({ content: markdownContent }, pdfConfig);

    console.log("✅ PDF criado com sucesso!\n");
    console.log("📍 Localização:", outputPath);

    // Get file size
    const stats = fs.statSync(outputPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log("📊 Tamanho:", fileSizeInMB, "MB");

    console.log("\n🎉 Conversão concluída!\n");
    console.log("Próximos passos:");
    console.log("1. Abrir e verificar: public/downloads/introducao-lusitano.pdf");
    console.log("2. Testar download em: http://localhost:3000/ebook-gratis");
    console.log("3. Se necessário, ajustar CSS acima e re-executar script\n");
  } catch (error) {
    console.error("❌ Erro ao gerar PDF:", error);
    console.error("\nSugestões:");
    console.error("1. Verificar se o ficheiro markdown existe");
    console.error("2. Executar: npm install --save-dev md-to-pdf");
    console.error("3. Verificar permissões de escrita na pasta public/downloads/\n");
    process.exit(1);
  }
}

// Execute
generateEbookPDF();
