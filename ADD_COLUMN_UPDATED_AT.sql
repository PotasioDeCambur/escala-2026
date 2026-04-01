-- RODE ESTE COMANDO NO SQL EDITOR DO SUPABASE PARA CORRIGIR DEFINITIVAMENTE

-- 1. Adiciona a coluna 'updated_at' que estava faltando
ALTER TABLE public.escala 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Confirmação
SELECT 'Coluna updated_at criada com sucesso!' as status;
