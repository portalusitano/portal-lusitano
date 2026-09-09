/**
 * As rotas do perfil, exercitadas contra o site a correr.
 *
 * ── Porque é que isto existe, se já há testes de unidade ────────────────────
 *
 * Os testes de unidade provam que o cano tira o EXIF, que a migração fecha o
 * buraco, e que a vista não deixa sair contactos. Nenhum deles prova a
 * **ligação**: que a rota chama mesmo o cano, que o que fica no balde é o que
 * saiu dele, e que o endereço que vai para a caixa de entrada da outra pessoa é
 * aquele. Uma propriedade escrita não é uma propriedade a funcionar — a lição
 * do `sticky` do `CLAUDE.md` vale igual aqui.
 *
 * Corre contra o `next start` apontado ao banco de ensaio do chat, com a sessão
 * por cookie como o `README.md` desse banco descreve.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const BANCO = process.env.BANCO || "http://127.0.0.1:54992";
const SITIO = process.env.SITIO || "http://127.0.0.1:3100";

let falhas = 0;
let provas = 0;
function prova(nome, ok, detalhe = "") {
  provas++;
  if (!ok) falhas++;
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

// ── Sessão ────────────────────────────────────────────────────────────────
const sessao = await (
  await fetch(`${BANCO}/auth/v1/token?grant_type=password`, { method: "POST", body: "{}" })
).json();
const COOKIE = `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(sessao)).toString("base64")}`;

const comSessao = (extra = {}) => ({
  ...extra,
  headers: { Cookie: COOKIE, ...(extra.headers || {}) },
});

// ── 1. Ler o perfil ───────────────────────────────────────────────────────
{
  const r = await fetch(`${SITIO}/api/perfil`, comSessao());
  const j = await r.json();
  prova("GET /api/perfil responde 200", r.status === 200, `status ${r.status}`);
  prova(
    "são duas chaves, e são estas",
    JSON.stringify(Object.keys(j.perfil || {}).sort()) === '["fotografia","nome"]',
    JSON.stringify(j.perfil)
  );
  const saiu = JSON.stringify(j);
  prova(
    "não sai facturação nem o identificador",
    !saiu.includes("cus_ensaio") &&
      !saiu.includes("11111111-1111-4111-8111-111111111111") &&
      !saiu.includes("subscription"),
    saiu.slice(0, 120)
  );
}

// ── 2. Sem sessão não se lê nem se escreve ────────────────────────────────
{
  const r = await fetch(`${SITIO}/api/perfil`);
  prova("sem sessão, GET dá 401", r.status === 401, `status ${r.status}`);
  const p = await fetch(`${SITIO}/api/perfil/fotografia`, { method: "POST" });
  prova("sem sessão, o envio dá 401", p.status === 401, `status ${p.status}`);
}

// ── 3. Mudar o nome ───────────────────────────────────────────────────────
{
  const r = await fetch(
    `${SITIO}/api/perfil`,
    comSessao({
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome: "  Maria\nSequeira  " }),
    })
  );
  const j = await r.json();
  prova(
    "PATCH limpa o nome em vez de o recusar",
    j.perfil?.nome === "Maria Sequeira",
    JSON.stringify(j)
  );

  const apagar = await fetch(
    `${SITIO}/api/perfil`,
    comSessao({
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome: "" }),
    })
  );
  prova("apagar o nome é uma resposta legítima", (await apagar.json()).perfil?.nome === null);

  await fetch(
    `${SITIO}/api/perfil`,
    comSessao({
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome: "Maria Sequeira" }),
    })
  );
}

// ── 4. A fotografia, com GPS lá dentro ────────────────────────────────────
let endereco = null;
{
  const original = readFileSync(path.join(AQUI, "telemovel-12mp.jpg"));
  const meta = await sharp(original).metadata();
  prova(
    "o ficheiro que se envia traz mesmo EXIF",
    (meta.exif?.length ?? 0) > 0 && original.includes(Buffer.from("Apple")),
    `${meta.exif?.length ?? 0} bytes de EXIF, ${original.length} bytes`
  );

  const fd = new FormData();
  fd.append("fotografia", new Blob([original], { type: "image/jpeg" }), "IMG_4021.HEIC");

  const r = await fetch(`${SITIO}/api/perfil/fotografia`, comSessao({ method: "POST", body: fd }));
  const j = await r.json();
  prova("POST responde 201", r.status === 201, `status ${r.status} ${JSON.stringify(j)}`);
  endereco = j.perfil?.fotografia ?? null;
  prova("devolve um endereço", typeof endereco === "string", String(endereco));

  if (endereco) {
    prova(
      "o endereço não traz o identificador da pessoa",
      !endereco.includes("11111111-1111-4111-8111-111111111111") &&
        !endereco.includes("11111111111141118111111111111111"),
      endereco
    );
    prova("o endereço está no balde próprio, e não no `images`", endereco.includes("/avatares/"));

    // O que ficou mesmo no balde.
    const bytes = Buffer.from(await (await fetch(endereco)).arrayBuffer());
    const m = await sharp(bytes).metadata();
    prova("o que ficou no balde é WebP", m.format === "webp", String(m.format));
    prova("é um quadrado de 256", m.width === 256 && m.height === 256, `${m.width}x${m.height}`);
    prova("não tem EXIF", m.exif === undefined);
    prova(
      "não tem as coordenadas nem o fabricante",
      !["Apple", "iPhone", "GPS", "Exif"].some((a) => bytes.includes(Buffer.from(a, "latin1")))
    );
    prova(
      "encolheu duas ordens de grandeza",
      bytes.length * 50 < original.length,
      `${original.length} → ${bytes.length} bytes (${Math.round(original.length / bytes.length)}x)`
    );
  }
}

// ── 5. O que não passa ────────────────────────────────────────────────────
{
  // Um PDF com nome e Content-Type de fotografia. Quem decide são os bytes.
  const fd = new FormData();
  fd.append(
    "fotografia",
    new Blob([Buffer.from("%PDF-1.7\n1 0 obj\n")], { type: "image/jpeg" }),
    "retrato.jpg"
  );
  const r = await fetch(`${SITIO}/api/perfil/fotografia`, comSessao({ method: "POST", body: fd }));
  prova("um PDF com nome de JPEG é recusado", r.status === 400, `status ${r.status}`);

  // E a fotografia boa continua lá: uma recusa não apaga a anterior.
  const g = await (await fetch(`${SITIO}/api/perfil`, comSessao())).json();
  prova("uma recusa não apaga a fotografia que já lá estava", g.perfil?.fotografia === endereco);
}

// ── 6. Tirar a fotografia ─────────────────────────────────────────────────
{
  const r = await fetch(`${SITIO}/api/perfil/fotografia`, comSessao({ method: "DELETE" }));
  const j = await r.json();
  prova("DELETE responde 200 e devolve nulo", r.status === 200 && j.perfil?.fotografia === null);

  const g = await (await fetch(`${SITIO}/api/perfil`, comSessao())).json();
  prova(
    "sem fotografia é nulo, e não um avatar inventado",
    g.perfil?.fotografia === null,
    JSON.stringify(g.perfil)
  );
}

// ── 7. A caixa de entrada sabe quem é a outra parte ───────────────────────
{
  const r = await fetch(`${SITIO}/api/conversas`, comSessao());
  const j = await r.json();
  const cs = j.conversas || [];
  prova(
    "GET /api/conversas responde com conversas",
    r.status === 200 && cs.length > 0,
    `${cs.length}`
  );

  if (cs.length) {
    prova(
      "todas as conversas trazem a chave da fotografia",
      cs.every((c) => "outraParteFoto" in c)
    );
    const comFoto = cs.filter((c) => c.outraParteFoto);
    prova(
      "algumas trazem fotografia e outras não — a gama está coberta",
      comFoto.length > 0 && comFoto.length < cs.length,
      `${comFoto.length} de ${cs.length}`
    );
    prova(
      "nenhum endereço traz o identificador de ninguém",
      !cs.some((c) =>
        [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
          "55555555-5555-4555-8555-555555555555",
        ].some((id) => String(c.outraParteFoto || "").includes(id))
      )
    );

    /* Os contactos que a rota **nunca** pode publicar são os das colunas do
       anúncio e os da linha do perfil. Não se varre o JSON inteiro à procura de
       um `@`: a pré-visualização da última mensagem é texto que uma pessoa
       escreveu, e o banco de ensaio traz de propósito um corpo com um endereço
       lá dentro. Escrever o próprio email numa mensagem é a pessoa a partilhar
       o contacto, que é precisamente o que a promessa da página inicial
       permite — «o contacto só é partilhado se quiser». Uma verificação que não
       distinga as duas coisas acusa o produto de fazer o que ele existe para
       fazer. */
    const campos = JSON.stringify(
      cs.map(({ outraParte, outraParteFoto, cavaloNome, cavaloFoto, cavaloPreco }) => ({
        outraParte,
        outraParteFoto,
        cavaloNome,
        cavaloFoto,
        cavaloPreco,
      }))
    );
    prova(
      "nenhum campo de identidade traz um contacto",
      !campos.includes("@") && !campos.includes("+351") && !campos.includes("912345678"),
      campos.slice(0, 160)
    );

    const saiu = JSON.stringify(j);
    prova(
      "não sai facturação nem coluna de contacto do anúncio",
      !saiu.includes("vendedor_telefone") &&
        !saiu.includes("vendedor_whatsapp") &&
        !saiu.includes("cus_ensaio") &&
        !saiu.includes("subscription") &&
        !saiu.includes("avatar_prefixo")
    );
    prova(
      "nem o identificador de nenhuma das pessoas",
      !saiu.includes("22222222-2222-4222-8222-222222222222") &&
        !saiu.includes("11111111-1111-4111-8111-111111111111")
    );

    // O nome do perfil ganha à cópia congelada na conversa.
    const daAna = cs.find((c) => c.outraParte === "Ana");
    prova("o nome vem do perfil quando ele existe", Boolean(daAna), "procurava «Ana»");

    // Uma pessoa sem linha de perfil cai na cadeia antiga, sem rebentar.
    prova(
      "quem não tem perfil continua a ter nome",
      cs.every((c) => typeof c.outraParte === "string" && c.outraParte.length > 0)
    );
  }
}

// ── 8. O cabeçalho do fio, e a mensagem que não ganhou a chave ────────────
{
  const cs = (await (await fetch(`${SITIO}/api/conversas`, comSessao())).json()).conversas || [];
  if (cs.length) {
    const j = await (await fetch(`${SITIO}/api/conversas/${cs[0].id}`, comSessao())).json();
    prova("o cabeçalho do fio traz a fotografia", "outraParteFoto" in (j.conversa || {}));
    prova(
      "a mensagem não ganhou a chave",
      (j.mensagens || []).every((m) => !("outraParteFoto" in m)),
      `${(j.mensagens || []).length} mensagens`
    );
  }
}

console.log(`\n${provas - falhas} de ${provas} provas passaram.`);
process.exit(falhas ? 1 : 0);
