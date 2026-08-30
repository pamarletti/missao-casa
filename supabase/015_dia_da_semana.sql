-- Dia certo da semana para as tarefas semanais.
--
-- Uma tarefa semanal continua valendo a semana inteira: o prazo é domingo à
-- noite, a cota é uma por semana, e nada disso muda. O que esta coluna
-- acrescenta é o combinado da casa — "a roupa de cama é trocada aos
-- domingos" —, que hoje só existia na cabeça de quem lembrava.
--
-- Com o dia preenchido, a tarefa passa a aparecer também na lista de Hoje
-- quando chega o dia dela, com o nome do dia escrito no cartão. Sem o dia
-- (nulo), tudo continua exatamente como sempre foi: ela mora só em "Esta
-- semana" e é feita quando der. Nulo é o valor de todas as 97 tarefas já
-- cadastradas, então nada muda para ninguém até alguém escolher um dia.
--
-- Números iguais aos do JavaScript (getDay): 0 = domingo, 6 = sábado. É o
-- que o app já usa para saber se hoje é sexta ou sábado, então não precisa
-- de conversão em lugar nenhum.

alter table public.task_catalog
  add column if not exists dia_da_semana smallint;

alter table public.task_catalog
  drop constraint if exists task_catalog_dia_da_semana_check;

alter table public.task_catalog
  add constraint task_catalog_dia_da_semana_check
  check (dia_da_semana is null or (dia_da_semana >= 0 and dia_da_semana <= 6));

comment on column public.task_catalog.dia_da_semana is
  'Dia combinado para uma tarefa semanal (0 = domingo ... 6 = sábado). Nulo = qualquer dia da semana.';

-- ── Frequência "não específica" ─────────────────────────────────
--
-- Uma tarefa que não tem ritmo nenhum: nem todo dia, nem toda semana, nem
-- todo mês — é feita quando alguém quiser fazer. Vale só para tarefas de
-- BÔNUS. Obrigação sem prazo não é cobrável: não haveria como dizer que
-- ficou atrasada, nem quantas vezes ela renderia por mês para entrar no
-- valor base. O app bloqueia essa combinação na hora de salvar; aqui o
-- banco só passa a aceitar o valor novo.

alter table public.task_catalog
  drop constraint if exists task_catalog_frequencia_check;

alter table public.task_catalog
  add constraint task_catalog_frequencia_check
  check (frequencia in ('diaria', 'semanal', 'mensal', 'nao_especifica'));
