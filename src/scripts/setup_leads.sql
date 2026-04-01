-- Tabela para coletar interessados (Leads)
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  empresa text,
  whatsapp text not null,
  email text not null unique,
  mensagem text,
  status text default 'pendente', -- 'pendente', 'contatado', 'aprovado'
  created_at timestamptz default now()
);

-- Ativar RLS (Row Level Security)
alter table public.leads enable row level security;

-- Política: Qualquer um pode INSERIR um lead (formulário público)
create policy "Anyone can insert leads" 
  on public.leads for insert 
  with check (true);

-- Política: Apenas service_role (admin) pode LER leads por padrão
-- Para facilitar seu teste no painel do Supabase, você usará o Table Editor com a role de service ou o próprio dashboard.
create policy "Service role can manage leads" 
  on public.leads for all
  using (auth.role() = 'service_role');
