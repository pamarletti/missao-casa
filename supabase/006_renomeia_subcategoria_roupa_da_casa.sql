-- Pequenos ajustes de nomenclatura no catálogo, pedidos pela Paolla:
-- 1) subcategoria de coletivas "Roupa da casa" -> "Roupas, lençóis e panos"
--    (nome mais descritivo);
-- 2) tarefa individual "Tirar toalhas de banho" -> "Tirar toalha de banho
--    suja" (mais claro sobre o que a tarefa é).
-- Atualiza tanto as tarefas já cadastradas quanto o catálogo padrão
-- semeado para famílias novas.

update public.task_catalog
set subcategoria = 'Roupas, lençóis e panos'
where subcategoria = 'Roupa da casa';

update public.task_catalog
set name = 'Tirar toalha de banho suja'
where name = 'Tirar toalhas de banho';

-- Recria seed_default_catalog com os nomes atualizados.
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
    (p_family_id, 'Tirar toalha de banho suja', 'individual', null, 'semanal', 5, 1, 0.35, 1, false),
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

    -- Coletivas: Roupas, lençóis e panos
    (p_family_id, 'Lavar roupas brancas', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Lavar roupas coloridas', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Lavar roupas escuras', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Secar roupas brancas', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Secar roupas coloridas', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Secar roupas escuras', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Dobrar roupas brancas', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Dobrar roupas coloridas', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Dobrar roupas escuras', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Lavar roupa de cama', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Secar roupa de cama', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Dobrar roupa de cama', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Guardar roupa de cama', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Trocar a roupa de cama (áreas comuns)', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Lavar panos de prato', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Lavar panos de chão', 'coletiva', 'Roupas, lençóis e panos', 'semanal', 5, 1, 0.35, 1, false),

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
