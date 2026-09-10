# Os 99 campos do formulário de publicar anúncio

Inventário campo a campo, com o destino de cada um e a razão. As contagens
foram reproduzidas do código, não estimadas — e `__tests__/lib/campos-do-anuncio.test.ts`
volta a reproduzi-las a cada `vitest run`, para que não encolham em silêncio.

## O problema, medido

| O quê                                                       | Quantos |
| ----------------------------------------------------------- | ------- |
| Campos em `FormData` (`components/vender-cavalo/types.ts`)  | **99**  |
| Chaves no pedido de checkout (`app/vender-cavalo/page.tsx`) | **104** |
| Colunas escritas pelo webhook, antes deste trabalho         | **30**  |
| Colunas em `cavalos_venda` na base viva, antes              | **53**  |
| Respostas do vendedor que chegavam a uma coluna             | **19**  |
| Respostas do vendedor que eram deitadas fora                | **80**  |

As 104 chaves são as 99 respostas mais cinco que a página acrescenta: `idade`
(calculada de `data_nascimento`), `documentosEmDia` (derivada), `imageUrls` (as
fotografias, que não são campo do formulário) e dois nomes duplicados —
`linhagem` e `registoAPSL` viajam ao lado de `linhagemPrincipal` e
`numeroRegisto` porque o webhook lia os primeiros.

As 30 colunas escritas são 29 pares `chave: valor` mais `slug`, que vai
abreviado.

### Onde a contagem difere do enunciado

O enunciado deste trabalho falava em 62 colunas, 103 chaves e 76 campos
deitados fora. Reproduzida do código, a contagem dá 53 colunas na base viva,
104 chaves e 80 campos sem destino. As diferenças, todas explicadas:

- **62 contra 53 colunas.** As 62 são a união de duas fontes que divergem:
  `lib/database.types.ts` (gerado, e **velho** — declara `raca`, `nome_cavalo`,
  `image_url`, `nivel`, `pontuacao_apsl` e `contacto_nome/email/telefone`, que a
  base não tem) mais as colunas de `ALTER TABLE` das migrações posteriores. A
  base viva tem 53. Isto não é um pormenor de contagem: é a razão pela qual o
  teste `colunas-supabase` não apanha o `raca` em falta — ver o achado no fim
  deste ficheiro.
- **103 contra 104 chaves.** `imageUrls` vai abreviada (`imageUrls,` em vez de
  `imageUrls: …`) e escapa a uma contagem por `chave:`.
- **76 contra 80 campos.** Depende do que conte como «chegar». Aqui a regra é
  estrita: **um campo chega quando o seu próprio valor é escrito numa coluna.**
  Por essa regra são 80, e os quatro de diferença são campos cujo valor é
  reduzido a outra coisa e perdido:
  - `data_nascimento` vira `idade`, que é uma conta que envelhece um ano por
    ano — a data em si não era guardada, apesar de a coluna existir;
  - `vacinacao_atualizada` e `desparasitacao_atualizada` são reduzidas a um E
    lógico em `documentos_em_dia`: «vacinação sim, desparasitação não» ficava
    indistinguível de «nenhuma das duas»;
  - `numero_registo` chega (a `registro_apsl`) e por isso conta como chegado,
    mas o seu segundo nome `numeroRegisto` não é lido por ninguém.

## Os quatro destinos, e o critério

1. **Coluna própria** — quando o valor tem de ser alcançável por um `WHERE` ou
   um `ORDER BY` do PostgREST. Ou já é filtro hoje, ou é da mesma classe dos que
   já são coluna (`sexo`, `idade`, `altura`, `preco`, `regiao`, `nivel_treino`,
   `disciplinas`). O peso é da classe da altura; a raça, da pelagem; `uso_atual`,
   de `disciplinas`.

2. **Bloco `jsonb`** — quando o bloco se lê inteiro na ficha e nenhum campo
   isolado é chave de pesquisa. Um `jsonb` continua a ser filtrável
   (`comportamento->>'apto_criancas' = 'true'`), por isso agrupar não fecha
   nenhuma porta: evita 45 colunas que ninguém consultaria uma a uma.

