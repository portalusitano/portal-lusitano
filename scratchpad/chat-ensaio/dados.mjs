/**
 * Os dados do banco de ensaio do chat.
 *
 * ── O que isto é, e o que não é ──────────────────────────────────────────
 *
 * **Isto é um substituto, inteiro.** Ao contrário do
 * `scratchpad/coudelarias-ensaio.json`, que traz as vinte e nove coudelarias
 * verdadeiras tal como a base as devolve, aqui não há uma única linha real:
 * não há acesso à base verdadeira e conversas de pessoas a sério não sairiam
 * dela para um banco de ensaio de qualquer maneira. Tudo o que está aqui foi
 * escrito à mão.
 *
 * O `CLAUDE.md` conta o que custou passar um stub de mão em mão como se
 * fossem «as vinte e nove verdadeiras»: um agente concluiu, com números, que
 * três colunas estavam vazias, escreveu-o no código e na mensagem de commit,
 * e estavam preenchidas 29, 29 e 21. Por isso este ficheiro diz de si próprio
 * o que é, e por isso o que ele garante **não** é fidelidade aos dados — é
 * **cobertura da gama**. O mesmo ficheiro conta a outra metade da lição: um
 * banco com `historia` em 29/29 mas a mesma frase de 69 caracteres nas vinte
 * e nove tem cobertura perfeita e não reproduz nada.
 *
 * ── A gama que isto cobre, de propósito ──────────────────────────────────
 *
 * Cada eixo tem os extremos e o meio, porque é nos extremos que a interface
 * parte:
 *
 *   fios          1 mensagem · 3 · 40 · 400
 *   corpos        1 caractere · uma frase · 4000 (o limite do CHECK) ·
 *                 com quebras de linha · com um endereço · com um número de
 *                 telefone · com emoji · com uma palavra de 200 letras sem
 *                 espaços (o que rebenta caixas que não previnem o transbordo)
 *   nomes         «Ana» · um nome de 96 caracteres · nulo (o fallback)
 *   anúncios      com fotografia e sem · com preço e sem · vendido · apagado
 *                 (a conversa fica órfã e a rota escreve «Anúncio removido»)
 *   por ler       0 · 1 · 12
 *   papéis        a comprar e a vender, na mesma caixa de entrada
 *   datas         hoje · ontem · esta semana · há meses (os separadores de dia)
 *
 * O `VAZIO=1` serve a caixa de entrada sem uma única conversa, que é o estado
 * de toda a gente no primeiro dia e o único que a interface actual mostra bem.
 */

/** O dono da sessão do ensaio. É ele que a página autentica. */
export const EU = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "eu@exemplo.pt",
  nome: "Maria Sequeira",
};

const OUTROS = [
  { id: "22222222-2222-4222-8222-222222222222", nome: "Ana" },
  {
    id: "33333333-3333-4333-8333-333333333333",
    nome: "João Maria de Bragança e Sousa Mendes de Vasconcelos Almeida",
  },
  { id: "44444444-4444-4444-8444-444444444444", nome: null },
  { id: "55555555-5555-4555-8555-555555555555", nome: "Tomás Rebelo" },
  { id: "66666666-6666-4666-8666-666666666666", nome: "Beatriz Nunes" },
];

const AGORA = new Date("2026-09-09T14:00:00Z").getTime();
const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const quando = (msAtras) => new Date(AGORA - msAtras).toISOString();

/* ── Os corpos que fazem a gama ─────────────────────────────────────────── */

const FRASE =
  "Bom dia, o cavalo ainda está disponível? Tenho interesse em vê-lo este fim-de-semana.";

const CORPOS = {
  curtissimo: "?",
  frase: FRASE,
  // Exactamente 4000: o CHECK da tabela é `BETWEEN 1 AND 4000`, e um
  // corpo de 4001 seria um caso que a base nunca deixa existir.
  limite: "Ainda sobre a alimentação e o maneio deste cavalo, ".repeat(80).slice(0, 4000),
  quebras:
    "Bom dia.\n\nTenho três perguntas:\n\n1. Já foi classificado?\n2. Tem raio-x?\n3. Aceita visita?",
  comEndereco: "Pode responder para o meu email? ana.pereira@exemplo.pt",
  comTelefone: "O meu número é 912 345 678, ligue quando puder.",
  comEmoji: "Adorei o vídeo 🐴✨ é mesmo bonito",
  semEspacos: "P".repeat(200),
  ligacao:
    "Vi este aqui https://www.exemplo.pt/um/caminho/muito/comprido/que/nao/cabe/na/caixa/de/mensagem",
};

