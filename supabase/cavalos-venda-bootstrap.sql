-- Arranque da tabela do marketplace (cavalos_venda)
--
-- Porque é que este ficheiro existe: nenhuma migração cria cavalos_venda. A
-- tabela só é definida em supabase/NOVAS-FUNCIONALIDADES.sql, que além do DDL
-- traz 6 INSERT de dados de exemplo SEM ON CONFLICT — correr esse ficheiro numa
-- base de dados já povoada duplica eventos, linhagens, cavalos e reviews.
--
-- Este ficheiro é a mesma definição de tabela, sem nenhum INSERT, e é seguro
-- correr as vezes que forem precisas: tudo é IF NOT EXISTS, por isso numa base
-- de dados que já tenha a tabela não faz absolutamente nada.
--
-- Corra-o quando uma migração falhar com:
--   ERROR: 42P01: relation "cavalos_venda" does not exist
--
-- A coudelaria_id abaixo referencia a tabela coudelarias. Se essa também não
-- existir, a criação falha — nesse caso a base de dados está vazia e o que
-- falta é o esquema completo, não só esta tabela.

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
    documentos_em_dia BOOLEAN DEFAULT true,
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

