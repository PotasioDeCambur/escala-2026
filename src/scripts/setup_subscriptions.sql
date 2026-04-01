-- Tabela de Assinaturas
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  plan_type text not null default 'pro', -- 'basic', 'pro', 'enterprise'
  current_period_end timestamptz,
  mp_preapproval_id text, -- ID da assinatura no Mercado Pago
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ativar RLS (Row Level Security)
alter table public.subscriptions enable row level security;

-- Política: Usuário pode ver apenas sua própria assinatura
create policy "Users can view own subscription" 
  on public.subscriptions for select 
  using (auth.uid() = user_id);

-- Política: Apenas Service Role pode inserir/atualizar (via webhook)
-- Mas para facilitar testes manuais do admin, vamos permitir update do próprio user por enquanto (REMOVER EM PRODUÇÃO REAL)
create policy "Users can update own subscription (DEV ONLY)" 
  on public.subscriptions for update 
  using (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
create or replace function public.handle_updated_at() 
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_subscription_updated
  before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();

-- Trigger para criar assinatura TRIAL automaticamente ao criar usuário
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status, plan_type, current_period_end)
  values (
    new.id, 
    'trialing', 
    'pro', 
    now() + interval '7 days' -- 7 dias grátis
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que dispara quando um usuário é criado na tabela auth.users do Supabase
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
