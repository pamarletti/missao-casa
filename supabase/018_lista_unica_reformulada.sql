-- Catálogo reformulado a partir da lista única "listatarefasunica".
--
-- O que a lista nova faz de diferente:
--
--  * JUNTA passos do cuidado do mesmo item numa tarefa só — tirar + lavar +
--    guardar a toalha viraram "Cuidar da toalha de banho"; as nove de roupa
--    por cor viraram seis; as quatro da roupa de cama viraram uma.
--  * SEPARA em tarefas nomeadas o que era um item genérico "×N por dia" —
--    pôr a mesa virou pôr a mesa do café, do almoço e do jantar; o mesmo com
--    tirar a mesa, a bancada da cozinha, a louça da família e o prato de
--    cada menino. Some o "3× por dia": cada refeição tem nome próprio, e o
--    menino sabe exatamente qual delas ainda falta.
--
-- Regra das fusões, vinda da lista: tempo = soma dos tempos; nível = o maior
-- entre os fundidos.
--
-- NADA DO QUE OS MENINOS JÁ FIZERAM É ALTERADO. Renomear é sempre na mesma
-- linha (mesmo id), então o histórico, os valores lançados e os saldos
-- seguem intactos. Tarefa que saiu da lista é DESLIGADA (ativo = false),
-- nunca apagada: ela some das listas de hoje em diante e continua no
-- histórico do que já foi feito com ela.
--
-- Preços: taxa de R$0,0718 por minuto, fator 1,0 / 1,15 / 1,3 conforme o
-- nível, arredondado a cada 5 centavos — e depois escalado para as
-- obrigatórias fecharem exatamente R$90,00 por mês por menino. Conferido
-- por script: fecha em R$90,00 na conta nova (as compartilhadas entram pela
-- metade, porque os meninos se revezam nelas).

-- ── 1. Renomeações (mesma linha, histórico preservado) ─────────
update public.task_catalog set name = 'Lavar/guardar o próprio prato do café da manhã' where name = 'Lavar/guardar o próprio prato em cada refeição (café, almoço e jantar)';
update public.task_catalog set name = 'Cuidar da toalha de banho (tirar, lavar e guardar)' where name = 'Lavar toalha de banho';
update public.task_catalog set name = 'Organizar criado mudo do quarto' where name = 'Organizar armário do quarto';
update public.task_catalog set name = 'Colocar mesa do café da manhã (refeição em família)' where name = 'Colocar mesa (Refeições em família)';
update public.task_catalog set name = 'Tirar a mesa do café da manhã (refeição em família)' where name = 'Tirar a mesa (refeições em família)';
update public.task_catalog set name = 'Limpar a bancada e a pia da cozinha (após o café da manhã)' where name = 'Limpar a bancada e a pia da cozinha';
update public.task_catalog set name = 'Lavar, secar e guardar a louça da família do café da manhã' where name = 'Lavar louça da família';
update public.task_catalog set name = 'Cuidar da roupa branca (lavar e secar)' where name = 'Lavar roupas brancas';
update public.task_catalog set name = 'Cuidar da roupa colorida (lavar e secar)' where name = 'Lavar roupas coloridas';
update public.task_catalog set name = 'Cuidar da roupa escura (lavar e secar)' where name = 'Lavar roupas escuras';
update public.task_catalog set name = 'Dobrar roupa branca' where name = 'Dobrar roupas brancas';
update public.task_catalog set name = 'Dobrar roupa colorida' where name = 'Dobrar roupas coloridas';
update public.task_catalog set name = 'Dobrar roupa escura' where name = 'Dobrar roupas escuras';
update public.task_catalog set name = 'Cuidar da roupa de cama (lavar, secar, dobrar e guardar)' where name = 'Lavar roupa de cama';
update public.task_catalog set name = 'Organizar a sala (manhã)' where name = 'Organizar a sala (almofadas, objetos, controles)';
update public.task_catalog set name = 'Varrer e passar pano no chão' where name = 'Varrer e passar pano no chão da sala';
update public.task_catalog set name = 'Alimentar e trocar a água do pet' where name = 'Alimentar o(s) pet(s)';

