# Provas de escrita da migração dos campos do formulário de venda.
#
# Estavam dentro do `validar.sh`, e por isso qualquer outra migração que
# passasse pelo guião falhava aqui — não por estar errada, mas por não ter
# `cavalos_venda_ascendentes` nenhuma onde escrever. Saíram para um ficheiro
# com o nome da migração a que pertencem; o conteúdo é o mesmo, letra por letra.
#
# Corre com `DB` e `PSQL` herdados do `validar.sh`, e com o `set -e` dele.

echo "== um anúncio com todos os blocos =="
"${PSQL[@]}" -d "$DB" -c "
INSERT INTO public.cavalos_venda
  (nome, slug, sexo, raca, peso_kg, anos_treino, uso_atual, prova_aptidao_apsl,
   morfologia, comportamento, saude, condicoes_venda)
VALUES
  ('Ulisses','ulisses-prova','Garanhão','Lusitano',512.5,7,
   ARRAY['Lazer','Competição'],true,
   '{\"cor_olhos\":\"Castanho\"}'::jsonb,
   '{\"apto_criancas\":false,\"habituado_campo\":true}'::jsonb,
   '{\"vacinacao_atualizada\":false}'::jsonb,
   '{\"exportacao_possivel\":true,\"preco_cobricao\":800}'::jsonb);" >/dev/null

"${PSQL[@]}" -d "$DB" -c "
INSERT INTO public.cavalos_venda_ascendentes (cavalo_id, caminho, geracao, nome, registo)
SELECT id, 'pai', 1, 'Rubi', 'PSL-1234' FROM public.cavalos_venda
WHERE slug='ulisses-prova';" >/dev/null

echo "o \`false\` do vendedor sobrevive à ida e volta:"
"${PSQL[@]}" -d "$DB" -At -c "
  SELECT '  apto_criancas=' || (comportamento->>'apto_criancas')
       || ' vacinacao=' || (saude->>'vacinacao_atualizada')
       || ' peso=' || peso_kg || ' usos=' || array_length(uso_atual,1)
  FROM public.cavalos_venda WHERE slug='ulisses-prova';"

echo
echo "== o que as restrições têm de recusar =="
if "${PSQL[@]}" -d "$DB" -c "
  INSERT INTO public.cavalos_venda_ascendentes (cavalo_id, caminho, geracao, nome)
  SELECT id, 'pai', 1, 'Outro' FROM public.cavalos_venda
  WHERE slug='ulisses-prova';" >/dev/null 2>&1; then
  echo "  FALHA: o caminho repetido foi aceite"; exit 1
fi
echo "  caminho repetido: recusado"

if "${PSQL[@]}" -d "$DB" -c "
  INSERT INTO public.cavalos_venda_ascendentes (cavalo_id, caminho, geracao)
  SELECT id, 'mae', 1 FROM public.cavalos_venda
  WHERE slug='ulisses-prova';" >/dev/null 2>&1; then
  echo "  FALHA: o antepassado sem nome e sem registo foi aceite"; exit 1
fi
echo "  antepassado vazio: recusado"

echo
echo "== apagar o anúncio leva a árvore atrás =="
"${PSQL[@]}" -d "$DB" -c "DELETE FROM public.cavalos_venda WHERE slug='ulisses-prova';" >/dev/null
restantes=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT count(*) FROM public.cavalos_venda_ascendentes;")
[ "$restantes" = "0" ] || { echo "  FALHA: ficaram $restantes ascendentes órfãos"; exit 1; }
echo "  ascendentes restantes: 0"