3. **Tabela à parte** — para a ascendência. Oito colunas de avós resolvem duas
   gerações e mais nenhuma; um caminho (`pai.mae`) resolve as que vierem sem
   outra migração. E é uma árvore, não uma lista de campos.

4. **Não guardar em `cavalos_venda`** — três campos, e a razão é a mesma para os
   três, medida e não de gosto: a política `cavalos_venda_select_active` não tem
   papel nenhum atribuído, e o RLS do Postgres é por linha, não por coluna.
   **Tudo o que entrar nesta tabela fica legível por qualquer pessoa assim que o
   anúncio for aprovado.** Continuam guardados em `contact_submissions.form_data`,
   cujas duas únicas políticas exigem `service_role` — que é onde o
   administrador e a factura os querem.

## A tabela

Legenda da coluna «destino»:

- **já chegava** — nada muda;
- **coluna** — coluna própria, nova na migração `20260902000002`;
- **coluna (existia)** — a coluna já lá estava e nunca era escrita;
- **`bloco`** — chave dentro de um `jsonb`;
- **árvore** — linha em `cavalos_venda_ascendentes`;
- **não guardar** — fica só em `contact_submissions`.

### Proprietário

| Campo do formulário     | Tipo     | Chave no checkout      | Destino                          | Razão                                                                         |
| ----------------------- | -------- | ---------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `proprietario_nome`     | `string` | `proprietarioNome`     | já chegava → `vendedor_nome`     | —                                                                             |
| `proprietario_email`    | `string` | `proprietarioEmail`    | já chegava → `vendedor_email`    | vai ao Stripe como `customer_email` e volta em `session.customer_details`     |
| `proprietario_telefone` | `string` | `proprietarioTelefone` | já chegava → `vendedor_telefone` | —                                                                             |
| `proprietario_whatsapp` | `string` | `proprietarioWhatsapp` | já chegava → `vendedor_whatsapp` | com recurso ao telefone quando vazio                                          |
| `proprietario_nif`      | `string` | `proprietarioNif`      | **não guardar**                  | dado fiscal; a tabela é pública quando o anúncio está activo                  |
| `proprietario_morada`   | `string` | `proprietarioMorada`   | **não guardar**                  | dado fiscal, e o Stripe já recolhe a morada de facturação                     |
| `tipo_proprietario`     | `string` | `tipoProprietario`     | coluna `vendedor_tipo`           | particular / profissional / coudelaria é a primeira coisa que se quer filtrar |
| `pais_proprietario`     | `string` | `paisProprietario`     | coluna `vendedor_pais`           | par com `exportacao_possivel`: um comprador de fora precisa de saber          |
| `website_coudelaria`    | `string` | `websiteCoudelaria`    | coluna `vendedor_website`        | é um link na ficha                                                            |

### Identificação

| Campo               | Tipo     | Chave                           | Destino                      | Razão                                                                        |
| ------------------- | -------- | ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `nome`              | `string` | `nomeCavalo`                    | já chegava → `nome`          | —                                                                            |
| `nome_registo`      | `string` | `nomeRegisto`                   | coluna `nome_registo`        | o nome oficial no livro; distingue homónimos                                 |
| `numero_registo`    | `string` | `numeroRegisto` + `registoAPSL` | já chegava → `registro_apsl` | —                                                                            |
| `microchip`         | `string` | `microchip`                     | coluna `microchip`           | identidade do animal, e a única chave para apanhar o mesmo cavalo duas vezes |
| `passaporte_equino` | `string` | `passaporteEquino`              | coluna `passaporte_equino`   | documento; par do microchip                                                  |
| `raca_confirmada`   | `string` | `racaConfirmada`                | coluna `raca`                | **`app/api/cavalos` já a pede e a base não a tem** — ver o achado no fim     |
| `pais_nascimento`   | `string` | `paisNascimento`                | coluna `pais_nascimento`     | PT, BR ou ES é um dado de mercado e de preço                                 |
| `peso`              | `string` | `peso`                          | coluna `peso_kg` (`numeric`) | da classe da altura, que já é coluna filtrável                               |
| `cor_olhos`         | `string` | `corOlhos`                      | `morfologia`                 | lê-se com as outras cores; ninguém filtra por olhos                          |
| `cor_crina`         | `string` | `corCrina`                      | `morfologia`                 | idem                                                                         |
| `nivel_apsl`        | `string` | `nivelApsl`                     | coluna `nivel_apsl`          | o grau Ouro/Prata é o dado a que o dourado do site se reserva                |

