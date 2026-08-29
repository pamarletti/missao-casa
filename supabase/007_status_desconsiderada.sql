-- Adiciona o status "desconsiderada" a task_events.
--
-- Contexto: o desconto automático por silêncio (rotina agendada na Vercel,
-- src/app/api/cron/desconto/route.ts) não estava rodando de forma confiável
-- no plano gratuito da Vercel (histórico de logs muito curto para
-- diagnosticar, e nenhum desconto automático chegou a ser gravado). Por
-- decisão da Paolla, esse desconto passa a ser manual: tarefas obrigatórias
-- diárias que ficam em silêncio total até o fim do dia aparecem como
-- "Atrasadas" no painel do responsável, que decide, tarefa por tarefa:
-- marcar como feita, marcar como não feita (aplica o desconto na hora) ou
-- desconsiderar (não desconta nem credita — ex.: dia de viagem, doença
-- etc.), removendo da lista sem mexer no saldo.

alter table public.task_events drop constraint if exists task_events_status_check;

alter table public.task_events add constraint task_events_status_check check (status in (
  'aguardando_autorizacao',
  'liberada',
  'aguardando_confirmacao',
  'confirmado',
  'nao_feito',
  'pedido_para_refazer',
  'desconto_automatico',
  'desconsiderada'
));
