-- Renomeia "Tirar a mesa" para "Tirar a mesa (refeições em família)".
--
-- Única diferença encontrada ao comparar, linha a linha, a planilha
-- "Coeficientes das Tarefas" com o catálogo que a migração 011 deixou no
-- banco. Tudo o mais bate: tempo, nível, frequência, vezes por dia, tipo,
-- finalidade e cômodo das 97 tarefas.
--
-- É só o nome que muda, e muda NA MESMA LINHA (mesmo `id`): a tarefa
-- continua sendo a mesma, então tudo o que os meninos já fizeram com ela
-- segue no histórico, com valor e saldo intactos. Nenhum evento é tocado.
--
-- Tarefa de bônus (Facultativa), 3 min, nível 1, 3×/dia — o teto de R$90,00
-- por menino das obrigatórias não muda em nada.
--
-- Nota sobre a planilha: ela ainda traz, além destas, quatro linhas que já
-- foram resolvidas na 011 e que aparecem como "sobrando" a cada comparação
-- — "Pôr a mesa", "Lavar a louça", "Enxugar a louça" e "Guardar a louça".
-- São as versões antigas de "Colocar mesa (Refeições em família)", "Lavar
-- louça da família", "Secar louça da família" e "Guardar louça da família",
-- que a Paolla escolheu renomear em vez de duplicar. Apagar essas quatro
-- linhas da planilha deixa as comparações futuras limpas.

-- ── 1. Renomeia no catálogo das famílias que já existem ─────────
update public.task_catalog
set name = 'Tirar a mesa (refeições em família)'
where name = 'Tirar a mesa';

-- ── 2. Catálogo padrão das famílias novas ───────────────────────
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
    (p_family_id, 'Tirar a mesa (refeições em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 3, false, 'Facultativa', 'Para a família', 'Preparo de refeições'),
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
