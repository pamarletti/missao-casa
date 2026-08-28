"use client";

import { useState } from "react";
import SaldoCard from "@/components/SaldoCard";
import ConfirmQueue, { type PendingEvent } from "@/components/ConfirmQueue";
import TabBar from "@/components/TabBar";
import Atividades, { type AtividadeItem } from "@/components/Atividades";

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  subcategoria: string | null;
  valor_unitario: number;
};

type Crianca = { id: string; name: string };

const CATEGORIA_LABEL: Record<string, string> = {
  individual: "Tarefas individuais",
  individual_coletiva: "Tarefas do quarto (individual-coletivas)",
  coletiva: "Tarefas coletivas",
};

const TABS = [
  { key: "inicio", label: "Início" },
  { key: "catalogo", label: "Catálogo" },
  { key: "atividades", label: "Histórico de Atividades" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ResponsavelDashboard({
  familyId,
  criancas,
  saldoPorPerfil,
  pending,
  catalog,
  atividades,
}: {
  familyId: string;
  criancas: Crianca[];
  saldoPorPerfil: Record<string, number>;
  pending: PendingEvent[];
  catalog: Tarefa[];
  atividades: AtividadeItem[];
}) {
  const [tab, setTab] = useState<TabKey>("inicio");

  const grupos = new Map<string, Tarefa[]>();
  for (const t of catalog) {
    const chave = CATEGORIA_LABEL[t.categoria] ?? t.categoria;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(t);
  }

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "inicio" && (
        <>
          <h2 className="text-lg font-semibold mb-3">Saldo acumulado</h2>
          <p className="text-sm text-slate-400 -mt-2 mb-3">
            Não zera no fim do mês — some as tarefas confirmadas e só diminui quando você registra uma retirada
            abaixo ("Ajustar saldo" → "Remover").
          </p>
          {criancas.map((c) => (
            <SaldoCard
              key={c.id}
              profileId={c.id}
              familyId={familyId}
              name={c.name}
              saldo={saldoPorPerfil[c.id] ?? 0}
            />
          ))}

          <h2 className="text-lg font-semibold mb-3 mt-6">Pendências</h2>
          <ConfirmQueue familyId={familyId} events={pending} />
        </>
      )}

      {tab === "catalogo" && (
        <>
          {Array.from(grupos.entries()).map(([titulo, tarefas]) => (
            <section key={titulo} className="mb-6">
              <h2 className="text-lg font-semibold mb-3">{titulo}</h2>
              <ul className="space-y-2">
                {tarefas.map((t) => (
                  <li key={t.id} className="card flex items-center justify-between">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-slate-400">R$ {Number(t.valor_unitario).toFixed(2)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {tab === "atividades" && <Atividades itens={atividades} permitirDesfazer />}
    </div>
  );
}
