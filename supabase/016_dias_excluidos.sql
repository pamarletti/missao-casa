-- Dias da semana em que uma tarefa diária NÃO vale.
--
-- Até aqui existia só um caso, e ele estava congelado numa coluna de
-- sim/não: `pula_fim_de_semana`, que queria dizer "não vale na sexta nem no
-- sábado" — porque no dia seguinte não tem aula, e não há mochila para
-- arrumar nem roupa de escola para separar. Funcionava para essas duas
-- tarefas e para mais nenhuma.
--
-- Agora a família escolhe: qualquer combinação de dias pode ficar de fora
-- de qualquer tarefa diária. "Regar as plantas, menos domingo". "Tirar o
-- lixo, só nos dias em que passa o caminhão".
--
-- Números iguais aos do JavaScript (getDay): 0 = domingo, 6 = sábado.
-- Lista nula ou vazia = vale todos os dias, que é como estão as 97 tarefas
-- de hoje.
--
-- O que isso muda no dinheiro: uma tarefa que vale 5 dias por semana rende
-- 5 vezes, não 7. Essa conta já existia para o fim de semana e passa a ser
-- feita a partir da lista — os valores das tarefas em si não são tocados,
-- nem nada que já foi feito.

alter table public.task_catalog
  add column if not exists dias_excluidos smallint[];

comment on column public.task_catalog.dias_excluidos is
  'Dias da semana em que a tarefa diária não vale (0 = domingo ... 6 = sábado). Nulo ou vazio = todos os dias.';

-- Traz o que a coluna antiga já dizia, sem mudar comportamento nenhum:
-- sexta (5) e sábado (6). Só preenche onde ainda está vazio, então rodar
-- este arquivo duas vezes não estraga uma escolha feita depois.
update public.task_catalog
set dias_excluidos = array[5, 6]::smallint[]
where pula_fim_de_semana = true
  and (dias_excluidos is null or cardinality(dias_excluidos) = 0);
