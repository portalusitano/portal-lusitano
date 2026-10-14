import { describe, it, expect } from "vitest";
import { BASES_UELN, CODIGO_APSL } from "@/lib/documentos/ueln-bases";
import { ROTULOS_DO_PASSAPORTE } from "@/lib/documentos/vocabulario-passaporte";
import { lerPassaporte } from "@/components/vender-cavalo/passaporte-ueln";

/**
 * Os dados oficiais, e a regra que impede que eles se tornem perigosos.
 *
 * Estes dois módulos são gerados de `dados/oficiais/`, e são o que substituiu
 * suposição por facto: os rótulos vêm do Anexo II do Regulamento (UE)
 * 2021/963, e os códigos da base do UELN.
 *
 * **O que se testa aqui não é a lista** — essa vem da fonte e o gerador já
 * falha alto se for incoerente. Testa-se a maneira como se usa: que
 * desconhecido continua a ser desconhecido, e nunca inválido.
 */

describe("os códigos de base do UELN", () => {
  it("a APSL é 620003, e o palpite que se fez antes não existe", () => {
    // Antes de a lista chegar tinha-se suposto `620015`. Está aqui como teste
    // porque foi por pouco: se o palpite tivesse sido escrito, o site estaria
    // hoje a assinalar como estranhos os passaportes da própria APSL.
    expect(BASES_UELN[CODIGO_APSL]).toContain("Puro Sangue Lusitano");
    expect(BASES_UELN["620015"]).toBeUndefined();
  });

  it("tem as bases onde o Lusitano está registado fora de Portugal", () => {
    // Metade da raça nasce fora, e todas mediam a inscrição no mesmo livro.
    for (const codigo of ["076005", "826081", "840052", "752008", "056004"]) {
      expect(BASES_UELN[codigo], `${codigo} devia estar na lista`).toBeTruthy();
    }
  });

  it("todos os códigos têm seis caracteres alfanuméricos", () => {
    for (const codigo of Object.keys(BASES_UELN)) {
      expect(codigo, `${codigo} não tem a forma de um código UELN`).toMatch(/^[0-9A-Z]{6}$/i);
    }
  });
});

describe("um UELN lido", () => {
  it("diz de quem é o número quando conhece a base", () => {
    const r = lerPassaporte("620 003 004471234");
    expect(r.pareceUeln).toBe(true);
    expect(r.codigoPais).toBe("620");
    expect(r.codigoBase).toBe("003");
    expect(r.organizacao).toContain("Puro Sangue Lusitano");
  });

  it("**uma base desconhecida continua a ser um UELN válido**", () => {
    // É a regra inteira. A lista é a cópia de um dia; organizações novas
    // entram, e recusar um passaporte por causa disso seria repetir, com uma
    // lista a sério, o erro que se evitou quando não havia lista nenhuma.
    const r = lerPassaporte("620999004471234");
    expect(r.pareceUeln).toBe(true);
    expect(r.problema).toBeNull();
    expect(r.organizacao).toBeUndefined();
  });

  it("o que já recusava continua a recusar", () => {
    expect(lerPassaporte("62000300447").problema).toBe("comprimento");
    expect(lerPassaporte("ABC003004471234").problema).toBe("pais-nao-numerico");
  });

  it("os separadores impressos não atrapalham", () => {
    // `620 003 004471234` é como o número aparece no documento.
    expect(lerPassaporte("620-003-004471234").organizacao).toBe(
      lerPassaporte("620003004471234").organizacao
    );
  });
});

describe("os rótulos do passaporte", () => {
  it("trazem as três línguas e a secção do anexo", () => {
    for (const r of ROTULOS_DO_PASSAPORTE) {
      expect(r.en.length, `${r.campo} sem rótulo inglês`).toBeGreaterThan(0);
      expect(r.pt.length, `${r.campo} sem rótulo português`).toBeGreaterThan(0);
      expect(r.seccao, `${r.campo} sem secção`).toMatch(/Sec/);
    }
  });

  it("tem os quatro que identificam o animal", () => {
    const campos = ROTULOS_DO_PASSAPORTE.map((r) => r.campo);
    expect(campos).toContain("Transponder / microchip");
    expect(campos).toContain("UELN / código único");
    expect(campos).toContain("Nome do animal");
    expect(campos).toContain("Número no livro genealógico");
  });

  it("o francês falta só onde o documento não o imprime", () => {
    // As linhas da Secção V são o certificado zootécnico, que não aparece nas
    // três línguas no mesmo documento. Fora dessas, o francês existe.
    for (const r of ROTULOS_DO_PASSAPORTE) {
      if (r.fr === null) expect(r.seccao, `${r.campo}`).toMatch(/Secção V/);
    }
  });
});
