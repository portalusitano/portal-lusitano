# Provas de escrita da migração dos documentos do cavalo.
#
# O que se prova aqui, e o que **não** se prova.
#
# Prova-se o que é SQL: que a linha entra, que o estado inicial é
# `por_verificar` sem ninguém o escrever, que as restrições recusam um
# `verificado` sem autor e um `recusado` sem motivo, que o `jsonb` sobrevive à
# ida e volta, que apagar o anúncio leva os documentos atrás, e que a tabela
# fica com RLS ligada e zero políticas.
#
# **Não se prova que o balde é privado no Supabase.** O `storage.buckets` deste
# harness é um boneco (ver o fim do `esquema-vivo-cavalos-venda.sql`): guarda a
# coluna `public` e mais nada. Quem faz cumprir a privacidade é o serviço de
# armazenamento do Supabase, que aqui não corre. O que se prova é a linha —
# que a migração escreve `public = false` e que a volta a escrever mesmo que
# alguém a tenha posto a `true` entretanto, que é a parte da idempotência que
# interessa num balde com dados pessoais lá dentro.
#
# Corre com `DB` e `PSQL` herdados do `validar.sh`, e com o `set -e` dele.

echo "== o balde =="
"${PSQL[@]}" -d "$DB" -At -c "
  SELECT '  público=' || public || ' limite=' || file_size_limit
       || ' mimes=' || array_length(allowed_mime_types, 1)
  FROM storage.buckets WHERE id = 'documentos-cavalos';"

echo "  alguém o põe público, a migração seguinte repõe-no:"
"${PSQL[@]}" -d "$DB" -c \
  "UPDATE storage.buckets SET public = true WHERE id = 'documentos-cavalos';" >/dev/null
"${PSQL[@]}" -d "$DB" -f "$MIGRACAO" >/dev/null
publico=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT public FROM storage.buckets WHERE id = 'documentos-cavalos';")
[ "$publico" = "f" ] || { echo "  FALHA: o balde ficou público"; exit 1; }
echo "  público=f"

echo
echo "== um documento acabado de chegar =="
"${PSQL[@]}" -d "$DB" -c "
INSERT INTO public.cavalos_venda (nome, slug, sexo)
VALUES ('Ulisses','ulisses-documentos','Garanhão');" >/dev/null

# Repare-se no que **não** se escreve: o `estado`. Quem o põe é a coluna, e é
# essa a garantia que interessa — uma rota distraída não consegue criar um
# documento já verificado por omissão.
"${PSQL[@]}" -d "$DB" -c "
INSERT INTO public.documentos_cavalo
  (cavalo_id, referencia, tipo, caminho, nome_original, mime, bytes, sha256, leitura, conflitos)
SELECT id,
       '3f7c1e2a-0000-4000-8000-000000000001',
       'livro_azul',
       '3f7c1e2a-0000-4000-8000-000000000001/livro_azul/aa.pdf',
       'livro azul.pdf',
       'application/pdf',
       204800,
       repeat('a', 64),
       '{\"origem\":\"pdf\",\"ueln\":\"620015000000001\"}'::jsonb,
       '[{\"campo\":\"microchip\",\"noFormulario\":\"1\",\"noDocumento\":\"2\"}]'::jsonb
FROM public.cavalos_venda WHERE slug='ulisses-documentos';" >/dev/null

"${PSQL[@]}" -d "$DB" -At -c "
  SELECT '  estado=' || estado
       || ' origem=' || (leitura->>'origem')
       || ' conflitos=' || jsonb_array_length(conflitos)
       || ' verificado_por=' || coalesce(verificado_por, '(nulo)')
  FROM public.documentos_cavalo;"

estado=$("${PSQL[@]}" -d "$DB" -At -c "SELECT estado FROM public.documentos_cavalo;")
[ "$estado" = "por_verificar" ] || { echo "  FALHA: o estado inicial é '$estado'"; exit 1; }

echo
echo "== um documento sem anúncio, que é o caso normal antes do pagamento =="
"${PSQL[@]}" -d "$DB" -c "
INSERT INTO public.documentos_cavalo
  (referencia, tipo, caminho, nome_original, mime, bytes, sha256)
VALUES ('3f7c1e2a-0000-4000-8000-000000000002', 'passaporte',
        '3f7c1e2a-0000-4000-8000-000000000002/passaporte/bb.jpg',
        'passaporte.jpg', 'image/jpeg', 51200, repeat('b', 64));" >/dev/null
echo "  cavalo_id nulo: aceite"

echo
echo "== o que as restrições têm de recusar =="
recusa() {
  local descricao="$1" sql="$2"
  if "${PSQL[@]}" -d "$DB" -c "$sql" >/dev/null 2>&1; then
    echo "  FALHA: $descricao foi aceite"; exit 1
  fi
  echo "  $descricao: recusado"
}

