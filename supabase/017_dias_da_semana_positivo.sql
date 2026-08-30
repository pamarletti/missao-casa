-- Frequência semanal com os dias marcados por dentro, não por fora.
--
-- O que muda: em vez de dizer em que dias a tarefa NÃO vale (a coluna
-- `dias_excluidos`, de ontem), a família marca em que dias ela ACONTECE.
-- É como se pensa a rotina de casa — "o banheiro é às quartas" —, não pelo
-- avesso.
--
-- O quadro de frequências passa a ser:
--   diária          — todo dia, 1, 2 ou 3 vezes por dia
--   semanal         — nos dias marcados; sem nenhum dia marcado, é uma vez
--                     por semana, quando der (prazo domingo à noite)
--   mensal          — uma vez por mês
--   não específica  — sem ritmo nenhum, só para tarefas de bônus
--
-- Prazo, nas semanais: com dias marcados, o prazo é o próprio dia — se era
-- quarta e não foi feita, na quinta está atrasada. Sem dias marcados, o
-- prazo continua sendo o fim da semana, como sempre foi.
--
-- Esta migração converte tudo o que já existe SEM mudar comportamento nem
-- valor de nada:
--   * semanal com um dia combinado (coluna `dia_da_semana`, da 015) vira
--     uma lista de um dia só;
--   * diária com dias de folga (`dias_excluidos`, da 016, e o antigo
--     `pula_fim_de_semana`) vira semanal com os dias que sobraram — a
--     mochila e a roupa da escola passam a ser "semanal: seg, ter, qua,
--     qui, dom", que é exatamente o que elas sempre foram.
--
-- As colunas antigas ficam no banco, sem uso, em vez de serem apagadas:
-- guardar o histórico do que foi decidido custa nada e permite conferir
-- depois se a conversão fez o que devia.

alter table public.task_catalog
  add column if not exists dias_da_semana smallint[];

comment on column public.task_catalog.dias_da_semana is
  'Dias em que a tarefa semanal acontece (0 = domingo ... 6 = sábado). Nulo ou vazio = uma vez por semana, em qualquer dia.';

-- 1. Semanal que já tinha um dia combinado.
update public.task_catalog
set dias_da_semana = array[dia_da_semana]::smallint[]
where frequencia = 'semanal'
  and dia_da_semana is not null
  and (dias_da_semana is null or cardinality(dias_da_semana) = 0);

-- 2. Diária com dias de folga vira semanal com os dias que restam.
update public.task_catalog
set frequencia = 'semanal',
    dias_da_semana = (
      select array_agg(d::smallint order by d)
      from generate_series(0, 6) as d
      where not (
        d = any(
          coalesce(
            dias_excluidos,
            case when pula_fim_de_semana then array[5, 6]::smallint[] else '{}'::smallint[] end
          )
        )
      )
    )
where frequencia = 'diaria'
  and (
    cardinality(coalesce(dias_excluidos, '{}'::smallint[])) > 0
    or pula_fim_de_semana = true
  )
  and (dias_da_semana is null or cardinality(dias_da_semana) = 0);

-- Conferência (roda junto e mostra o resultado):
select name, frequencia, dias_da_semana, ocorrencias_por_dia
from public.task_catalog
where dias_da_semana is not null
order by name;
