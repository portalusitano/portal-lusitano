import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Directório de Coudelarias — Portal Lusitano";
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
        backgroundImage: "radial-gradient(circle at 20% 70%, #1a1a1a 0%, #050505 60%)",
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
        {/* A página já tinha deixado de prometer «criadores certificados» nos
            metadados — ver o comentário em `app/directorio/page.tsx` —, mas a
            imagem de partilha continuava a dizê-lo, e é ela que aparece quando
            o link circula. */}
        Criadores de Lusitanos
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
        Directório de Coudelarias
      </div>
      <div
        style={{
          fontSize: 22,
          color: "#a1a1aa",
          fontStyle: "italic",
          fontFamily: "serif",
          maxWidth: "600px",
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        As Melhores Coudelarias de Lusitanos em Portugal
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
          Portal Lusitano
        </div>
        <div style={{ width: "40px", height: "1px", backgroundColor: "#C5A059" }} />
      </div>
    </div>,
    { ...size }
  );
}
