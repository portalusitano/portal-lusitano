/**
 * O relatório.
 *
 * Todos os juízos estão aqui e só aqui. As medidas recolhem números; é este
 * ficheiro que decide o que é grave, o que é um aviso e o que é uma nota — e
 * por isso mudar de opinião sobre um limiar não obriga a voltar a abrir o
 * browser. É também aqui que vive a comparação entre duas corridas, que é o
 * uso para que o banco foi feito: um número sozinho não diz se melhorou.
 */

const GRAVE = "GRAVE";
const AVISO = "aviso";
const NOTA = "nota";

const n2 = (v) => (v === null || v === undefined ? "—" : Number(v).toFixed(2));
const n1 = (v) => (v === null || v === undefined ? "—" : Number(v).toFixed(1));

/** Uma linha de achado. `chave` é o que se compara entre corridas. */
function achado(nivel, chave, texto, valor) {
  return { nivel, chave, texto, valor };
}

/**
 * Do JSON de um ecrã para a lista de achados.
 *
 * A ordem por que saem é a ordem por que estragam a experiência: primeiro o
 * que impede alguém de chegar onde queria, depois o que o engana, depois o
 * que o incomoda.
 */
export function julgar(ecra) {
  const a = [];
  const r = ecra.repouso;
  const alf = r?.alfinetes;

  /* ── Chegar lá ─────────────────────────────────────────────────────── */

  for (const p of ecra.percursos?.percursos ?? []) {
    if (p.falha) {
      /* Um caminho que não existe neste quadro não é uma avaria: em desktop,
         com os pontos separados, pode não haver pilha nenhuma à vista. O que
         é uma avaria é o caminho existir e não dar em nada. */
      const inexistente = /não encontrad|nenhum[ao]/i.test(p.falha);
      a.push(
        achado(
          inexistente ? NOTA : GRAVE,
          `percurso:${p.nome}`,
          inexistente
            ? `«${p.nome}» não se pôde medir: ${p.falha}`
            : `«${p.nome}» nem chegou a correr: ${p.falha}`,
          1
        )
      );
      continue;
    }
    const nada = !p.navegou && !p.abriuJanela && !p.fechouJanela && !p.abriuPilha && !p.abriuMancha;
    if (nada && !/vazia|Aproximar/.test(p.nome)) {
      a.push(
        achado(GRAVE, `percurso:${p.nome}`, `«${p.nome}» não faz nada — esperado: ${p.esperado}`, 1)
      );
    }
  }

  if (ecra.teclado?.setas && !ecra.teclado.setas.alcancouTodos) {
    a.push(
      achado(
        GRAVE,
        "setas:alcance",
        `as setas só alcançam ${ecra.teclado.setas.distintos} das ${ecra.teclado.setas.total} coudelarias`,
        ecra.teclado.setas.distintos
      )
    );
  }
  if (ecra.teclado?.setas?.focoPerdido > 0) {
    a.push(
      achado(
        GRAVE,
        "setas:foco-perdido",
        `o foco sai do globo em ${ecra.teclado.setas.focoPerdido} dos ${ecra.teclado.setas.passos} passos das setas`,
        ecra.teclado.setas.focoPerdido
      )
    );
  }
  if (ecra.teclado?.setas?.comFocoInvisivel > 0) {
    a.push(
      achado(
        GRAVE,
        "setas:foco-invisivel",
        `${ecra.teclado.setas.comFocoInvisivel} passos das setas dão foco a um nome que não se lê`,
        ecra.teclado.setas.comFocoInvisivel
      )
    );
  }
  if (ecra.teclado?.tabulacao?.semContorno > 0) {
    a.push(
      achado(
        GRAVE,
        "tabulacao:sem-contorno",
        `${ecra.teclado.tabulacao.semContorno} paragens de tabulação sem contorno de foco visível`,
        ecra.teclado.tabulacao.semContorno
      )
    );
  }

  /* ── Acertar no que se aponta ──────────────────────────────────────── */

  if (alf?.pontaria) {
    if (alf.pontaria.semNada > 0) {
      a.push(
        achado(
          GRAVE,
          "pontaria:sem-area",
          `${alf.pontaria.semNada} alfinetes não têm um único pixel em que um clique lhes acerte — estão inteiramente cobertos por um vizinho`,
          alf.pontaria.semNada
        )
      );
    }
    if (alf.pontaria.comErro > 0) {
      a.push(
        achado(
          alf.pontaria.fraccaoErradaMax > 0.25 ? GRAVE : AVISO,
          "pontaria:vizinho-errado",
          `${alf.pontaria.comErro} alfinetes têm área de clique roubada por um vizinho; no pior, ${Math.round(alf.pontaria.fraccaoErradaMax * 100)}% do disco de toque abre a coudelaria errada`,
          alf.pontaria.comErro
        )
      );
    }
    const menor = alf.pontaria.areaCerta.min;
    if (menor !== null && menor < 120) {
      a.push(
        achado(
          AVISO,
          "pontaria:area-minima",
          `o alfinete mais apertado tem ${Math.round(menor)}px² de área de acerto (um disco de raio ${n1(alf.raioDeToque)} tem ${Math.round(Math.PI * (alf.raioDeToque ?? 15) ** 2)})`,
          menor
        )
      );
    }
  }

  const emRepouso = alf?.aglomeracao?.contagem;
  if (emRepouso) {
    const { 3: p3, 6: p6, 12: p12 } = emRepouso;
    if (p3 > 0) {
      a.push(
        achado(
          GRAVE,
          "aglomeracao:3px",
          `${p3} pares de alfinetes a menos de 3px em repouso — nenhum ponteiro os separa`,
          p3
        )
      );
    }
    if (p6 > 0) {
      a.push(achado(AVISO, "aglomeracao:6px", `${p6} pares a menos de 6px em repouso`, p6));
    }
    if (p12 > 0) {
      a.push(
        achado(
          AVISO,
          "aglomeracao:12px",
          `${p12} pares a menos de 12px em repouso (o raio de toque é ${n1(alf?.raioDeToque)})`,
          p12
        )
      );
    }
  }

  /* ── Não mentir ────────────────────────────────────────────────────── */

  if (r) {
    if (r.contadas !== r.total) {
      a.push(
        achado(
          GRAVE,
          "contagem",
          `${r.contadas} de ${r.total} coudelarias estão contadas no ecrã; ${r.total - r.contadas} não aparecem nem em nome nem em algarismo`,
          r.total - r.contadas
        )
      );
    }
    if (r.entreNomes.length) {
      a.push(
        achado(
          GRAVE,
          "sobreposicao:nomes",
          `${r.entreNomes.length} pares de nomes sobrepostos (maior: ${Math.round(r.entreNomes[0].area)}px²)`,
          r.entreNomes.length
        )
      );
    }
    if (r.nomesContraManchas.length) {
      a.push(
        achado(
          AVISO,
          "sobreposicao:nome-mancha",
          `${r.nomesContraManchas.length} nomes por baixo de um algarismo de mancha`,
          r.nomesContraManchas.length
        )
      );
    }
    if (r.foraDaLona.length) {
      a.push(
        achado(
          AVISO,
          "fora-da-lona",
          `${r.foraDaLona.length} elementos com parte fora da lona: ${r.foraDaLona
            .slice(0, 4)
            .map((x) => `${x.que} (${Math.round(x.dentro * 100)}% dentro)`)
            .join(", ")}`,
          r.foraDaLona.length
        )
      );
    }
    if (r.cortados.length) {
      a.push(
        achado(
          AVISO,
          "nomes-cortados",
          `${r.cortados.length} nomes cortados com reticências: ${r.cortados.slice(0, 5).join(", ")}`,
          r.cortados.length
        )
      );
    }
    if (r.visiveisInertes > 0) {
      a.push(
        achado(
          AVISO,
          "inertes-visiveis",
          `${r.visiveisInertes} nomes legíveis estão marcados \`inert\` — vêem-se e não se carregam`,
          r.visiveisInertes
        )
      );
    }
  }

  /* ── Não trabalhar à toa ───────────────────────────────────────────── */

  const f = ecra.fluidez;
  if (f?.emRepouso) {
    if (f.emRepouso.desenhos > 0) {
      a.push(
        achado(
          GRAVE,
          "desenho:repouso",
          `${f.emRepouso.desenhos} chamadas de desenho em ${f.emRepouso.janelaMs}ms de repouso, em ${f.emRepouso.quadros} quadros — o relógio devia estar parado`,
          f.emRepouso.desenhos
        )
      );
    }
    if (f.foraDoEcra.desenhos > 0) {
      a.push(
        achado(
          GRAVE,
          "desenho:fora-do-ecra",
          `${f.foraDoEcra.desenhos} chamadas de desenho com o globo fora do ecrã`,
          f.foraDoEcra.desenhos
        )
      );
    }
    if (f.escondido.desenhos > 0) {
      a.push(
        achado(
          GRAVE,
          "desenho:separador-escondido",
          `${f.escondido.desenhos} chamadas de desenho com o separador escondido`,
          f.escondido.desenhos
        )
      );
    }
  }

  /* ── A escolha ─────────────────────────────────────────────────────── */

  const esc = ecra.escolha;
  if (esc && !esc.falhou) {
    if (!esc.houveTransicao && !esc.parado) {
      a.push(
        achado(
          AVISO,
          "escolha:sem-transicao",
          "carregar num nome não muda nada no globo antes de a página mudar",
          0
        )
      );
    }
    if (esc.houveTransicao && esc.parado) {
      a.push(
        achado(
          GRAVE,
          "escolha:movimento-reduzido",
          "a transição corre com `prefers-reduced-motion: reduce`",
          esc.duracaoMs
        )
      );
    }
    if (esc.maxAnimacoesJuntas > 1) {
      a.push(
        achado(
          AVISO,
          "escolha:varios-movimentos",
          `${esc.maxAnimacoesJuntas} animações distintas correm juntas ao escolher (${esc.animacoes.join(", ")}) — devia ler-se como um movimento`,
          esc.maxAnimacoesJuntas
        )
      );
    }
    if (esc.houveTransicao && esc.limpou === false) {
      a.push(
        achado(
          GRAVE,
          "escolha:ficou-presa",
          "com a navegação cortada, a transição ficou por acabar — o globo fica preso a meio",
          1
        )
      );
    }
  }

  /* ── O alvo foge ao ponteiro ───────────────────────────────────────── */

  const af = ecra.alvoFoge;
  if (af?.total) {
    if (af.fugiram > 0) {
      a.push(
        achado(
          GRAVE,
          "alvo-foge",
          `${af.fugiram} de ${af.total} alvos saem de debaixo do ponteiro no instante em que se aponta para eles (${af.fugiramManchas} manchas, ${af.fugiramNomes} nomes); o clique seguinte bate noutra coisa`,
          af.fugiram
        )
      );
    }
    if (af.deslocamento.max > 6) {
      a.push(
        achado(
          AVISO,
          "alvo-desloca",
          `apontar move um alvo até ${Math.round(af.deslocamento.max)}px`,
          Math.round(af.deslocamento.max)
        )
      );
    }
  }

  /* ── A janela útil ─────────────────────────────────────────────────── */

  const j = ecra.janelaUtil;
  if (j?.avisoPresente && r?.nomesLidos) {
    if (j.nomesLidos < r.nomesLidos) {
      a.push(
        achado(
          GRAVE,
          "janela-util:aviso",
          `com o aviso de cookies por responder o globo escreve ${j.nomesLidos} nomes em vez de ${r.nomesLidos} — a primeira visita vê ${r.nomesLidos - j.nomesLidos} nomes a menos`,
          j.nomesLidos
        )
      );
    }
    if (j.tapados.length) {
      a.push(
        achado(
          GRAVE,
          "janela-util:tapados",
          `${j.tapados.length} nomes escritos por baixo de um elemento fixo`,
          j.tapados.length
        )
      );
    }
    /* Um nome de folga: o número de nomes legíveis varia sozinho de ±1 entre
       corridas — está medido na tabela da variação —, e um limiar mais
       apertado do que o ruído do próprio instrumento acusa o que não há. */
    const d = j.depoisDeResponder;
    if (d && d.avisoSaiu && d.nomesLidos < r.nomesLidos - 1) {
      a.push(
        achado(
          GRAVE,
          "janela-util:nao-recupera",
          `depois de responder ao aviso o globo fica com ${d.nomesLidos} nomes e não volta aos ${r.nomesLidos} — a lona voltou e os nomes não`,
          d.nomesLidos
        )
      );
    }
  }

  /* ── Erros ─────────────────────────────────────────────────────────── */

  const todosOsErros = juntarErros(ecra);
  for (const e of todosOsErros.pagina) {
    a.push(achado(GRAVE, `pageerror:${e.slice(0, 40)}`, `erro de página: ${e}`, 1));
  }
  const consolaUnica = [...new Set(todosOsErros.consola.map((c) => c.texto))];
  for (const t of consolaUnica.slice(0, 12)) {
    a.push(achado(t.includes("Warning") ? NOTA : AVISO, `consola:${t.slice(0, 40)}`, t, 1));
  }
  for (const x of todosOsErros.rede.slice(0, 8)) {
    a.push(achado(AVISO, `rede:${x.url.slice(0, 50)}`, `pedido falhado: ${x.url} (${x.erro})`, 1));
  }

  /* ── Robustez ──────────────────────────────────────────────────────── */

  for (const c of ecra.robustez?.casos ?? []) {
    if (!c.vivo) {
      a.push(
        achado(GRAVE, `robustez:${c.nome}`, `«${c.nome}» deixou o globo sem camada de nomes`, 1)
      );
    } else if (c.falha) {
      a.push(achado(AVISO, `robustez:${c.nome}`, `«${c.nome}» falhou: ${c.falha}`, 1));
    }
  }

  /* Um achado por chave. O mesmo problema visto seis vezes é um problema, e
     seis linhas iguais no relatório empurram para fora do ecrã os cinco
     problemas que só aparecem uma vez. */
  const unicos = new Map();
  for (const x of a) {
    const antes = unicos.get(x.chave);
    if (!antes) unicos.set(x.chave, { ...x, vezes: 1 });
    else antes.vezes++;
  }
  const peso = { [GRAVE]: 0, [AVISO]: 1, [NOTA]: 2 };
  return [...unicos.values()]
    .map((x) => (x.vezes > 1 ? { ...x, texto: `${x.texto} (×${x.vezes})` } : x))
    .sort((x, y) => peso[x.nivel] - peso[y.nivel]);
}

