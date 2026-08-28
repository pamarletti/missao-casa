-- Missão Casa — schema multi-tenant
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (uma vez).

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- Tabelas
-- ──────────────────────────────────────────────────────────────

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Minha família',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('crianca', 'responsavel')),
  pin_hash text, -- só para 'responsavel'; null para crianças (sem senha)
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists public.task_catalog (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  categoria text not null check (categoria in ('individual', 'individual_coletiva', 'coletiva')),
  subcategoria text, -- só para 'coletiva': Planejamento e compras, Preparo de refeições, etc.
  frequencia text not null check (frequencia in ('diaria', 'semanal', 'mensal')),
  tempo_min int not null default 0,
  nivel int not null default 1 check (nivel between 1 and 3),
  valor_unitario numeric(10,2) not null default 0,
  ocorrencias_por_dia int not null default 1, -- ex.: lavar o prato = 3x/dia (café, almoço, jantar)
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  task_id uuid not null references public.task_catalog(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade, -- o menino
  data date not null default current_date,
  status text not null check (status in (
    'aguardando_autorizacao', -- coletiva pedida, esperando liberação
    'liberada',               -- coletiva liberada, pode fazer
    'aguardando_confirmacao', -- feita, esperando um responsável confirmar
    'confirmado',
    'nao_feito',
    'pedido_para_refazer',
    'desconto_automatico'
  )),
  valor numeric(10,2) not null default 0, -- negativo para descontos
  origem text not null check (origem in ('menino', 'responsavel', 'sistema')),
  observacoes text,
  confirmado_por uuid references public.profiles(id),
  confirmado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fechamentos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  periodo_inicio date not null,
  periodo_fim date not null,
  totais jsonb not null, -- {"profile_id": valor_total, ...}
  fechado_por uuid references public.profiles(id),
  fechado_em timestamptz not null default now()
);

create index if not exists idx_profiles_family on public.profiles(family_id);
create index if not exists idx_catalog_family on public.task_catalog(family_id);
create index if not exists idx_events_family on public.task_events(family_id);
create index if not exists idx_events_profile on public.task_events(profile_id);
create index if not exists idx_events_data on public.task_events(data);

-- ──────────────────────────────────────────────────────────────
-- Helper: família do usuário autenticado (1 login por família)
-- ──────────────────────────────────────────────────────────────

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.families where owner_user_id = auth.uid()
$$;

-- ──────────────────────────────────────────────────────────────
-- Row Level Security — isolamento real entre famílias
-- ──────────────────────────────────────────────────────────────

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.task_catalog enable row level security;
alter table public.task_events enable row level security;
alter table public.fechamentos enable row level security;

create policy "família vê e edita só a própria linha" on public.families
  for all using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "perfis só da própria família" on public.profiles
  for all using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

create policy "catálogo só da própria família" on public.task_catalog
  for all using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

create policy "eventos só da própria família" on public.task_events
  for all using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

create policy "fechamentos só da própria família" on public.fechamentos
  for all using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

-- ──────────────────────────────────────────────────────────────
-- Permissões da API — necessário porque "Automatically expose new
-- tables" fica desmarcado no projeto (mais seguro: controle manual em vez
-- de expor tudo por padrão). RLS acima continua sendo quem decide quais
-- LINHAS aparecem; isto aqui só libera a tabela para a role 'authenticated'
-- poder ser consultada.
-- ──────────────────────────────────────────────────────────────

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.task_catalog to authenticated;
grant select, insert, update, delete on public.task_events to authenticated;
grant select, insert, update, delete on public.fechamentos to authenticated;

grant execute on function public.current_family_id() to authenticated;
grant execute on function public.seed_default_catalog(uuid) to authenticated;

-- ──────────────────────────────────────────────────────────────
-- Realtime — é isto que resolve a sincronização entre dispositivos
-- ──────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.task_events;
alter publication supabase_realtime add table public.task_catalog;

-- ──────────────────────────────────────────────────────────────
-- updated_at automático em task_events
-- ──────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_task_events_updated_at on public.task_events;
create trigger trg_task_events_updated_at
  before update on public.task_events
  for each row execute function public.set_updated_at();
