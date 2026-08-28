-- Missão Casa — ajustes manuais de saldo (mesada virtual)
-- Rode este arquivo uma vez no SQL Editor do Supabase, depois do schema.sql
-- e do seed_catalog_function.sql.

create table if not exists public.saldo_ajustes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade, -- o menino
  valor numeric(10,2) not null, -- positivo = crédito, negativo = débito
  motivo text,
  criado_por uuid references public.profiles(id), -- responsável que fez o ajuste
  criado_em timestamptz not null default now()
);

create index if not exists idx_ajustes_family on public.saldo_ajustes(family_id);
create index if not exists idx_ajustes_profile on public.saldo_ajustes(profile_id);

alter table public.saldo_ajustes enable row level security;

create policy "ajustes só da própria família" on public.saldo_ajustes
  for all using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

grant select, insert, update, delete on public.saldo_ajustes to authenticated;

alter publication supabase_realtime add table public.saldo_ajustes;