### Linhagem

| Campo                     | Tipo     | Chave                            | Destino                            | Razão                                                         |
| ------------------------- | -------- | -------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| `pai_nome`                | `string` | `pai`                            | já chegava → `pai`, e árvore `pai` | a coluna fica: é ela que o cartão e o `<Pedigree>` lêem       |
| `pai_registo`             | `string` | `paiRegisto`                     | árvore `pai`                       | não tinha sítio nenhum                                        |
| `mae_nome`                | `string` | `mae`                            | já chegava → `mae`, e árvore `mae` | —                                                             |
| `mae_registo`             | `string` | `maeRegisto`                     | árvore `mae`                       | —                                                             |
| `avo_paterno_nome`        | `string` | `avoPaterno`                     | árvore `pai.pai`                   | oito colunas resolviam duas gerações; um caminho resolve N    |
| `avo_paterno_registo`     | `string` | `avoPaternoRegisto`              | árvore `pai.pai`                   | —                                                             |
| `avo_paterno_mae_nome`    | `string` | `avoPaternoMae`                  | árvore `pai.mae`                   | —                                                             |
| `avo_paterno_mae_registo` | `string` | `avoPaternoMaeRegisto`           | árvore `pai.mae`                   | —                                                             |
| `avo_materno_nome`        | `string` | `avoMaterno`                     | árvore `mae.pai`                   | —                                                             |
| `avo_materno_registo`     | `string` | `avoMaternoRegisto`              | árvore `mae.pai`                   | —                                                             |
| `avo_materno_mae_nome`    | `string` | `avoMaternoMae`                  | árvore `mae.mae`                   | —                                                             |
| `avo_materno_mae_registo` | `string` | `avoMaternoMaeRegisto`           | árvore `mae.mae`                   | —                                                             |
| `linhagem_principal`      | `string` | `linhagem` + `linhagemPrincipal` | já chegava → `linhagem`            | o par corrigido que deu origem a este trabalho                |
| `coudelaria_origem`       | `string` | `coudelariaOrigem`               | coluna `coudelaria_origem`         | texto livre; `coudelaria_id` só serve quem está no directório |

### Características

| Campo                | Tipo      | Chave                      | Destino                                | Razão                                                                       |
| -------------------- | --------- | -------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `data_nascimento`    | `string`  | `dataNascimento` + `idade` | **coluna (existia)** `data_nascimento` | a coluna existia e nunca era escrita; só se guardava a idade, que envelhece |
| `sexo`               | `string`  | `sexo`                     | já chegava → `sexo`                    | —                                                                           |
| `pelagem`            | `string`  | `pelagem`                  | já chegava → `cor`                     | —                                                                           |
| `altura`             | `string`  | `altura`                   | já chegava → `altura`                  | —                                                                           |
| `temperamento`       | `string`  | `temperamento`             | coluna `temperamento`                  | separa o cavalo de amador do de profissional; classe de `nivel_treino`      |
| `marcas_distintivas` | `string`  | `marcasDistintivas`        | `morfologia`                           | texto livre lido com as cores                                               |
| `cor_casco`          | `string`  | `corCasco`                 | `morfologia`                           | idem                                                                        |
| `prova_aptidao_apsl` | `boolean` | `provaAptidaoApsl`         | coluna `prova_aptidao_apsl`            | é um distintivo no cartão, e um distintivo tem de ser filtrável             |

