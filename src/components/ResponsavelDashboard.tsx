"use client";

import { useState } from "react";
import SaldoCard from "@/components/SaldoCard";
import NivelBadge from "@/components/NivelBadge";
import type { NivelInfo } from "@/lib/nivelConstancia";
import ConfirmQueue, { type PendingEvent } from "@/components/ConfirmQueue";
import TabBar from "@/components/TabBar";
import { type AtividadeItem } from "@/components/Atividades";
import PendenciasTab, { type Atrasada } from "@/components/PendenciasTab";
import { type PedidoDeTroca } from "@/lib/trocas";
import ResumoFeitasCard, { type ResumoFeitas } from "@/components/ResumoFeitasCard";
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
  /** Dias em que a semanal acontece: 0 = domingo ... 6 = sábado. Vazio = qualquer dia. */
  dias_da_semana: number[] | null;
  icone: string | null;
  ativo: boolean;
  tipo: string | null;
  finalidade: string | null;
  comodo: string | null;
  /** Crianças que se revezam nesta tarefa. Nulo/vazio = todas. */
  profile_ids: string[] | null;
};

type Crianca = { id: string; name: string; icon?: string | null };
type EventoSemana = { id: string; task_id: string; profile_id: string; status: string; data: string };
const TABS = [
  { key: "inicio", label: "Início" },
  { key: "pendencias", label: "Pendências" },
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
  catalogoCompleto,
  atividades,
  hojeISO,
  eventosSemanaTodos,
  atrasadas,
  resumoFeitas,
  valorBaseObrigatorias,
  nivelPorPerfil,
  pedidosDeTroca,
}: {
  familyId: string;
  criancas: Crianca[];
  saldoPorPerfil: Record<string, number>;
  pending: PendingEvent[];
  /** Só as tarefas ligadas — é o que os meninos veem e o que entra em Pendências. */
  catalog: Tarefa[];
  /** Inclui também as desligadas ("desnecessárias"), só pro Catálogo editável. */
  catalogoCompleto: Tarefa[];
  atividades: AtividadeItem[];
  hojeISO: string;
  eventosSemanaTodos: EventoSemana[];
  atrasadas: Atrasada[];
  resumoFeitas: Record<string, ResumoFeitas>;
  valorBaseObrigatorias: number;
  nivelPorPerfil: Record<string, NivelInfo>;
  /** Trocas combinadas entre os meninos — mudam de quem é cada tarefa hoje. */
  pedidosDeTroca: PedidoDeTroca[];
}) {
  const [tab, setTab] = useState<TabKey>("inicio");

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "inicio" && (
        <>
          <p className="text-sm text-slate-400 mb-4">Tenha uma visão geral do que está acontecendo.</p>
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

          <ResumoFeitasCard criancas={criancas} resumo={resumoFeitas} />

          <h2 className="text-lg font-semibold mt-6">Aguardando confirmação/autorização</h2>
          <p className="text-sm text-slate-400 mb-3">
            Não esqueça de conferir se a tarefa foi feita... e bem feita. Talvez tenha algo que precise ser ensinado.
          </p>
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
          pedidos={pedidosDeTroca}
        />
      )}



      {tab === "catalogo" && (
        <CatalogoEditavelTab
          catalog={catalogoCompleto}
          criancas={criancas}
          familyId={familyId}
          valorBaseAtual={valorBaseObrigatorias}
        />
      )}

      {tab === "historico" && <HistoricoPorPerfilTab criancas={criancas} atividades={atividades} />}
    </div>
  );
}
