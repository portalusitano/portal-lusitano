import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Comprar Cavalo Lusitano — Portal Lusitano";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#050505",
        backgroundImage: "radial-gradient(circle at 30% 20%, #1a1a1a 0%, #050505 60%)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          letterSpacing: "0.4em",
          color: "#C5A059",
          textTransform: "uppercase",
          marginBottom: "24px",
        }}
      >
        Marketplace Premium
      </div>
      <div
        style={{
          fontSize: 68,
          fontWeight: 400,
          color: "white",
          textAlign: "center",
          lineHeight: 1.1,
          fontFamily: "serif",
          marginBottom: "18px",
        }}
      >
        Cavalos Lusitanos
      </div>
      <div
        style={{
          fontSize: 28,
          color: "#C5A059",
          fontStyle: "italic",
          fontFamily: "serif",
          marginBottom: "40px",
        }}
      >
        à Venda em Portugal
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ width: "40px", height: "1px", backgroundColor: "#C5A059" }} />
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.3em",
            color: "#71717a",
            textTransform: "uppercase",
          }}
        >
          {/* Dizia «Linhagem Certificada APSL · Verificado». É a imagem que
              acompanha o link quando alguém o partilha no WhatsApp ou no
              Facebook — muita gente vê-a sem chegar a abrir o site, e por isso
              é o pior sítio possível para uma afirmação que a página por trás
              não sustenta. */}
          Criadores e proprietários · Contacto directo
        </div>
        <div style={{ width: "40px", height: "1px", backgroundColor: "#C5A059" }} />
      </div>
    </div>,
    { ...size }
  );
}
