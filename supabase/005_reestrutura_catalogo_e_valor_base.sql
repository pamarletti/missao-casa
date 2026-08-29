-- Reestruturação completa do catálogo de tarefas com base na versão final
-- de claude/lista-de-tarefas.md (taxa recalibrada para R$0,0718/minuto de
-- peso, obrigatórias somando exatamente R$90/mês por menino) + suporte a:
--   1) "valor base" mensal das obrigatórias, ajustável pelo responsável
--      (recalcula todas as tarefas obrigatórias proporcionalmente);
--   2) tarefas diárias que não valem na sexta/sábado (não tem aula, então
--      não tem o que fazer nem o que descontar).
--
-- Seguro rodar mais de uma vez: updates são idempotentes e os inserts
-- checam antes se a tarefa já existe para aquela família.

-- ──────────────────────────────────────────────────────────────
-- 1) Novas colunas
-- ──────────────────────────────────────────────────────────────

alter table public.families add column if not exists valor_base_obrigatorias numeric(10,2) not null default 90.00;
alter table public.task_catalog add column if not exists pula_fim_de_semana boolean not null default false;

-- ──────────────────────────────────────────────────────────────
-- 2) Individuais — correção de nomes e valores
-- ──────────────────────────────────────────────────────────────

update public.task_catalog set valor_unitario = 0.20 where name = 'Arrumar a própria cama';
update public.task_catalog set valor_unitario = 0.15 where name = 'Separar a roupa suja e colocar no cesto';
update public.task_catalog set name = 'Cuidar da roupa da escola (incluindo meia e sapato) do dia seguinte', valor_unitario = 0.30, pula_fim_de_semana = true
  where name = 'Cuidar da roupa da escola do dia seguinte';
update public.task_catalog set valor_unitario = 0.40, pula_fim_de_semana = true where name = 'Arrumar a mochila para o dia seguinte';
update public.task_catalog set valor_unitario = 0.15 where name = 'Guardar os próprios sapatos';
update public.task_catalog set name = 'Organizar brinquedos e objetos pessoais pela casa', valor_unitario = 0.35
  where name = 'Organizar brinquedos e objetos pessoais';
update public.task_catalog set valor_unitario = 0.15 where name = 'Lavar/guardar o próprio prato';
update public.task_catalog set valor_unitario = 0.85 where name = 'Trocar a roupa de cama pessoal';
update public.task_catalog set valor_unitario = 0.35 where name = 'Separar roupas para lavar';
update public.task_catalog set valor_unitario = 0.70 where name = 'Guardar a própria roupa limpa no lugar';
update public.task_catalog set valor_unitario = 0.85 where name = 'Manter o próprio skate e EPIs higienizados';
update public.task_catalog set valor_unitario = 0.85 where name = 'Lavar toalhas de banho';
update public.task_catalog set name = 'Tirar toalhas de banho', valor_unitario = 0.35 where name = 'Trocar toalhas de banho';
update public.task_catalog set valor_unitario = 0.35 where name = 'Guardar toalhas limpas';

-- Saíram da lista (lavar/secar/dobrar a própria roupa viraram tarefas
-- coletivas, separadas por cor; "guardar objetos pessoais usados no dia"
-- foi removida). Desativa em vez de apagar, pra preservar o histórico de
-- quem já fez essas tarefas antes.
update public.task_catalog set ativo = false where name in (
  'Guardar objetos pessoais usados no dia',
  'Lavar a própria roupa (máquina)',
  'Secar a própria roupa',
  'Dobrar a própria roupa'
);

-- Nova tarefa individual
insert into public.task_catalog (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario, ocorrencias_por_dia)
select f.id, 'Limpar o próprio tênis', 'individual', null, 'semanal', 10, 1, 0.70, 1
from public.families f
where not exists (
  select 1 from public.task_catalog t where t.family_id = f.id and t.name = 'Limpar o próprio tênis'
);

-- ──────────────────────────────────────────────────────────────
-- 3) Individual-coletivas — correção de nomes e valores (já por menino)
-- ──────────────────────────────────────────────────────────────

update public.task_catalog set valor_unitario = 0.20 where name = 'Manter o quarto arrumado no geral';
update public.task_catalog set name = 'Abrir a janela', valor_unitario = 0.05 where name = 'Arejar o quarto';
update public.task_catalog set valor_unitario = 0.45 where name = 'Varrer e passar pano no chão do quarto';
update public.task_catalog set valor_unitario = 0.75 where name = 'Organizar o guarda-roupa compartilhado';
update public.task_catalog set name = 'Organizar armário do quarto', valor_unitario = 0.45
  where name = 'Organizar objetos/brinquedos comuns do quarto';