recusa "um verificado sem autor" "
  INSERT INTO public.documentos_cavalo
    (referencia, tipo, caminho, nome_original, mime, bytes, sha256, estado)
  VALUES ('r1','livro_azul','r1/livro_azul/c.pdf','c.pdf','application/pdf',1,repeat('c',64),'verificado');"

recusa "um recusado sem motivo" "
  INSERT INTO public.documentos_cavalo
    (referencia, tipo, caminho, nome_original, mime, bytes, sha256, estado)
  VALUES ('r2','livro_azul','r2/livro_azul/d.pdf','d.pdf','application/pdf',1,repeat('d',64),'recusado');"

recusa "um estado inventado" "
  INSERT INTO public.documentos_cavalo
    (referencia, tipo, caminho, nome_original, mime, bytes, sha256, estado)
  VALUES ('r3','livro_azul','r3/livro_azul/e.pdf','e.pdf','application/pdf',1,repeat('e',64),'quase');"

recusa "um tipo de documento inventado" "
  INSERT INTO public.documentos_cavalo
    (referencia, tipo, caminho, nome_original, mime, bytes, sha256)
  VALUES ('r4','factura','r4/factura/f.pdf','f.pdf','application/pdf',1,repeat('f',64));"

recusa "um MIME fora dos quatro" "
  INSERT INTO public.documentos_cavalo
    (referencia, tipo, caminho, nome_original, mime, bytes, sha256)
  VALUES ('r5','livro_azul','r5/livro_azul/g.svg','g.svg','image/svg+xml',1,repeat('1',64));"

recusa "um sha256 que não é um sha256" "
  INSERT INTO public.documentos_cavalo
    (referencia, tipo, caminho, nome_original, mime, bytes, sha256)
  VALUES ('r6','livro_azul','r6/livro_azul/h.pdf','h.pdf','application/pdf',1,'ABC');"

recusa "um ficheiro de zero bytes" "
  INSERT INTO public.documentos_cavalo
    (referencia, tipo, caminho, nome_original, mime, bytes, sha256)
  VALUES ('r7','livro_azul','r7/livro_azul/i.pdf','i.pdf','application/pdf',0,repeat('2',64));"

recusa "duas linhas para o mesmo caminho" "
  INSERT INTO public.documentos_cavalo
    (referencia, tipo, caminho, nome_original, mime, bytes, sha256)
  VALUES ('3f7c1e2a-0000-4000-8000-000000000002','passaporte',
          '3f7c1e2a-0000-4000-8000-000000000002/passaporte/bb.jpg',
          'outro.jpg','image/jpeg',1,repeat('3',64));"

echo
echo "== o mesmo ficheiro em dois sítios é legítimo =="
"${PSQL[@]}" -d "$DB" -c "
INSERT INTO public.documentos_cavalo
  (referencia, tipo, caminho, nome_original, mime, bytes, sha256)
VALUES ('3f7c1e2a-0000-4000-8000-000000000003','livro_azul',
        '3f7c1e2a-0000-4000-8000-000000000003/livro_azul/jj.pdf',
        'livro azul.pdf','application/pdf',204800,repeat('a',64));" >/dev/null
repetidos=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT count(*) FROM public.documentos_cavalo WHERE sha256 = repeat('a',64);")
[ "$repetidos" = "2" ] || { echo "  FALHA: o sha256 repetido não entrou"; exit 1; }
echo "  duas linhas com o mesmo sha256: aceites e procuráveis"

echo
echo "== apagar o anúncio leva os documentos atrás =="
"${PSQL[@]}" -d "$DB" -c \
  "DELETE FROM public.cavalos_venda WHERE slug='ulisses-documentos';" >/dev/null
orfaos=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT count(*) FROM public.documentos_cavalo WHERE cavalo_id IS NOT NULL;")
[ "$orfaos" = "0" ] || { echo "  FALHA: ficaram $orfaos documentos órfãos"; exit 1; }
soltos=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT count(*) FROM public.documentos_cavalo;")
echo "  documentos com anúncio apagado: 0; documentos ainda sem anúncio: $soltos"

echo
echo "== RLS ligada, e sem políticas nenhumas =="
rls=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.documentos_cavalo'::regclass;")
politicas=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT count(*) FROM pg_policies
   WHERE schemaname='public' AND tablename='documentos_cavalo';")
[ "$rls" = "t" ] || { echo "  FALHA: a RLS não está ligada"; exit 1; }
[ "$politicas" = "0" ] || { echo "  FALHA: apareceram $politicas políticas"; exit 1; }
echo "  rls=t políticas=0 — só a chave de serviço lá chega"
