-- Limpa perfis duplicados criados por um bug no cadastro (onboarding): a
-- tela "Quem mora na casa?" não desabilitava o botão "Começar a usar" nem
-- travava no servidor um segundo envio, então um clique duplo (ou reenvio
-- depois de voltar a página) criava um segundo conjunto de perfis com os
-- mesmos nomes na mesma família. Corrigido no código em 29/08/2026
-- (src/app/onboarding/OnboardingForm.tsx desabilita o botão após o
-- primeiro clique; src/app/onboarding/actions.ts agora checa se a família
-- já tem perfis antes de criar mais). Este arquivo só limpa o que já
-- existia no banco antes da correção.
--
-- PASSO 1 — rode só esta consulta primeiro, pra CONFERIR o que vai ser
-- apagado. Ela lista, para cada nome duplicado dentro da mesma família,
-- todos os perfis "extras" (mantém sempre o mais antigo de cada grupo) e
-- quantas tarefas/ajustes cada um já tem registrado.

with ranked as (
  select
    id, family_id, name, kind, created_at,
    row_number() over (partition by family_id, name, kind order by created_at asc, id asc) as posicao
  from public.profiles
)
select
  r.family_id,
  r.name,
  r.kind,
  r.id,
  r.created_at,
  (select count(*) from public.task_events e where e.profile_id = r.id) as eventos,
  (select count(*) from public.saldo_ajustes a where a.profile_id = r.id) as ajustes
from ranked r
where r.posicao > 1
order by r.family_id, r.name;

-- PASSO 2 — depois de conferir acima que os "extras" com eventos = 0 e
-- ajustes = 0 são mesmo os duplicados do bug (perfis de teste, saldo
-- R$0,00, nunca usados), rode este DELETE. Ele só apaga um perfil duplicado
-- se ele não tiver NENHUM evento nem ajuste registrado — se algum duplicado
-- já tiver sido usado de verdade, ele é preservado e precisa de decisão
-- manual (juntar o histórico à mão, o que este script não faz sozinho).

-- with ranked as (
--   select
--     id, family_id, name, kind, created_at,
--     row_number() over (partition by family_id, name, kind order by created_at asc, id asc) as posicao
--   from public.profiles
-- )
-- delete from public.profiles
-- where id in (
--   select r.id
--   from ranked r
--   where r.posicao > 1
--     and not exists (select 1 from public.task_events e where e.profile_id = r.id)
--     and not exists (select 1 from public.saldo_ajustes a where a.profile_id = r.id)
-- );
