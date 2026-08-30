-- Planilha "Coeficientes das Tarefas" (Google Sheets) passa a ser a base do
-- catálogo. Rodar DEPOIS da 010.
--
-- Nada do que os meninos já fizeram muda: as tarefas são renomeadas na
-- própria linha (mesmo id, histórico e saldo intactos), nenhum valor, tempo
-- ou nível é alterado — conferido item a item, a planilha bate exatamente
-- com os coeficientes que já estavam no app — e nada é apagado. Rodar duas
-- vezes não faz mal.
--
-- A planilha traz três classificações novas (Tipo, Finalidade, Cômodo/Área).
-- Elas são gravadas agora em colunas próprias, mas ainda NÃO mudam nada na
-- tela: a reorganização do site virá depois, quando a Paolla definir como.
--
-- Duas divergências da planilha foram mantidas de propósito, conforme
-- combinado na conversa:
--   * "Tirar toalha de banho suja" — a planilha voltou ao nome antigo
--     ("Tirar toalhas de banho") por engano;
--   * "Varrer e passar pano no chão da sala" — na planilha o nome é só
--     "Varrer e passar pano no chão", que ficaria ambíguo ao lado das
--     versões do quarto, da cozinha e do banheiro.

-- ── 1. Colunas novas ────────────────────────────────────────────
alter table public.task_catalog add column if not exists tipo text;
alter table public.task_catalog add column if not exists finalidade text;
alter table public.task_catalog add column if not exists comodo text;

comment on column public.task_catalog.tipo is 'Obrigatória | Facultativa (planilha)';
comment on column public.task_catalog.finalidade is 'Para mim | Compartilhadas | Para a família (planilha)';
comment on column public.task_catalog.comodo is 'Cômodo/Área da planilha';

-- ── 2. Renomeações ──────────────────────────────────────────────
update public.task_catalog set name = 'Lavar/guardar o próprio prato em cada refeição (café, almoço e jantar)' where name in ('Lavar/guardar o próprio prato');
update public.task_catalog set name = 'Fazer lanche para si' where name in ('Preparar lanche para si');
update public.task_catalog set name = 'Fazer lanche para a família' where name in ('Preparar lanche para a família', 'Preparar lanche coletivo');
update public.task_catalog set name = 'Lavar louça da família' where name in ('Lavar a louça');
update public.task_catalog set name = 'Secar louça da família' where name in ('Enxugar a louça');
update public.task_catalog set name = 'Guardar louça da família' where name in ('Guardar a louça');
update public.task_catalog set name = 'Colocar mesa (Refeições em família)' where name in ('Pôr a mesa');

