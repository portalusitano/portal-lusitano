import { createOgImage, ogSize, ogContentType } from "@/lib/og-helpers";

export const runtime = "edge";
export const alt = "Vender Cavalo Lusitano — Portal Lusitano";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return createOgImage({
    label: "Marketplace Premium",
    title: "Venda o Seu Cavalo",
    // Não diz «verificado»: quem carimba um documento como verificado é uma
    // pessoa, no painel de revisão, um documento de cada vez — e essa decisão
    // não está tomada quando esta imagem é gerada. O que é verdade antes de
    // qualquer anúncio existir é o percurso: envia-se, revê-se, publica-se.
    subtitle: "Envie o anúncio e a documentação; revemos antes de publicar",
  });
}
