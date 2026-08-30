"use client";

import { useState } from "react";
import { reais } from "@/lib/moeda";

/** Somatório do que as tarefas renderam para o menino, em quatro janelas de
 * tempo. Conta só tarefas (obrigatórias e coletivas), não ajustes manuais
 * de saldo — é "quanto eu ganhei fazendo coisas", não o saldo. Como
 * descontos entram como valor negativo, o número já vem líquido.
 * Calculado no servidor, em src/app/app/[profileId]/page.tsx. */
export type TotaisAtividades = {
  hoje: number;
  semana: number;
  mes: number;
  total: number;
};

const PERIODOS = [
  { key: "hoje", label: "Hoje", legenda: "hoje" },
  { key: "semana", label: "Esta semana", legenda: "nesta semana" },
  { key: "mes", label: "Este mês", legenda: "neste mês" },
  { key: "total", label: "Desde o início", legenda: "desde o início" },
] as const;

type PeriodoKey = (typeof PERIODOS)[number]["key"];

export default function TotaisAtividadesCard({ totais }: { totais: TotaisAtividades }) {
  const [periodo, setPeriodo] = useState<PeriodoKey>("hoje");
  const escolhido = PERIODOS.find((p) => p.key === periodo) ?? PERIODOS[0];
  const valor = totais[periodo];

  return (
    <div className="card mb-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriodo(p.key)}
            className={
              "text-xs px-3 py-1 rounded-full whitespace-nowrap transition " +
              (periodo === p.key ? "bg-casa-accent text-slate-900 font-semibold" : "bg-slate-700 text-slate-300")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className={"text-3xl font-bold " + (valor < 0 ? "text-red-400" : "text-casa-accent")}>
        R$ {reais(valor)}
      </p>
      <p className="text-sm text-slate-400">
        somando tudo que você fez {escolhido.legenda} (tarefas obrigatórias e coletivas)
      </p>
    </div>
  );
}
