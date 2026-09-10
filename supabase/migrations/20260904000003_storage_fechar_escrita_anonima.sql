-- O balde das fotografias aceitava escrita anónima, e nenhum código a usava.
--
-- Havia esta política em `storage.objects`:
--
--   "Anon upload to cavalos-imagens pending"
--   INSERT, para {anon, authenticated}
--   with check: bucket_id = 'cavalos-imagens' and foldername[1] = 'pending'
--
-- Quer dizer que qualquer pessoa com a chave anónima — que é pública, vai no
-- JavaScript da página, e é suposto ir — podia escrever ficheiros no balde
-- directamente, sem passar pelo site. Sem verificação de origem, sem limite de
-- ritmo, sem contador. Armazenamento gratuito para quem desse pela coisa.
--
-- E não servia para nada. **Todos** os caminhos de escrita deste repositório
-- vão por `supabaseAdmin`, que usa a chave de serviço e salta a RLS por
-- definição: `app/api/upload/route.ts` e `app/api/vender-cavalo/upload/route.ts`
-- são os dois únicos, e nenhum precisa desta política para funcionar. É um
-- resto de um desenho anterior, em que o browser subia as fotografias
-- directamente.
--
-- Verificado antes de a apagar: um único objecto em `pending/`, de 18 de
-- Fevereiro. Não houve abuso — o que se fecha é a porta, não um incêndio.
--
-- Aproveita-se para pôr no balde os limites que as rotas já aplicam. A rota
-- validar não chega: se um dia alguém escrever uma terceira rota e se esquecer
-- de validar, é o balde que a trava. Uma verificação que vive num sítio só é
-- uma verificação que se perde na primeira distracção.
--
-- Idempotente: pode correr duas vezes.

-- ---------------------------------------------------------------------------
-- A escrita anónima
-- ---------------------------------------------------------------------------

drop policy if exists "Anon upload to cavalos-imagens pending" on storage.objects;

-- ---------------------------------------------------------------------------
-- Os limites, no balde e não só na rota
-- ---------------------------------------------------------------------------

-- As fotografias dos anúncios. A rota já recusa acima de 5 MB e fora destes
-- quatro tipos; o balde passa a recusar o mesmo.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
where id = 'cavalos-imagens';

-- O balde geral, onde escreve a administração (`app/api/upload/route.ts`, que
-- exige sessão). Não tinha limite de tamanho nenhum nem restrição de tipo: um
-- engano numa rota de administração podia lá pôr um ficheiro de qualquer
-- formato e de qualquer tamanho, e o balde é público de leitura.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'images';