function juntarErros(ecra) {
  const saida = { consola: [], pagina: [], rede: [] };
  const passear = (o) => {
    if (!o || typeof o !== "object") return;
    if (o.erros && (o.erros.consola || o.erros.pagina || o.erros.rede)) {
      saida.consola.push(...(o.erros.consola ?? []));
      saida.pagina.push(...(o.erros.pagina ?? []));
      saida.rede.push(...(o.erros.rede ?? []));
    }
    for (const v of Object.values(o)) if (v && typeof v === "object") passear(v);
  };
  passear(ecra);
  return saida;
}

/* ── O texto ────────────────────────────────────────────────────────────── */

function tabela(linhas) {
  if (!linhas.length) return "";
  const larguras = linhas[0].map((_, i) =>
    Math.max(...linhas.map((l) => String(l[i] ?? "").length))
  );
  return linhas
    .map((l) => l.map((c, i) => String(c ?? "").padEnd(larguras[i])).join("  "))
    .join("\n");
}

export function escreverRelatorio(corrida) {
  const L = [];
  const p = (s = "") => L.push(s);

  p("═".repeat(78));
  p("  PROVA DO GLOBO — Portal Lusitano");
  p("═".repeat(78));
  p(`  corrida ....... ${corrida.nome}`);
  p(`  url ........... ${corrida.url}`);
  p(`  quando ........ ${corrida.quando}`);
  p(`  navegador ..... ${corrida.navegador} (WebGL por software)`);
  p(`  passo de varrimento ... ${corrida.passo}px`);
  p(`  duração ....... ${Math.round(corrida.ms / 1000)}s`);
  p();
  p("  Os milissegundos por quadro só se comparam entre corridas na mesma");
  p("  máquina: o WebGL aqui é swiftshader. As contagens — pares de alfinetes");
  p("  demasiado juntos, pixéis que abrem a coudelaria errada, desenhos em");
  p("  repouso — valem por si.");
  p();

  for (const ecra of corrida.ecras) {
    p("─".repeat(78));
    p(`  ${ecra.nome.toUpperCase()} — ${ecra.largura}×${ecra.altura}`);
    p("─".repeat(78));
    const r = ecra.repouso;
    const alf = r?.alfinetes;

    p();
    p("  REPOUSO");
    p(`    lona ...................... ${n1(r.caixa.l)}×${n1(r.caixa.a)}px`);
    p(
      `    repousou em ............... ${r.repouso.ms}ms${r.repouso.repousou ? "" : "  (NÃO REPOUSOU)"}`
    );
    p(`    coudelarias ............... ${r.total} em ${r.pontos} pontos`);
    p(`    nomes legíveis ............ ${r.nomesLidos}`);
    p(
      `    manchas ................... ${r.manchas.length} ${r.manchas.length ? `(${r.manchas.join(" + ")})` : ""}`
    );
    p(`    contadas no ecrã .......... ${r.contadas} de ${r.total}`);
    p(`    na ordem de tabulação ..... ${r.naOrdemDeTabulacao}`);
    p(`    nomes sobrepostos ......... ${r.entreNomes.length}`);
    p(`    nomes sob um algarismo .... ${r.nomesContraManchas.length}`);
    p(`    fora da lona .............. ${r.foraDaLona.length}`);
    p(`    nomes cortados ............ ${r.cortados.length}`);
    p(`    nomes numa linha só ....... ${r.curtos.length}`);

    if (alf) {
      p();
      p("  ALFINETES (recuperados do ecrã, por varrimento do teste de acerto)");
      p(`    encontrados ............... ${alf.centros.length}`);
      p(`    raio de toque medido ...... ${n1(alf.raioDeToque)}px`);
      p(`    posição afinada ........... ${alf.afinados ?? 0}  (aglomerados, sem fronteira livre)`);
      p(`    posição imprecisa ......... ${alf.imprecisos}`);
      p(`    o modelo explica .......... ${n2(alf.concordancia.fraccao * 100)}% do mapa medido`);
      if (r.conferencia?.n) {
        p(
          `    conferência pelo DOM ...... ${r.conferencia.n} nomes, desvio mediano ${n2(r.conferencia.p50)}px, máx ${n2(r.conferencia.max)}px`
        );
      }
      p(`    varrimento ................ ${alf.msVarrimento}ms`);
      p();
      p("  PONTARIA — onde é que um clique junto a cada alfinete vai parar");
      p(
        `    área de acerto (px²) ...... mín ${Math.round(alf.pontaria.areaCerta.min)}  mediana ${Math.round(alf.pontaria.areaCerta.p50)}  máx ${Math.round(alf.pontaria.areaCerta.max)}`
      );
      p(`    alfinetes sem área ........ ${alf.pontaria.semNada}`);
      p(`    com área roubada .......... ${alf.pontaria.comErro}`);
      p(`    pior fracção errada ....... ${Math.round(alf.pontaria.fraccaoErradaMax * 100)}%`);
      p();
      p("  AGLOMERAÇÃO EM REPOUSO (distâncias entre alfinetes, em pixéis)");
      p(`    pares a menos de 3px ...... ${alf.aglomeracao.contagem[3]}`);
      p(`    pares a menos de 6px ...... ${alf.aglomeracao.contagem[6]}`);
      p(`    pares a menos de 12px ..... ${alf.aglomeracao.contagem[12]}`);
      p(`    pares a menos de 24px ..... ${alf.aglomeracao.contagem[24]}`);
      p(
        `    vizinho mais próximo ...... mín ${n2(alf.aglomeracao.estatistica.min)}  mediana ${n2(alf.aglomeracao.estatistica.p50)}  máx ${n2(alf.aglomeracao.estatistica.max)}`
      );
      p(
        `    piores distâncias ......... ${alf.aglomeracao.piores
          .slice(0, 8)
          .map((x) => n2(x.d))
          .join(", ")}`
      );
      const piores = [...alf.pontaria.porAlfinete]
        .sort((x, y) => x.areaCerta - y.areaCerta)
        .slice(0, 5);
      p();
      p(
        "    " +
          tabela([
            ["alfinete", "acerta", "vizinho errado", "nada"],
            ...piores.map((x) => [
              `#${x.indice}`,
              `${Math.round(x.areaCerta)}px²`,
              `${Math.round(x.areaErrada)}px²`,
              `${x.vazio * corrida.passo * corrida.passo}px²`,
            ]),
          ]).replace(/\n/g, "\n    ")
      );
    }

    if (ecra.aglomeracao?.niveis) {
      p();
      p("  AGLOMERAÇÃO POR NÍVEL DE APROXIMAÇÃO (distâncias em pixéis de ecrã)");
      p(
        "    " +
          tabela([
            [
              "cliques",
              "alfinetes",
              "nomes",
              "manchas",
              "<3px",
              "<6px",
              "<12px",
              "<24px",
              "vizinho+próximo",
            ],
            ...ecra.aglomeracao.niveis.map((n) => [
              n.cliques + (n.noLimite ? " (limite)" : ""),
              n.alfinetesNoEcra,
              n.nomesLidos,
              n.manchas,
              n.pares?.[3] ?? "—",
              n.pares?.[6] ?? "—",
              n.pares?.[12] ?? "—",
              n.pares?.[24] ?? "—",
              n.vizinhoMaisProximo
                ? `mín ${n2(n.vizinhoMaisProximo.min)} / med ${n2(n.vizinhoMaisProximo.p50)}`
                : "—",
            ]),
          ]).replace(/\n/g, "\n    ")
      );
    }

    if (ecra.alvoFoge?.alvos) {
      const af = ecra.alvoFoge;
      p();
      p("  O ALVO FOGE AO PONTEIRO");
      p(`    alvos medidos ..................... ${af.total}`);
      p(
        `    que já não estão sob o ponteiro ... ${af.fugiram} (${af.fugiramNomes} nomes, ${af.fugiramManchas} manchas)`
      );
      p(
        `    deslocamento ...................... mediana ${n1(af.deslocamento.p50)}px  máx ${n1(af.deslocamento.max)}px`
      );
      p();
      p(
        "    " +
          tabela([
            ["alvo", "deslocou", "ainda sob o ponteiro", "o que ficou por baixo"],
            ...af.piores.map((x) => [
              `${x.tipo} ${x.rotulo}`,
              `${n1(x.deslocou)}px`,
              x.aindaSob ? "sim" : "NÃO",
              x.sob ?? "—",
            ]),
          ]).replace(/\n/g, "\n    ")
      );
    }

    if (ecra.percursos?.percursos) {
      p();
      p("  ONDE É QUE UM CLIQUE LEVA");
      p(
        "    " +
          tabela([
            ["caminho", "o que aconteceu", "ficou em", "esperado"],
            ...ecra.percursos.percursos.map((x) => [
              x.nome,
              x.falha
                ? `não se pôde medir: ${x.falha.split("\n")[0].slice(0, 44)}`
                : [
                    x.navegou ? `navegou` : null,
                    x.abriuJanela ? `abriu a ficha de ${x.janelaDe ?? "?"}` : null,
                    x.fechouJanela ? "fechou a ficha" : null,
                    x.abriuPilha ? "abriu a pilha" : null,
                    x.abriuMancha ? "abriu a mancha" : null,
                    x.fechouLista ? "fechou a lista" : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "NADA",
              x.caminho,
              x.esperado,
            ]),
          ]).replace(/\n/g, "\n    ")
      );
    }

    if (ecra.fluidez?.emRepouso) {
      const f = ecra.fluidez;
      p();
      p("  FLUIDEZ");
      p(`    desenhos em repouso (3s) ........ ${f.emRepouso.desenhos}  (tem de ser 0)`);
      p(`    desenhos fora do ecrã (2,5s) .... ${f.foraDoEcra.desenhos}  (tem de ser 0)`);
      p(`    desenhos com o separador escondido ${f.escondido.desenhos}  (tem de ser 0)`);
      p(
        `    arrasto ......................... ${f.arrasto.quadros} quadros em ${f.arrasto.ms}ms, ${n1(f.arrasto.quadrosPorSegundo)}/s`
      );
      p(
        `      intervalo entre quadros ....... med ${n1(f.arrasto.intervalos.p50)}ms  p95 ${n1(f.arrasto.intervalos.p95)}ms  máx ${n1(f.arrasto.intervalos.max)}ms`
      );
      p(`      chamadas por quadro ........... ${f.arrasto.desenhosPorQuadro}`);
      if (f.arrasto.caixas !== undefined) {
        p(
          `      leituras de geometria ......... ${f.arrasto.caixas} caixas + ${f.arrasto.deslocamentos} deslocamentos (${n1(f.arrasto.caixasPorQuadro)}+${n1(f.arrasto.deslocamentosPorQuadro)} por quadro)`
        );
        p(
          `      trabalho do motor ............. ${f.arrasto.layouts} layouts, ${f.arrasto.estilos} recálculos de estilo (${n1(f.arrasto.layoutsPorQuadro)}+${n1(f.arrasto.estilosPorQuadro)} por quadro)`
        );
        p(
          `      lixo alocado no gesto ......... ${f.arrasto.lixoKb}KB (${n1(f.arrasto.lixoPorQuadroKb)}KB por quadro)`
        );
      }
      if (f.passeio) {
        p(
          `    passeio do rato ................. ${f.passeio.quadros} quadros em ${f.passeio.ms}ms`
        );
        p(
          `      leituras de geometria ......... ${f.passeio.caixas} caixas + ${f.passeio.deslocamentos} deslocamentos (${n1(f.passeio.caixasPorQuadro)}+${n1(f.passeio.deslocamentosPorQuadro)} por quadro)`
        );
        p(
          `      trabalho do motor ............. ${f.passeio.layouts} layouts, ${f.passeio.estilos} recálculos de estilo`
        );
      }
      p(
        `    aproximação ..................... ${f.zoom.quadros} quadros em ${f.zoom.ms}ms, ${n1(f.zoom.quadrosPorSegundo)}/s`
      );
      p(
        `      intervalo entre quadros ....... med ${n1(f.zoom.intervalos.p50)}ms  p95 ${n1(f.zoom.intervalos.p95)}ms  máx ${n1(f.zoom.intervalos.max)}ms`
      );
      if (f.zoom.caixas !== undefined) {
        p(
          `      leituras de geometria ......... ${f.zoom.caixas} caixas + ${f.zoom.deslocamentos} deslocamentos (${n1(f.zoom.caixasPorQuadro)}+${n1(f.zoom.deslocamentosPorQuadro)} por quadro)`
        );
        p(
          `      trabalho do motor ............. ${f.zoom.layouts} layouts, ${f.zoom.estilos} recálculos de estilo`
        );
      }
    }

    if (ecra.escolha && !ecra.escolha.falhou) {
      const e = ecra.escolha;
      p();
      p("  A ESCOLHA (clicar num nome, com a navegação cortada de propósito)");
      p(`    movimento preferido pelo sistema . ${e.parado ? "reduzido" : "normal"}`);
      p(`    nome escolhido ................... ${(e.alvo || "").slice(0, 46)}`);
      p(`    houve transição .................. ${e.houveTransicao ? "sim" : "NÃO"}`);
      p(`    durou ............................ ${e.duracaoMs}ms`);
      p(`    animações juntas, no pior quadro . ${e.maxAnimacoesJuntas}  (um movimento, não três)`);
      if (e.animacoes.length) p(`    quais ............................ ${e.animacoes.join(", ")}`);
      p(
        `    o resto recuou até .............. ${e.somaOutrasMinima ?? "—"} de opacidade somada, ${e.outrasMinimas ?? "—"} nomes`
      );
      p(`    limpou quando a página não veio .. ${e.limpou ? "sim" : "NÃO"}`);
      p(`    nomes visíveis no fim ............ ${e.outrasNoFim}`);
      p(`    desenhos gastos .................. ${e.desenhos}`);
    }

    if (ecra.teclado?.tabulacao) {
      const t = ecra.teclado;
      p();
      p("  TECLADO");
      p(
        `    paragens de tabulação no globo ... ${t.tabulacao.paragens} (${t.tabulacao.comandos} comandos, ${t.tabulacao.nomes} nomes)`
      );
      p(`    sem contorno de foco ............. ${t.tabulacao.semContorno}`);
      p(`    paragens fora da lona ............ ${t.tabulacao.foraDaLona}`);
      p(`    setas: coudelarias alcançadas .... ${t.setas.distintos} de ${t.setas.total}`);
      p(`    setas: foco perdido .............. ${t.setas.focoPerdido}`);
      p(`    setas: foco em nome ilegível ..... ${t.setas.comFocoInvisivel}`);
    }

    if (ecra.janelaUtil?.fixos) {
      const j = ecra.janelaUtil;
      p();
      p("  JANELA ÚTIL (com o aviso de cookies por responder)");
      p(`    elementos fixos por cima ......... ${j.fixos.length}`);
      for (const f of j.fixos.slice(0, 4)) {
        p(`      · ${f.classe} — ${Math.round(f.caixa.l)}×${Math.round(f.caixa.a)}px`);
      }
      p(
        `    nomes legíveis ................... ${j.nomesLidos} (com o globo livre: ${ecra.repouso?.nomesLidos ?? "—"})`
      );
      p(`    manchas .......................... ${j.manchas ?? "—"}`);
      p(`    nomes tapados por um fixo ........ ${j.tapados.length}`);
      if (j.depoisDeResponder) {
        p(
          `    depois de responder .............. ${j.depoisDeResponder.nomesLidos} nomes, ${j.depoisDeResponder.manchas} manchas, aviso saiu: ${j.depoisDeResponder.avisoSaiu ? "sim" : "NÃO"}`
        );
      }
      for (const x of j.tapados.slice(0, 5)) {
        p(`      · ${x.nome} tapado por ${x.por} (${Math.round(x.area)}px²)`);
      }
    }

    if (ecra.robustez?.casos) {
      p();
      p("  ROBUSTEZ");
      p(
        "    " +
          tabela([
            ["caso", "resultado", "globo vivo"],
            ...ecra.robustez.casos.map((c) => [
              c.nome,
              c.falha
                ? `FALHOU: ${c.falha.slice(0, 50)}`
                : [
                    c.navegou ? `navegou para ${c.caminho}` : null,
                    c.abriuJanela ? "abriu janela" : null,
                    c.fechouJanela ? "fechou janela" : null,
                    c.extra !== null && c.extra !== undefined ? JSON.stringify(c.extra) : null,
                  ]
                    .filter(Boolean)
                    .join("; ") || "nada",
              c.vivo ? "sim" : "NÃO",
            ]),
          ]).replace(/\n/g, "\n    ")
      );
    }

    const achados = julgar(ecra);
    p();
    p(
      `  ACHADOS — ${achados.filter((x) => x.nivel === GRAVE).length} graves, ${achados.filter((x) => x.nivel === AVISO).length} avisos`
    );
    for (const x of achados) p(`    [${x.nivel}] ${x.texto}`);
    p();
  }

  if (corrida.variacao) {
    p("─".repeat(78));
    p("  VARIAÇÃO ENTRE CORRIDAS");
    p("─".repeat(78));
    p("  O mesmo núcleo (repouso + varrimento) medido várias vezes, cada uma");
    p("  numa página nova. Uma medida que varia sozinha não serve para julgar");
    p("  uma alteração: é preciso saber de quanto.");
    p();
    for (const [ecra, linhas] of Object.entries(corrida.variacao)) {
      p(`  ${ecra}`);
      p(
        "    " +
          tabela([
            ["grandeza", ...linhas.repeticoes.map((_, i) => `#${i + 1}`), "varia?"],
            ...linhas.grandezas.map((g) => [
              g.nome,
              ...g.valores.map((v) => (v === null ? "—" : String(v))),
              g.estavel ? "não" : `SIM (${g.amplitude})`,
            ]),
          ]).replace(/\n/g, "\n    ")
      );
      p();
    }
  }

  return L.join("\n");
}

/* ── Comparar duas corridas ─────────────────────────────────────────────── */

/** As grandezas que se seguem de corrida para corrida. */
export function grandezas(ecra) {
  const r = ecra.repouso ?? {};
  const alf = r.alfinetes;
  const n0 = ecra.aglomeracao?.niveis?.[0];
  const f = ecra.fluidez;
  const t = ecra.teclado;
  return {
    "nomes legíveis": r.nomesLidos ?? null,
    "coudelarias contadas": r.contadas ?? null,
    "nomes sobrepostos": r.entreNomes?.length ?? null,
    "nomes fora da lona": r.foraDaLona?.length ?? null,
    "nomes cortados": r.cortados?.length ?? null,
    "alfinetes no ecrã": alf?.centros.length ?? null,
    "raio de toque": alf?.raioDeToque ? Number(alf.raioDeToque.toFixed(1)) : null,
    "pares <3px": n0?.pares?.[3] ?? null,
    "pares <6px": n0?.pares?.[6] ?? null,
    "pares <12px": n0?.pares?.[12] ?? null,
    "alfinetes sem área": alf?.pontaria.semNada ?? null,
    "alfinetes com área roubada": alf?.pontaria.comErro ?? null,
    "área de acerto mínima": alf ? Math.round(alf.pontaria.areaCerta.min) : null,
    "desenhos em repouso": f?.emRepouso.desenhos ?? null,
    "desenhos fora do ecrã": f?.foraDoEcra.desenhos ?? null,
    "desenhos escondido": f?.escondido.desenhos ?? null,
    "quadros no arrasto": f?.arrasto.quadros ?? null,
    "ms/quadro no arrasto (p50)": f ? Number(n1(f.arrasto.intervalos.p50)) : null,
    "alvos que fogem ao ponteiro": ecra.alvoFoge?.fugiram ?? null,
    "caixas lidas no arrasto": f?.arrasto.caixas ?? null,
    "layouts no arrasto": f?.arrasto.layouts ?? null,
    "caixas lidas no passeio": f?.passeio?.caixas ?? null,
    "layouts no passeio": f?.passeio?.layouts ?? null,
    "KB alocados por quadro (arrasto)": f?.arrasto.lixoPorQuadroKb ?? null,
    "animações juntas na escolha": ecra.escolha?.maxAnimacoesJuntas ?? null,
    "transição de escolha": ecra.escolha ? (ecra.escolha.houveTransicao ? 1 : 0) : null,
    "nomes acesos no pior instante da escolha": ecra.escolha?.outrasMinimas ?? null,
    "coudelarias pelas setas": t?.setas.distintos ?? null,
    "paragens de tabulação": t?.tabulacao.paragens ?? null,
  };
}

export function compararCorridas(antes, depois) {
  const L = [];
  const p = (s = "") => L.push(s);
  p("═".repeat(78));
  p("  COMPARAÇÃO");
  p("═".repeat(78));
  p(`  antes .... ${antes.nome}  (${antes.quando})`);
  p(`  depois ... ${depois.nome}  (${depois.quando})`);
  p();
  p("  Lembrete: os milissegundos só valem se as duas corridas forem da mesma");
  p("  máquina. As contagens valem sempre.");
  p();

  for (const e of depois.ecras) {
    const a = antes.ecras.find((x) => x.nome === e.nome);
    if (!a) continue;
    const ga = grandezas(a);
    const gd = grandezas(e);
    p(`  ${e.nome.toUpperCase()}`);
    p(
      "    " +
        tabela([
          ["grandeza", "antes", "depois", "delta"],
          ...Object.keys(gd).map((k) => {
            const x = ga[k];
            const y = gd[k];
            const d = x === null || y === null ? "—" : y - x;
            return [
              k,
              x ?? "—",
              y ?? "—",
              typeof d === "number" ? (d > 0 ? `+${n2(d)}` : n2(d)) : d,
            ];
          }),
        ]).replace(/\n/g, "\n    ")
    );
    p();

    const antesAchados = new Map(julgar(a).map((x) => [x.chave, x]));
    const depoisAchados = new Map(julgar(e).map((x) => [x.chave, x]));
    const novos = [...depoisAchados.values()].filter((x) => !antesAchados.has(x.chave));
    const idos = [...antesAchados.values()].filter((x) => !depoisAchados.has(x.chave));
    p(`    achados novos: ${novos.length}`);
    for (const x of novos) p(`      + [${x.nivel}] ${x.texto}`);
    p(`    achados resolvidos: ${idos.length}`);
    for (const x of idos) p(`      − [${x.nivel}] ${x.texto}`);
    p();
  }
  return L.join("\n");
}
