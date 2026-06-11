-- ============================================================
-- BANCO DE DADOS - SISTEMA DE GASTOS
-- Use este arquivo no Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  icone TEXT NOT NULL,
  cor TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meses_financeiros (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL DEFAULT 1,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  renda_base NUMERIC(12,2) NOT NULL DEFAULT 700.00,
  entrada_extra NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, ano, mes)
);

CREATE TABLE IF NOT EXISTS gastos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL DEFAULT 1,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  quem_pagou TEXT NOT NULL CHECK (quem_pagou IN ('eu', 'mae')),
  categoria_id TEXT NOT NULL REFERENCES categorias(id),
  data_gasto DATE NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos_fixos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL DEFAULT 1,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  quem_pagou TEXT NOT NULL CHECK (quem_pagou IN ('eu', 'mae')),
  categoria_id TEXT NOT NULL REFERENCES categorias(id),
  dia_vencimento INTEGER DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inicio_ano INTEGER NOT NULL,
  inicio_mes INTEGER NOT NULL,
  fim_ano INTEGER NULL,
  fim_mes INTEGER NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO categorias 
(id, nome, icone, cor, ordem, ativo)
VALUES
('alimentacao', 'Alimentacao', 'ti-shopping-cart', '#1D9E75', 1, TRUE),
('transporte', 'Transporte', 'ti-bus', '#378ADD', 2, TRUE),
('moradia', 'Moradia', 'ti-home', '#7F77DD', 3, TRUE),
('assinatura', 'Assinatura', 'ti-player-play', '#D4537E', 4, TRUE),
('saude', 'Saúde', 'ti-heart', '#D85A30', 5, TRUE),
('pessoal', 'Pessoal', 'ti-user', '#B45309', 6, TRUE),
('lazer', 'Lazer', 'ti-device-gamepad', '#0F6E56', 7, TRUE),
('outros', 'Outros', 'ti-dots', '#888780', 8, TRUE)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo;

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE meses_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_fixos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitir tudo categorias" ON categorias;
DROP POLICY IF EXISTS "permitir tudo meses" ON meses_financeiros;
DROP POLICY IF EXISTS "permitir tudo gastos" ON gastos;
DROP POLICY IF EXISTS "permitir tudo fixos" ON gastos_fixos;

CREATE POLICY "permitir tudo categorias"
ON categorias
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "permitir tudo meses"
ON meses_financeiros
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "permitir tudo gastos"
ON gastos
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "permitir tudo fixos"
ON gastos_fixos
FOR ALL
USING (true)
WITH CHECK (true);

GRANT ALL ON categorias TO anon;
GRANT ALL ON meses_financeiros TO anon;
GRANT ALL ON gastos TO anon;
GRANT ALL ON gastos_fixos TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