-- ── 2. Tarefas que saíram da lista: desligadas, nunca apagadas ──
update public.task_catalog set ativo = false where name in (
  'Arrumar o sofá',
  'Dobrar roupa de cama',
  'Guardar louça da família',
  'Guardar roupa de cama',
  'Guardar toalha limpa',
  'Lavar panelas e utensílios maiores',
  'Repor sabonete e shampoo',
  'Secar louça da família',
  'Secar roupa de cama',
  'Secar roupas brancas',
  'Secar roupas coloridas',
  'Secar roupas escuras',
  'Separar roupas para lavar',
  'Tirar toalha de banho suja',
  'Trocar a água do pet'
);

-- ── 3. Tempo, nível, valor, ritmo e classificação de cada tarefa ─
update public.task_catalog t
set categoria = v.categoria,
    subcategoria = v.sub,
    frequencia = v.freq,
    tempo_min = v.tempo::int,
    nivel = v.nivel::int,
    valor_unitario = v.valor::numeric,
    ocorrencias_por_dia = v.ocorr::int,
    tipo = v.tipo,
    finalidade = v.fin,
    comodo = v.comodo,
    dias_da_semana = v.dias::smallint[],
    pula_fim_de_semana = false,
    ativo = true
from (values
  ('Arrumar a própria cama', 'individual', null, 'diaria', 3, 1, 0.25, 1, 'Obrigatória', 'Para mim', 'Quarto', null),
  ('Colocar roupa suja no cesto', 'individual', null, 'diaria', 2, 1, 0.15, 1, 'Obrigatória', 'Para mim', 'Quarto', null),
  ('Pendurar a própria toalha de banho', 'individual', null, 'diaria', 1, 1, 0.05, 1, 'Obrigatória', 'Para mim', 'Banheiro', null),
  ('Guardar os próprios sapatos', 'individual', null, 'diaria', 2, 1, 0.15, 1, 'Obrigatória', 'Para mim', 'Quarto', null),
  ('Organizar brinquedos e objetos pessoais pela casa', 'individual', null, 'diaria', 5, 1, 0.35, 1, 'Obrigatória', 'Para mim', 'Geral (casa toda)', null),
  ('Lavar/guardar o próprio prato do café da manhã', 'individual', null, 'diaria', 2, 1, 0.15, 1, 'Obrigatória', 'Para mim', 'Cozinha', null),
  ('Lavar/guardar o próprio prato do almoço', 'individual', null, 'diaria', 2, 1, 0.15, 1, 'Obrigatória', 'Para mim', 'Cozinha', null),
  ('Lavar/guardar o próprio prato do jantar', 'individual', null, 'diaria', 2, 1, 0.15, 1, 'Obrigatória', 'Para mim', 'Cozinha', null),
  ('Cuidar da roupa da escola (incluindo meia e sapato) do dia seguinte', 'individual', null, 'semanal', 4, 1, 0.30, 1, 'Obrigatória', 'Para mim', 'Quarto', '{0,1,2,3,4}'),
  ('Arrumar a mochila para o dia seguinte', 'individual', null, 'semanal', 5, 2, 0.40, 1, 'Obrigatória', 'Para mim', 'Quarto', '{0,1,2,3,4}'),
  ('Trocar a roupa de cama pessoal', 'individual', null, 'semanal', 10, 2, 0.85, 1, 'Obrigatória', 'Para mim', 'Quarto', null),
  ('Guardar a própria roupa limpa no lugar', 'individual', null, 'semanal', 10, 1, 0.70, 1, 'Obrigatória', 'Para mim', 'Quarto', null),
  ('Manter o próprio skate e EPIs higienizados', 'individual', null, 'semanal', 10, 2, 0.85, 1, 'Obrigatória', 'Para mim', 'Área de Serviço', null),
  ('Cuidar da toalha de banho (tirar, lavar e guardar)', 'individual', null, 'semanal', 20, 2, 1.70, 1, 'Obrigatória', 'Para mim', 'Lavanderia', null),
  ('Limpar o próprio tênis', 'individual', null, 'semanal', 10, 1, 0.70, 1, 'Obrigatória', 'Para mim', 'Área de Serviço', null),
  ('Manter o quarto arrumado no geral', 'individual_coletiva', null, 'diaria', 5, 1, 0.35, 1, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
  ('Abrir a janela', 'individual_coletiva', null, 'diaria', 1, 1, 0.05, 1, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
  ('Varrer e passar pano no chão do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.90, 1, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
  ('Organizar o guarda-roupa', 'individual_coletiva', null, 'semanal', 15, 3, 1.45, 1, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
  ('Organizar criado mudo do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.85, 1, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
  ('Organizar estante do quarto', 'individual_coletiva', null, 'semanal', 10, 1, 0.70, 1, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
  ('Fazer a lista de compras da feira/mercado', 'coletiva', 'Planejamento e compras', 'semanal', 10, 2, 0.85, 1, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
  ('Planejar o cardápio da semana', 'coletiva', 'Planejamento e compras', 'semanal', 15, 3, 1.40, 1, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
  ('Conferir a validade dos alimentos', 'coletiva', 'Planejamento e compras', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
  ('Organizar e limpar despensa', 'coletiva', 'Planejamento e compras', 'semanal', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
  ('Guardar as compras nos armários e na geladeira', 'coletiva', 'Planejamento e compras', 'semanal', 20, 2, 1.65, 1, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
  ('Colocar mesa do café da manhã (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Colocar mesa do almoço (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Colocar mesa do jantar (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Fazer café da manhã para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Fazer café da manhã para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 2, 2.50, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Fazer lanche para si', 'coletiva', 'Preparo de refeições', 'diaria', 5, 2, 0.40, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Fazer lanche para a família', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Fazer almoço para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Fazer almoço para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Fazer jantar para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Fazer jantar para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Tirar a mesa do café da manhã (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Tirar a mesa do almoço (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Tirar a mesa do jantar (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Tirar o lixo da cozinha', 'coletiva', 'Cozinha', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Limpar a bancada e a pia da cozinha (após o café da manhã)', 'coletiva', 'Cozinha', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Limpar a bancada e a pia da cozinha (após o almoço)', 'coletiva', 'Cozinha', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Limpar a bancada e a pia da cozinha (após o jantar)', 'coletiva', 'Cozinha', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Limpar o fogão', 'coletiva', 'Cozinha', 'diaria', 5, 2, 0.40, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Lavar, secar e guardar a louça da família do café da manhã', 'coletiva', 'Cozinha', 'diaria', 30, 2, 2.50, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Lavar, secar e guardar a louça da família do almoço', 'coletiva', 'Cozinha', 'diaria', 30, 2, 2.50, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Lavar, secar e guardar a louça da família do jantar', 'coletiva', 'Cozinha', 'diaria', 30, 2, 2.50, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Varrer e passar pano no chão da cozinha', 'coletiva', 'Cozinha', 'diaria', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Limpar micro-ondas', 'coletiva', 'Cozinha', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Limpar a geladeira por dentro', 'coletiva', 'Cozinha', 'semanal', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Lavar panos de prato', 'coletiva', 'Lavanderia', 'semanal', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Lavar panos de chão', 'coletiva', 'Lavanderia', 'semanal', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Cuidar da roupa branca (lavar e secar)', 'coletiva', 'Lavanderia', 'semanal', 20, 2, 1.65, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Cuidar da roupa colorida (lavar e secar)', 'coletiva', 'Lavanderia', 'semanal', 20, 2, 1.65, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Cuidar da roupa escura (lavar e secar)', 'coletiva', 'Lavanderia', 'semanal', 20, 2, 1.65, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Dobrar roupa branca', 'coletiva', 'Lavanderia', 'semanal', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Dobrar roupa colorida', 'coletiva', 'Lavanderia', 'semanal', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Dobrar roupa escura', 'coletiva', 'Lavanderia', 'semanal', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Cuidar da roupa de cama (lavar, secar, dobrar e guardar)', 'coletiva', 'Lavanderia', 'semanal', 40, 2, 3.30, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Trocar a roupa de cama (áreas comuns)', 'coletiva', 'Lavanderia', 'semanal', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Lavanderia', null),
  ('Limpar o vaso sanitário', 'coletiva', 'Banheiro', 'diaria', 5, 2, 0.40, 1, 'Facultativa', 'Para a família', 'Banheiro', null),
  ('Limpar a pia do banheiro', 'coletiva', 'Banheiro', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Banheiro', null),
  ('Varrer e passar pano no chão do banheiro', 'coletiva', 'Banheiro', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Banheiro', null),
  ('Repor papel higiênico', 'coletiva', 'Banheiro', 'diaria', 1, 1, 0.05, 1, 'Facultativa', 'Para a família', 'Banheiro', null),
  ('Esvaziar a lixeira do banheiro', 'coletiva', 'Banheiro', 'diaria', 2, 1, 0.15, 1, 'Facultativa', 'Para a família', 'Banheiro', null),
  ('Limpar o box/chuveiro', 'coletiva', 'Banheiro', 'semanal', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Banheiro', null),
  ('Limpar o espelho', 'coletiva', 'Banheiro', 'semanal', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Banheiro', null),
  ('Organizar o armário do banheiro', 'coletiva', 'Banheiro', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Banheiro', null),
  ('Organizar a sala (manhã)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Organizar a sala (noite)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Varrer e passar pano no chão', 'coletiva', 'Sala e áreas comuns', 'diaria', 15, 1, 1.10, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Regar plantas', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Organizar mesa(s)', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Tirar o pó dos móveis', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 1, 1.10, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Limpar janelas e espelhos', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 2, 1.25, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Organizar estantes e armários do rack', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Limpar interruptores, maçanetas e superfícies de toque', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Podar e limpar plantas', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 2, 0.85, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
  ('Regar plantas do quintal/jardim', 'coletiva', 'Área Externa (quintal e jardim)', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)', null),
  ('Varrer quintal, garagem ou varanda', 'coletiva', 'Área Externa (quintal e jardim)', 'semanal', 15, 1, 1.10, 1, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)', null),
  ('Podar e limpar plantas do quintal/jardim', 'coletiva', 'Área Externa (quintal e jardim)', 'semanal', 10, 2, 0.85, 1, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)', null),
  ('Organizar objetos guardados na área externa', 'coletiva', 'Área Externa (quintal e jardim)', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)', null),
  ('Alimentar e trocar a água do pet', 'coletiva', 'Pets', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Pets', null),
  ('Passear com o cachorro', 'coletiva', 'Pets', 'diaria', 20, 1, 1.45, 1, 'Facultativa', 'Para a família', 'Pets', null),
  ('Limpar a caixa de areia/local do pet', 'coletiva', 'Pets', 'diaria', 5, 2, 0.40, 1, 'Facultativa', 'Para a família', 'Pets', null),
  ('Escovar o pet', 'coletiva', 'Pets', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Pets', null),
  ('Lavar as lixeiras periodicamente', 'coletiva', 'Lixo e reciclagem', 'semanal', 10, 2, 0.85, 1, 'Facultativa', 'Para a família', 'Lixo e reciclagem', null),
  ('Conferir e repor itens de limpeza', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Área de Serviço', null),
  ('Organizar armário de ferramentas', 'coletiva', 'Área de Serviço', 'semanal', 10, 2, 0.85, 1, 'Facultativa', 'Para a família', 'Área de Serviço', null),
  ('Organizar armário da área de serviço', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Área de Serviço', null),
  ('Separar roupas pequenas ou que não servem mais para doação', 'coletiva', 'Fora do ritmo (mensal)', 'mensal', 15, 1, 1.10, 1, 'Facultativa', 'Para a família', 'Fora do ritmo (mensal)', null),
  ('Organizar o armário de remédios/primeiros socorros', 'coletiva', 'Fora do ritmo (mensal)', 'mensal', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Fora do ritmo (mensal)', null)
) as v(name, categoria, sub, freq, tempo, nivel, valor, ocorr, tipo, fin, comodo, dias)
where t.name = v.name;

-- ── 4. As 11 tarefas novas, para cada família que já existe ─────
insert into public.task_catalog
  (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario,
   ocorrencias_por_dia, pula_fim_de_semana, tipo, finalidade, comodo, dias_da_semana)
select f.id, v.name, v.categoria, v.sub, v.freq, v.tempo::int, v.nivel::int, v.valor::numeric,
       v.ocorr::int, false, v.tipo, v.fin, v.comodo, v.dias::smallint[]
from public.families f
cross join (values
  ('Lavar/guardar o próprio prato do almoço', 'individual', null, 'diaria', 2, 1, 0.15, 1, 'Obrigatória', 'Para mim', 'Cozinha', null),
  ('Lavar/guardar o próprio prato do jantar', 'individual', null, 'diaria', 2, 1, 0.15, 1, 'Obrigatória', 'Para mim', 'Cozinha', null),
  ('Colocar mesa do almoço (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Colocar mesa do jantar (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Tirar a mesa do almoço (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Tirar a mesa do jantar (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
  ('Limpar a bancada e a pia da cozinha (após o almoço)', 'coletiva', 'Cozinha', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Limpar a bancada e a pia da cozinha (após o jantar)', 'coletiva', 'Cozinha', 'diaria', 5, 1, 0.35, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Lavar, secar e guardar a louça da família do almoço', 'coletiva', 'Cozinha', 'diaria', 30, 2, 2.50, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Lavar, secar e guardar a louça da família do jantar', 'coletiva', 'Cozinha', 'diaria', 30, 2, 2.50, 1, 'Facultativa', 'Para a família', 'Cozinha', null),
  ('Organizar a sala (noite)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.70, 1, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null)
) as v(name, categoria, sub, freq, tempo, nivel, valor, ocorr, tipo, fin, comodo, dias)
where not exists (
  select 1 from public.task_catalog c where c.family_id = f.id and c.name = v.name
);

-- ── 5. O alvo mensal volta a ser exatamente R$90,00 ────────────
update public.families set valor_base_obrigatorias = 90.00;

-- ── 6. Catálogo padrão das famílias novas ──────────────────────
create or replace function public.seed_default_catalog(p_family_id uuid)
returns void
language sql
as $$
  insert into public.task_catalog
    (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario,
     ocorrencias_por_dia, pula_fim_de_semana, tipo, finalidade, comodo, dias_da_semana)
  values
    (p_family_id, 'Arrumar a própria cama', 'individual', null, 'diaria', 3, 1, 0.25, 1, false, 'Obrigatória', 'Para mim', 'Quarto', null),
    (p_family_id, 'Colocar roupa suja no cesto', 'individual', null, 'diaria', 2, 1, 0.15, 1, false, 'Obrigatória', 'Para mim', 'Quarto', null),
    (p_family_id, 'Pendurar a própria toalha de banho', 'individual', null, 'diaria', 1, 1, 0.05, 1, false, 'Obrigatória', 'Para mim', 'Banheiro', null),
    (p_family_id, 'Guardar os próprios sapatos', 'individual', null, 'diaria', 2, 1, 0.15, 1, false, 'Obrigatória', 'Para mim', 'Quarto', null),
    (p_family_id, 'Organizar brinquedos e objetos pessoais pela casa', 'individual', null, 'diaria', 5, 1, 0.35, 1, false, 'Obrigatória', 'Para mim', 'Geral (casa toda)', null),
    (p_family_id, 'Lavar/guardar o próprio prato do café da manhã', 'individual', null, 'diaria', 2, 1, 0.15, 1, false, 'Obrigatória', 'Para mim', 'Cozinha', null),
    (p_family_id, 'Lavar/guardar o próprio prato do almoço', 'individual', null, 'diaria', 2, 1, 0.15, 1, false, 'Obrigatória', 'Para mim', 'Cozinha', null),
    (p_family_id, 'Lavar/guardar o próprio prato do jantar', 'individual', null, 'diaria', 2, 1, 0.15, 1, false, 'Obrigatória', 'Para mim', 'Cozinha', null),
    (p_family_id, 'Cuidar da roupa da escola (incluindo meia e sapato) do dia seguinte', 'individual', null, 'semanal', 4, 1, 0.30, 1, false, 'Obrigatória', 'Para mim', 'Quarto', '{0,1,2,3,4}'::smallint[]),
    (p_family_id, 'Arrumar a mochila para o dia seguinte', 'individual', null, 'semanal', 5, 2, 0.40, 1, false, 'Obrigatória', 'Para mim', 'Quarto', '{0,1,2,3,4}'::smallint[]),
    (p_family_id, 'Trocar a roupa de cama pessoal', 'individual', null, 'semanal', 10, 2, 0.85, 1, false, 'Obrigatória', 'Para mim', 'Quarto', null),
    (p_family_id, 'Guardar a própria roupa limpa no lugar', 'individual', null, 'semanal', 10, 1, 0.70, 1, false, 'Obrigatória', 'Para mim', 'Quarto', null),
    (p_family_id, 'Manter o próprio skate e EPIs higienizados', 'individual', null, 'semanal', 10, 2, 0.85, 1, false, 'Obrigatória', 'Para mim', 'Área de Serviço', null),
    (p_family_id, 'Cuidar da toalha de banho (tirar, lavar e guardar)', 'individual', null, 'semanal', 20, 2, 1.70, 1, false, 'Obrigatória', 'Para mim', 'Lavanderia', null),
    (p_family_id, 'Limpar o próprio tênis', 'individual', null, 'semanal', 10, 1, 0.70, 1, false, 'Obrigatória', 'Para mim', 'Área de Serviço', null),
    (p_family_id, 'Manter o quarto arrumado no geral', 'individual_coletiva', null, 'diaria', 5, 1, 0.35, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
    (p_family_id, 'Abrir a janela', 'individual_coletiva', null, 'diaria', 1, 1, 0.05, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
    (p_family_id, 'Varrer e passar pano no chão do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.90, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
    (p_family_id, 'Organizar o guarda-roupa', 'individual_coletiva', null, 'semanal', 15, 3, 1.45, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
    (p_family_id, 'Organizar criado mudo do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.85, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
    (p_family_id, 'Organizar estante do quarto', 'individual_coletiva', null, 'semanal', 10, 1, 0.70, 1, false, 'Obrigatória', 'Compartilhadas', 'Quarto', null),
    (p_family_id, 'Fazer a lista de compras da feira/mercado', 'coletiva', 'Planejamento e compras', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
    (p_family_id, 'Planejar o cardápio da semana', 'coletiva', 'Planejamento e compras', 'semanal', 15, 3, 1.40, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
    (p_family_id, 'Conferir a validade dos alimentos', 'coletiva', 'Planejamento e compras', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
    (p_family_id, 'Organizar e limpar despensa', 'coletiva', 'Planejamento e compras', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
    (p_family_id, 'Guardar as compras nos armários e na geladeira', 'coletiva', 'Planejamento e compras', 'semanal', 20, 2, 1.65, 1, false, 'Facultativa', 'Para a família', 'Planejamento e compras', null),
    (p_family_id, 'Colocar mesa do café da manhã (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Colocar mesa do almoço (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Colocar mesa do jantar (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Fazer café da manhã para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Fazer café da manhã para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 2, 2.50, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Fazer lanche para si', 'coletiva', 'Preparo de refeições', 'diaria', 5, 2, 0.40, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Fazer lanche para a família', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Fazer almoço para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Fazer almoço para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Fazer jantar para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Fazer jantar para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Tirar a mesa do café da manhã (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Tirar a mesa do almoço (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Tirar a mesa do jantar (refeição em família)', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Preparo de refeições', null),
    (p_family_id, 'Tirar o lixo da cozinha', 'coletiva', 'Cozinha', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Limpar a bancada e a pia da cozinha (após o café da manhã)', 'coletiva', 'Cozinha', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Limpar a bancada e a pia da cozinha (após o almoço)', 'coletiva', 'Cozinha', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Limpar a bancada e a pia da cozinha (após o jantar)', 'coletiva', 'Cozinha', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Limpar o fogão', 'coletiva', 'Cozinha', 'diaria', 5, 2, 0.40, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Lavar, secar e guardar a louça da família do café da manhã', 'coletiva', 'Cozinha', 'diaria', 30, 2, 2.50, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Lavar, secar e guardar a louça da família do almoço', 'coletiva', 'Cozinha', 'diaria', 30, 2, 2.50, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Lavar, secar e guardar a louça da família do jantar', 'coletiva', 'Cozinha', 'diaria', 30, 2, 2.50, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Varrer e passar pano no chão da cozinha', 'coletiva', 'Cozinha', 'diaria', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Limpar micro-ondas', 'coletiva', 'Cozinha', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Limpar a geladeira por dentro', 'coletiva', 'Cozinha', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Cozinha', null),
    (p_family_id, 'Lavar panos de prato', 'coletiva', 'Lavanderia', 'semanal', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Lavar panos de chão', 'coletiva', 'Lavanderia', 'semanal', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Cuidar da roupa branca (lavar e secar)', 'coletiva', 'Lavanderia', 'semanal', 20, 2, 1.65, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Cuidar da roupa colorida (lavar e secar)', 'coletiva', 'Lavanderia', 'semanal', 20, 2, 1.65, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Cuidar da roupa escura (lavar e secar)', 'coletiva', 'Lavanderia', 'semanal', 20, 2, 1.65, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Dobrar roupa branca', 'coletiva', 'Lavanderia', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Dobrar roupa colorida', 'coletiva', 'Lavanderia', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Dobrar roupa escura', 'coletiva', 'Lavanderia', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Cuidar da roupa de cama (lavar, secar, dobrar e guardar)', 'coletiva', 'Lavanderia', 'semanal', 40, 2, 3.30, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Trocar a roupa de cama (áreas comuns)', 'coletiva', 'Lavanderia', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Lavanderia', null),
    (p_family_id, 'Limpar o vaso sanitário', 'coletiva', 'Banheiro', 'diaria', 5, 2, 0.40, 1, false, 'Facultativa', 'Para a família', 'Banheiro', null),
    (p_family_id, 'Limpar a pia do banheiro', 'coletiva', 'Banheiro', 'diaria', 3, 1, 0.20, 1, false, 'Facultativa', 'Para a família', 'Banheiro', null),
    (p_family_id, 'Varrer e passar pano no chão do banheiro', 'coletiva', 'Banheiro', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Banheiro', null),
    (p_family_id, 'Repor papel higiênico', 'coletiva', 'Banheiro', 'diaria', 1, 1, 0.05, 1, false, 'Facultativa', 'Para a família', 'Banheiro', null),
    (p_family_id, 'Esvaziar a lixeira do banheiro', 'coletiva', 'Banheiro', 'diaria', 2, 1, 0.15, 1, false, 'Facultativa', 'Para a família', 'Banheiro', null),
    (p_family_id, 'Limpar o box/chuveiro', 'coletiva', 'Banheiro', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Banheiro', null),
    (p_family_id, 'Limpar o espelho', 'coletiva', 'Banheiro', 'semanal', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Banheiro', null),
    (p_family_id, 'Organizar o armário do banheiro', 'coletiva', 'Banheiro', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Banheiro', null),
    (p_family_id, 'Organizar a sala (manhã)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Organizar a sala (noite)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Varrer e passar pano no chão', 'coletiva', 'Sala e áreas comuns', 'diaria', 15, 1, 1.10, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Regar plantas', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Organizar mesa(s)', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Tirar o pó dos móveis', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 1, 1.10, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Limpar janelas e espelhos', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 2, 1.25, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Organizar estantes e armários do rack', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Limpar interruptores, maçanetas e superfícies de toque', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Podar e limpar plantas', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Sala e áreas comuns', null),
    (p_family_id, 'Regar plantas do quintal/jardim', 'coletiva', 'Área Externa (quintal e jardim)', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)', null),
    (p_family_id, 'Varrer quintal, garagem ou varanda', 'coletiva', 'Área Externa (quintal e jardim)', 'semanal', 15, 1, 1.10, 1, false, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)', null),
    (p_family_id, 'Podar e limpar plantas do quintal/jardim', 'coletiva', 'Área Externa (quintal e jardim)', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)', null),
    (p_family_id, 'Organizar objetos guardados na área externa', 'coletiva', 'Área Externa (quintal e jardim)', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Área Externa (quintal e jardim)', null),
    (p_family_id, 'Alimentar e trocar a água do pet', 'coletiva', 'Pets', 'diaria', 5, 1, 0.35, 1, false, 'Facultativa', 'Para a família', 'Pets', null),
    (p_family_id, 'Passear com o cachorro', 'coletiva', 'Pets', 'diaria', 20, 1, 1.45, 1, false, 'Facultativa', 'Para a família', 'Pets', null),
    (p_family_id, 'Limpar a caixa de areia/local do pet', 'coletiva', 'Pets', 'diaria', 5, 2, 0.40, 1, false, 'Facultativa', 'Para a família', 'Pets', null),
    (p_family_id, 'Escovar o pet', 'coletiva', 'Pets', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Pets', null),
    (p_family_id, 'Lavar as lixeiras periodicamente', 'coletiva', 'Lixo e reciclagem', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Lixo e reciclagem', null),
    (p_family_id, 'Conferir e repor itens de limpeza', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Área de Serviço', null),
    (p_family_id, 'Organizar armário de ferramentas', 'coletiva', 'Área de Serviço', 'semanal', 10, 2, 0.85, 1, false, 'Facultativa', 'Para a família', 'Área de Serviço', null),
    (p_family_id, 'Organizar armário da área de serviço', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Área de Serviço', null),
    (p_family_id, 'Separar roupas pequenas ou que não servem mais para doação', 'coletiva', 'Fora do ritmo (mensal)', 'mensal', 15, 1, 1.10, 1, false, 'Facultativa', 'Para a família', 'Fora do ritmo (mensal)', null),
    (p_family_id, 'Organizar o armário de remédios/primeiros socorros', 'coletiva', 'Fora do ritmo (mensal)', 'mensal', 10, 1, 0.70, 1, false, 'Facultativa', 'Para a família', 'Fora do ritmo (mensal)', null);
$$;

-- ── Conferência (roda junto e mostra o resultado) ──────────────
select
  count(*) filter (where ativo) as ativas,
  count(*) filter (where not ativo) as desligadas,
  count(*) filter (where ativo and tipo = 'Obrigatória') as obrigatorias,
  count(*) filter (where ativo and tipo = 'Facultativa') as bonus
from public.task_catalog
where family_id = (select id from public.families order by created_at limit 1);