insert into public.task_catalog (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario, ocorrencias_por_dia)
select f.id, 'Organizar estante do quarto', 'individual_coletiva', null, 'semanal', 10, 1, 0.35, 1
from public.families f
where not exists (
  select 1 from public.task_catalog t where t.family_id = f.id and t.name = 'Organizar estante do quarto'
);

-- ──────────────────────────────────────────────────────────────
-- 4) Coletivas — nova taxa (R$0,0718/min), todos os valores mudam
-- ──────────────────────────────────────────────────────────────

update public.task_catalog set valor_unitario = 0.85 where name = 'Fazer a lista de compras da feira/mercado';
update public.task_catalog set valor_unitario = 1.40 where name = 'Planejar o cardápio da semana';
update public.task_catalog set valor_unitario = 0.70 where name = 'Conferir a validade dos alimentos';
update public.task_catalog set valor_unitario = 1.25 where name = 'Organizar a despensa';
update public.task_catalog set valor_unitario = 1.65 where name = 'Guardar as compras nos armários e na geladeira';

-- Correção: essas 8 tarefas de "Preparo de refeições" e "Limpeza da
-- cozinha" acontecem mais de uma vez por dia (a cada refeição, ou 2x/dia
-- no caso das panelas e da sala) — o catálogo antigo tinha isso zerado em
-- 1x/dia por engano, o que sub-contava o potencial de bônus.
update public.task_catalog set valor_unitario = 0.20, ocorrencias_por_dia = 3 where name = 'Pôr a mesa';
update public.task_catalog set valor_unitario = 1.25 where name = 'Fazer café da manhã';
update public.task_catalog set valor_unitario = 0.85 where name = 'Preparar lanche coletivo';
update public.task_catalog set valor_unitario = 3.75 where name = 'Fazer almoço';
update public.task_catalog set valor_unitario = 2.80 where name = 'Fazer jantar';
update public.task_catalog set valor_unitario = 0.20, ocorrencias_por_dia = 3 where name = 'Tirar a mesa';

update public.task_catalog set valor_unitario = 0.20 where name = 'Tirar o lixo da cozinha';
update public.task_catalog set valor_unitario = 0.35, ocorrencias_por_dia = 3 where name = 'Limpar a bancada e a pia da cozinha';
update public.task_catalog set valor_unitario = 0.40 where name = 'Limpar o fogão';
update public.task_catalog set valor_unitario = 1.25, ocorrencias_por_dia = 3 where name = 'Lavar a louça';
update public.task_catalog set valor_unitario = 0.70, ocorrencias_por_dia = 3 where name = 'Enxugar a louça';
update public.task_catalog set valor_unitario = 0.35, ocorrencias_por_dia = 3 where name = 'Guardar a louça';
update public.task_catalog set valor_unitario = 0.85, ocorrencias_por_dia = 2 where name = 'Lavar panelas e utensílios maiores';
update public.task_catalog set valor_unitario = 0.70 where name = 'Varrer e passar pano no chão da cozinha';
update public.task_catalog set valor_unitario = 0.70 where name = 'Limpar micro-ondas';
update public.task_catalog set valor_unitario = 1.25 where name = 'Limpar a geladeira por dentro';

update public.task_catalog set valor_unitario = 0.85 where name = 'Lavar roupa de cama';
update public.task_catalog set valor_unitario = 0.70 where name = 'Secar roupa de cama';
update public.task_catalog set valor_unitario = 1.25 where name = 'Dobrar roupa de cama';
update public.task_catalog set valor_unitario = 0.35 where name = 'Guardar roupa de cama';
update public.task_catalog set valor_unitario = 1.25 where name = 'Trocar a roupa de cama (áreas comuns)';
update public.task_catalog set valor_unitario = 0.35 where name = 'Lavar panos de prato';
update public.task_catalog set valor_unitario = 0.35 where name = 'Lavar panos de chão';

update public.task_catalog set valor_unitario = 0.40 where name = 'Limpar o vaso sanitário';
update public.task_catalog set valor_unitario = 0.20 where name = 'Limpar a pia do banheiro';
update public.task_catalog set valor_unitario = 0.35 where name = 'Varrer e passar pano no chão do banheiro';
update public.task_catalog set valor_unitario = 0.15 where name = 'Esvaziar a lixeira do banheiro';
update public.task_catalog set valor_unitario = 1.25 where name = 'Limpar o box/chuveiro';
update public.task_catalog set valor_unitario = 0.35 where name = 'Limpar o espelho';
update public.task_catalog set valor_unitario = 0.15 where name = 'Repor sabonete e shampoo';
update public.task_catalog set valor_unitario = 0.70 where name = 'Organizar o armário do banheiro';

