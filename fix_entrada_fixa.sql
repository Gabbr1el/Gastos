-- Fix: quem_pagou opcional para entradas fixas
-- Cole e execute no Supabase > SQL Editor

ALTER TABLE gastos_fixos
  DROP CONSTRAINT IF EXISTS gastos_fixos_quem_pagou_check;

ALTER TABLE gastos_fixos
  ALTER COLUMN quem_pagou DROP NOT NULL;

ALTER TABLE gastos_fixos
  ADD CONSTRAINT gastos_fixos_quem_pagou_check
  CHECK (quem_pagou IN ('eu', 'mae') OR quem_pagou IS NULL);
