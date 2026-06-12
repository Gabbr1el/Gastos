-- Fix: permissões da tabela entradas
-- Cole e execute no Supabase > SQL Editor

-- 1. Garante que a tabela existe com a estrutura correta
CREATE TABLE IF NOT EXISTS entradas (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL DEFAULT 1,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  origem TEXT NULL,
  quem_recebe TEXT NULL,
  data_entrada DATE NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilita RLS e cria política permissiva
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitir tudo entradas" ON entradas;
CREATE POLICY "permitir tudo entradas"
ON entradas FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Permissão total para o usuário anônimo (tabela + sequência do BIGSERIAL)
GRANT ALL ON entradas TO anon;
GRANT USAGE, SELECT ON SEQUENCE entradas_id_seq TO anon;