update public.task_catalog set valor_unitario = 0.70, ocorrencias_por_dia = 2 where name = 'Organizar a sala (almofadas, objetos, controles)';
update public.task_catalog set valor_unitario = 1.10 where name = 'Varrer e passar pano no chão da sala';
update public.task_catalog set valor_unitario = 0.35 where name = 'Regar plantas';
update public.task_catalog set valor_unitario = 0.35 where name = 'Organizar mesa(s)';
update public.task_catalog set valor_unitario = 1.10 where name = 'Tirar o pó dos móveis';
update public.task_catalog set valor_unitario = 1.25 where name = 'Limpar janelas e espelhos';
update public.task_catalog set valor_unitario = 0.70 where name = 'Organizar estantes e armários do rack';
update public.task_catalog set valor_unitario = 0.70 where name = 'Limpar interruptores, maçanetas e superfícies de toque';
update public.task_catalog set valor_unitario = 0.85 where name = 'Podar e limpar plantas';

update public.task_catalog set valor_unitario = 0.20 where name = 'Recolher o lixo da cozinha';
update public.task_catalog set valor_unitario = 0.15 where name = 'Recolher o lixo dos banheiros';
update public.task_catalog set valor_unitario = 0.85 where name = 'Lavar as lixeiras periodicamente';

update public.task_catalog set valor_unitario = 1.25 where name = 'Organizar e limpar despensa';
update public.task_catalog set valor_unitario = 0.70 where name = 'Conferir e repor itens de limpeza';
update public.task_catalog set valor_unitario = 0.85 where name = 'Organizar armário de ferramentas';
update public.task_catalog set valor_unitario = 0.70 where name = 'Organizar armário da área de serviço';

update public.task_catalog set name = 'Separar roupas pequenas ou que não servem mais para doação', valor_unitario = 1.10
  where name = 'Separar roupas pequenas para doação';
update public.task_catalog set valor_unitario = 0.70 where name = 'Organizar o armário de remédios/primeiros socorros';

-- Novas coletivas: lavanderia da casa separada por cor de roupa
insert into public.task_catalog (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario, ocorrencias_por_dia)
select f.id, v.name, 'coletiva', 'Roupa da casa', 'semanal', v.tempo_min, v.nivel, v.valor_unitario, 1
from public.families f
cross join (values
  ('Lavar roupas brancas', 10, 2, 0.85),
  ('Lavar roupas coloridas', 10, 2, 0.85),
  ('Lavar roupas escuras', 10, 2, 0.85),
  ('Secar roupas brancas', 10, 1, 0.70),
  ('Secar roupas coloridas', 10, 1, 0.70),
  ('Secar roupas escuras', 10, 1, 0.70),
  ('Dobrar roupas brancas', 15, 2, 1.25),
  ('Dobrar roupas coloridas', 15, 2, 1.25),
  ('Dobrar roupas escuras', 15, 2, 1.25)
) as v(name, tempo_min, nivel, valor_unitario)
where not exists (
  select 1 from public.task_catalog t where t.family_id = f.id and t.name = v.name
);

-- Conferência: some os valores mensais das tarefas obrigatórias
-- (individual + individual-coletiva, considerando pula_fim_de_semana) e
-- confirme que dá R$90,00 por menino.
-- select
--   sum(case
--     when frequencia = 'diaria' then valor_unitario * ocorrencias_por_dia * (case when pula_fim_de_semana then 20 else 30 end)
--     when frequencia = 'semanal' then valor_unitario * 4
--     else 0
--   end) as total_mensal_obrigatorias
-- from public.task_catalog
-- where categoria in ('individual', 'individual_coletiva') and ativo = true;

-- ──────────────────────────────────────────────────────────────
-- 5) Catálogo padrão para famílias novas — versão final, já com
--    pula_fim_de_semana embutido
-- ──────────────────────────────────────────────────────────────

