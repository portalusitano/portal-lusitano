/**
 * Actualizar Herdade do Azinhal com dados do site oficial
 * FONTE: site oficial da Herdade do Azinhal (secção História da Coudelaria)
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

const data = {
  descricao:
    "Cavalos Lusitanos puro sangue Andrade, originários da histórica Coudelaria d'Andrade fundada em 1894 pelo Arq. Alfredo d'Andrade. Herdade em Portalegre, continuação directa de uma das linhagens mais importantes da raça Lusitana, preservada há mais de 130 anos.",

  historia: `Os cavalos Lusitanos da Coudelaria de Fernando d'Andrade, com sede na Herdade do Azinhal em Portalegre, são puro sangue Andrade, originários da Coudelaria d'Andrade.

A Coudelaria d'Andrade foi fundada em 1894 pelo Arq. Alfredo d'Andrade, trisavô dos actuais proprietários da Herdade do Azinhal, e melhorada com aquisições de éguas e garanhões em 1901 pelo Dr. Ruy d'Andrade. Foi mais tarde herdada pelo filho Eng.º Fernando Sommer d'Andrade e, após a sua morte em 1991, dividida pelos seus quatro filhos, de onde prossegue esta Coudelaria.

O Dr. Ruy d'Andrade (1880-1967) teve uma vida muito rica e diversificada como artista, autor, político, desportista, agricultor, zoólogo e criador e seleccionador de diversas raças de animais, nomeadamente o Cavalo Peninsular, hoje chamado de Puro Sangue Lusitano e de Pura Raça Espanhola. A ele se deve a recuperação da Coudelaria de Alter Real, que se encontrava em vias de extinção, bem como todo o trabalho sobre a sua história.

Sendo um estudioso da História do Cavalo Ibérico, procurou assegurar que os cavalos da Coudelaria fossem seleccionados sobretudo a partir dos seus andamentos e qualidades funcionais. Com base nalguns garanhões e éguas formadores e cruzamentos consanguíneos, tendo em vista o apuramento das espécies dentro da mesma raça e a homogeneidade necessária à fixação das suas próprias características.

Após a morte de D. Ruy d'Andrade, em 1967, o seu filho Eng.º Fernando Sommer d'Andrade (1920-1991) herdou a Coudelaria e seguiu o rumo anterior com excelentes resultados. Fernando Sommer d'Andrade foi um grande aficionado do cavalo lusitano, júri internacional, Presidente da Associação Portuguesa do Puro Sangue Lusitano e Fundador do Stud Book.

A linhagem Andrade, um património genético que é necessário conservar, está presente em inúmeras coudelarias portuguesas, representando um marco importante na criação de cavalos em Portugal. A Coudelaria d'Andrade e os seus cavalos receberam inúmeros prémios importantes ao longo do último século.

Actualmente, a Coudelaria Herdade do Azinhal procura manter intactas as características do cavalo Andrade com base no modelo, na genealogia, realçando o seu temperamento dócil, a sua coragem, resistência e prazer no trabalho, na qualidade dos produtos fornecidos e na análise das suas características funcionais.`,

  especialidades: [
    "Linhagem Andrade",
    "Dressage",
    "Equitação de Trabalho",
    "Toureio",
    "Conservação Genética",
    "Selecção Funcional",
  ],

  premios: [
    "Inúmeros prémios importantes ao longo de mais de um século",
    "Linhagem histórica preservada desde 1894",
    "Fernando Sommer d'Andrade — Presidente da APSL e Fundador do Stud Book",
  ],

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
  console.log("Herdade do Azinhal actualizada com sucesso!");
} else {
  const err = await res.json();
  console.log("Erro:", JSON.stringify(err, null, 2));
}
