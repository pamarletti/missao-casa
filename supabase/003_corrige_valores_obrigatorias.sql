-- Corrige valores de tarefas individuais e individual-coletivas que
-- estavam com números de um rascunho anterior à calibração final para
-- R$90/mês (ver claude/lista-de-tarefas.md). Rode este arquivo uma vez —
-- ele atualiza as tarefas que a sua família já tem cadastradas.

update public.task_catalog set valor_unitario = 0.20 where name = 'Cuidar da roupa da escola do dia seguinte';
update public.task_catalog set valor_unitario = 0.25 where name = 'Guardar objetos pessoais usados no dia';
update public.task_catalog set valor_unitario = 0.25 where name = 'Organizar brinquedos e objetos pessoais';
update public.task_catalog set valor_unitario = 0.55 where name = 'Trocar a roupa de cama pessoal';
update public.task_catalog set valor_unitario = 0.25 where name = 'Separar roupas para lavar';
update public.task_catalog set valor_unitario = 0.60 where name = 'Lavar a própria roupa (máquina)';
update public.task_catalog set valor_unitario = 0.55 where name = 'Secar a própria roupa';
update public.task_catalog set valor_unitario = 0.80 where name = 'Dobrar a própria roupa';
update public.task_catalog set valor_unitario = 0.50 where name = 'Guardar a própria roupa limpa no lugar';
update public.task_catalog set valor_unitario = 0.55 where name = 'Manter o próprio skate e EPIs higienizados';
update public.task_catalog set valor_unitario = 0.55 where name = 'Lavar toalhas de banho';
update public.task_catalog set valor_unitario = 0.25 where name = 'Trocar toalhas de banho';
update public.task_catalog set valor_unitario = 0.25 where name = 'Guardar toalhas limpas';
update public.task_catalog set valor_unitario = 0.30 where name = 'Manter o quarto arrumado no geral';
update public.task_catalog set valor_unitario = 0.70 where name = 'Varrer e passar pano no chão do quarto';
update public.task_catalog set valor_unitario = 1.25 where name = 'Organizar o guarda-roupa compartilhado';
update public.task_catalog set valor_unitario = 0.70 where name = 'Organizar objetos/brinquedos comuns do quarto';

-- Conferência: some os valores mensais das tarefas obrigatórias (individual
-- + individual-coletiva) e confirme que dá R$90,00.
-- select
--   sum(case when frequencia = 'diaria' then valor_unitario * ocorrencias_por_dia * 30
--            when frequencia = 'semanal' then valor_unitario * 4
--            else 0 end) as total_mensal_obrigatorias
-- from public.task_catalog
-- where categoria in ('individual', 'individual_coletiva');
