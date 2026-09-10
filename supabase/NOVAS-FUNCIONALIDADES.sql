-- =====================================================
-- PORTAL LUSITANO - NOVAS FUNCIONALIDADES
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABELA DE EVENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS eventos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    descricao TEXT,
    descricao_completa TEXT,
    tipo VARCHAR(50) NOT NULL, -- feira, competicao, leilao, exposicao, workshop, outro
    data_inicio DATE NOT NULL,
    data_fim DATE,
    hora_inicio TIME,
    hora_fim TIME,
    localizacao VARCHAR(255) NOT NULL,
    regiao VARCHAR(100),
    morada TEXT,
    coordenadas_lat DECIMAL(10, 8),
    coordenadas_lng DECIMAL(11, 8),
    organizador VARCHAR(255),
    website VARCHAR(500),
    email VARCHAR(255),
    telefone VARCHAR(50),
    preco_entrada VARCHAR(100),
    imagem_capa VARCHAR(500),
    imagens TEXT[],
    tags TEXT[],
    destaque BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para eventos
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_regiao ON eventos(regiao);
CREATE INDEX IF NOT EXISTS idx_eventos_status ON eventos(status);

-- =====================================================
-- 2. TABELA DE CAVALOS À VENDA (MARKETPLACE)
-- =====================================================
CREATE TABLE IF NOT EXISTS cavalos_venda (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    descricao TEXT,
    sexo VARCHAR(20) NOT NULL, -- macho, femea, castrado
    idade INTEGER, -- anos
    data_nascimento DATE,
    cor VARCHAR(100),
    altura DECIMAL(3, 2), -- em metros
    linhagem VARCHAR(255),
    pai VARCHAR(255),
    mae VARCHAR(255),
    nivel_treino VARCHAR(100), -- desbastado, iniciado, avancado, competicao
    disciplinas TEXT[], -- dressage, toureio, trabalho, lazer, alta_escola
    premios TEXT[],
    caracteristicas TEXT[],
    preco DECIMAL(12, 2),
    preco_negociavel BOOLEAN DEFAULT false,
    preco_sob_consulta BOOLEAN DEFAULT false,
    moeda VARCHAR(3) DEFAULT 'EUR',
    coudelaria_id UUID REFERENCES coudelarias(id),
    vendedor_nome VARCHAR(255),
    vendedor_telefone VARCHAR(50),
    vendedor_email VARCHAR(255),
    vendedor_whatsapp VARCHAR(50),
    localizacao VARCHAR(255),
    regiao VARCHAR(100),
    foto_principal VARCHAR(500),
    fotos TEXT[],
    video_url VARCHAR(500),
    registro_apsl VARCHAR(100), -- número de registro
    -- Sem resposta do vendedor, o lado prudente — a nota está por extenso em
    -- `supabase/cavalos-venda-bootstrap.sql`.
    documentos_em_dia BOOLEAN DEFAULT false,
    aceita_troca BOOLEAN DEFAULT false,
    transporte_incluido BOOLEAN DEFAULT false,
    destaque BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active', -- active, vendido, reservado, inativo
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para cavalos
CREATE INDEX IF NOT EXISTS idx_cavalos_preco ON cavalos_venda(preco);
CREATE INDEX IF NOT EXISTS idx_cavalos_sexo ON cavalos_venda(sexo);
CREATE INDEX IF NOT EXISTS idx_cavalos_regiao ON cavalos_venda(regiao);
CREATE INDEX IF NOT EXISTS idx_cavalos_status ON cavalos_venda(status);
CREATE INDEX IF NOT EXISTS idx_cavalos_coudelaria ON cavalos_venda(coudelaria_id);

-- =====================================================
-- 3. TABELA DE REVIEWS/AVALIAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coudelaria_id UUID REFERENCES coudelarias(id) ON DELETE CASCADE,
    autor_nome VARCHAR(255) NOT NULL,
    autor_email VARCHAR(255),
    autor_localizacao VARCHAR(255),
    avaliacao INTEGER NOT NULL CHECK (avaliacao >= 1 AND avaliacao <= 5),
    titulo VARCHAR(255),
    comentario TEXT NOT NULL,
    data_visita DATE,
    tipo_visita VARCHAR(100), -- compra, visita, aulas, eventos
    recomenda BOOLEAN DEFAULT true,
    resposta_coudelaria TEXT,
    resposta_data TIMESTAMP WITH TIME ZONE,
    verificado BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para reviews
CREATE INDEX IF NOT EXISTS idx_reviews_coudelaria ON reviews(coudelaria_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_avaliacao ON reviews(avaliacao);

-- =====================================================
-- 4. TABELA DE LINHAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS linhagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) UNIQUE NOT NULL,
    descricao TEXT,
    historia TEXT,
    origem VARCHAR(255),
    fundador VARCHAR(255),
    ano_fundacao INTEGER,
    caracteristicas TEXT[],
    cores_comuns TEXT[],
    temperamento TEXT,
    aptidoes TEXT[],
    cavalos_famosos JSONB, -- [{nome, ano, conquistas}]
    coudelarias_principais TEXT[],
    imagem_capa VARCHAR(500),
    imagens TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. INSERIR DADOS DE EVENTOS
-- =====================================================
INSERT INTO eventos (titulo, slug, descricao, descricao_completa, tipo, data_inicio, data_fim, localizacao, regiao, organizador, website, preco_entrada, destaque, tags) VALUES

('Feira Nacional do Cavalo - Golegã 2025', 'feira-golega-2025',
'A maior feira equestre de Portugal, celebrando o Cavalo Lusitano há mais de 500 anos.',
'A Feira Nacional do Cavalo da Golegã é o maior evento equestre de Portugal e um dos mais importantes da Europa. Realiza-se anualmente na vila da Golegã, conhecida como a "Capital do Cavalo". Durante 10 dias, a vila transforma-se num verdadeiro santuário do cavalo Lusitano, com desfiles, competições, leilões e espetáculos. Milhares de visitantes e criadores de todo o mundo convergem para celebrar a excelência do cavalo Lusitano.',
'feira', '2025-11-07', '2025-11-16', 'Golegã', 'Ribatejo', 'Câmara Municipal da Golegã', 'https://www.cm-golega.pt', 'Gratuito', true,
ARRAY['feira', 'lusitano', 'tradicao', 'golega', 'leilao']),

('Campeonato Nacional de Dressage 2025', 'campeonato-dressage-2025',
'O mais prestigiado campeonato de Dressage em Portugal.',
'O Campeonato Nacional de Dressage reúne os melhores conjuntos de Portugal, competindo nas diversas categorias desde o nível básico até ao Grande Prémio. O evento conta com juízes internacionais e prémios significativos, além de ser uma excelente oportunidade para os criadores mostrarem a qualidade dos seus cavalos Lusitanos.',
'competicao', '2025-06-15', '2025-06-18', 'Centro Hípico da Companhia das Lezírias', 'Ribatejo', 'Federação Equestre Portuguesa', 'https://www.fep.pt', '15€', true,
ARRAY['dressage', 'competicao', 'fep', 'nacional']),

('Leilão Lusitano Collection 2025', 'leilao-lusitano-collection-2025',
'Leilão exclusivo com os melhores exemplares de coudelarias portuguesas.',
'O Lusitano Collection é um leilão de prestígio que apresenta cavalos selecionados das melhores coudelarias de Portugal. Cada cavalo é cuidadosamente avaliado e apresentado, com documentação completa e histórico detalhado. Uma oportunidade única para adquirir exemplares de elite do cavalo Lusitano.',
'leilao', '2025-09-20', '2025-09-21', 'Alter do Chão', 'Alentejo', 'Coudelaria de Alter Real', 'https://www.alterreal.pt', '50€', true,
ARRAY['leilao', 'alter', 'elite', 'venda']),

('Equitana Portugal 2025', 'equitana-portugal-2025',
'A maior feira equestre internacional em Portugal.',
'A Equitana Portugal traz a Lisboa a prestigiada marca internacional de feiras equestres. Com expositores de todo o mundo, demonstrações de várias disciplinas, workshops e conferências, é o evento ideal para profissionais e amadores do mundo equestre.',
'feira', '2025-04-10', '2025-04-13', 'FIL - Feira Internacional de Lisboa', 'Lisboa', 'Equitana International', 'https://www.equitana.com', '20€', true,
ARRAY['equitana', 'internacional', 'feira', 'comercio']),

('Festival Ibérico do Cavalo', 'festival-iberico-2025',
'Celebração conjunta do cavalo Lusitano e Pura Raça Espanhola.',
'Um evento único que celebra a herança comum dos cavalos ibéricos. Com apresentações de ambas as raças, competições amigáveis e intercâmbio cultural entre criadores portugueses e espanhóis.',
'exposicao', '2025-05-22', '2025-05-25', 'Elvas', 'Alentejo', 'APSL & ANCCE', 'https://www.cavalo-lusitano.com', '10€', false,
ARRAY['iberico', 'espanhol', 'lusitano', 'cultura']),

('Workshop de Doma Clássica', 'workshop-doma-classica-2025',
'Formação intensiva com mestres internacionais.',
'Workshop de três dias focado nas técnicas de doma clássica aplicadas ao cavalo Lusitano. Com demonstrações práticas, sessões teóricas e oportunidade de trabalhar com cavalos sob orientação de mestres reconhecidos.',
'workshop', '2025-03-15', '2025-03-17', 'Escola Portuguesa de Arte Equestre', 'Lisboa', 'EPAE', 'https://www.parfrances.pt/epae', '350€', false,
ARRAY['workshop', 'doma', 'formacao', 'epae']),

('Concurso de Saltos Internacional', 'csi-cascais-2025',
'Competição internacional de saltos de obstáculos.',
'O CSI Cascais reúne os melhores cavaleiros e cavalos de saltos da Europa. Com provas de diferentes níveis e prémios atrativos, é uma excelente montra do potencial do cavalo Lusitano nos saltos.',
'competicao', '2025-07-03', '2025-07-06', 'Hipódromo Manuel Possolo', 'Lisboa', 'FEP', 'https://www.fep.pt', '12€', false,
ARRAY['saltos', 'csi', 'internacional', 'cascais']),

('Romaria a Cavalo - Viana do Castelo', 'romaria-viana-2025',
'Tradicional romaria equestre no norte de Portugal.',
'Uma das mais antigas tradições equestres do norte de Portugal. Cavaleiros de toda a região juntam-se para esta romaria que combina fé, tradição e amor pelos cavalos.',
'exposicao', '2025-08-15', '2025-08-15', 'Viana do Castelo', 'Minho', 'Câmara Municipal de Viana do Castelo', 'https://www.cm-viana-castelo.pt', 'Gratuito', false,
ARRAY['romaria', 'tradicao', 'norte', 'religioso']),

('Feira do Cavalo de Ponte de Lima', 'feira-ponte-lima-2025',
'Tradicional feira equestre no coração do Minho.',
'A Feira do Cavalo de Ponte de Lima celebra a tradição equestre do norte de Portugal. Com exposições, vendas, e demonstrações, é um evento familiar que atrai milhares de visitantes.',
'feira', '2025-06-21', '2025-06-23', 'Ponte de Lima', 'Minho', 'Câmara Municipal de Ponte de Lima', 'https://www.cm-pontedelima.pt', 'Gratuito', false,
ARRAY['feira', 'minho', 'tradicao', 'familiar']),

('Campeonato de Equitação de Trabalho', 'campeonato-trabalho-2025',
'Competição nacional da disciplina mais portuguesa.',
'O Campeonato Nacional de Equitação de Trabalho celebra a disciplina que mais representa a tradição equestre portuguesa. Com provas de maneabilidade, velocidade e toureio a cavalo.',
'competicao', '2025-10-04', '2025-10-06', 'Santarém', 'Ribatejo', 'FEP', 'https://www.fep.pt', '8€', true,
ARRAY['trabalho', 'tradicao', 'nacional', 'santarem']);

-- =====================================================
-- 6. INSERIR DADOS DE LINHAGENS
-- =====================================================
INSERT INTO linhagens (nome, slug, descricao, historia, origem, fundador, ano_fundacao, caracteristicas, cores_comuns, temperamento, aptidoes, cavalos_famosos, coudelarias_principais) VALUES

('Veiga', 'veiga',
'A linhagem mais antiga e prestigiada do cavalo Lusitano, conhecida pela sua pureza e elegância.',
'A linhagem Veiga tem origem na coudelaria da família Veiga, estabelecida no início do século XIX em Salvaterra de Magos. Dr. Manuel Veiga e os seus descendentes desenvolveram uma linha de cavalos de extraordinária pureza, com características muito definidas: pescoço arqueado, cabeça expressiva e movimentos elevados. Esta linhagem é considerada a mais pura e influente na história do Lusitano, tendo sido fundamental para a definição do padrão da raça.',
'Salvaterra de Magos, Ribatejo', 'Dr. Manuel Veiga', 1820,
ARRAY['Pescoço arqueado e musculado', 'Cabeça pequena e expressiva', 'Movimentos elevados e cadenciados', 'Garupa arredondada', 'Temperamento nobre'],
ARRAY['Ruço', 'Castanho', 'Preto'],
'Cavalos de temperamento nobre, sensíveis e inteligentes. Muito cooperativos no trabalho, com grande vontade de agradar.',
ARRAY['Alta Escola', 'Dressage Clássico', 'Equitação de Trabalho'],
'[{"nome": "Novilheiro", "ano": "1985", "conquistas": "Considerado um dos melhores Lusitanos de sempre"}, {"nome": "Opus", "ano": "1991", "conquistas": "Grande campeão internacional de Dressage"}]',
ARRAY['Coudelaria Veiga', 'Coudelaria de Alter Real', 'Coudelaria Ortigão Costa']),

('Andrade', 'andrade',
'Linhagem robusta e versátil, famosa pelos seus cavalos de grande presença e força.',
'A linhagem Andrade foi desenvolvida por D. Fernando d''Andrade na sua coudelaria no Alentejo. Os cavalos Andrade são conhecidos pela sua robustez, força e versatilidade. São cavalos de grande porte, com ossatura forte e excelente constituição. Esta linhagem teve grande influência no desenvolvimento de cavalos para trabalho de campo e toureio.',
'Elvas, Alentejo', 'D. Fernando d''Andrade', 1840,
ARRAY['Grande porte e presença', 'Ossatura forte', 'Musculatura desenvolvida', 'Resistência física', 'Cascos duros e bem formados'],
ARRAY['Castanho', 'Preto', 'Alazão'],
'Cavalos corajosos e determinados, com grande capacidade de trabalho. Muito leais e confiáveis.',
ARRAY['Equitação de Trabalho', 'Toureio', 'Atrelagem', 'Lazer'],
'[{"nome": "Firme", "ano": "1972", "conquistas": "Grande reprodutor, pai de múltiplos campeões"}, {"nome": "Destinado", "ano": "1988", "conquistas": "Campeão de Equitação de Trabalho"}]',
ARRAY['Coudelaria Andrade', 'Monte Velho', 'Herdade do Azinhal']),

('Alter Real', 'alter-real',
'A linhagem real portuguesa, criada na Coudelaria de Alter desde 1748.',
'A linhagem Alter Real foi estabelecida por ordem de D. João V em 1748, quando fundou a Coudelaria de Alter. Os cavalos foram selecionados a partir de éguas andaluzas e garanhões das melhores linhas ibéricas. Durante séculos, a Coudelaria de Alter forneceu cavalos à Casa Real Portuguesa e desenvolveu uma linhagem de características muito específicas, orientada para a Alta Escola e cerimónias reais.',
'Alter do Chão, Alentejo', 'D. João V', 1748,
ARRAY['Elegância natural', 'Movimentos expressivos', 'Conformação harmoniosa', 'Aptidão natural para ares de Alta Escola', 'Presença majestosa'],
ARRAY['Castanho', 'Ruço', 'Preto'],
'Cavalos de grande sensibilidade e inteligência, com aptidão natural para a Alta Escola. Muito elegantes e expressivos.',
ARRAY['Alta Escola', 'Dressage Clássico', 'Cerimónias'],
'[{"nome": "Euclides", "ano": "1967", "conquistas": "Garanhão fundador da linha moderna de Alter"}, {"nome": "Quo Vadis", "ano": "1983", "conquistas": "Grande campeão de morfologia e funcionalidade"}]',
ARRAY['Coudelaria de Alter Real']),

('Coudelaria Nacional', 'coudelaria-nacional',
'Cavalos da antiga Coudelaria Nacional, com forte influência na raça.',
'A Coudelaria Nacional foi uma instituição estatal que teve grande influência no desenvolvimento do cavalo Lusitano em Portugal. Utilizando garanhões das melhores linhas, desenvolveu cavalos de qualidade para diversos fins, desde o trabalho agrícola até às artes equestres.',
'Fonte Boa, Ribatejo', 'Estado Português', 1893,
ARRAY['Versatilidade', 'Robustez', 'Bom temperamento', 'Boa funcionalidade', 'Adaptabilidade'],
ARRAY['Todas as pelagens'],
'Cavalos equilibrados e versáteis, com bom temperamento e fáceis de trabalhar.',
ARRAY['Trabalho', 'Desporto', 'Lazer'],
'[{"nome": "Neptuno", "ano": "1950", "conquistas": "Importante reprodutor na história da Coudelaria"}]',
ARRAY['Companhia das Lezírias', 'Diversas coudelarias privadas']);

-- =====================================================
-- 7. INSERIR CAVALOS À VENDA (EXEMPLOS)
-- =====================================================
INSERT INTO cavalos_venda (nome, slug, descricao, sexo, idade, cor, altura, linhagem, nivel_treino, disciplinas, preco, preco_negociavel, vendedor_nome, vendedor_telefone, vendedor_email, localizacao, regiao, destaque, caracteristicas) VALUES

('Navegador PLFS', 'navegador-plfs',
'Magnífico garanhão Lusitano com excelente genética e treino avançado em Dressage. Filho de reprodutor aprovado, com movimentos expressivos e temperamento equilibrado. Ideal para competição ou reprodução.',
'macho', 7, 'Ruço', 1.65, 'Veiga',
'avancado', ARRAY['dressage', 'alta_escola'],
45000.00, true,
'Coudelaria Portal Lusitano', '+351 919 000 001', 'vendas@portallusitano.pt',
'Ribatejo', 'Ribatejo', true,
ARRAY['Excelentes movimentos', 'Temperamento dócil', 'Apto reprodução', 'Radiografias disponíveis']),

('Bailarina MV', 'bailarina-mv',
'Égua de excelente morfologia, premiada em concursos. Filha de campeão de raça, com aptidão comprovada para Dressage e potencial reprodutivo excecional.',
'femea', 5, 'Castanha', 1.58, 'Alter Real',
'iniciado', ARRAY['dressage', 'reproducao'],
28000.00, false,
'Monte Velho Equestre', '+351 919 000 002', 'cavalos@montevelho.pt',
'Comporta', 'Alentejo', true,
ARRAY['Premiada em morfologia', 'Excelente linhagem', 'Mansa e fácil de trabalhar']),

('Tornado AR', 'tornado-ar',
'Cavalo castrado de 6 anos, perfeito para amador avançado ou cavaleiro de lazer. Muito bem treinado, seguro e confiável. Excelente para passeios e trabalho ligeiro.',
'castrado', 6, 'Preto', 1.62, 'Andrade',
'avancado', ARRAY['lazer', 'trabalho'],
18000.00, true,
'Herdade do Azinhal', '+351 919 000 003', 'info@herdadeazinhal.pt',
'Évora', 'Alentejo', false,
ARRAY['Muito seguro', 'Ideal para passeios', 'Excelente em campo aberto']),

('Princesa QC', 'princesa-qc',
'Égua jovem com grande potencial para Dressage. Recém desbastada, mostra talento natural para a disciplina. Origem comprovada, documentação em dia.',
'femea', 4, 'Ruça', 1.60, 'Veiga',
'desbastado', ARRAY['dressage'],
22000.00, true,
'Quinta dos Cedros', '+351 919 000 004', 'quintacedros@email.pt',
'Sintra', 'Lisboa', false,
ARRAY['Grande potencial', 'Movimentos naturais elevados', 'Boa conformação']),

('Imperador LL', 'imperador-ll',
'Garanhão aprovado, com filhos premiados. Excelente reprodutor com genética comprovada. Disponível para venda ou cedência para reprodução.',
'macho', 10, 'Castanho', 1.68, 'Alter Real',
'competicao', ARRAY['dressage', 'reproducao', 'alta_escola'],
75000.00, false,
'Lusitanos d''Atela', '+351 919 000 005', 'atela@lusitanos.pt',
'Rio Maior', 'Ribatejo', true,
ARRAY['Garanhão aprovado', 'Filhos premiados', 'Genética de excelência']);

-- =====================================================
-- 8. ATUALIZAR TABELA COUDELARIAS (adicionar média de avaliações)
-- =====================================================
ALTER TABLE coudelarias ADD COLUMN IF NOT EXISTS media_avaliacoes DECIMAL(2,1) DEFAULT 0;
ALTER TABLE coudelarias ADD COLUMN IF NOT EXISTS total_avaliacoes INTEGER DEFAULT 0;
ALTER TABLE coudelarias ADD COLUMN IF NOT EXISTS coordenadas_lat DECIMAL(10, 8);
ALTER TABLE coudelarias ADD COLUMN IF NOT EXISTS coordenadas_lng DECIMAL(11, 8);

-- Adicionar coordenadas às coudelarias existentes (aproximadas)
UPDATE coudelarias SET coordenadas_lat = 39.2050, coordenadas_lng = -7.6600 WHERE slug = 'coudelaria-alter-real';
UPDATE coudelarias SET coordenadas_lat = 38.9667, coordenadas_lng = -8.8500 WHERE slug = 'companhia-das-lezirias';
UPDATE coudelarias SET coordenadas_lat = 39.2833, coordenadas_lng = -9.3000 WHERE slug = 'coudelaria-ortigao-costa';
UPDATE coudelarias SET coordenadas_lat = 39.3333, coordenadas_lng = -8.9167 WHERE slug = 'lusitanos-d-atela';
UPDATE coudelarias SET coordenadas_lat = 38.5667, coordenadas_lng = -7.9000 WHERE slug = 'herdade-do-azinhal';
UPDATE coudelarias SET coordenadas_lat = 39.4000, coordenadas_lng = -8.6333 WHERE slug = 'coudelaria-joao-pedro-rodrigues';
UPDATE coudelarias SET coordenadas_lat = 38.7833, coordenadas_lng = -9.5000 WHERE slug = 'quinta-dos-cedros';
UPDATE coudelarias SET coordenadas_lat = 38.7783, coordenadas_lng = -7.4158 WHERE slug = 'coudelaria-vila-vicosa';
UPDATE coudelarias SET coordenadas_lat = 39.0333, coordenadas_lng = -8.9333 WHERE slug = 'coudelaria-torres-vaz-freire';
UPDATE coudelarias SET coordenadas_lat = 38.3833, coordenadas_lng = -8.8000 WHERE slug = 'monte-velho-equestre';
UPDATE coudelarias SET coordenadas_lat = 37.9500, coordenadas_lng = -7.9833 WHERE slug = 'malhadinha-nova';
UPDATE coudelarias SET coordenadas_lat = 38.4333, coordenadas_lng = -8.8000 WHERE slug = 'cavalos-na-areia';
UPDATE coudelarias SET coordenadas_lat = 39.2000, coordenadas_lng = -8.7500 WHERE slug = 'coudelaria-luis-pitta';
UPDATE coudelarias SET coordenadas_lat = 38.8667, coordenadas_lng = -8.8833 WHERE slug = 'coudelaria-manuel-tavares-veiga';
UPDATE coudelarias SET coordenadas_lat = 38.6500, coordenadas_lng = -8.0000 WHERE slug = 'coudelaria-arsenio-raposo-cordeiro';
UPDATE coudelarias SET coordenadas_lat = 39.1000, coordenadas_lng = -9.2500 WHERE slug = 'coudelaria-miguel-costa-freitas';
UPDATE coudelarias SET coordenadas_lat = 38.3000, coordenadas_lng = -7.6000 WHERE slug = 'herdade-da-figueirinha';
UPDATE coudelarias SET coordenadas_lat = 38.9500, coordenadas_lng = -8.8667 WHERE slug = 'coudelaria-antonio-borba-monteiro';
UPDATE coudelarias SET coordenadas_lat = 38.5000, coordenadas_lng = -7.8500 WHERE slug = 'coudelaria-paulo-caetano';
UPDATE coudelarias SET coordenadas_lat = 39.3500, coordenadas_lng = -8.4500 WHERE slug = 'coudelaria-nuno-oliveira-foundation';

-- =====================================================
-- 9. INSERIR ALGUMAS REVIEWS DE EXEMPLO
-- =====================================================
INSERT INTO reviews (coudelaria_id, autor_nome, autor_localizacao, avaliacao, titulo, comentario, data_visita, tipo_visita, recomenda, status, verificado)
SELECT
    id,
    'João Silva',
    'Lisboa',
    5,
    'Experiência inesquecível',
    'Visitámos a coudelaria num sábado e ficámos impressionados com a qualidade dos cavalos e a simpatia de toda a equipa. Os cavalos são magníficos e nota-se o cuidado e dedicação no seu tratamento. Recomendo vivamente!',
    '2024-06-15',
    'visita',
    true,
    'approved',
    true
FROM coudelarias WHERE slug = 'coudelaria-alter-real';

INSERT INTO reviews (coudelaria_id, autor_nome, autor_localizacao, avaliacao, titulo, comentario, data_visita, tipo_visita, recomenda, status, verificado)
SELECT
    id,
    'Maria Santos',
    'Porto',
    5,
    'Profissionalismo de excelência',
    'Comprei o meu primeiro Lusitano nesta coudelaria e não podia estar mais satisfeita. Todo o processo foi transparente e profissional. O acompanhamento pós-venda também foi excelente.',
    '2024-08-20',
    'compra',
    true,
    'approved',
    true
FROM coudelarias WHERE slug = 'monte-velho-equestre';

INSERT INTO reviews (coudelaria_id, autor_nome, autor_localizacao, avaliacao, titulo, comentario, data_visita, tipo_visita, recomenda, status, verificado)
SELECT
    id,
    'Pierre Dubois',
    'França',
    5,
    'Best Portuguese horses',
    'Traveled from France specifically to visit this historic stud farm. The horses are exceptional and the history is fascinating. A must-visit for any Lusitano enthusiast.',
    '2024-09-10',
    'visita',
    true,
    'approved',
    true
FROM coudelarias WHERE slug = 'coudelaria-alter-real';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