### Treino e competição

| Campo             | Tipo       | Chave            | Destino                                   | Razão                                                    |
| ----------------- | ---------- | ---------------- | ----------------------------------------- | -------------------------------------------------------- |
| `nivel_treino`    | `string`   | `nivelTreino`    | já chegava → `nivel_treino`               | —                                                        |
| `anos_treino`     | `string`   | `anosTreino`     | coluna `anos_treino`                      | ordenável; classe de `idade`                             |
| `nivel_cavaleiro` | `string`   | `nivelCavaleiro` | coluna `nivel_cavaleiro`                  | «apto a cavaleiro iniciado» é uma pesquisa a sério       |
| `treinador_atual` | `string`   | `treinadorAtual` | `treino`                                  | crédito profissional, lê-se com os outros                |
| `ginete_habitual` | `string`   | `gineteHabitual` | `treino`                                  | idem                                                     |
| `uso_atual`       | `string[]` | `usoAtual`       | coluna `uso_atual` (`text[]`)             | classe de `disciplinas`, que já é `text[]` e já é filtro |
| `disciplinas`     | `string[]` | `disciplinas`    | já chegava → `disciplinas`                | —                                                        |
| `competicoes`     | `string`   | `competicoes`    | `treino`                                  | texto livre                                              |
| `premios`         | `string`   | `premios`        | **coluna (existia)** `premios` (`text[]`) | a coluna existia e nunca era escrita                     |

`premios` é o único campo em que a forma muda: o formulário dá uma linha de
texto e a coluna é `text[]`. Parte-se por linha e por ponto-e-vírgula, **e não
por vírgula** — «Campeão Nacional, 2023» é um prémio só, e parti-lo pela
vírgula publicava dois, um deles chamado «2023». Ver a proposta ao formulário
no fim deste ficheiro.

### Comportamento e maneabilidade → `comportamento`

Os oito são booleanos e vão todos para o mesmo bloco: lêem-se como uma lista de
«sim/não» na ficha, e nenhum é chave de pesquisa isolada. `apto_criancas` é o
candidato óbvio a coluna própria e continua no bloco de propósito — um
`comportamento->>'apto_criancas' = 'true'` filtra na mesma, e tirá-lo dali
partia o bloco que a ficha lê.

| Campo                   | Chave                  |
| ----------------------- | ---------------------- |
| `habituado_transporte`  | `habituadoTransporte`  |
| `habituado_ferrador`    | `habituadoFerrador`    |
| `habituado_veterinario` | `habituadoVeterinario` |
| `trabalha_em_grupo`     | `trabalhaEmGrupo`      |
| `trabalha_solto`        | `trabalhaSolto`        |
| `trabalha_a_mao`        | `trabalhaAMao`         |
| `habituado_campo`       | `habituadoCampo`       |
| `apto_criancas`         | `aptoCriancas`         |

### Maneio → `maneio`

| Campo                   | Tipo      | Chave                 |
| ----------------------- | --------- | --------------------- |
| `regime_estabulacao`    | `string`  | `regimeEstabulacao`   |
| `tipo_alimentacao`      | `string`  | `tipoAlimentacao`     |
| `horas_trabalho_semana` | `string`  | `horasTrabalhoSemana` |
| `teste_dna_realizado`   | `boolean` | `testeDnaRealizado`   |
| `seguro_equino`         | `boolean` | `seguroEquino`        |

### Saúde → `saude`

