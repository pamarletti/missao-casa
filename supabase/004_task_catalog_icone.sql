-- Adiciona a possibilidade de cada tarefa ter um ícone próprio, editável
-- pelo responsável na aba "Catálogo editável". Quando não for definido
-- (null), o app continua escolhendo um ícone automático por palavra-chave.
alter table public.task_catalog add column if not exists icone text;
