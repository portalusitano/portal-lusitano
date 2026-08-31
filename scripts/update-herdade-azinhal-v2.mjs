/**
 * Actualizar Herdade do Azinhal — dados completos do site oficial
 * FONTE: site oficial da Herdade do Azinhal (secções "História" e "O Cavalo Andrade")
 * VERIFICADO: 2026-02-23
 */
import { readFileSync } from "fs";

const lines = readFileSync(".env.local", "utf8").split("\n");
const env = {};
for (const line of lines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const historia = `Os cavalos Lusitanos da Coudelaria de Fernando d'Andrade, com sede na Herdade do Azinhal em Portalegre, são puro sangue Andrade, originários da Coudelaria d'Andrade.

A Coudelaria d'Andrade foi fundada em 1894 pelo Arq. Alfredo d'Andrade, trisavô dos actuais proprietários, e melhorada com aquisições de éguas e garanhões em 1901 pelo Dr. Ruy d'Andrade. Foi mais tarde herdada pelo filho Eng.º Fernando Sommer d'Andrade e, após a sua morte em 1991, dividida pelos seus quatro filhos, de onde prossegue esta Coudelaria.

Quando o Dr. Ruy d'Andrade assumiu a gestão em 1901, adquiriu éguas da mais pura Raça Espanhola Andaluz (estirpe Cartujana) de Guerrero Hermanos, D. Vicente Romero y García e D. António Perez Tinao, criando a base para a Coudelaria Andrade. Como garanhões, utilizou cavalos das mesmas origens, dos quais há a destacar Rumboso (Guerrero Hermanos), Arriero (Camino Hermanos), Bergantín (Eduardo Miura), Cartujano e Saltador (D. António Perez Tinao), Novelero (Pallares Moreno) e Príncipe VIII (D. Francisco Chica Navarro), que veio a ser o grande garanhão formador da Coudelaria.

O Dr. Ruy d'Andrade (1880-1967) teve uma vida muito rica e diversificada como artista, autor, político, desportista, agricultor, zoólogo e criador. Dedicou grande parte da sua vida ao estudo arqueológico e histórico da Península Ibérica e, sobretudo, dos seus cavalos. A ele se deve a recuperação da Coudelaria de Alter Real, que se encontrava em vias de extinção.

O cavalo Andrade é considerado uma sub-raça do cavalo Lusitano pelas suas características distintivas e pelo facto de esta linhagem estar presente e ter dado origem a muitas das melhores coudelarias actuais. Escreveu Ruy d'Andrade que os cavalos da linhagem devem ser "fortes, curtos, valentes com os toiros, ardentes se provocados e calmos se não excitados, velozes na corrida e rápidos nas voltas, e de bom passo. Finos à espora, submissos, de boa boca, infindáveis, resistentes a tudo…"

São de destacar como garanhões da linhagem Andrade: Maravilha, Majestoso, Justo, Vulcão, Eneias, Firme e Martini. FIRME é pai de vários notáveis cavalos de ferro Veiga — Neptuno, Nilo, Novilheiro e Opus 72. FIRME com D. José d'Athayde e URCO com José Luís d'Andrade notabilizaram-se no toureio.

Sob a direcção de Fernando Sommer d'Andrade (1920-1991) — Presidente da APSL, Fundador do Stud Book e júri internacional — a coudelaria obteve inúmeros prémios, com destaque para os títulos de Coudelaria Campeã Ibérica na Feira de Campo, Madrid, em 1970 e 1972, juntamente com Poldro Campeão Ibérico e Égua Campeã Ibérica. No primeiro Campeonato Internacional do Cavalo Lusitano, ZAMORIM conquistou o primeiro lugar na classe de machos com mais de 5 anos.

Actualmente, a Coudelaria é composta por 8 cavalos e uma manada de 9 éguas. O efectivo é descendente dos garanhões Malpolon (filho de Jabeque, neto de Yacht), Zamorim e Xexe/Nablio (filho de Urco, neto de Martini e Yacht).`;

const data = {
  descricao:
    "Cavalos Lusitanos puro sangue Andrade, originários da histórica Coudelaria d'Andrade fundada em 1894. Herdade em Portalegre, Campeã Ibérica 1970 e 1972. Berço de FIRME — pai de Neptuno, Nilo, Novilheiro e Opus 72. Linhagem preservada há mais de 130 anos.",

  historia,

  num_cavalos: 17,

  especialidades: [
    "Linhagem Andrade",
    "Dressage",
    "Equitação de Trabalho",
    "Toureio",
    "Conservação Genética",
    "Selecção Funcional",
  ],

  linhagens: ["Andrade"],

  premios: [
    "Coudelaria Campeã Ibérica — Feira de Campo, Madrid 1970",
    "Coudelaria Campeã Ibérica — Feira de Campo, Madrid 1972",
    "Poldro Campeão Ibérico — Madrid 1970",
    "Égua Campeã Ibérica — Madrid 1970",
    "ZAMORIM — 1.º lugar machos +5 anos, 1.º Campeonato Internacional do Lusitano",
    "Fernando Sommer d'Andrade — Presidente da APSL e Fundador do Stud Book",
  ],

  cavalos_destaque: JSON.stringify([
    {
      nome: "Firme",
      descricao:
        "Garanhão lendário da linhagem Andrade. Pai de Neptuno, Nilo, Novilheiro e Opus 72 (cavalos de ferro Veiga). Toureiro com D. José d'Athayde.",
    },
    {
      nome: "Zamorim",
      descricao:
        "1.º lugar na classe de machos com mais de 5 anos no primeiro Campeonato Internacional do Cavalo Lusitano.",
    },
    {
      nome: "Príncipe VIII",
      descricao: "De D. Francisco Chica Navarro. Grande garanhão formador da Coudelaria d'Andrade.",
    },
    {
      nome: "Urco",
      descricao:
        "Notável cavalo de toureio com José Luís d'Andrade. Reprodutor da linhagem — avô do actual efectivo.",
    },
  ]),

  tags: [
    "andrade",
    "linhagem andrade",
    "portalegre",
    "historica",
    "1894",
    "ruy d'andrade",
    "fernando sommer d'andrade",
    "alfredo d'andrade",
    "alter real",
    "stud book",
    "apsl",
    "conservacao genetica",
    "puro sangue andrade",
    "seleccao funcional",
    "firme",
    "nilo",
    "novilheiro",
    "opus 72",
    "neptuno",
    "zamorim",
    "campea iberica",
    "madrid 1970",
    "toureio",
    "sub-raca",
  ],
};

const res = await fetch(`${url}/rest/v1/coudelarias?slug=eq.herdade-do-azinhal`, {
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
  console.log("Herdade do Azinhal v2 actualizada com sucesso!");
} else {
  const err = await res.json();
  console.log("Erro:", JSON.stringify(err, null, 2));
}