/* ── Os anúncios ────────────────────────────────────────────────────────── */

export const CAVALOS = [
  {
    id: "0aa00001-0000-4000-8000-000000000001",
    nome: "Zambujeiro do Vale",
    foto_principal: "/logo.webp",
    preco: 18500,
    vendedor_nome: "Coudelaria do Vale",
    user_id: EU.id,
    status: "active",
  },
  {
    id: "0aa00001-0000-4000-8000-000000000002",
    nome: "Índia",
    foto_principal: null, // sem fotografia: não se inventa um rectângulo cinzento
    preco: null, // sem preço
    vendedor_nome: "Quinta da Lezíria",
    user_id: OUTROS[0].id,
    status: "active",
  },
  {
    id: "0aa00001-0000-4000-8000-000000000003",
    nome: "Vencedor da Broa de Cima e do Casal do Monte Alentejano",
    foto_principal: "/logo.webp",
    preco: 120000,
    vendedor_nome: null, // o fallback do `nomeOutraParte`
    user_id: OUTROS[1].id,
    status: "sold",
  },
  {
    id: "0aa00001-0000-4000-8000-000000000004",
    nome: "Faísca",
    foto_principal: "/logo.webp",
    preco: 7200,
    vendedor_nome: "Herdade dos Currais",
    user_id: EU.id,
    status: "active",
  },
];

/* ── As conversas ───────────────────────────────────────────────────────── */

/**
 * Cada entrada descreve um fio: quem, sobre que anúncio, com que mensagens.
 * `n` gera um fio comprido com corpos rodados, para o desempenho e para os
 * separadores de dia terem por onde se ver.
 */
const GUIÃO = [
  {
    // A vender, 12 por ler, fio curto, comprador sem nome guardado.
    papel: "vendedor",
    outro: OUTROS[3],
    cavalo: CAVALOS[0],
    compradorNome: null,
    mensagens: [
      { de: "outro", corpo: CORPOS.frase, hMin: 40, lida: false },
      { de: "outro", corpo: CORPOS.quebras, hMin: 38, lida: false },
      ...Array.from({ length: 10 }, (_, i) => ({
        de: "outro",
        corpo: `Continuo interessado, mensagem ${i + 1}.`,
        hMin: 35 - i,
        lida: false,
      })),
    ],
  },
  {
    // A comprar, tudo lido, uma mensagem só. O caso mais comum.
    papel: "comprador",
    outro: OUTROS[0],
    cavalo: CAVALOS[1],
    compradorNome: EU.nome,
    mensagens: [{ de: "eu", corpo: CORPOS.frase, hMin: 3 * 60, lida: true }],
  },
  {
    // Nome comprido dos dois lados, anúncio vendido, corpo no limite dos 4000.
    papel: "comprador",
    outro: OUTROS[1],
    cavalo: CAVALOS[2],
    compradorNome: EU.nome,
    mensagens: [
      { de: "eu", corpo: CORPOS.limite, hMin: 5 * 24 * 60, lida: true },
      { de: "outro", corpo: CORPOS.curtissimo, hMin: 5 * 24 * 60 - 10, lida: true },
      { de: "outro", corpo: CORPOS.semEspacos, hMin: 5 * 24 * 60 - 12, lida: true },
      { de: "eu", corpo: CORPOS.ligacao, hMin: 4 * 24 * 60, lida: true },
      { de: "outro", corpo: CORPOS.comEmoji, hMin: 26 * 60, lida: true },
      { de: "outro", corpo: CORPOS.comTelefone, hMin: 25 * 60, lida: false },
    ],
  },
  {
    // A vender, o fio comprido: 400 mensagens ao longo de meses.
    papel: "vendedor",
    outro: OUTROS[4],
    cavalo: CAVALOS[3],
    compradorNome: OUTROS[4].nome,
    n: 400,
  },
  {
    // A conversa órfã: o anúncio foi apagado e a rota escreve «Anúncio removido».
    papel: "comprador",
    outro: OUTROS[2],
    cavalo: { id: "0aa0dead-0000-4000-8000-000000000000" },
    compradorNome: EU.nome,
    mensagens: [{ de: "eu", corpo: CORPOS.comEndereco, hMin: 90 * 24 * 60, lida: true }],
  },
];

