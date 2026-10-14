import { readFileSync } from "fs";

const lines = readFileSync(".env.local", "utf8").split("\n");
const env = {};
for (const line of lines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const historia = [
  "A Quinta da Portela, datada do s\u00e9culo XVIII e mandada erguer pelo Marqu\u00eas de Castelo Melhor, Conde da Ribeira Grande, encontra-se a apenas 15 minutos do Aeroporto de Lisboa, localizada em plena regi\u00e3o vitivin\u00edcola de Bucelas.",
  "",
  "O alojamento \u00e9 feito em habita\u00e7\u00f5es com dois quartos e sala de estar com lareira, junto \u00e0s \u00e1reas comuns da propriedade: boxes dos cavalos Lusitanos, biblioteca, piscina ao ar livre e jardins com vista \u00edmpar sobre o Rio Tejo.",
  "",
  "Atrav\u00e9s das suas F\u00e9rias Equestres, o Morgado Lusitano promove a beleza e o excelente temperamento do Cavalo Lusitano. Aqui pode-se aprender equita\u00e7\u00e3o ao mais alto n\u00edvel, sob o olhar atento de instrutores experientes e de provas dadas no meio.",
  "",
  "As F\u00e9rias Equestres oferecem uma experi\u00eancia \u00fanica de aprendizagem, disponibilizando ao p\u00fablico cavalos treinados a um n\u00edvel que raramente est\u00e1 dispon\u00edvel na maioria das escolas de equita\u00e7\u00e3o. Entre os movimentos ensinados encontram-se: Esp\u00e1dua a dentro, Ced\u00eancia \u00e0 Perna, Galope invertido, Passagens de m\u00e3o, Passo Espanhol, Pirueta, Piaffe e Passage.",
  "",
  "O Morgado Lusitano oferece dois pacotes principais:",
  "",
  "\u2014 Pacote de 7 noites: alojamento em pens\u00e3o completa com 13 aulas de equita\u00e7\u00e3o (2 por dia). \u00c9poca alta (Mar-Nov): desde 2.055\u20ac/pessoa. \u00c9poca baixa (Dez-Fev): desde 1.915\u20ac/pessoa. Inclui 1 upgrade gratuito para aula privada e uma segunda oferta \u00e0 escolha (aula \u00e0 guia, passeio a cavalo, visita \u00e0 EPAE).",
  "",
  "\u2014 Pacote de 4 noites: alojamento em pens\u00e3o completa com 8 aulas de equita\u00e7\u00e3o (2 por dia). \u00c9poca alta: desde 1.220\u20ac/pessoa. \u00c9poca baixa: desde 1.080\u20ac/pessoa. Inclui 1 upgrade gratuito para aula privada.",
  "",
  "Servi\u00e7os adicionais incluem aulas privadas (110\u20ac/45min), passeio na Floresta de Sobreiros (90\u20ac), passeio nas colinas do Morgado (60\u20ac), visita \u00e0 Escola Portuguesa de Arte Equestre (90\u20ac), aula de r\u00e9deas longas (80\u20ac), aula de Equita\u00e7\u00e3o de Trabalho (80-110\u20ac), Master Class (110\u20ac), sess\u00f5es de fotografia (desde 95\u20ac), e massagem (80\u20ac/h).",
  "",
  "Para eventos, a Quinta disponibiliza espa\u00e7os em exclusivo \u2014 desde almo\u00e7os de Natal corporativos a reuni\u00f5es de fam\u00edlia \u2014 com variedade de aperitivos, pratos tradicionais e sobremesas. Festas de anivers\u00e1rio para crian\u00e7as incluem 90 minutos de baptismo equestre em picadeiro coberto (at\u00e9 20 crian\u00e7as: 400\u20ac).",
].join("\n");

const data = {
  descricao:
    "F\u00e9rias equestres de excel\u00eancia a 15 minutos do Aeroporto de Lisboa. A Quinta da Portela, do s\u00e9c. XVIII, oferece alojamento, dressage cl\u00e1ssico com cavalos Lusitanos treinados ao mais alto n\u00edvel, eventos corporativos e festas de anivers\u00e1rio \u2014 tudo com vista privilegiada sobre o Rio Tejo.",
  historia,
  localizacao: "Alverca do Ribatejo",
  regiao: "Lisboa",
  telefone: "+351 219 936 520",
  email: "info@morgadolusitano.pt",
  website: "https://morgadolusitano.pt",
  especialidades: [
    "Dressage Cl\u00e1ssico",
    "F\u00e9rias Equestres",
    "Turismo Equestre",
    "Enoturismo",
    "Eventos Corporativos",
  ],
  servicos: [
    "F\u00e9rias equestres com alojamento",
    "Aulas de dressage cl\u00e1ssico",
    "Aulas privadas e partilhadas",
    "Passeio a cavalo (Floresta de Sobreiros)",
    "Passeio nas colinas do Morgado",
    "Aula de Equita\u00e7\u00e3o de Trabalho",
    "Master Class",
    "Visita \u00e0 Escola Portuguesa de Arte Equestre",
    "Eventos corporativos e de Natal",
    "Festas de anivers\u00e1rio",
    "Sess\u00f5es de fotografia",
    "Massagem e bem-estar",
    "Prova de vinhos",
    "Transfer aeroporto",
  ],
  tags: [
    "lisboa",
    "alverca",
    "bucelas",
    "enoturismo",
    "eventos",
    "dressage",
    "ferias equestres",
    "alojamento",
    "rio tejo",
    "seculo xviii",
    "aulas equitacao",
    "aniversarios",
    "natal",
    "corporativo",
    "epae",
  ],
  horario:
    "Pacotes de 4 ou 7 noites. Aulas: 2 por dia. Festas: 09:00-12:30 ou 14:30-18:00. Transfer aeroporto dispon\u00edvel (~15 min, 40\u20ac/percurso).",
  latitude: 38.8863,
  longitude: -9.0417,
};

const res = await fetch(`${url}/rest/v1/coudelarias?slug=eq.morgado-lusitano`, {
  method: "PATCH",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify(data),
});

console.log("Status:", res.status);
if (res.ok) {
  console.log("Morgado Lusitano actualizado com sucesso!");
} else {
  const err = await res.json();
  console.log("Erro:", JSON.stringify(err, null, 2));
}
