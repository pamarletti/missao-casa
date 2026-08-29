"use client";

import { useState } from "react";
import SaldoCard from "@/components/SaldoCard";
import ConfirmQueue, { type PendingEvent } from "@/components/ConfirmQueue";
import TabBar from "@/components/TabBar";
import { type AtividadeItem } from "@/components/Atividades";
import PendenciasTab from "@/components/PendenciasTab";
import DescontosPorDiaTab from "@/components/DescontosPorDiaTab";
import RevisarTarefasTab from "@/components/RevisarTarefasTab";
import CatalogoEditavelTab from "@/components/CatalogoEditavelTab";
import HistoricoPorPerfilTab from "@/components/HistoricoPorPerfilTab";

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  subcategoria: string | null;
  frequencia: string;
  valor_unitario: number;
  ocorrencias_por_dia: number;
  icone: string | null;
};

type Crianca = { id: string; name: string };
type EventoSemana = { id: string; task_id: string; profile_id: string; status: string; data: string };
type DescontoItem = {
  id: string;
  data: string;
  valor: number;
  profileId: string;
  profileName: string;
  descricao: string;
};
type RevisarItem = { id: string; data: string; status: string; valor: number; profileName: string; descricao: string };

const TABS = [
  { key: "inicio", label: "Início" },
  { key: "pendencias", label: "Pendências" },
  { key: "descontos", label: "Descontos por dia" },
  { key: "revisar", label: "Revisar tarefas" },
  { key: "catalogo", label: "Catálogo editável" },
  { key: "historico", label: "Histórico por perfil" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ResponsavelDashboard({
  familyId,
  criancas,
  saldoPorPerfil,
  pending,
  catalog,
  atividades,
  hojeISO,
  eventosSemanaTodos,
  descontosEventos,
  descontosAjustes,
  revisarEventos,
  revisarCount,
}: {
  familyId: string;
  criancas: Crianca[];
  saldoPorPerfil: Record<string, number>;
  pending: PendingEvent[];
  catalog: Tarefa[];
  atividades: AtividadeItem[];
  hojeISO: string;
  eventosSemanaTodos: EventoSemana[];
  descontosEventos: DescontoItem[];
  descontosAjustes: DescontoItem[];
  revisarEventos: RevisarItem[];
  revisarCount: number;
}) {
  const [tab, setTab] = useState<TabKey>("inicio");

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

      {tab === "pendencias" && (
        <PendenciasTab
          familyId={familyId}
          criancas={criancas}
          catalog={catalog}
          eventos={eventosSemanaTodos}
          hojeISO={hojeISO}
        />
      )}

      {tab === "descontos" && <DescontosPorDiaTab eventos={descontosEventos} ajustes={descontosAjustes} />}

      {tab === "revisar" && <RevisarTarefasTab eventos={revisarEventos} count={revisarCount} />}

      {tab === "catalogo" && <CatalogoEditavelTab catalog={catalog} />}

      {tab === "historico" && <HistoricoPorPerfilTab criancas={criancas} atividades={atividades} />}
    </div>
  );
}
