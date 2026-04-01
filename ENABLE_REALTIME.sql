-- Habilita a publicação 'supabase_realtime' (se ainda não existir) e adiciona a tabela 'escala'
-- Isso é CRUCIAL para que o 'on(UPDATE)' no celular receba as mudanças

BEGIN;
  -- Verifica se a publicação já existe
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Adiciona a tabela à publicação (comando idempotente, não falha se já estiver)
  ALTER PUBLICATION supabase_realtime ADD TABLE public.escala;
COMMIT;

SELECT 'Realtime ativado com sucesso para tabela escala!' as status;
