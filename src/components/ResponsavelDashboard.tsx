"use client";

import { useState } from "react";
import SaldoCard from "@/components/SaldoCard";
import NivelBadge from "@/components/NivelBadge";
import type { NivelInfo } from "@/lib/nivelConstancia";
import ConfirmQueue, { type PendingEvent } from "@/components/ConfirmQueue";
import TabBar from "@/components/TabBar";
import { type AtividadeItem } from "@/components/Atividades";
import PendenciasTab, { type Atrasada } from "@/components/PendenciasTab";
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
  pula_fim_de_semana: boolean;
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
  atrasadas,
  descontosEventos,
  descontosAjustes,
  revisarEventos,
  revisarCount,
  valorBaseObrigatorias,
  nivelPorPerfil,
}: {
  familyId: string;
  criancas: Crianca[];
  saldoPorPerfil: Record<string, number>;
  pending: PendingEvent[];
  catalog: Tarefa[];
  atividades: AtividadeItem[];
  hojeISO: string;
  eventosSemanaTodos: EventoSemana[];
  atrasadas: Atrasada[];
  descontosEventos: DescontoItem[];
  descontosAjustes: DescontoItem[];
  revisarEventos: RevisarItem[];
  revisarCount: number;
  valorBaseObrigatorias: number;
  nivelPorPerfil: Record<string, NivelInfo>;
}) {
  const [tab, setTab] = useState<TabKey>("inicio");

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "inicio" && (
        <>
          {criancas.map((c) => (
            <SaldoCard
              key={c.id}
              profileId={c.id}
              familyId={familyId}
              name={c.name}
              saldo={saldoPorPerfil[c.id] ?? 0}
              nivelBadge={<NivelBadge info={nivelPorPerfil[c.id]} />}
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
          atrasadas={atrasadas}
        />
      )}

      {tab === "descontos" && <DescontosPorDiaTab eventos={descontosEventos} ajustes={descontosAjustes} />}

      {tab === "revisar" && <RevisarTarefasTab eventos={revisarEventos} count={revisarCount} />}

      {tab === "catalogo" && (
        <CatalogoEditavelTab catalog={catalog} familyId={familyId} valorBaseAtual={valorBaseObrigatorias} />
      )}

      {tab === "historico" && <HistoricoPorPerfilTab criancas={criancas} atividades={atividades} />}
    </div>
  );
}
