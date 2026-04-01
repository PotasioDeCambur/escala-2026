-- Tabela de convites (solicitações de acesso)
CREATE TABLE invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  granted_days INTEGER, -- NULL = ilimitado, ou número de dias concedidos
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Permite que o usuário veja apenas seus próprios convites
CREATE POLICY "Users can view own invites" ON invites
  FOR SELECT USING (auth.uid() = user_id);

-- Permite que o usuário insira seu próprio convite
CREATE POLICY "Users can insert own invites" ON invites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permite que o auth.jwt email seja usado para verificar admin
CREATE POLICY "Admin full access to invites" ON invites
  FOR ALL USING (
    (auth.jwt() ->> 'email'::text) = 'armandoo.linares@gmail.com'
  );
