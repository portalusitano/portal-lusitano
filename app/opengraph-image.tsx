import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Portal Lusitano - Cavalos Lusitanos de Elite";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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
        backgroundImage: "radial-gradient(circle at 25% 25%, #1a1a1a 0%, #050505 50%)",
      }}
    >
      {/* Decorative Line */}
      <div
        style={{
          width: "1px",
          height: "60px",
          background: "linear-gradient(to bottom, transparent, #C5A059, transparent)",
          marginBottom: "30px",
        }}
      />

      {/* Brand Label */}
      <div
        style={{
          fontSize: 14,
          letterSpacing: "0.4em",
          color: "#C5A059",
          textTransform: "uppercase",
          marginBottom: "20px",
        }}
      >
        Est. 2023 - Portugal
      </div>

      {/* Main Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 400,
          color: "white",
          textAlign: "center",
          lineHeight: 1.1,
          fontFamily: "serif",
          marginBottom: "20px",
        }}
      >
        PORTAL LUSITANO
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 24,
          color: "#a1a1aa",
          fontStyle: "italic",
          fontFamily: "serif",
          maxWidth: "600px",
          textAlign: "center",
        }}
      >
        Cavalos Lusitanos de Elite
      </div>

      {/* Bottom Line */}
      <div
        style={{
          position: "absolute",
          bottom: "60px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "1px",
            backgroundColor: "#C5A059",
          }}
        />
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.3em",
            color: "#71717a",
            textTransform: "uppercase",
          }}
        >
          Marketplace Premium de Cavalos Portugueses
        </div>
        <div
          style={{
            width: "40px",
            height: "1px",
            backgroundColor: "#C5A059",
          }}
        />
      </div>
    </div>,
    {
      ...size,
    }
  );
}
