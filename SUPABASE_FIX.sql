-- 🚨 COPIE E COLE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE PARA CORRIGIR O ERRO "ERRO AO SALVAR" 🚨

-- Esse comando libera a permissão para que o link público possa ser ATUALIZADO (editado) e não apenas criado.

-- 1. Remove políticas antigas que possam estar bloqueando ou duplicadas
DROP POLICY IF EXISTS "Permitir update publico" ON public.escala;
DROP POLICY IF EXISTS "Permitir insert publico" ON public.escala;
DROP POLICY IF EXISTS "Permitir select publico" ON public.escala;

-- 2. Habilita RLS na tabela (caso não esteja)
ALTER TABLE public.escala ENABLE ROW LEVEL SECURITY;

-- 3. Política para LER (SELECT) - Todos podem ver a escala
CREATE POLICY "Permitir select publico"
ON public.escala
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Política para CRIAR (INSERT) - Todos podem criar uma nova escala
CREATE POLICY "Permitir insert publico"
ON public.escala
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Política para ATUALIZAR (UPDATE) - Todos (ou quem tem o link) podem salvar alterações
-- CRÍTICO: É esta política que estava faltando para o seu erro!
CREATE POLICY "Permitir update publico"
ON public.escala
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Confirmação visual
SELECT 'Políticas de segurança atualizadas com sucesso! Agora tente salvar novamente.' as status;
