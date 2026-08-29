"use client";

import { useState } from "react";
import Atividades, { type AtividadeItem } from "@/components/Atividades";

type Crianca = { id: string; name: string };

const PERIODOS = [
  { key: "1d", label: "Último dia", dias: 1 },
  { key: "3d", label: "Últimos 3 dias", dias: 3 },
  { key: "7d", label: "Última semana", dias: 7 },
  { key: "30d", label: "Último mês", dias: 30 },
  { key: "todas", label: "Todas", dias: null },
] as const;

/** Histórico por perfil de criança — reaproveita o histórico geral
 * (tarefas + ajustes), filtrando por criança e por período na hora, sem
 * precisar de uma nova busca ao banco a cada troca de filtro. */
export default function HistoricoPorPerfilTab({
  criancas,
  atividades,
}: {
  criancas: Crianca[];
  atividades: AtividadeItem[];
}) {
  const [perfilId, setPerfilId] = useState<string>("todos");
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["key"]>("7d");

  const limiteDias = PERIODOS.find((p) => p.key === periodo)?.dias ?? null;
  const desde = limiteDias !== null ? Date.now() - limiteDias * 24 * 60 * 60 * 1000 : null;

  const filtradas = atividades.filter((item) => {
    if (perfilId !== "todos" && item.profileId !== perfilId) return false;
    if (desde !== null && new Date(item.quando).getTime() < desde) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={perfilId}
          onChange={(e) => setPerfilId(e.target.value)}
          className="text-sm bg-slate-800 border border-slate-600 rounded-xl px-3 py-2"
        >
          <option value="todos">Todas as crianças</option>
          {criancas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriodo(p.key)}
            className={
              "text-xs px-3 py-1 rounded-full transition " +
              (periodo === p.key ? "bg-casa-accent text-slate-900 font-semibold" : "bg-slate-700 text-slate-300")
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      <Atividades itens={filtradas} permitirDesfazer />
    </div>
  );
}
