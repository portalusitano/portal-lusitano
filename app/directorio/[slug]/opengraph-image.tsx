import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase-admin";

export const runtime = "edge";

export const alt = "Coudelaria - Portal Lusitano";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let nome = "Coudelaria";
  let localizacao = "";
  let regiao = "";
  let especialidades: string[] = [];

  try {
    const { data } = await supabase
      .from("coudelarias")
      .select("nome, localizacao, regiao, especialidades")
      .eq("slug", slug)
      .single();

    if (data) {
      nome = data.nome || "Coudelaria";
      localizacao = data.localizacao || "";
      regiao = data.regiao || "";
      especialidades = (data.especialidades || []).slice(0, 3);
    }
  } catch {
    // Fall through to default values
  }

  const displayName = nome.length > 45 ? nome.substring(0, 42) + "..." : nome;
  const location = [localizacao, regiao].filter(Boolean).join(", ");

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#050505",
        backgroundImage: "radial-gradient(circle at 25% 25%, #1a1a1a 0%, #050505 50%)",
        padding: "60px 80px",
        position: "relative",
      }}
    >
      {/* Top border accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background:
            "linear-gradient(to right, transparent 10%, #C5A059 30%, #C5A059 70%, transparent 90%)",
        }}
      />

      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            fontSize: 14,
            letterSpacing: "0.4em",
            color: "#C5A059",
            textTransform: "uppercase",
          }}
        >
          Portal Lusitano
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 20px",
            border: "1px solid rgb(var(--gold-rgb) / 0.3)",
            borderRadius: "8px",
            backgroundColor: "rgb(var(--gold-rgb) / 0.08)",
          }}
        >
          <span style={{ fontSize: 14, color: "#C5A059", letterSpacing: "0.05em" }}>
            Directório de Coudelarias
          </span>
        </div>
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: "60px",
          height: "1px",
          background: "linear-gradient(to right, #C5A059, transparent)",
          marginBottom: "30px",
        }}
      />

      {/* Main title */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 600,
            color: "white",
            lineHeight: 1.2,
            fontFamily: "serif",
            maxWidth: "900px",
            marginBottom: "16px",
          }}
        >
          {displayName}
        </div>
        {location && (
          <div
            style={{
              fontSize: 22,
              color: "#a1a1aa",
              fontFamily: "serif",
              fontStyle: "italic",
            }}
          >
            {location}
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "24px",
        }}
      >
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
            Cavalos Lusitanos de Elite
          </div>
        </div>
        {especialidades.length > 0 && (
          <div style={{ display: "flex", gap: "8px" }}>
            {especialidades.map((esp) => (
              <span
                key={esp}
                style={{
                  fontSize: 11,
                  color: "#C5A059",
                  padding: "4px 12px",
                  border: "1px solid rgb(var(--gold-rgb) / 0.25)",
                  borderRadius: "4px",
                }}
              >
                {esp}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>,
    { ...size }
  );
}
