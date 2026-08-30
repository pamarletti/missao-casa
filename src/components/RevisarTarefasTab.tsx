"use client";

import { decidir, desfazerEvento } from "@/app/app/[profileId]/actions";
import { BotaoDireto } from "@/components/Carregando";
import { reais } from "@/lib/moeda";

type Item = { id: string; data: string; status: string; valor: number; profileName: string; descricao: string };

const STATUS_LABEL: Record<string, string> = {
  confirmado: "confirmado",
  liberada: "liberada (autorizada)",
};

/** Revisar tarefas — número de registros confirmados/autorizados no dia
 * de hoje, e a lista completa, com botões para marcar, desmarcar ou
 * corrigir qualquer tarefa já registrada. */
export default function RevisarTarefasTab({ eventos, count }: { eventos: Item[]; count: number }) {
  return (
    <div>
      <div className="card mb-4 text-center">
        <p className="text-3xl font-bold text-casa-accent">{count}</p>
        <p className="text-sm text-slate-400">registros confirmados/autorizados hoje</p>
      </div>

      {eventos.length === 0 ? (
        <p className="text-slate-400 text-sm">Nada por aqui ainda.</p>
      ) : (
        <ul className="space-y-2">
          {eventos.map((e) => (
            <li key={e.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{e.descricao}</p>
                <p className="text-sm text-slate-400">
                  {e.profileName} · {new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR")} · R${" "}
                  {reais(Number(e.valor))} · {STATUS_LABEL[e.status] ?? e.status}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
                <BotaoDireto className="btn-primary text-xs w-full sm:w-auto" acao={() => decidir(e.id, "confirmar")}>
                  Confirmar
                </BotaoDireto>
                <BotaoDireto className="btn-secondary text-xs w-full sm:w-auto" acao={() => decidir(e.id, "refazer")}>
                  Refazer
                </BotaoDireto>
                <BotaoDireto className="btn-danger text-xs w-full sm:w-auto" acao={() => decidir(e.id, "nao_feito")}>
                  Não feito
                </BotaoDireto>
                <BotaoDireto
                  className="text-xs text-slate-500 underline disabled:opacity-40 py-1"
                  acao={() => desfazerEvento(e.id)}
                >
                  excluir
                </BotaoDireto>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
