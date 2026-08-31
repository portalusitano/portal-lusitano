import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase-admin";

export const runtime = "edge";
export const alt = "Coudelaria — Portal Lusitano";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OURO = "#c6a15b";
const PRETO = "#000000";
const BRANCO = "#ffffff";
const TENUE = "#8b8b93";

/**
 * O cartão que aparece quando alguém partilha uma coudelaria no WhatsApp.
 *
 * Duas correcções em relação à versão anterior. A primeira: havia
 * `border: "1px solid rgb(var(--gold-rgb) / 0.3)"` em três sítios — o Satori
 * não tem folha de estilos e não resolve variáveis de CSS, pelo que aquelas
 * regras não pintavam nada. As cores aqui são literais **de propósito**: esta
 * imagem é gerada fora do browser, onde os tokens do `globals.css` não
 * existem.
 *
 * A segunda: só se escreve o que a base de dados tem. Se não houver
 * especialidades, não se enche o rodapé com palavras bonitas.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let nome = "Coudelaria";
  let localizacao = "";
  let regiao = "";
  let anoFundacao: number | null = null;
  let especialidades: string[] = [];

  try {
    const { data } = await supabase
      .from("coudelarias")
      .select("nome, localizacao, regiao, ano_fundacao, especialidades")
      .eq("slug", slug)
      .eq("status", "active")
      .single();
    if (data) {
      nome = data.nome || nome;
      localizacao = data.localizacao || "";
      regiao = data.regiao || "";
      anoFundacao = data.ano_fundacao || null;
      especialidades = (data.especialidades || []).slice(0, 3);
    }
  } catch {
    // Cartão genérico; melhor isso do que nenhuma imagem.
  }

  const titulo = nome.length > 44 ? `${nome.slice(0, 41)}…` : nome;
  const sitio = [localizacao, regiao].filter(Boolean).join(", ");

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: PRETO,
        backgroundImage: "radial-gradient(circle at 22% 18%, #1a1a1a 0%, #000000 55%)",
        padding: "56px 72px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "40px", height: "2px", backgroundColor: OURO }} />
        <div
          style={{
            fontSize: 15,
            letterSpacing: "0.28em",
            color: OURO,
            textTransform: "uppercase",
          }}
        >
          Portal Lusitano
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 60, color: BRANCO, lineHeight: 1.15, maxWidth: "980px" }}>
          {titulo}
        </div>
        {sitio ? (
          <div style={{ fontSize: 26, color: "#a1a4a5", marginTop: "14px" }}>{sitio}</div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(214,235,253,0.19)",
          paddingTop: "22px",
        }}
      >
        <div
          style={{
            fontSize: 13,
            letterSpacing: "0.22em",
            color: TENUE,
            textTransform: "uppercase",
          }}
        >
          {anoFundacao ? `Fundada em ${anoFundacao}` : "Directório de coudelarias"}
        </div>
        {especialidades.length > 0 ? (
          <div style={{ display: "flex", gap: "10px" }}>
            {especialidades.map((especialidade) => (
              <div
                key={especialidade}
                style={{
                  fontSize: 14,
                  color: "#f0f0f0",
                  padding: "6px 14px",
                  border: "1px solid rgba(214,235,253,0.19)",
                  borderRadius: "999px",
                }}
              >
                {especialidade}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    { ...size }
  );
}
