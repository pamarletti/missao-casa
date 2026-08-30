-- Uma criança pede para a outra fazer uma tarefa obrigatória dela.
--
-- Como funciona: André abre "Hoje", acha "Lavar a louça" e toca em "pedir
-- pra Hugo". Nasce aqui uma linha com status 'pendente'. Hugo vê o pedido
-- na aba Início dele e responde: aceitando, a tarefa PASSA a ser dele
-- naquele período (aparece no Hoje/Esta semana dele, some do de André) e o
-- crédito vai pra quem fizer — o Hugo. Recusando (ou se André cancelar
-- antes da resposta), nada muda.
--
-- O que a troca vale: UMA ocorrência, do período CORRENTE — o dia, pras
-- tarefas diárias; a semana, pras semanais; o mês, pras mensais. É isso que
-- a coluna `periodo` guarda (a data de início da janela, calculada por
-- inicioDaJanela em src/lib/periodos.ts). Quando o período vira, a tarefa
-- volta sozinha pro dono de sempre, sem precisar desfazer nada — igual ao
-- rodízio das compartilhadas, que também não guarda estado.
--
-- Numa tarefa que acontece várias vezes por dia (lavar a louça é 3×), cada
-- pedido aceito passa UMA das vezes: André fica com 2, Hugo com as dele + 1.
--
-- Só vale pra tarefas obrigatórias. As de bônus não têm dono nem obrigação
-- — quem quiser fazer, faz.
--
-- Nada aqui mexe em histórico: a tabela só registra combinados a partir de
-- agora, e os eventos já lançados (valores, saldos, confirmações) seguem
-- exatamente como estão.

create table if not exists public.pedidos_de_troca (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  task_id uuid not null references public.task_catalog(id) on delete cascade,
  de_profile_id uuid not null references public.profiles(id) on delete cascade,   -- quem pediu
  para_profile_id uuid not null references public.profiles(id) on delete cascade, -- quem foi convidado
  periodo date not null, -- início da janela da tarefa (dia / segunda-feira / dia 1)
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado')),
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  constraint pedido_para_outra_crianca check (de_profile_id <> para_profile_id)
);

create index if not exists idx_trocas_family on public.pedidos_de_troca(family_id);
create index if not exists idx_trocas_periodo on public.pedidos_de_troca(periodo);
create index if not exists idx_trocas_para on public.pedidos_de_troca(para_profile_id);
create index if not exists idx_trocas_task on public.pedidos_de_troca(task_id);

alter table public.pedidos_de_troca enable row level security;

drop policy if exists "trocas só da própria família" on public.pedidos_de_troca;
create policy "trocas só da própria família" on public.pedidos_de_troca
  for all using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

grant select, insert, update, delete on public.pedidos_de_troca to authenticated;

-- REPLICA IDENTITY FULL: sem isso, o aviso de DELETE (André cancelando o
-- pedido antes de Hugo responder) sairia só com a chave primária, o filtro
-- por família não casaria e a tela de Hugo não atualizaria sozinha — foi
-- exatamente o problema resolvido na migração 009.
alter table public.pedidos_de_troca replica identity full;

-- Idempotente: rodar este arquivo duas vezes não pode dar erro.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pedidos_de_troca'
  ) then
    alter publication supabase_realtime add table public.pedidos_de_troca;
  end if;
end
$$;
