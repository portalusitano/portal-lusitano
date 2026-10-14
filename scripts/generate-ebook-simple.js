/**
 * Script simplificado para gerar PDF do ebook gratuito
 * Compatível com md-to-pdf v5.x
 */

const fs = require("fs");
const path = require("path");
const { mdToPdf } = require("md-to-pdf");

async function generateEbookPDF() {
  try {
    console.log("📚 Gerando PDF do Ebook...\n");

    // Paths
    const markdownPath = path.join(
      __dirname,
      "../public/ebooks/04-INTRODUCAO-LUSITANO/EBOOK-COMPLETO.md"
    );
    const outputDir = path.join(__dirname, "../public/downloads");
    const outputPath = path.join(outputDir, "introducao-lusitano.pdf");
    const cssPath = path.join(__dirname, "ebook-style.css");

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log("✅ Pasta criada: public/downloads/\n");
    }

    // Read markdown
    let markdownContent = fs.readFileSync(markdownPath, "utf-8");

    // Add cover page at the beginning
    const coverPage = `
<div style="text-align: center; padding: 100px 40px; border: 3px solid #C5A059; margin-bottom: 60px;">
  <p style="font-size: 12px; letter-spacing: 4px; color: #8B6914; margin-bottom: 40px;">PORTAL LUSITANO PRO</p>
  <h1 style="font-size: 42px; color: #C5A059; margin: 30px 0; line-height: 1.2;">INTRODUÇÃO AO<br>CAVALO LUSITANO</h1>
  <p style="font-size: 16px; font-style: italic; color: #666;">O Guia Essencial Para Iniciantes</p>
  <p style="margin-top: 80px; font-size: 11px; color: #999;">30 Páginas de Conhecimento Premium<br>© 2024 Portal Lusitano</p>
</div>

---

`;

    markdownContent = coverPage + markdownContent;

    console.log("📄 Processando markdown...");

    // Generate PDF with inline configuration
    const pdf = await mdToPdf(
      { content: markdownContent },
      {
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
        },
        css: `
          body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.8;
            color: #333;
            max-width: 100%;
          }

          h1 {
            font-size: 28pt;
            color: #C5A059;
            text-align: center;
            margin: 40px 0 25px 0;
            border-bottom: 3px solid #C5A059;
            padding-bottom: 15px;
            page-break-before: always;
          }

          h1:first-of-type {
            page-break-before: auto;
          }

          h2 {
            font-size: 20pt;
            color: #8B6914;
            margin: 30px 0 18px 0;
            border-left: 5px solid #C5A059;
            padding-left: 15px;
          }

          h3 {
            font-size: 16pt;
            color: #1a1a1a;
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

          blockquote {
            border-left: 4px solid #C5A059;
            padding: 15px 20px;
            margin: 20px 0;
            background: #f9f9f9;
            font-style: italic;
            color: #555;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 10pt;
          }

          th {
            background: #C5A059;
            color: white;
            padding: 10px;
            text-align: left;
          }

          td {
            border: 1px solid #ddd;
            padding: 8px 10px;
          }

          tr:nth-child(even) {
            background: #f9f9f9;
          }

          hr {
            border: none;
            border-top: 2px solid #C5A059;
            margin: 35px 0;
            opacity: 0.4;
          }

          strong {
            color: #1a1a1a;
          }

          code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
          }

          a {
            color: #C5A059;
            text-decoration: none;
          }
        `,
        launch_options: {
          headless: "new",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      }
    );

    console.log("\n✅ PDF gerado com sucesso!");
    console.log("📍 Localização:", outputPath);

    const stats = fs.statSync(outputPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log("📊 Tamanho:", fileSizeInMB, "MB");

    console.log("\n🎉 Pronto! O ebook pode ser descarregado em:");
    console.log("   http://localhost:3000/downloads/introducao-lusitano.pdf");
  } catch (error) {
    console.error("\n❌ Erro ao gerar PDF:", error.message);
    console.error("\nDica: Certifica-te que tens md-to-pdf instalado:");
    console.error("npm install --save-dev md-to-pdf");
    process.exit(1);
  }
}

generateEbookPDF();