function fioComprido(n, outroId) {
  const corpos = Object.values(CORPOS);
  return Array.from({ length: n }, (_, i) => ({
    de: i % 3 === 0 ? "eu" : "outro",
    corpo: i % 7 === 0 ? corpos[i % corpos.length] : `Mensagem número ${i + 1} deste fio.`,
    // Espalhadas por ~120 dias, para haver muitos separadores de dia.
    hMin: (n - i) * 7 * 60,
    lida: true,
    _de: outroId,
  }));
}

export function construir({ vazio = false } = {}) {
  if (vazio) return { conversas: [], mensagens: [] };

  const conversas = [];
  const mensagens = [];

  GUIÃO.forEach((g, idx) => {
    const conversaId = `0cc0${String(idx + 1).padStart(4, "0")}-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`;
    const lista = g.n ? fioComprido(g.n, g.outro.id) : g.mensagens;

    const ordenadas = [...lista].sort((a, b) => b.hMin - a.hMin);
    let porLerAqui = 0;

    ordenadas.forEach((m, j) => {
      const meu = m.de === "eu";
      if (!meu && !m.lida) porLerAqui += 1;
      mensagens.push({
        // `destinatario_id`, `entregue_at`: colunas que a migração
        // `20260909000001_chat_tempo_real` acrescenta, escritas aqui
        // exactamente como o gatilho e o backfill dela as escrevem —
        // senão o caminho novo mede-se contra o esquema velho.
        destinatario_id: meu ? g.outro.id : EU.id,
        entregue_at: meu || m.lida ? quando(m.hMin * MIN - 30_000) : null,
        id: `0be0${String(idx).padStart(4, "0")}-${String(j).padStart(4, "0")}-4000-8000-${String(j).padStart(12, "0")}`,
        conversa_id: conversaId,
        remetente_id: meu ? EU.id : g.outro.id,
        corpo: m.corpo,
        lida_at: meu || m.lida ? quando(m.hMin * MIN - 60_000) : null,
        created_at: quando(m.hMin * MIN),
      });
    });

    const ultima = ordenadas[ordenadas.length - 1];
    conversas.push({
      id: conversaId,
      cavalo_id: g.cavalo.id,
      comprador_id: g.papel === "comprador" ? EU.id : g.outro.id,
      vendedor_id: g.papel === "comprador" ? g.outro.id : EU.id,
      comprador_nome: g.compradorNome,
      ultima_mensagem_at: quando(ultima.hMin * MIN),
      ultima_mensagem_previa: ultima.corpo.slice(0, 200),
      arquivada_comprador: false,
      arquivada_vendedor: false,
      created_at: quando(ordenadas[0].hMin * MIN),
      _porLer: porLerAqui,
    });
  });

  // Mais vinte e cinco fios banais, para a caixa de entrada ter de rolar: uma
  // lista de cinco não diz nada sobre uma lista de trinta.
  for (let i = 0; i < 25; i++) {
    const outro = OUTROS[i % OUTROS.length];
    const cavalo = CAVALOS[i % CAVALOS.length];
    const conversaId = `0dd0${String(i).padStart(4, "0")}-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const hMin = (i + 1) * 6 * 60;
    conversas.push({
      id: conversaId,
      cavalo_id: cavalo.id,
      comprador_id: i % 2 ? EU.id : outro.id,
      vendedor_id: i % 2 ? outro.id : EU.id,
      comprador_nome: i % 2 ? EU.nome : outro.nome,
      ultima_mensagem_at: quando(hMin * MIN),
      ultima_mensagem_previa: `Olá, ainda tem o ${cavalo.nome}? (fio ${i + 1})`.slice(0, 200),
      arquivada_comprador: false,
      arquivada_vendedor: false,
      created_at: quando(hMin * MIN + DIA),
      _porLer: i === 3 ? 1 : 0,
    });
    mensagens.push({
      destinatario_id: i === 3 ? EU.id : i % 2 ? outro.id : EU.id,
      entregue_at: i === 3 ? null : quando(hMin * MIN - 30_000),
      id: `0ee0${String(i).padStart(4, "0")}-0000-4000-8000-${String(i).padStart(12, "0")}`,
      conversa_id: conversaId,
      remetente_id: i === 3 ? outro.id : EU.id,
      corpo: `Olá, ainda tem o ${cavalo.nome}? (fio ${i + 1})`,
      lida_at: i === 3 ? null : quando(hMin * MIN - MIN),
      created_at: quando(hMin * MIN),
    });
  }

  conversas.sort((a, b) => (a.ultima_mensagem_at < b.ultima_mensagem_at ? 1 : -1));
  return { conversas, mensagens };
}
