-- Rollback: remover tabela de lookup `meses` e políticas associadas
-- Execute no Supabase > SQL Editor para desfazer a migração criada anteriormente.

-- Rollback seguro: só remove a tabela/policies se a tabela existir
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'meses' AND relkind = 'r') THEN
		EXECUTE 'DROP POLICY IF EXISTS "permitir tudo meses_lookup" ON meses';
		EXECUTE 'REVOKE SELECT ON meses FROM anon';
		EXECUTE 'ALTER TABLE meses DISABLE ROW LEVEL SECURITY';
		EXECUTE 'DROP TABLE meses';
	END IF;
END
$$;

-- Alternativa simples (funciona mesmo se a tabela já não existir):
-- DROP TABLE IF EXISTS meses CASCADE;