| Campo                        | Tipo      | Chave                      | Nota                                                    |
| ---------------------------- | --------- | -------------------------- | ------------------------------------------------------- |
| `estado_saude`               | `string`  | `estadoSaude`              |                                                         |
| `vacinacao_atualizada`       | `boolean` | `vacinacaoAtualizada`      | era reduzida a um E lógico em `documentos_em_dia`       |
| `data_ultima_vacinacao`      | `string`  | `dataUltimaVacinacao`      |                                                         |
| `desparasitacao_atualizada`  | `boolean` | `desparasitacaoAtualizada` | idem                                                    |
| `data_ultima_desparasitacao` | `string`  | `dataUltimaDesparasitacao` |                                                         |
| `exame_veterinario`          | `boolean` | `exameVeterinario`         |                                                         |
| `radiografias_disponivel`    | `boolean` | `radiografiasDisponivel`   |                                                         |
| `piroplasmose_testado`       | `boolean` | `piroplasmoseTestado`      |                                                         |
| `data_ultima_ferragem`       | `string`  | `dataUltimaFerragem`       |                                                         |
| `tipo_ferragem`              | `string`  | `tipoFerragem`             |                                                         |
| `historico_lesoes`           | `string`  | `historicoLesoes`          |                                                         |
| `observacoes_saude`          | `string`  | `observacoesSaude`         |                                                         |
| `nome_veterinario`           | `string`  | `nomeVeterinario`          | **não guardar** — nome de um terceiro que não consentiu |

### Venda

| Campo                       | Tipo      | Chave                     | Destino                                    | Razão                                                                                         |
| --------------------------- | --------- | ------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `preco`                     | `string`  | `preco`                   | já chegava → `preco`                       | —                                                                                             |
| `negociavel`                | `boolean` | `precoNegociavel`         | já chegava → `preco_negociavel`            | —                                                                                             |
| `regiao`                    | `string`  | `regiao`                  | já chegava → `regiao`                      | —                                                                                             |
| `localizacao`               | `string`  | `localizacao`             | já chegava → `localizacao`                 | —                                                                                             |
| `aceita_troca`              | `boolean` | `aceitaTroca`             | **coluna (existia)** `aceita_troca`        | a coluna existia, o vendedor da área de conta podia editá-la, e a publicação nunca a escrevia |
| `transporte_incluido`       | `boolean` | `transporteIncluido`      | **coluna (existia)** `transporte_incluido` | idem                                                                                          |
| `trial_possivel`            | `boolean` | `trialPossivel`           | `condicoes_venda`                          | bloco de negociação, lido inteiro                                                             |
| `duracao_trial`             | `string`  | `duracaoTrial`            | `condicoes_venda`                          |                                                                                               |
| `financiamento_possivel`    | `boolean` | `financiamentoPossivel`   | `condicoes_venda`                          |                                                                                               |
| `exportacao_possivel`       | `boolean` | `exportacaoPossivel`      | `condicoes_venda`                          |                                                                                               |
| `acompanhamento_pos_venda`  | `boolean` | `acompanhamentoPosVenda`  | `condicoes_venda`                          |                                                                                               |
| `internato_possivel`        | `boolean` | `internatoPossivel`       | `condicoes_venda`                          |                                                                                               |
| `aulas_incluidas`           | `boolean` | `aulasIncluidas`          | `condicoes_venda`                          |                                                                                               |
| `disponivel_cobricao`       | `boolean` | `disponivelCobricao`      | `condicoes_venda`                          | a cobrição é outro produto, não é este preço                                                  |
| `preco_cobricao`            | `string`  | `precoCobricao`           | `condicoes_venda`                          | é um preço, mas não é aquele por que se ordena a listagem                                     |
| `disponibilidade_visita`    | `string`  | `disponibilidadeVisita`   | `condicoes_venda`                          |                                                                                               |
| `motivo_venda`              | `string`  | `motivoVenda`             | `condicoes_venda`                          |                                                                                               |
| `aceita_visita_veterinario` | `boolean` | `aceitaVisitaVeterinario` | `condicoes_venda`                          |                                                                                               |
| `equipamento_incluido`      | `string`  | `equipamentoIncluido`     | `condicoes_venda`                          |                                                                                               |

### Descrição