-- ── 3. Classificações, tarefa por tarefa ────────────────────────
update public.task_catalog t
set tipo = v.tipo, finalidade = v.finalidade, comodo = v.comodo
from (values
  ('Arrumar a própria cama', 'Obrigatória', 'Para mim', 'Quarto'),
  ('Colocar roupa suja no cesto', 'Obrigatória', 'Para mim', 'Quarto'),
  ('Pendurar a própria toalha de banho', 'Obrigatória', 'Para mim', 'Banheiro'),
  ('Guardar os próprios sapatos', 'Obrigatória', 'Para mim', 'Quarto'),
  ('Organizar brinquedos e objetos pessoais pela casa', 'Obrigatória', 'Para mim', 'Geral (casa toda)'),
  ('Lavar/guardar o próprio prato em cada refeição (café, almoço e jantar)', 'Obrigatória', 'Para mim', 'Cozinha'),
  ('Cuidar da roupa da escola (incluindo meia e sapato) do dia seguinte', 'Obrigatória', 'Para mim', 'Quarto'),
  ('Arrumar a mochila para o dia seguinte', 'Obrigatória', 'Para mim', 'Quarto'),
  ('Trocar a roupa de cama pessoal', 'Obrigatória', 'Para mim', 'Quarto'),
  ('Separar roupas para lavar', 'Obrigatória', 'Para mim', 'Quarto'),
  ('Guardar a própria roupa limpa no lugar', 'Obrigatória', 'Para mim', 'Quarto'),
  ('Manter o próprio skate e EPIs higienizados', 'Obrigatória', 'Para mim', 'Área de Serviço'),
  ('Lavar toalha de banho', 'Obrigatória', 'Para mim', 'Lavanderia'),
  ('Tirar toalha de banho suja', 'Obrigatória', 'Para mim', 'Banheiro'),
  ('Guardar toalha limpa', 'Obrigatória', 'Para mim', 'Banheiro'),
  ('Limpar o próprio tênis', 'Obrigatória', 'Para mim', 'Área de Serviço'),
  ('Manter o quarto arrumado no geral', 'Obrigatória', 'Compartilhadas', 'Quarto'),
  ('Abrir a janela', 'Obrigatória', 'Compartilhadas', 'Quarto'),
  ('Varrer e passar pano no chão do quarto', 'Obrigatória', 'Compartilhadas', 'Quarto'),
  ('Organizar o guarda-roupa', 'Obrigatória', 'Compartilhadas', 'Quarto'),
  ('Organizar armário do quarto', 'Obrigatória', 'Compartilhadas', 'Quarto'),
  ('Organizar estante do quarto', 'Obrigatória', 'Compartilhadas', 'Quarto'),
  ('Fazer a lista de compras da feira/mercado', 'Facultativa', 'Para a família', 'Planejamento e compras'),
  ('Planejar o cardápio da semana', 'Facultativa', 'Para a família', 'Planejamento e compras'),
  ('Conferir a validade dos alimentos', 'Facultativa', 'Para a família', 'Planejamento e compras'),
  ('Guardar as compras nos armários e na geladeira', 'Facultativa', 'Para a família', 'Planejamento e compras'),
  ('Colocar mesa (Refeições em família)', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Fazer café da manhã para a família', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Fazer lanche para a família', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Fazer almoço para a família', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Fazer jantar para a família', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Tirar a mesa', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Tirar o lixo da cozinha', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Limpar a bancada e a pia da cozinha', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Limpar o fogão', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Lavar louça da família', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Secar louça da família', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Guardar louça da família', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Lavar panelas e utensílios maiores', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Varrer e passar pano no chão da cozinha', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Limpar micro-ondas', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Limpar a geladeira por dentro', 'Facultativa', 'Para a família', 'Cozinha'),
  ('Lavar roupas brancas', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Lavar roupas coloridas', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Lavar roupas escuras', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Secar roupas brancas', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Secar roupas coloridas', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Secar roupas escuras', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Dobrar roupas brancas', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Dobrar roupas coloridas', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Dobrar roupas escuras', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Lavar roupa de cama', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Secar roupa de cama', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Dobrar roupa de cama', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Guardar roupa de cama', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Trocar a roupa de cama (áreas comuns)', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Lavar panos de prato', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Lavar panos de chão', 'Facultativa', 'Para a família', 'Lavanderia'),
  ('Limpar o vaso sanitário', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Limpar a pia do banheiro', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Varrer e passar pano no chão do banheiro', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Repor papel higiênico', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Esvaziar a lixeira do banheiro', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Limpar o box/chuveiro', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Limpar o espelho', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Repor sabonete e shampoo', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Organizar o armário do banheiro', 'Facultativa', 'Para a família', 'Banheiro'),
  ('Organizar a sala (almofadas, objetos, controles)', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Varrer e passar pano no chão da sala', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Regar plantas', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Organizar mesa(s)', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Tirar o pó dos móveis', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Limpar janelas e espelhos', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Organizar estantes e armários do rack', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Limpar interruptores, maçanetas e superfícies de toque', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Podar e limpar plantas', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Lavar as lixeiras periodicamente', 'Facultativa', 'Para a família', 'Lixo e reciclagem'),
  ('Organizar e limpar despensa', 'Facultativa', 'Para a família', 'Planejamento e compras'),
  ('Conferir e repor itens de limpeza', 'Facultativa', 'Para a família', 'Área de Serviço'),
  ('Organizar armário de ferramentas', 'Facultativa', 'Para a família', 'Área de Serviço'),
  ('Organizar armário da área de serviço', 'Facultativa', 'Para a família', 'Área de Serviço'),
  ('Separar roupas pequenas ou que não servem mais para doação', 'Facultativa', 'Para a família', 'Extra'),
  ('Organizar o armário de remédios/primeiros socorros', 'Facultativa', 'Para a família', 'Extra'),
  ('Fazer café da manhã para si', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Fazer almoço para si', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Fazer jantar para si', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Fazer lanche para si', 'Facultativa', 'Para a família', 'Preparo de refeições'),
  ('Arrumar o sofá', 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
  ('Regar plantas do quintal/jardim', 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)'),
  ('Varrer quintal, garagem ou varanda', 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)'),
  ('Podar e limpar plantas do quintal/jardim', 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)'),
  ('Organizar objetos guardados na área externa', 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)'),
  ('Alimentar o(s) pet(s)', 'Facultativa', 'Para a família', 'Pets'),
  ('Trocar a água do pet', 'Facultativa', 'Para a família', 'Pets'),
  ('Passear com o cachorro', 'Facultativa', 'Para a família', 'Pets'),
  ('Limpar a caixa de areia/local do pet', 'Facultativa', 'Para a família', 'Pets'),
  ('Escovar o pet', 'Facultativa', 'Para a família', 'Pets')
) as v(nome, tipo, finalidade, comodo)
where t.name = v.nome;

-- ── 4. Catálogo padrão das famílias novas ───────────────────────
create or replace function public.seed_default_catalog(p_family_id uuid)
returns void
language sql
as $$
  insert into public.task_catalog
    (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario,
     ocorrencias_por_dia, pula_fim_de_semana, tipo, finalidade, comodo)
  values
    (p_family_id, 'Arrumar a própria cama', 'individual', null, 'diaria', 3, 1, 0.20, 1, false, 'Obrigatória', 'Para mim', 'Quarto'),
    (p_family_id, 'Colocar roupa suja no cesto', 'individual', null, 'diaria', 2, 1, 0.15, 1, false, 'Obrigatória', 'Para mim', 'Quarto'),
    (p_family_id, 'Pendurar a própria toalha de banho', 'individual', null, 'diaria', 1, 1, 0.05, 1, false, 'Obrigatória', 'Para mim', 'Banheiro'),
    (p_family_id, 'Guardar os próprios sapatos', 'individual', null, 'diaria', 2, 1, 0.15, 1, false, 'Obrigatória', 'Para mim', 'Quarto'),
    (p_family_id, 'Organizar brinquedos e objetos pessoais pela casa', 'individual', null, 'diaria', 5, 1, 0.35, 1, false, 'Obrigatória', 'Para mim', 'Geral (casa toda)'),
    (p_family_id, 'Lavar/guardar o próprio prato em cada refeição (café, almoço e jantar)', 'individual', null, 'diaria', 2, 1, 0.15, 3, false, 'Obrigatória', 'Para mim', 'Cozinha'),
    (p_family_id, 'Cuidar da roupa da escola (incluindo meia e sapato) do dia seguinte', 'individual', null, 'diaria', 4, 1, 0.30, 1, true, 'Obrigatória', 'Para mim', 'Quarto'),
    (p_family_id, 'Arrumar a mochila para o dia seguinte', 'individual', null, 'diaria', 5, 2, 0.40, 1, true, 'Obrigatória', 'Para mim', 'Quarto'),
    (p_family_id, 'Trocar a roupa de cama pessoal', 'individual', null, 'semanal', 10, 2, 0.85, 1, false, 'Obrigatória', 'Para mim', 'Quarto'),
    (p_family_id, 'Separar roupas para lavar', 'individual', null, 'semanal', 5, 1, 0.35, 1, false, 'Obrigatória', 'Para mim', 'Quarto'),
    (p_family_id, 'Guardar a própria roupa limpa no lugar', 'individual', null, 'semanal', 10, 1, 0.70, 1, false, 'Obrigatória', 'Para mim', 'Quarto'),
    (p_family_id, 'Manter o próprio skate e EPIs higienizados', 'individual', null, 'semanal', 10, 2, 0.85, 1, false, 'Obrigatória', 'Para mim', 'Área de Serviço'),
    (p_family_id, 'Lavar toalha de banho', 'individual', null, 'semanal', 10, 2, 0.85, 1, false, 'Obrigatória', 'Para mim', 'Lavanderia'),
    (p_family_id, 'Tirar toalha de banho suja', 'individual', null, 'semanal', 5, 1, 0.35, 1, false, 'Obrigatória', 'Para mim', 'Banheiro'),
    (p_family_id, 'Guardar toalha limpa', 'individual', null, 'semanal', 5, 1, 0.35, 1, false, 'Obrigatória', 'Para mim', 'Banheiro'),
    (p_family_id, 'Limpar o próprio tênis', 'individual', null, 'semanal', 10, 1, 0.70, 1, false, 'Obrigatória', 'Para mim', 'Área de Serviço'),
    (p_family_id, 'Manter o quarto arrumado no geral', 'individual_coletiva', null, 'diaria', 5, 1, 0.20, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto'),
    (p_family_id, 'Abrir a janela', 'individual_coletiva', null, 'diaria', 1, 1, 0.05, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto'),
    (p_family_id, 'Varrer e passar pano no chão do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.45, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto'),
    (p_family_id, 'Organizar o guarda-roupa', 'individual_coletiva', null, 'semanal', 15, 3, 0.75, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto'),
    (p_family_id, 'Organizar armário do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.45, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto'),
    (p_family_id, 'Organizar estante do quarto', 'individual_coletiva', null, 'semanal', 10, 1, 0.35, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto'),
    (p_family_id, 'Fazer a lista de compras da feira/mercado', 'coletiva', 'Planejamento e compras', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras'),
    (p_family_id, 'Planejar o cardápio da semana', 'coletiva', 'Planejamento e compras', 'semanal', 15, 3, 1.40, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras'),
    (p_family_id, 'Conferir a validade dos alimentos', 'coletiva', 'Planejamento e compras', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras'),
    (p_family_id, 'Guardar as compras nos armários e na geladeira', 'coletiva', 'Planejamento e compras', 'semanal', 20, 2, 1.65, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras'),
    (p_family_id, 'Colocar mesa (Refeições em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 3, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Fazer café da manhã para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 2, 2.50, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Fazer lanche para a família', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Fazer almoço para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Fazer jantar para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Tirar a mesa', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 3, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Tirar o lixo da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Limpar a bancada e a pia da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 1, 0.35, 3, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Limpar o fogão', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 2, 0.40, 1, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Lavar louça da família', 'coletiva', 'Limpeza da cozinha', 'diaria', 15, 2, 1.25, 3, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Secar louça da família', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 1, 0.70, 3, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Guardar louça da família', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 1, 0.35, 3, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Lavar panelas e utensílios maiores', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 2, 0.85, 2, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Varrer e passar pano no chão da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Limpar micro-ondas', 'coletiva', 'Limpeza da cozinha', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Limpar a geladeira por dentro', 'coletiva', 'Limpeza da cozinha', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Cozinha'),
    (p_family_id, 'Lavar roupas brancas', 'coletiva', 'Roupas da família', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Lavar roupas coloridas', 'coletiva', 'Roupas da família', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Lavar roupas escuras', 'coletiva', 'Roupas da família', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Secar roupas brancas', 'coletiva', 'Roupas da família', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Secar roupas coloridas', 'coletiva', 'Roupas da família', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Secar roupas escuras', 'coletiva', 'Roupas da família', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Dobrar roupas brancas', 'coletiva', 'Roupas da família', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Dobrar roupas coloridas', 'coletiva', 'Roupas da família', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Dobrar roupas escuras', 'coletiva', 'Roupas da família', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Lavar roupa de cama', 'coletiva', 'Roupas de cama', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Secar roupa de cama', 'coletiva', 'Roupas de cama', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Dobrar roupa de cama', 'coletiva', 'Roupas de cama', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Guardar roupa de cama', 'coletiva', 'Roupas de cama', 'semanal', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Trocar a roupa de cama (áreas comuns)', 'coletiva', 'Roupas de cama', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Lavar panos de prato', 'coletiva', 'Limpeza da cozinha', 'semanal', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Lavar panos de chão', 'coletiva', 'Limpeza da cozinha', 'semanal', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Lavanderia'),
    (p_family_id, 'Limpar o vaso sanitário', 'coletiva', 'Banheiro', 'diaria', 5, 2, 0.40, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Limpar a pia do banheiro', 'coletiva', 'Banheiro', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Varrer e passar pano no chão do banheiro', 'coletiva', 'Banheiro', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Repor papel higiênico', 'coletiva', 'Banheiro', 'diaria', 1, 1, 0.05, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Esvaziar a lixeira do banheiro', 'coletiva', 'Banheiro', 'diaria', 2, 1, 0.15, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Limpar o box/chuveiro', 'coletiva', 'Banheiro', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Limpar o espelho', 'coletiva', 'Banheiro', 'semanal', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Repor sabonete e shampoo', 'coletiva', 'Banheiro', 'semanal', 2, 1, 0.15, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Organizar o armário do banheiro', 'coletiva', 'Banheiro', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Banheiro'),
    (p_family_id, 'Organizar a sala (almofadas, objetos, controles)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.70, 2, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Varrer e passar pano no chão da sala', 'coletiva', 'Sala e áreas comuns', 'diaria', 15, 1, 1.10, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Regar plantas', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Organizar mesa(s)', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Tirar o pó dos móveis', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 1, 1.10, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Limpar janelas e espelhos', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Organizar estantes e armários do rack', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Limpar interruptores, maçanetas e superfícies de toque', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Podar e limpar plantas', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Lavar as lixeiras periodicamente', 'coletiva', 'Lixo e reciclagem', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Lixo e reciclagem'),
    (p_family_id, 'Organizar e limpar despensa', 'coletiva', 'Planejamento e compras', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras'),
    (p_family_id, 'Conferir e repor itens de limpeza', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Área de Serviço'),
    (p_family_id, 'Organizar armário de ferramentas', 'coletiva', 'Área de Serviço', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Área de Serviço'),
    (p_family_id, 'Organizar armário da área de serviço', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Área de Serviço'),
    (p_family_id, 'Separar roupas pequenas ou que não servem mais para doação', 'coletiva', 'Fora do ritmo', 'mensal', 15, 1, 1.10, 1, false, 'Facultativa', 'Para a família', 'Extra'),
    (p_family_id, 'Organizar o armário de remédios/primeiros socorros', 'coletiva', 'Fora do ritmo', 'mensal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Extra'),
    (p_family_id, 'Fazer café da manhã para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Fazer almoço para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Fazer jantar para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Fazer lanche para si', 'coletiva', 'Preparo de refeições', 'diaria', 5, 2, 0.40, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
    (p_family_id, 'Arrumar o sofá', 'coletiva', 'Sala e áreas comuns', 'diaria', 2, 1, 0.15, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns'),
    (p_family_id, 'Regar plantas do quintal/jardim', 'coletiva', 'Área externa', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)'),
    (p_family_id, 'Varrer quintal, garagem ou varanda', 'coletiva', 'Área externa', 'semanal', 15, 1, 1.10, 1, false, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)'),
    (p_family_id, 'Podar e limpar plantas do quintal/jardim', 'coletiva', 'Área externa', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)'),
    (p_family_id, 'Organizar objetos guardados na área externa', 'coletiva', 'Área externa', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)'),
    (p_family_id, 'Alimentar o(s) pet(s)', 'coletiva', 'Pets', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Pets'),
    (p_family_id, 'Trocar a água do pet', 'coletiva', 'Pets', 'diaria', 2, 1, 0.15, 1, false, 'Facultativa', 'Para a família', 'Pets'),
    (p_family_id, 'Passear com o cachorro', 'coletiva', 'Pets', 'diaria', 20, 1, 1.45, 1, false, 'Facultativa', 'Para a família', 'Pets'),
    (p_family_id, 'Limpar a caixa de areia/local do pet', 'coletiva', 'Pets', 'diaria', 5, 2, 0.40, 1, false, 'Facultativa', 'Para a família', 'Pets'),
    (p_family_id, 'Escovar o pet', 'coletiva', 'Pets', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Pets');
$$;
