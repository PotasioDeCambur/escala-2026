-- Tabela "whitelist" para controlar e-mails aprovados
create table if not exists public.whitelist (
  email text primary key,
  approved_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Ativar RLS na whitelist
alter table public.whitelist enable row level security;

-- Política: Apenas admin pode manipular a whitelist
create policy "Admins can manage whitelist" 
  on public.whitelist for all 
  using (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'armandoo.linares@gmail.com')); 
  -- Substitua pelo seu e-mail real de admin, ou use uma role de admin mais robusta depois.

-- Trigger para verificar se o usuário está na whitelist antes de permitir login/criação
-- (Isso é complexo de fazer direto no Auth do Supabase sem Edge Functions, 
-- então faremos a verificação no Front-end ou via Trigger pós-criação que bloqueia o acesso)

-- Vamos simplificar: Criar uma função que o botão "Aprovar" do Admin chama.
-- Essa função: 
-- 1. Cria o usuário no Auth (se possível via API admin) ou 
-- 2. Adiciona na whitelist e envia um magic link (via Edge Function, mas aqui no front-end faremos via API client).

-- ATUALIZAR STATUS DO LEAD
create or replace function public.approve_lead(lead_id uuid)
returns void as $$
begin
  update public.leads 
  set status = 'aprovado' 
  where id = lead_id;
end;
$$ language plpgsql security definer;