create or replace function public.seed_default_catalog(p_family_id uuid)
returns void
language sql
as $$
  insert into public.task_catalog
    (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario, ocorrencias_por_dia, pula_fim_de_semana)
  values
    -- Individuais
    (p_family_id, 'Arrumar a própria cama', 'individual', null, 'diaria', 3, 1, 0.20, 1, false),
    (p_family_id, 'Separar a roupa suja e colocar no cesto', 'individual', null, 'diaria', 2, 1, 0.15, 1, false),
    (p_family_id, 'Pendurar a própria toalha de banho', 'individual', null, 'diaria', 1, 1, 0.05, 1, false),
    (p_family_id, 'Guardar os próprios sapatos', 'individual', null, 'diaria', 2, 1, 0.15, 1, false),
    (p_family_id, 'Organizar brinquedos e objetos pessoais pela casa', 'individual', null, 'diaria', 5, 1, 0.35, 1, false),
    (p_family_id, 'Lavar/guardar o próprio prato', 'individual', null, 'diaria', 2, 1, 0.15, 3, false),
    (p_family_id, 'Cuidar da roupa da escola (incluindo meia e sapato) do dia seguinte', 'individual', null, 'diaria', 4, 1, 0.30, 1, true),
    (p_family_id, 'Arrumar a mochila para o dia seguinte', 'individual', null, 'diaria', 5, 2, 0.40, 1, true),
    (p_family_id, 'Trocar a roupa de cama pessoal', 'individual', null, 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Separar roupas para lavar', 'individual', null, 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Guardar a própria roupa limpa no lugar', 'individual', null, 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Manter o próprio skate e EPIs higienizados', 'individual', null, 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Lavar toalhas de banho', 'individual', null, 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Tirar toalhas de banho', 'individual', null, 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Guardar toalhas limpas', 'individual', null, 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Limpar o próprio tênis', 'individual', null, 'semanal', 10, 1, 0.70, 1, false),

    -- Individual-coletivas (valor já por menino)
    (p_family_id, 'Manter o quarto arrumado no geral', 'individual_coletiva', null, 'diaria', 5, 1, 0.20, 1, false),
    (p_family_id, 'Abrir a janela', 'individual_coletiva', null, 'diaria', 1, 1, 0.05, 1, false),
    (p_family_id, 'Varrer e passar pano no chão do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.45, 1, false),
    (p_family_id, 'Organizar o guarda-roupa compartilhado', 'individual_coletiva', null, 'semanal', 15, 3, 0.75, 1, false),
    (p_family_id, 'Organizar armário do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.45, 1, false),
    (p_family_id, 'Organizar estante do quarto', 'individual_coletiva', null, 'semanal', 10, 1, 0.35, 1, false),

    -- Coletivas: Planejamento e compras
    (p_family_id, 'Fazer a lista de compras da feira/mercado', 'coletiva', 'Planejamento e compras', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Planejar o cardápio da semana', 'coletiva', 'Planejamento e compras', 'semanal', 15, 3, 1.40, 1, false),
    (p_family_id, 'Conferir a validade dos alimentos', 'coletiva', 'Planejamento e compras', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Organizar a despensa', 'coletiva', 'Planejamento e compras', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Guardar as compras nos armários e na geladeira', 'coletiva', 'Planejamento e compras', 'semanal', 20, 2, 1.65, 1, false),

    -- Coletivas: Preparo de refeições
    (p_family_id, 'Pôr a mesa', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 3, false),
    (p_family_id, 'Fazer café da manhã', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, false),
    (p_family_id, 'Preparar lanche coletivo', 'coletiva', 'Preparo de refeições', 'diaria', 10, 2, 0.85, 1, false),
    (p_family_id, 'Fazer almoço', 'coletiva', 'Preparo de refeições', 'diaria', 40, 3, 3.75, 1, false),
    (p_family_id, 'Fazer jantar', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, false),
    (p_family_id, 'Tirar a mesa', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 3, false),

    -- Coletivas: Limpeza da cozinha
    (p_family_id, 'Tirar o lixo da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 3, 1, 0.20, 1, false),
    (p_family_id, 'Limpar a bancada e a pia da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 1, 0.35, 3, false),
    (p_family_id, 'Limpar o fogão', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 2, 0.40, 1, false),
    (p_family_id, 'Lavar a louça', 'coletiva', 'Limpeza da cozinha', 'diaria', 15, 2, 1.25, 3, false),
    (p_family_id, 'Enxugar a louça', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 1, 0.70, 3, false),
    (p_family_id, 'Guardar a louça', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 1, 0.35, 3, false),
    (p_family_id, 'Lavar panelas e utensílios maiores', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 2, 0.85, 2, false),
    (p_family_id, 'Varrer e passar pano no chão da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 1, 0.70, 1, false),
    (p_family_id, 'Limpar micro-ondas', 'coletiva', 'Limpeza da cozinha', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Limpar a geladeira por dentro', 'coletiva', 'Limpeza da cozinha', 'semanal', 15, 2, 1.25, 1, false),

    -- Coletivas: Roupa da casa
    (p_family_id, 'Lavar roupas brancas', 'coletiva', 'Roupa da casa', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Lavar roupas coloridas', 'coletiva', 'Roupa da casa', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Lavar roupas escuras', 'coletiva', 'Roupa da casa', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Secar roupas brancas', 'coletiva', 'Roupa da casa', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Secar roupas coloridas', 'coletiva', 'Roupa da casa', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Secar roupas escuras', 'coletiva', 'Roupa da casa', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Dobrar roupas brancas', 'coletiva', 'Roupa da casa', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Dobrar roupas coloridas', 'coletiva', 'Roupa da casa', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Dobrar roupas escuras', 'coletiva', 'Roupa da casa', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Lavar roupa de cama', 'coletiva', 'Roupa da casa', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Secar roupa de cama', 'coletiva', 'Roupa da casa', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Dobrar roupa de cama', 'coletiva', 'Roupa da casa', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Guardar roupa de cama', 'coletiva', 'Roupa da casa', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Trocar a roupa de cama (áreas comuns)', 'coletiva', 'Roupa da casa', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Lavar panos de prato', 'coletiva', 'Roupa da casa', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Lavar panos de chão', 'coletiva', 'Roupa da casa', 'semanal', 5, 1, 0.35, 1, false),

    -- Coletivas: Banheiro
    (p_family_id, 'Limpar o vaso sanitário', 'coletiva', 'Banheiro', 'diaria', 5, 2, 0.40, 1, false),
    (p_family_id, 'Limpar a pia do banheiro', 'coletiva', 'Banheiro', 'diaria', 3, 1, 0.20, 1, false),
    (p_family_id, 'Varrer e passar pano no chão do banheiro', 'coletiva', 'Banheiro', 'diaria', 5, 1, 0.35, 1, false),
    (p_family_id, 'Repor papel higiênico', 'coletiva', 'Banheiro', 'diaria', 1, 1, 0.05, 1, false),
    (p_family_id, 'Esvaziar a lixeira do banheiro', 'coletiva', 'Banheiro', 'diaria', 2, 1, 0.15, 1, false),
    (p_family_id, 'Limpar o box/chuveiro', 'coletiva', 'Banheiro', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Limpar o espelho', 'coletiva', 'Banheiro', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Repor sabonete e shampoo', 'coletiva', 'Banheiro', 'semanal', 2, 1, 0.15, 1, false),
    (p_family_id, 'Organizar o armário do banheiro', 'coletiva', 'Banheiro', 'semanal', 10, 1, 0.70, 1, false),

    -- Coletivas: Sala e áreas comuns
    (p_family_id, 'Organizar a sala (almofadas, objetos, controles)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.70, 2, false),
    (p_family_id, 'Varrer e passar pano no chão da sala', 'coletiva', 'Sala e áreas comuns', 'diaria', 15, 1, 1.10, 1, false),
    (p_family_id, 'Regar plantas', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, false),
    (p_family_id, 'Organizar mesa(s)', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, false),
    (p_family_id, 'Tirar o pó dos móveis', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 1, 1.10, 1, false),
    (p_family_id, 'Limpar janelas e espelhos', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Organizar estantes e armários do rack', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Limpar interruptores, maçanetas e superfícies de toque', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Podar e limpar plantas', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 2, 0.85, 1, false),

    -- Coletivas: Lixo e reciclagem
    (p_family_id, 'Recolher o lixo da cozinha', 'coletiva', 'Lixo e reciclagem', 'diaria', 3, 1, 0.20, 1, false),
    (p_family_id, 'Recolher o lixo dos banheiros', 'coletiva', 'Lixo e reciclagem', 'diaria', 2, 1, 0.15, 1, false),
    (p_family_id, 'Lavar as lixeiras periodicamente', 'coletiva', 'Lixo e reciclagem', 'semanal', 10, 2, 0.85, 1, false),

    -- Coletivas: Área de Serviço
    (p_family_id, 'Organizar e limpar despensa', 'coletiva', 'Área de Serviço', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Conferir e repor itens de limpeza', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Organizar armário de ferramentas', 'coletiva', 'Área de Serviço', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Organizar armário da área de serviço', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, false),

    -- Coletivas: Fora do ritmo (mensal)
    (p_family_id, 'Separar roupas pequenas ou que não servem mais para doação', 'coletiva', 'Fora do ritmo', 'mensal', 15, 1, 1.10, 1, false),
    (p_family_id, 'Organizar o armário de remédios/primeiros socorros', 'coletiva', 'Fora do ritmo', 'mensal', 10, 1, 0.70, 1, false);
$$;
