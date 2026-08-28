-- Função que semeia o catálogo padrão (baseado em lista-de-tarefas.md) para
-- uma família recém-criada. Rode este arquivo uma vez depois do schema.sql.
-- Ela é chamada automaticamente pelo app logo após o cadastro da família
-- (veja src/app/onboarding/actions.ts).

create or replace function public.seed_default_catalog(p_family_id uuid)
returns void
language sql
as $$
  insert into public.task_catalog
    (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario, ocorrencias_por_dia)
  values
    -- Individuais
    (p_family_id, 'Arrumar a própria cama', 'individual', null, 'diaria', 3, 1, 0.15, 1),
    (p_family_id, 'Separar a roupa suja e colocar no cesto', 'individual', null, 'diaria', 2, 1, 0.10, 1),
    (p_family_id, 'Cuidar da roupa da escola do dia seguinte', 'individual', null, 'diaria', 4, 1, 0.20, 1),
    (p_family_id, 'Pendurar a própria toalha de banho', 'individual', null, 'diaria', 1, 1, 0.05, 1),
    (p_family_id, 'Guardar objetos pessoais usados no dia', 'individual', null, 'diaria', 5, 1, 0.25, 1),
    (p_family_id, 'Arrumar a mochila para o dia seguinte', 'individual', null, 'diaria', 5, 2, 0.25, 1),
    (p_family_id, 'Guardar os próprios sapatos', 'individual', null, 'diaria', 2, 1, 0.10, 1),
    (p_family_id, 'Organizar brinquedos e objetos pessoais', 'individual', null, 'diaria', 5, 1, 0.25, 1),
    (p_family_id, 'Lavar/guardar o próprio prato', 'individual', null, 'diaria', 2, 1, 0.10, 3),
    (p_family_id, 'Trocar a roupa de cama pessoal', 'individual', null, 'semanal', 10, 2, 0.55, 1),
    (p_family_id, 'Separar roupas para lavar', 'individual', null, 'semanal', 5, 1, 0.25, 1),
    (p_family_id, 'Lavar a própria roupa (máquina)', 'individual', null, 'semanal', 10, 3, 0.60, 1),
    (p_family_id, 'Secar a própria roupa', 'individual', null, 'semanal', 10, 2, 0.55, 1),
    (p_family_id, 'Dobrar a própria roupa', 'individual', null, 'semanal', 15, 2, 0.80, 1),
    (p_family_id, 'Guardar a própria roupa limpa no lugar', 'individual', null, 'semanal', 10, 1, 0.50, 1),
    (p_family_id, 'Manter o próprio skate e EPIs higienizados', 'individual', null, 'semanal', 10, 2, 0.55, 1),
    (p_family_id, 'Lavar toalhas de banho', 'individual', null, 'semanal', 10, 2, 0.55, 1),
    (p_family_id, 'Trocar toalhas de banho', 'individual', null, 'semanal', 5, 1, 0.25, 1),
    (p_family_id, 'Guardar toalhas limpas', 'individual', null, 'semanal', 5, 1, 0.25, 1),

    -- Individual-coletivas (valor já por menino)
    (p_family_id, 'Manter o quarto arrumado no geral', 'individual_coletiva', null, 'diaria', 5, 1, 0.30, 1),
    (p_family_id, 'Arejar o quarto', 'individual_coletiva', null, 'diaria', 1, 1, 0.05, 1),
    (p_family_id, 'Varrer e passar pano no chão do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.70, 1),
    (p_family_id, 'Organizar o guarda-roupa compartilhado', 'individual_coletiva', null, 'semanal', 15, 3, 1.25, 1),
    (p_family_id, 'Organizar objetos/brinquedos comuns do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.70, 1),

    -- Coletivas: Planejamento e compras
    (p_family_id, 'Fazer a lista de compras da feira/mercado', 'coletiva', 'Planejamento e compras', 'semanal', 10, 2, 0.50, 1),
    (p_family_id, 'Planejar o cardápio da semana', 'coletiva', 'Planejamento e compras', 'semanal', 15, 3, 0.80, 1),
    (p_family_id, 'Conferir a validade dos alimentos', 'coletiva', 'Planejamento e compras', 'semanal', 10, 1, 0.40, 1),
    (p_family_id, 'Organizar a despensa', 'coletiva', 'Planejamento e compras', 'semanal', 15, 2, 0.70, 1),
    (p_family_id, 'Guardar as compras nos armários e na geladeira', 'coletiva', 'Planejamento e compras', 'semanal', 20, 2, 0.95, 1),

    -- Coletivas: Preparo de refeições
    (p_family_id, 'Pôr a mesa', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.15, 1),
    (p_family_id, 'Fazer café da manhã', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 0.70, 1),
    (p_family_id, 'Preparar lanche coletivo', 'coletiva', 'Preparo de refeições', 'diaria', 10, 2, 0.50, 1),
    (p_family_id, 'Fazer almoço', 'coletiva', 'Preparo de refeições', 'diaria', 40, 3, 2.15, 1),
    (p_family_id, 'Fazer jantar', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 1.65, 1),
    (p_family_id, 'Tirar a mesa', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.15, 1),

    -- Coletivas: Limpeza da cozinha
    (p_family_id, 'Tirar o lixo da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 3, 1, 0.15, 1),
    (p_family_id, 'Limpar a bancada e a pia da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 1, 0.20, 1),
    (p_family_id, 'Limpar o fogão', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 2, 0.25, 1),
    (p_family_id, 'Lavar a louça', 'coletiva', 'Limpeza da cozinha', 'diaria', 15, 2, 0.70, 1),
    (p_family_id, 'Enxugar a louça', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 1, 0.40, 1),
    (p_family_id, 'Guardar a louça', 'coletiva', 'Limpeza da cozinha', 'diaria', 5, 1, 0.20, 1),
    (p_family_id, 'Lavar panelas e utensílios maiores', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 2, 0.50, 1),
    (p_family_id, 'Varrer e passar pano no chão da cozinha', 'coletiva', 'Limpeza da cozinha', 'diaria', 10, 1, 0.40, 1),
    (p_family_id, 'Limpar micro-ondas', 'coletiva', 'Limpeza da cozinha', 'semanal', 10, 1, 0.40, 1),
    (p_family_id, 'Limpar a geladeira por dentro', 'coletiva', 'Limpeza da cozinha', 'semanal', 15, 2, 0.70, 1),

    -- Coletivas: Roupa da casa
    (p_family_id, 'Lavar roupa de cama', 'coletiva', 'Roupa da casa', 'semanal', 10, 2, 0.50, 1),
    (p_family_id, 'Secar roupa de cama', 'coletiva', 'Roupa da casa', 'semanal', 10, 1, 0.40, 1),
    (p_family_id, 'Dobrar roupa de cama', 'coletiva', 'Roupa da casa', 'semanal', 15, 2, 0.70, 1),
    (p_family_id, 'Guardar roupa de cama', 'coletiva', 'Roupa da casa', 'semanal', 5, 1, 0.20, 1),
    (p_family_id, 'Trocar a roupa de cama (áreas comuns)', 'coletiva', 'Roupa da casa', 'semanal', 15, 2, 0.70, 1),
    (p_family_id, 'Lavar panos de prato', 'coletiva', 'Roupa da casa', 'semanal', 5, 1, 0.20, 1),
    (p_family_id, 'Lavar panos de chão', 'coletiva', 'Roupa da casa', 'semanal', 5, 1, 0.20, 1),

    -- Coletivas: Banheiro
    (p_family_id, 'Limpar o vaso sanitário', 'coletiva', 'Banheiro', 'diaria', 5, 2, 0.25, 1),
    (p_family_id, 'Limpar a pia do banheiro', 'coletiva', 'Banheiro', 'diaria', 3, 1, 0.15, 1),
    (p_family_id, 'Varrer e passar pano no chão do banheiro', 'coletiva', 'Banheiro', 'diaria', 5, 1, 0.20, 1),
    (p_family_id, 'Repor papel higiênico', 'coletiva', 'Banheiro', 'diaria', 1, 1, 0.05, 1),
    (p_family_id, 'Esvaziar a lixeira do banheiro', 'coletiva', 'Banheiro', 'diaria', 2, 1, 0.10, 1),
    (p_family_id, 'Limpar o box/chuveiro', 'coletiva', 'Banheiro', 'semanal', 15, 2, 0.70, 1),
    (p_family_id, 'Limpar o espelho', 'coletiva', 'Banheiro', 'semanal', 5, 1, 0.20, 1),
    (p_family_id, 'Repor sabonete e shampoo', 'coletiva', 'Banheiro', 'semanal', 2, 1, 0.10, 1),
    (p_family_id, 'Organizar o armário do banheiro', 'coletiva', 'Banheiro', 'semanal', 10, 1, 0.40, 1),

    -- Coletivas: Sala e áreas comuns
    (p_family_id, 'Organizar a sala (almofadas, objetos, controles)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.40, 1),
    (p_family_id, 'Varrer e passar pano no chão da sala', 'coletiva', 'Sala e áreas comuns', 'diaria', 15, 1, 0.65, 1),
    (p_family_id, 'Regar plantas', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.20, 1),
    (p_family_id, 'Organizar mesa(s)', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.20, 1),
    (p_family_id, 'Tirar o pó dos móveis', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 1, 0.65, 1),
    (p_family_id, 'Limpar janelas e espelhos', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 2, 0.70, 1),
    (p_family_id, 'Organizar estantes e armários do rack', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.40, 1),
    (p_family_id, 'Limpar interruptores, maçanetas e superfícies de toque', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.40, 1),
    (p_family_id, 'Podar e limpar plantas', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 2, 0.50, 1),

    -- Coletivas: Lixo e reciclagem
    (p_family_id, 'Recolher o lixo da cozinha', 'coletiva', 'Lixo e reciclagem', 'diaria', 3, 1, 0.15, 1),
    (p_family_id, 'Recolher o lixo dos banheiros', 'coletiva', 'Lixo e reciclagem', 'diaria', 2, 1, 0.10, 1),
    (p_family_id, 'Lavar as lixeiras periodicamente', 'coletiva', 'Lixo e reciclagem', 'semanal', 10, 2, 0.50, 1),

    -- Coletivas: Área de Serviço
    (p_family_id, 'Organizar e limpar despensa', 'coletiva', 'Área de Serviço', 'semanal', 15, 2, 0.70, 1),
    (p_family_id, 'Conferir e repor itens de limpeza', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.40, 1),
    (p_family_id, 'Organizar armário de ferramentas', 'coletiva', 'Área de Serviço', 'semanal', 10, 2, 0.50, 1),
    (p_family_id, 'Organizar armário da área de serviço', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.40, 1),

    -- Coletivas: Fora do ritmo (mensal)
    (p_family_id, 'Separar roupas pequenas para doação', 'coletiva', 'Fora do ritmo', 'mensal', 15, 1, 0.65, 1),
    (p_family_id, 'Organizar o armário de remédios/primeiros socorros', 'coletiva', 'Fora do ritmo', 'mensal', 10, 1, 0.40, 1);
$$;
