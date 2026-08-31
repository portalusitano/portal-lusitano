/**
 * Actualizar Casa Cadaval com dados do site oficial
 * FONTE: https://www.casacadaval.pt (secção Lusitanos)
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
    "Uma das mais antigas coudelarias da Península Ibérica, com mais de 375 anos de criação de Lusitanos. Propriedade de 5.400 hectares em Muge, no Ribatejo, pertencente à família Cadaval há 11 gerações. Cavalos campeões do mundo em Atrelagem e campeões europeus em Equitação de Trabalho.",

  historia: `A história da Casa Cadaval remonta a mais de 400 anos. Antes de pertencer à família Cadaval, o palácio foi residência da Rainha D. Leonor de Áustria no início do século XVI.

Em 1648, a propriedade passou para a posse da família Cadaval. Em 1660, D. Maria de Faro, Condessa de Odemira, casou com D. Nuno Álvares Pereira de Melo, 1.º Duque de Cadaval, trazendo como dote uma manada de éguas Lusitanas das suas propriedades no Alentejo — fundando assim a tradição de criação equestre.

A propriedade tem estado na mesma família durante 11 gerações, sendo gerida por mulheres ao longo de cinco gerações consecutivas. A actual proprietária, Teresa Schönborn-Wiesentheid, é uma amazona consumada que compete com equipas de cavalos Lusitanos baios criados na propriedade.

Na senda de uma qualidade que se plasma na criação de um cavalo lusitano de secular beleza e modelo, com extraordinário temperamento e comprovada funcionalidade para a prática de dressage ao mais alto nível internacional, a Casa Cadaval alia o conhecimento adquirido ao longo de gerações às mais inovadoras técnicas de reprodução assistida — incluindo transferência de embriões — recorrendo às melhores linhas na actualidade.

Com um efectivo médio de 15 éguas, rigorosamente seleccionadas a partir das duas grandes linhas de matriarcas da coudelaria, o acompanhamento é feito por uma equipa de veterinários e equitador de referência na raça lusitana. A filosofia é aliar Tradição e Cultura com a objectividade das melhores práticas de produção, maneio, treino desportivo e conhecimento científico de vanguarda.

Entregues a conceituados treinadores e cavaleiros, os cavalos da Casa Cadaval têm-se destacado tanto em Portugal como no estrangeiro, com grande sucesso em concursos de Modelos e Andamentos e nas disciplinas de Atrelagem (Campeões do Mundo), Equitação de Trabalho (Campeão Europeu) e Dressage.

A herdade de 5.400 hectares divide-se entre floresta, culturas irrigadas, vinha, criação de cavalos Lusitanos e gado. A produção vinícola da Casa Cadaval, na região do Tejo, inclui castas como Trincadeira, Touriga Nacional, Aragonez, Arinto e Fernão Pires.`,

  num_cavalos: 15,

  especialidades: [
    "Criação de Lusitanos",
    "Dressage",
    "Atrelagem",
    "Equitação de Trabalho",
    "Vinicultura",
    "Enoturismo",
    "Reprodução Assistida",
  ],

  premios: ["Campeões do Mundo — Atrelagem", "Campeão Europeu — Equitação de Trabalho"],

  tags: [
    "muge",
    "ribatejo",
    "historica",
    "enoturismo",
    "cadaval",
    "duque",
    "1648",
    "vinho",
    "tejo",
    "salvaterra de magos",
    "atrelagem",
    "equitacao de trabalho",
    "dressage",
    "reproducao assistida",
    "campeoes do mundo",
    "campeao europeu",
  ],
};

const res = await fetch(`${url}/rest/v1/coudelarias?slug=eq.casa-cadaval`, {
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
  console.log("Casa Cadaval actualizada com sucesso!");
} else {
  const err = await res.json();
  console.log("Erro:", JSON.stringify(err, null, 2));
}
