import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CHAVES_PERFIL_PROPRIO } from "@/lib/perfil/contrato";
import { CHAVES_CONVERSA, CHAVES_CABECALHO } from "@/lib/chat/vista-publica";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(path.join(raiz, p), "utf8");

/**
 * ── Porque é que este ficheiro existe ────────────────────────────────────
 *
 * As duas metades do perfil foram construídas em paralelo. A camada de dados
 * chamou à coisa `fotografia`; a interface chamou-lhe `avatar`. Quatro
 * desencontros, e **nenhum deles partiu nada**:
 *
 *   campo do perfil      `avatarUrl`              `fotografia`
 *   rota da subida       /api/perfil/avatar       /api/perfil/fotografia
 *   campo do formulário  `avatar`                 `fotografia`
 *   chave na conversa    `outraParteAvatar`       `outraParteFoto`
 *
 * O `tsc` ficou verde e os 2399 testes passaram, porque cada uma daquelas
 * leituras é defensiva de propósito: a chave é opcional, um 404 é silêncio, e
 * o ecrã sabe desenhar a ausência. O produto teria desenhado **iniciais para
 * sempre**, em toda a gente, sem um erro em lado nenhum — que é a pior maneira
 * de falhar, e a mesma que este repositório já pagou com um banco de ensaio a
 * responder `200 []`.
 *
 * Um tipo partilhado não chegava: o que não coincidia era o **nome escrito na
 * ligação** — um caminho de rota e uma chave de `FormData` são texto, e texto
 * não é verificado por compilador nenhum. Por isso o teste lê os ficheiros.
 */
describe("a costura do perfil entre a interface e a API", () => {
  const cliente = ler("components/perfil/api.ts");

  it("o cliente chama as rotas que existem", () => {
    const rotas = [...cliente.matchAll(/ROTA_\w+\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(rotas).toContain("/api/perfil");
    expect(rotas).toContain("/api/perfil/fotografia");
    for (const rota of rotas) {
      const ficheiro = path.join("app", rota, "route.ts");
      expect(() => ler(ficheiro), `a rota ${rota} não existe em ${ficheiro}`).not.toThrow();
    }
  });

  it("o campo do FormData é o que a rota lê", () => {
    const campoEnviado = cliente.match(/corpo\.append\("([^"]+)"/)?.[1];
    const rota = ler("app/api/perfil/fotografia/route.ts");
    const campoLido = rota.match(/formData\.get\("([^"]+)"\)/)?.[1];
    expect(campoEnviado).toBeDefined();
    expect(campoLido).toBeDefined();
    expect(campoEnviado).toBe(campoLido);
  });

  it("o cliente lê as chaves que o contrato do perfil promete", () => {
    for (const chave of CHAVES_PERFIL_PROPRIO) {
      expect(cliente, `o cliente não lê a chave "${chave}"`).toContain(`o.${chave}`);
    }
  });

  it("a interface lê a fotografia da outra parte pela chave que a conversa traz", () => {
    // As duas listas que saem pela API: a da caixa de entrada e a do
    // cabeçalho do fio. A fotografia tem de estar nas duas, senão ela aparece
    // na lista e desaparece ao abrir a conversa.
    expect(CHAVES_CONVERSA).toContain("outraParteFoto");
    expect(CHAVES_CABECALHO).toContain("outraParteFoto");
    const outraParte = ler("components/perfil/outra-parte.ts");
    expect(outraParte).toContain("outraParteFoto");
    expect(outraParte).not.toContain("outraParteAvatar");
  });

  it("não sobrou o vocabulário antigo em nenhum dos dois lados", () => {
    for (const f of [
      "components/perfil/api.ts",
      "components/perfil/outra-parte.ts",
      "components/chat/CaixaEntrada.tsx",
      "components/chat/Fio.tsx",
      "components/minha-conta/MensagensContent.tsx",
    ]) {
      expect(ler(f), `${f} ainda diz avatarUrl`).not.toContain("avatarUrl");
      expect(ler(f), `${f} ainda diz outraParteAvatar`).not.toContain("outraParteAvatar");
    }
  });
});
