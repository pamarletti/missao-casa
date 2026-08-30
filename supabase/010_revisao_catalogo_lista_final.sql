-- Revisão do catálogo a partir da lista final "Coeficientes das Tarefas"
-- (Tempo x Nível de Complexidade), enviada pela Paolla em 30/08/2026.
--
-- REGRA QUE GUIA ESTA MIGRAÇÃO: nada do que os meninos já fizeram muda.
-- Nenhuma linha do catálogo é apagada (só desativada, com ativo = false, o
-- que preserva o histórico ligado a ela), e as mudanças de valor valem
-- daqui pra frente: cada registro em task_events guarda o próprio valor do
-- momento em que a tarefa foi feita, então saldo e histórico ficam
-- intactos. O total obrigatório continua exatamente R$90,00/mês por
-- menino: nenhuma tarefa individual ou individual-coletiva é tocada aqui.
-- Rodar duas vezes não faz mal: tudo aqui é idempotente.
--
-- O que muda, tudo dentro das COLETIVAS (que são bônus, sem teto):
--   1. as três refeições viram versões "para a família" (30 min) e ganham
--      uma irmã "para si" (15 min); o lanche segue a mesma ideia, com
--      15 min para a família e 5 min para si;
--   2. "Roupas, lençóis e panos" se divide em "Roupas da família" e
--      "Roupas de cama", e os panos de prato/chão passam para a cozinha;
--   3. três tarefas duplicadas são desativadas;
--   4. entram 14 tarefas novas, incluindo duas áreas que não existiam no
--      app: Área externa (quintal e jardim) e Pets.

-- 1. Renomeações: mesma linha, mesmo id, o histórico continua ligado.
--    "Preparar lanche coletivo" vira "Preparar lanche para a família", que
--    é a única tarefa de lanche que sobra além da versão "para si".
update public.task_catalog set name = 'Fazer café da manhã para a família' where name = 'Fazer café da manhã';
update public.task_catalog set name = 'Fazer almoço para a família' where name = 'Fazer almoço';
update public.task_catalog set name = 'Fazer jantar para a família' where name = 'Fazer jantar';
update public.task_catalog set name = 'Preparar lanche para a família' where name = 'Preparar lanche coletivo';

-- 2. Novos tempos: refeição para a família = 30 min (antes o café eram 15 e
--    o almoço 40); lanche para a família = 15 min (antes 10). O valor
--    acompanha a taxa da lista (R$0,0718/minuto x fator do nível),
--    arredondado a R$0,05 — e vale só para o que for feito daqui pra frente.
update public.task_catalog set tempo_min = 30, nivel = 2, valor_unitario = 2.50 where name = 'Fazer café da manhã para a família';
update public.task_catalog set tempo_min = 30, nivel = 3, valor_unitario = 2.80 where name = 'Fazer almoço para a família';
update public.task_catalog set tempo_min = 30, nivel = 3, valor_unitario = 2.80 where name = 'Fazer jantar para a família';
update public.task_catalog set tempo_min = 15, nivel = 2, valor_unitario = 1.25 where name = 'Preparar lanche para a família';

-- 3. Categorias das coletivas: "Roupa da casa" / "Roupas, lençóis e panos"
--    se divide em duas, e os panos vão para a cozinha (é lá que eles são
--    usados). Só muda onde a tarefa aparece na tela; valor e histórico
--    ficam iguais.
update public.task_catalog set subcategoria = 'Limpeza da cozinha'
where name in ('Lavar panos de prato', 'Lavar panos de chão');

update public.task_catalog set subcategoria = 'Roupas de cama'
where name in (
  'Dobrar roupa de cama',
  'Guardar roupa de cama',
  'Lavar roupa de cama',
  'Secar roupa de cama',
  'Trocar a roupa de cama (áreas comuns)');

update public.task_catalog set subcategoria = 'Roupas da família'
where subcategoria in ('Roupa da casa', 'Roupas, lençóis e panos');

update public.task_catalog
set subcategoria = 'Planejamento e compras'
where name = 'Organizar e limpar despensa';

