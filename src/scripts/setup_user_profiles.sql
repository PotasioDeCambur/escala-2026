-- Tabela de Perfis de Usuário (User Profiles)
-- Usada para estender os dados do auth.users do Supabase, já que não podemos (e não devemos) consultar auth.users diretamente do client-side.
create table if not exists public.user_profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  access_status text not null default 'active' check (access_status in ('active', 'blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ativar RLS (Row Level Security)
alter table public.user_profiles enable row level security;

-- Política: Admin pode ver todos os perfis
create policy "Admins can view all user profiles"
  on public.user_profiles for select
  using (auth.jwt() ->> 'email' = 'armandoo.linares@gmail.com');

-- Política: Usuário pode ver apenas seu próprio perfil
create policy "Users can view own profile" 
  on public.user_profiles for select 
  using (auth.uid() = id);

-- Política: Apenas Admin pode atualizar perfis (ex: para bloquear/desbloquear)
create policy "Admins can update user profiles"
  on public.user_profiles for update
  using (auth.jwt() ->> 'email' = 'armandoo.linares@gmail.com');

-- Trigger para atualizar updated_at automaticamente
create trigger on_user_profile_updated
  before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();

-- Trigger para criar um user_profile automaticamente ao criar usuário no auth.users
create or replace function public.handle_new_user_profile() 
returns trigger as $$
begin
  insert into public.user_profiles (id, email, access_status)
  values (new.id, new.email, 'active');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que dispara quando um usuário é criado na tabela auth.users do Supabase
-- Usamos um nome de trigger único caso já existam outros triggers no auth.users
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- SCRIPT DE MIGRAÇÃO: Inserir usuários já existentes no auth.users para a tabela user_profiles (caso já houver usuários antes dessa tabela existir)
-- Como auth.users é fechado por RLS externo, a função abaixo rodando com SECURITY DEFINER vai bypassar o RLS e garantir o sync.
-- Pode ser rodada 1 vez apenas com "SELECT sync_existing_users();" no painel SQL.
create or replace function public.sync_existing_users()
returns void as $$
begin
  insert into public.user_profiles (id, email, access_status)
  select id, email, 'active' from auth.users
  where id not in (select id from public.user_profiles);
end;
$$ language plpgsql security definer;
