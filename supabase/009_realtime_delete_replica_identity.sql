-- Faz o cancelamento feito pelo menino sumir na hora da tela do responsável.
--
-- Sintoma: André ou Hugo cancelavam um pedido de autorização/confirmação no
-- celular deles, a linha era apagada certinho do banco, mas o pedido
-- continuava aparecendo na fila de Pendências do responsável até ele dar
-- F5 ou trocar de aba. Marcar uma tarefa (INSERT) e confirmar (UPDATE)
-- sempre atualizaram sozinhos; só o cancelamento (DELETE) não.
--
-- Causa: por padrão o Postgres publica, num DELETE, apenas a chave
-- primária da linha apagada (REPLICA IDENTITY DEFAULT). O app assina o
-- Realtime filtrando por família (`filter: family_id=eq.<id>`, em
-- src/components/ConfirmQueue.tsx) — e, como o family_id não vem no aviso
-- de DELETE, esse filtro nunca casa e o aviso é descartado antes de chegar
-- no navegador. Com REPLICA IDENTITY FULL a linha antiga inteira é
-- publicada, o filtro passa a funcionar e a tela atualiza sozinha.
--
-- Vale para as duas tabelas em que o app apaga linhas: task_events
-- (cancelar a própria marcação, e o "desfazer" do responsável) e
-- saldo_ajustes (desfazer um ajuste manual de saldo).

alter table public.task_events replica identity full;
alter table public.saldo_ajustes replica identity full;
