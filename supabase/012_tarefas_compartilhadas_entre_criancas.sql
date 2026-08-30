-- Quem alterna cada tarefa compartilhada.
--
-- Tarefas com Finalidade "Compartilhadas" (o quarto e o guarda-roupa que os
-- meninos dividem) passam a poder indicar QUAIS crianças se revezam nelas.
-- Guardado como uma lista de perfis na própria tarefa — é sempre um punhado
-- de ids, não compensa uma tabela à parte.
--
-- Regra de leitura, pensada pra não mudar nada do que já existe: lista vazia
-- ou nula significa "todas as crianças da família", que é exatamente o
-- comportamento de hoje. As 97 tarefas já cadastradas ficam nulas e seguem
-- valendo pra todo mundo até alguém escolher o contrário.

alter table public.task_catalog add column if not exists profile_ids uuid[];

comment on column public.task_catalog.profile_ids is
  'Crianças que se revezam nesta tarefa. Nulo ou vazio = todas as crianças da família.';