-- 4. Duplicadas: cada uma repete outra tarefa que continua ativa
--    ("Organizar e limpar despensa", "Tirar o lixo da cozinha" e "Esvaziar
--    a lixeira do banheiro"). Desativadas, não apagadas: aparecem no bloco
--    "Tarefas desnecessárias" do catálogo editável, e tudo que já foi feito
--    com elas segue no histórico e no saldo.
update public.task_catalog set ativo = false where name in (
  'Organizar a despensa',
  'Recolher o lixo da cozinha',
  'Recolher o lixo dos banheiros');

-- 5. Tarefas novas, para cada família que já existe. O "not exists" deixa a
--    migração segura de rodar mais de uma vez, e nada é ligado ou desligado
--    aqui: se a família desativar alguma depois, a escolha dela é mantida.
insert into public.task_catalog
  (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario, ocorrencias_por_dia, pula_fim_de_semana)
select f.id, v.nome, v.cat, v.sub, v.freq, v.tempo, v.nivel, v.valor, v.occ, v.pula
from public.families f
cross join (values
    ('Fazer café da manhã para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, false),
    ('Fazer almoço para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, false),
    ('Fazer jantar para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, false),
    ('Preparar lanche para si', 'coletiva', 'Preparo de refeições', 'diaria', 5, 2, 0.40, 1, false),
    ('Arrumar o sofá', 'coletiva', 'Sala e áreas comuns', 'diaria', 2, 1, 0.15, 1, false),
    ('Regar plantas do quintal/jardim', 'coletiva', 'Área externa', 'diaria', 5, 1, 0.35, 1, false),
    ('Varrer quintal, garagem ou varanda', 'coletiva', 'Área externa', 'semanal', 15, 1, 1.10, 1, false),
    ('Podar e limpar plantas do quintal/jardim', 'coletiva', 'Área externa', 'semanal', 10, 2, 0.85, 1, false),
    ('Organizar objetos guardados na área externa', 'coletiva', 'Área externa', 'semanal', 10, 1, 0.70, 1, false),
    ('Alimentar o(s) pet(s)', 'coletiva', 'Pets', 'diaria', 3, 1, 0.20, 1, false),
    ('Trocar a água do pet', 'coletiva', 'Pets', 'diaria', 2, 1, 0.15, 1, false),
    ('Passear com o cachorro', 'coletiva', 'Pets', 'diaria', 20, 1, 1.45, 1, false),
    ('Limpar a caixa de areia/local do pet', 'coletiva', 'Pets', 'diaria', 5, 2, 0.40, 1, false),
    ('Escovar o pet', 'coletiva', 'Pets', 'semanal', 10, 1, 0.70, 1, false)
) as v(nome, cat, sub, freq, tempo, nivel, valor, occ, pula)
where not exists (
  select 1 from public.task_catalog t where t.family_id = f.id and t.name = v.nome
);

-- 6. Catálogo padrão das famílias novas, com a lista final inteira
--    (97 tarefas: 16 individuais + 6 individual-coletivas + 75 coletivas).
create or replace function public.seed_default_catalog(p_family_id uuid)
returns void
language sql
as $$
  insert into public.task_catalog
    (family_id, name, categoria, subcategoria, frequencia, tempo_min, nivel, valor_unitario, ocorrencias_por_dia, pula_fim_de_semana)
  values
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
    (p_family_id, 'Manter o quarto arrumado no geral', 'individual_coletiva', null, 'diaria', 5, 1, 0.20, 1, false),
    (p_family_id, 'Abrir a janela', 'individual_coletiva', null, 'diaria', 1, 1, 0.05, 1, false),
    (p_family_id, 'Varrer e passar pano no chão do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.45, 1, false),
    (p_family_id, 'Organizar o guarda-roupa compartilhado', 'individual_coletiva', null, 'semanal', 15, 3, 0.75, 1, false),
    (p_family_id, 'Organizar armário do quarto', 'individual_coletiva', null, 'semanal', 10, 2, 0.45, 1, false),
    (p_family_id, 'Organizar estante do quarto', 'individual_coletiva', null, 'semanal', 10, 1, 0.35, 1, false),
    (p_family_id, 'Fazer a lista de compras da feira/mercado', 'coletiva', 'Planejamento e compras', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Planejar o cardápio da semana', 'coletiva', 'Planejamento e compras', 'semanal', 15, 3, 1.40, 1, false),
    (p_family_id, 'Conferir a validade dos alimentos', 'coletiva', 'Planejamento e compras', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Guardar as compras nos armários e na geladeira', 'coletiva', 'Planejamento e compras', 'semanal', 20, 2, 1.65, 1, false),
    (p_family_id, 'Pôr a mesa', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 3, false),
    (p_family_id, 'Fazer café da manhã para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 2, 2.50, 1, false),
    (p_family_id, 'Preparar lanche para a família', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, false),
    (p_family_id, 'Fazer almoço para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, false),
    (p_family_id, 'Fazer jantar para a família', 'coletiva', 'Preparo de refeições', 'diaria', 30, 3, 2.80, 1, false),
    (p_family_id, 'Tirar a mesa', 'coletiva', 'Preparo de refeições', 'diaria', 3, 1, 0.20, 3, false),
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
    (p_family_id, 'Lavar roupas brancas', 'coletiva', 'Roupas da família', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Lavar roupas coloridas', 'coletiva', 'Roupas da família', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Lavar roupas escuras', 'coletiva', 'Roupas da família', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Secar roupas brancas', 'coletiva', 'Roupas da família', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Secar roupas coloridas', 'coletiva', 'Roupas da família', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Secar roupas escuras', 'coletiva', 'Roupas da família', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Dobrar roupas brancas', 'coletiva', 'Roupas da família', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Dobrar roupas coloridas', 'coletiva', 'Roupas da família', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Dobrar roupas escuras', 'coletiva', 'Roupas da família', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Lavar roupa de cama', 'coletiva', 'Roupas de cama', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Secar roupa de cama', 'coletiva', 'Roupas de cama', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Dobrar roupa de cama', 'coletiva', 'Roupas de cama', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Guardar roupa de cama', 'coletiva', 'Roupas de cama', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Trocar a roupa de cama (áreas comuns)', 'coletiva', 'Roupas de cama', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Lavar panos de prato', 'coletiva', 'Limpeza da cozinha', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Lavar panos de chão', 'coletiva', 'Limpeza da cozinha', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Limpar o vaso sanitário', 'coletiva', 'Banheiro', 'diaria', 5, 2, 0.40, 1, false),
    (p_family_id, 'Limpar a pia do banheiro', 'coletiva', 'Banheiro', 'diaria', 3, 1, 0.20, 1, false),
    (p_family_id, 'Varrer e passar pano no chão do banheiro', 'coletiva', 'Banheiro', 'diaria', 5, 1, 0.35, 1, false),
    (p_family_id, 'Repor papel higiênico', 'coletiva', 'Banheiro', 'diaria', 1, 1, 0.05, 1, false),
    (p_family_id, 'Esvaziar a lixeira do banheiro', 'coletiva', 'Banheiro', 'diaria', 2, 1, 0.15, 1, false),
    (p_family_id, 'Limpar o box/chuveiro', 'coletiva', 'Banheiro', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Limpar o espelho', 'coletiva', 'Banheiro', 'semanal', 5, 1, 0.35, 1, false),
    (p_family_id, 'Repor sabonete e shampoo', 'coletiva', 'Banheiro', 'semanal', 2, 1, 0.15, 1, false),
    (p_family_id, 'Organizar o armário do banheiro', 'coletiva', 'Banheiro', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Organizar a sala (almofadas, objetos, controles)', 'coletiva', 'Sala e áreas comuns', 'diaria', 10, 1, 0.70, 2, false),
    (p_family_id, 'Varrer e passar pano no chão da sala', 'coletiva', 'Sala e áreas comuns', 'diaria', 15, 1, 1.10, 1, false),
    (p_family_id, 'Regar plantas', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, false),
    (p_family_id, 'Organizar mesa(s)', 'coletiva', 'Sala e áreas comuns', 'diaria', 5, 1, 0.35, 1, false),
    (p_family_id, 'Tirar o pó dos móveis', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 1, 1.10, 1, false),
    (p_family_id, 'Limpar janelas e espelhos', 'coletiva', 'Sala e áreas comuns', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Organizar estantes e armários do rack', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Limpar interruptores, maçanetas e superfícies de toque', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Podar e limpar plantas', 'coletiva', 'Sala e áreas comuns', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Lavar as lixeiras periodicamente', 'coletiva', 'Lixo e reciclagem', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Organizar e limpar despensa', 'coletiva', 'Planejamento e compras', 'semanal', 15, 2, 1.25, 1, false),
    (p_family_id, 'Conferir e repor itens de limpeza', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Organizar armário de ferramentas', 'coletiva', 'Área de Serviço', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Organizar armário da área de serviço', 'coletiva', 'Área de Serviço', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Separar roupas pequenas ou que não servem mais para doação', 'coletiva', 'Fora do ritmo', 'mensal', 15, 1, 1.10, 1, false),
    (p_family_id, 'Organizar o armário de remédios/primeiros socorros', 'coletiva', 'Fora do ritmo', 'mensal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Fazer café da manhã para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 2, 1.25, 1, false),
    (p_family_id, 'Fazer almoço para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, false),
    (p_family_id, 'Fazer jantar para si', 'coletiva', 'Preparo de refeições', 'diaria', 15, 3, 1.40, 1, false),
    (p_family_id, 'Preparar lanche para si', 'coletiva', 'Preparo de refeições', 'diaria', 5, 2, 0.40, 1, false),
    (p_family_id, 'Arrumar o sofá', 'coletiva', 'Sala e áreas comuns', 'diaria', 2, 1, 0.15, 1, false),
    (p_family_id, 'Regar plantas do quintal/jardim', 'coletiva', 'Área externa', 'diaria', 5, 1, 0.35, 1, false),
    (p_family_id, 'Varrer quintal, garagem ou varanda', 'coletiva', 'Área externa', 'semanal', 15, 1, 1.10, 1, false),
    (p_family_id, 'Podar e limpar plantas do quintal/jardim', 'coletiva', 'Área externa', 'semanal', 10, 2, 0.85, 1, false),
    (p_family_id, 'Organizar objetos guardados na área externa', 'coletiva', 'Área externa', 'semanal', 10, 1, 0.70, 1, false),
    (p_family_id, 'Alimentar o(s) pet(s)', 'coletiva', 'Pets', 'diaria', 3, 1, 0.20, 1, false),
    (p_family_id, 'Trocar a água do pet', 'coletiva', 'Pets', 'diaria', 2, 1, 0.15, 1, false),
    (p_family_id, 'Passear com o cachorro', 'coletiva', 'Pets', 'diaria', 20, 1, 1.45, 1, false),
    (p_family_id, 'Limpar a caixa de areia/local do pet', 'coletiva', 'Pets', 'diaria', 5, 2, 0.40, 1, false),
    (p_family_id, 'Escovar o pet', 'coletiva', 'Pets', 'semanal', 10, 1, 0.70, 1, false);
$$;
