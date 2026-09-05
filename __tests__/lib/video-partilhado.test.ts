import { describe, it, expect } from "vitest";
import { identificarVideo } from "@/lib/video-partilhado";

describe("endereços de vídeo", () => {
  it("reconhece as formas do YouTube e extrai sempre o mesmo identificador", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abcdefgh",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "youtube.com/watch?v=dQw4w9WgXcQ",
    ]) {
      expect(identificarVideo(url), url).toMatchObject({
        plataforma: "youtube",
        id: "dQw4w9WgXcQ",
      });
    }
  });

  it("o endereço canónico deita fora o que é seguimento", () => {
    // É o que permite ao anúncio embeber o vídeo sem arrastar a lista, o
    // instante e o parâmetro de partilha com que a ligação foi copiada.
    expect(identificarVideo("https://youtu.be/dQw4w9WgXcQ?si=xyz")?.url).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    expect(identificarVideo("https://youtu.be/dQw4w9WgXcQ")?.embed).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
  });

  it("reconhece o Vimeo, incluindo os endereços de canal", () => {
    expect(identificarVideo("https://vimeo.com/347119375")).toMatchObject({
      plataforma: "vimeo",
      id: "347119375",
    });
    expect(identificarVideo("https://player.vimeo.com/video/347119375")?.id).toBe("347119375");
    expect(identificarVideo("https://vimeo.com/channels/staffpicks/347119375")?.id).toBe(
      "347119375"
    );
  });

  it("outra plataforma não é reconhecida — e não é isso o mesmo que ser recusada", () => {
    expect(identificarVideo("https://www.dailymotion.com/video/x8abcde")).toBeNull();
    expect(identificarVideo("https://drive.google.com/file/d/abc/view")).toBeNull();
  });

  it("um endereço meio escrito devolve `null` em vez de rebentar", () => {
    for (const valor of ["", "   ", "isto não é um url", "https://", "youtube.com"]) {
      expect(identificarVideo(valor)).toBeNull();
    }
  });

  it("um identificador do YouTube tem onze caracteres, nem mais nem menos", () => {
    expect(identificarVideo("https://youtu.be/curto")).toBeNull();
    expect(identificarVideo("https://youtu.be/dQw4w9WgXcQextra")).toBeNull();
  });
});
