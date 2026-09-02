-- Preenche `distrito` e `codigo_postal` nas coudelarias.
--
-- Contexto: `docs/auditoria-coudelarias.md`. Das trinta e cinco linhas, as
-- trinta e cinco tinham `distrito` a NULL e as trinta e cinco tinham
-- `codigo_postal` a NULL — duas colunas inteiras por preencher.
--
-- Esta migração é deliberadamente a mais aborrecida que se conseguiu escrever.
-- A auditoria encontrou cinquenta afirmações contraditas e cento e vinte e
-- três por confirmar, e **nada disso se toca aqui**. Um campo vazio é
-- honesto; um campo com um facto plausível e falso é o defeito que se foi
-- caçar. Por isso só entra o que é dedução ou mudança de sítio:
--
--   1. **O distrito sai do concelho.** Que Alpiarça é do distrito de Santarém
--      e Vila Viçosa do de Évora não é um facto sobre a coudelaria — é a
--      divisão administrativa do país. Deduz-se da morada que a linha já tem,
--      e não se acrescenta informação nova nenhuma.
--
--   2. **O código postal já lá estava, no campo errado.** Oito linhas
--      guardam-no dentro de `localizacao` — «Herdade da Agolada de Baixo,
--      2100-047 Coruche» — enquanto a coluna própria está vazia. Aqui só se
--      move o que está escrito, com a expressão regular a fazer a leitura: se
--      não houver um `NNNN-NNN` na morada, não se inventa um.
--
-- O que **não** entra, e porquê:
--
--   - O `dressage-plus` fica sem distrito. A `localizacao` dele é «Portugal»,
--     que é o nome de um país e não de uma localidade. Não há concelho de onde
--     deduzir, e escolher um seria exactamente a invenção que se anda a caçar.
--   - As coordenadas ficam como estão. Nove são o centro de uma povoação e
--     seis discordam da segunda coluna da mesma linha, mas corrigir uma
--     coordenada exige saber onde a coudelaria fica — e isso pergunta-se à
--     casa, não se deduz.
--   - O telefone `+351 243 558 XXX` do `joao-pedro-rodrigues` fica. Apagá-lo
--     seria defensável (não é um número), mas é uma decisão de quem manda no
--     conteúdo, não de uma migração. Fica no relatório, para o dono decidir.
--
-- Idempotente por construção: cria a coluna se faltar, e as duas escritas
-- levam `IS NULL` na condição, pelo que correr isto duas vezes não muda nada
-- na segunda. Também não escreve por cima de nada que alguém tenha corrigido
-- entretanto — quem preencheu à mão ganha sempre a esta migração.

BEGIN;

ALTER TABLE public.coudelarias ADD COLUMN IF NOT EXISTS distrito text;
ALTER TABLE public.coudelarias ADD COLUMN IF NOT EXISTS codigo_postal text;

-- 1. Distrito, deduzido do concelho que a morada nomeia.
--
-- Um por linha, com o concelho escrito ao lado para se poder conferir sem sair
-- do ficheiro. A freguesia vem antes do concelho quando a morada a dá.
UPDATE public.coudelarias AS c
SET distrito = m.distrito
FROM (
  VALUES
    -- slug                          distrito       -- concelho (freguesia)
    ('casa-cadaval',                 'Santarém'),   -- Salvaterra de Magos (Muge)
    ('cavalos-na-areia',             'Setúbal'),    -- Alcácer do Sal (Comporta)
    ('coudelaria-andrade',           'Santarém'),   -- Coruche
    ('companhia-das-lezirias',       'Santarém'),   -- Benavente (Samora Correia)
    ('alter-real',                   'Portalegre'), -- Alter do Chão
    ('santa-margarida',              'Beja'),       -- Ferreira do Alentejo
    ('ferraz-da-costa',              'Beja'),       -- Serpa (Vila Verde de Ficalho)
    ('flor-do-lis',                  'Leiria'),     -- Leiria (Monte Real / Carvide)
    ('henrique-abecasis',            'Lisboa'),     -- Azambuja (Aveiras de Baixo)
    ('herdade-do-azinhal',           'Portalegre'), -- Portalegre (Urra)
    ('joao-lynce',                   'Santarém'),   -- Santarém
    ('joao-pedro-rodrigues',         'Santarém'),   -- Alpiarça
    ('luis-bastos',                  'Santarém'),   -- Cartaxo (Porto de Muge)
    ('luis-folgado',                 'Évora'),      -- Montemor-o-Novo
    ('coudelaria-manuel-veiga',      'Santarém'),   -- Golegã (Azinhaga)
    ('mascarenhas-cardoso',          'Faro'),       -- Albufeira
    ('ortigao-costa',                'Lisboa'),     -- Azambuja
    ('pedro-passanha',               'Beja'),       -- Ferreira do Alentejo
    ('quinta-da-hermida',            'Évora'),      -- Vendas Novas
    ('quinta-dos-cedros',            'Lisboa'),     -- Sintra (Almargem do Bispo)
    ('coudelaria-sa',                'Santarém'),   -- Coruche (Agolada de Baixo)
    ('torres-vaz-freire',            'Portalegre'), -- Alter do Chão (Chança)
    ('veiga-teixeira',               'Santarém'),   -- Coruche
    ('vila-vicosa',                  'Évora'),      -- Vila Viçosa
    ('fundacao-eugenio-almeida',     'Évora'),      -- Évora
    ('malhadinha-nova',              'Beja'),       -- Beja (Albernoa)
    ('herdade-do-pinheiro',          'Setúbal'),    -- Alcácer do Sal
    ('jupiter-classical-dressage',   'Évora'),      -- Vila Viçosa
    ('lusitanos-datela',             'Santarém'),   -- Alpiarça (Casalinho)
    ('monte-velho',                  'Évora'),      -- Arraiolos (Santana do Campo)
    ('morgado-lusitano',             'Lisboa'),     -- Vila Franca de Xira (Alverca)
    ('lago-alva',                    'Santarém'),   -- Alpiarça
    ('quinta-lusitania',             'Viseu'),      -- Santa Comba Dão (Couto do Mosteiro)
    ('quinta-madre-de-agua',         'Guarda')      -- Gouveia (Vinhó)
    -- O `dressage-plus` não está aqui de propósito: `localizacao` = «Portugal».
) AS m(slug, distrito)
WHERE c.slug = m.slug
  AND c.distrito IS NULL;

-- 2. Código postal, retirado de dentro da morada.
--
-- Não há aqui lista nenhuma: quem decide é a expressão regular a ler o campo
-- `localizacao`. Se a morada não tiver um `NNNN-NNN`, a linha não é tocada.
UPDATE public.coudelarias
SET codigo_postal = substring(localizacao FROM '\d{4}-\d{3}')
WHERE codigo_postal IS NULL
  AND localizacao ~ '\d{4}-\d{3}';

COMMIT;