| Campo          | Tipo     | Chave        | Destino                          | Razão                                                                           |
| -------------- | -------- | ------------ | -------------------------------- | ------------------------------------------------------------------------------- |
| `descricao`    | `string` | `descricao`  | já chegava → `descricao`         | —                                                                               |
| `videos_url`   | `string` | `videosUrl`  | **coluna (existia)** `video_url` | a coluna existia e nunca era escrita: os dois vídeos perdiam-se                 |
| `videos_url_2` | `string` | `videosUrl2` | coluna `video_url_2`             | `video_url` já é contrato com a área do vendedor; o formulário pede dois, não N |

## Contas finais

| Destino                                 | Campos |
| --------------------------------------- | ------ |
| Já chegavam                             | 19     |
| Coluna própria nova                     | 17     |
| Coluna que já existia e não era escrita | 5      |
| Bloco `jsonb` (6 blocos)                | 45     |
| `cavalos_venda_ascendentes`             | 10     |
| Não guardados em `cavalos_venda`        | 3      |
| **Total**                               | **99** |

`cavalos_venda` passa de 53 para 76 colunas.

## Achados pelo caminho

### `app/api/cavalos` pede uma coluna que a base não tem

O `.select(...)` da listagem pública inclui `raca`. A base viva não tem essa
coluna: o PostgREST devolve 42703, `data` vem a `null` e a listagem fica vazia.

Passou despercebido porque `__tests__/lib/colunas-supabase.test.ts` tira a
autoridade de `lib/database.types.ts`, que está velho: declara `raca`,
`nome_cavalo`, `image_url`, `nivel`, `pontuacao_apsl` e
`contacto_nome/email/telefone`, que a base não tem, e não conhece 15 colunas que
ela tem. **O ficheiro gerado precisa de ser regerado**; enquanto não for, aquele
teste tem um ponto cego do tamanho da diferença entre as duas.

A migração `20260902000002` cria `raca` — que é o destino do campo
`raca_confirmada` do formulário —, o que fecha este defeito pelo lado certo.

### A ficha do cavalo lê seis colunas com o nome errado

`app/comprar/[id]/page.tsx` faz `select("*")` e lê `cavalo.contacto_nome`,
`contacto_email`, `contacto_telefone`, `pelagem`, `nivel` e `pontuacao_apsl`. As
colunas na base chamam-se `vendedor_nome`, `vendedor_email`, `vendedor_telefone`,
`cor` e `nivel_treino`; `pontuacao_apsl` não existe de todo.

É o mesmo defeito da linhagem, com outra cara e mais caro: **o bloco de contacto
do vendedor nunca aparece**, o botão de telefone e o de WhatsApp não se
desenham, e o `mailto:` cai para `geral@portal-lusitano.pt`. Num classificados,
o contacto é a única coisa que a página tem de fazer. A página já normalizava
dois nomes (`nome_cavalo` e `image_url`) e pararam aí.

## Propostas ao formulário

Os ficheiros de `components/vender-cavalo/**` e `app/vender-cavalo/**` estão
fora do alcance deste trabalho. Ficam descritas as três mudanças que ele pediria:

1. **`premios` devia ser um `<textarea>`, um prémio por linha.** A coluna é
   `text[]` e o campo é uma linha de texto: hoje, o que se guarda é uma lista de
   um elemento. Com uma linha por prémio, a lista guarda-se inteira sem
   adivinhar separadores.

2. **`proprietario_morada` devia sair.** O checkout já pede a morada de
   facturação ao Stripe (`billing_address_collection: "auto"`). Pedi-la duas
   vezes é pedir duas vezes o mesmo, e a segunda não vai para lado nenhum.

3. **`nome_veterinario` devia sair, ou passar a «seguido por veterinário:
   sim/não».** O nome de um terceiro não se publica sem consentimento, e o
   comprador que quiser confirmar fá-lo depois do contacto. O sinal útil — que
   há acompanhamento — cabe num booleano que pode ir para `saude`.

O `proprietario_nif` fica: a factura precisa dele, e ele já está guardado onde
deve, em `contact_submissions`.
