"use client";

import { desfazerEvento, desfazerAjuste } from "@/app/app/[profileId]/actions";
import { BotaoDireto } from "@/components/Carregando";
import { reais } from "@/lib/moeda";

export type AtividadeItem = {
  id: string;
  quando: string; // ISO date/timestamp
  quemNome?: string;
  profileId?: string;
  descricao: string;
  valor: number;
  statusLabel: string;
  tipo: "tarefa" | "ajuste";
};

/** Histórico cronológico (tarefas + ajustes de saldo). Quando
 * `permitirDesfazer` é true (só no painel do responsável), cada linha
 * ganha um botão para corrigir um clique errado a qualquer momento. */
export default function Atividades({
  itens,
  permitirDesfazer,
}: {
  itens: AtividadeItem[];
  permitirDesfazer: boolean;
}) {
  if (itens.length === 0) {
    return <p className="text-slate-400 text-sm">Nenhuma atividade registrada ainda.</p>;
  }

  return (
    <ul className="space-y-2">
      {itens.map((item) => (
        <li key={`${item.tipo}-${item.id}`} className="card flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{item.descricao}</p>
            <p className="text-sm text-slate-400">
              {item.quemNome ? `${item.quemNome} · ` : ""}
              {new Date(item.quando).toLocaleDateString("pt-BR")} · R$ {reais(Number(item.valor))} ·{" "}
              {item.statusLabel}
            </p>
          </div>
          {permitirDesfazer && (
            <BotaoDireto
              className="text-xs text-slate-500 underline shrink-0 disabled:opacity-40"
              acao={() => (item.tipo === "tarefa" ? desfazerEvento(item.id) : desfazerAjuste(item.id))}
            >
              desfazer
            </BotaoDireto>
          )}
        </li>
      ))}
    </ul>
  );
}
