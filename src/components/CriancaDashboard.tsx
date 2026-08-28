"use client";

import { useState } from "react";
import { markOrRequest, markColetivaDone, cancelarPropriaMarcacao } from "@/app/app/[profileId]/actions";
import { inicioDaJanela } from "@/lib/periodos";
import TabBar from "@/components/TabBar";
import Atividades, { type AtividadeItem } from "@/components/Atividades";

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  subcategoria: string | null;
  frequencia: string;
  valor_unitario: number;
  ocorrencias_por_dia: number;
};

type EventoMes = {
  id: string;
  task_id: string;
  status: string;
  valor: number;
  data: string;
};

const CATEGORIA_LABEL: Record<string, string> = {
  individual: "Suas tarefas",
  individual_coletiva: "Do seu espaço (quarto)",
  coletiva: "Tarefas coletivas (bônus)",
};

const TABS = [
  { key: "inicio", label: "Início" },
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Esta semana" },
  { key: "coletivas", label: "Coletivas" },
  { key: "catalogo", label: "Catálogo" },
  { key: "atividades", label: "Atividades" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function CriancaDashboard({
  familyId,
  today,
  catalog,
  eventosMes,
  atividades,
  saldoDoMes,
  feitasMes,
  naoFeitasMes,
  numCriancas,
}: {
  familyId: string;
  today: string;
  catalog: Tarefa[];
  eventosMes: EventoMes[];
  atividades: AtividadeItem[];
  saldoDoMes: number;
  feitasMes: number;
  naoFeitasMes: number;
  numCriancas: number;
}) {
  const [tab, setTab] = useState<TabKey>("inicio");

  function statusAtual(taskId: string, frequencia: string) {
    const janela = inicioDaJanela(frequencia, today);
    const relevantes = eventosMes.filter((e) => e.task_id === taskId && e.data >= janela);
    return relevantes[relevantes.length - 1];
  }

  function TarefaRow({ t }: { t: Tarefa }) {
    const evento = statusAtual(t.id, t.frequencia);
    return (
      <li className="card flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{t.name}</p>
          <p className="text-sm text-slate-400">R$ {Number(t.valor_unitario).toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!evento && t.categoria !== "coletiva" && (
            <form action={markOrRequest.bind(null, t.id, familyId)}>
              <button className="btn-primary text-sm">Feito</button>
            </form>
          )}
          {!evento && t.categoria === "coletiva" && (
            <form action={markOrRequest.bind(null, t.id, familyId)}>
              <button className="btn-secondary text-sm">Quero fazer</button>
            </form>
          )}
          {evento?.status === "liberada" && (
            <form action={markColetivaDone.bind(null, evento.id)}>
              <button className="btn-primary text-sm">Feito</button>
            </form>
          )}
          {evento && ["aguardando_confirmacao", "aguardando_autorizacao"].includes(evento.status) && (
            <>
              <span className="text-sm text-amber-400">
                {evento.status === "aguardando_autorizacao" ? "esperando liberação" : "aguardando confirmação"}
              </span>
              <button
                type="button"
                className="text-xs text-slate-500 underline"
                onClick={() => cancelarPropriaMarcacao(evento.id)}
              >
                cancelar
              </button>
            </>
          )}
          {evento?.status === "confirmado" && <span className="text-sm text-green-400">confirmado ✓</span>}
          {evento?.status === "nao_feito" && <span className="text-sm text-red-400">não feito</span>}
          {evento?.status === "pedido_para_refazer" && (
            <span className="text-sm text-amber-400">pedido para refazer</span>
          )}
        </div>
      </li>
    );
  }

  function Catalogo({ tarefas, agruparPor }: { tarefas: Tarefa[]; agruparPor: "categoria" | "subcategoria" }) {
    if (tarefas.length === 0) return <p className="text-slate-400 text-sm">Nada por aqui.</p>;

    const grupos = new Map<string, Tarefa[]>();
    for (const t of tarefas) {
      const chave = agruparPor === "subcategoria" ? t.subcategoria ?? "Outras" : CATEGORIA_LABEL[t.categoria] ?? t.categoria;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(t);
    }

    return (
      <>
        {Array.from(grupos.entries()).map(([titulo, tarefasDoGrupo]) => (
          <section key={titulo} className="mb-6">
            <h2 className="text-lg font-semibold mb-3">{titulo}</h2>
            <ul className="space-y-2">
              {tarefasDoGrupo.map((t) => (
                <TarefaRow key={t.id} t={t} />
              ))}
            </ul>
          </section>
        ))}
      </>
    );
  }

  const pendentesProprios = eventosMes.filter((e) =>
    ["aguardando_autorizacao", "aguardando_confirmacao"].includes(e.status)
  );

  // Progresso e projeção: quanto dá pra ganhar fazendo tudo que é
  // obrigatório (individual + individual-coletiva — as coletivas são
  // bônus à parte, sem obrigação nem teto).
  const obrigatorias = catalog.filter((t) => t.categoria !== "coletiva");
  const potencialDia = obrigatorias
    .filter((t) => t.frequencia === "diaria")
    .reduce((acc, t) => acc + Number(t.valor_unitario) * (t.ocorrencias_por_dia || 1), 0);
  const potencialSemanaTarefas = obrigatorias
    .filter((t) => t.frequencia === "semanal")
    .reduce((acc, t) => acc + Number(t.valor_unitario), 0);
  const potencialSemana = potencialDia * 7 + potencialSemanaTarefas;
  const potencialMes = potencialDia * 30 + potencialSemanaTarefas * 4;

  const idsObrigatorias = new Set(obrigatorias.map((t) => t.id));
  const feitoHoje = eventosMes
    .filter(
      (e) =>
        e.data === today &&
        idsObrigatorias.has(e.task_id) &&
        ["confirmado", "aguardando_confirmacao"].includes(e.status)
    )
    .reduce((acc, e) => acc + Number(e.valor), 0);
  const progressoPct = potencialDia > 0 ? Math.min(100, (feitoHoje / potencialDia) * 100) : 0;

  // Progresso do mês: quanto das tarefas obrigatórias já foi feito/marcado
  // este mês, sobre o teto do mês (R$90) — e quanto ainda falta pra chegar
  // lá. Conta também o que está aguardando confirmação (já foi feito, só
  // falta o responsável bater o olho), não só o que já foi confirmado.
  const obrigatoriasFeitasMes = eventosMes
    .filter(
      (e) =>
        idsObrigatorias.has(e.task_id) &&
        ["confirmado", "aguardando_confirmacao", "desconto_automatico"].includes(e.status)
    )
    .reduce((acc, e) => acc + Number(e.valor), 0);
  const progressoMesPct = potencialMes > 0 ? Math.min(100, Math.max(0, (obrigatoriasFeitasMes / potencialMes) * 100)) : 0;
  const faltaMes = Math.max(0, potencialMes - obrigatoriasFeitasMes);
  const metaMesBatida = potencialMes > 0 && obrigatoriasFeitasMes >= potencialMes;

  // Bônus extra: quanto as tarefas coletivas (bônus, sem teto) dariam a
  // mais por mês, em média por criança — dividido pelo número de meninos
  // da família, já que as coletivas são feitas e repartidas entre eles.
  const coletivas = catalog.filter((t) => t.categoria === "coletiva");
  const coletivasDia = coletivas
    .filter((t) => t.frequencia === "diaria")
    .reduce((acc, t) => acc + Number(t.valor_unitario) * (t.ocorrencias_por_dia || 1), 0);
  const coletivasSemana = coletivas
    .filter((t) => t.frequencia === "semanal")
    .reduce((acc, t) => acc + Number(t.valor_unitario), 0);
  const coletivasMensal = coletivas
    .filter((t) => t.frequencia === "mensal")
    .reduce((acc, t) => acc + Number(t.valor_unitario), 0);
  const coletivasTotalMes = coletivasDia * 30 + coletivasSemana * 4 + coletivasMensal;
  const divisorCriancas = numCriancas > 0 ? numCriancas : 1;
  const bonusExtraDia = coletivasDia / divisorCriancas;
  const bonusExtraSemana = (coletivasDia * 7 + coletivasSemana) / divisorCriancas;
  const bonusExtraMes = coletivasTotalMes / divisorCriancas;

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "inicio" && (
        <>
          <div className="card mb-4">
            <p className="text-slate-400 text-sm">Saldo confirmado este mês</p>
            <p className="text-3xl font-bold text-casa-accent">R$ {saldoDoMes.toFixed(2)}</p>
          </div>

          <div className="card mb-4">
            <div className="flex justify-between text-sm text-slate-400 mb-1">
              <span>Progresso do mês</span>
              <span>
                R$ {obrigatoriasFeitasMes.toFixed(2)} / R$ {potencialMes.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-casa-accent h-3 rounded-full transition-all"
                style={{ width: `${progressoMesPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {metaMesBatida
                ? "Você já garantiu o valor cheio do mês! 🎉"
                : `Faltam R$ ${faltaMes.toFixed(2)} para completar o mês fazendo as obrigatórias.`}
            </p>
          </div>

          <div className="card mb-4">
            <div className="flex justify-between text-sm text-slate-400 mb-1">
              <span>Progresso de hoje</span>
              <span>
                R$ {feitoHoje.toFixed(2)} / R$ {potencialDia.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-casa-accent h-3 rounded-full transition-all"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
          </div>

          <div className="card mb-6">
            <p className="text-sm text-slate-400 mb-2">Se fizer tudo que é obrigatório, dá pra chegar a:</p>
            <div className="flex justify-around text-center">
              <div>
                <p className="font-bold text-casa-accent">R$ {potencialDia.toFixed(2)}</p>
                <p className="text-xs text-slate-400">hoje</p>
              </div>
              <div>
                <p className="font-bold text-casa-accent">R$ {potencialSemana.toFixed(2)}</p>
                <p className="text-xs text-slate-400">essa semana</p>
              </div>
              <div>
                <p className="font-bold text-casa-accent">R$ {potencialMes.toFixed(2)}</p>
                <p className="text-xs text-slate-400">esse mês</p>
              </div>
            </div>
          </div>

          <div className="card mb-6">
            <p className="text-sm text-slate-400 mb-2">
              Bônus extra fazendo tarefas coletivas (média por criança, sem teto):
            </p>
            <div className="flex justify-around text-center">
              <div>
                <p className="font-bold text-green-400">R$ {bonusExtraDia.toFixed(2)}</p>
                <p className="text-xs text-slate-400">por dia</p>
              </div>
              <div>
                <p className="font-bold text-green-400">R$ {bonusExtraSemana.toFixed(2)}</p>
                <p className="text-xs text-slate-400">por semana</p>
              </div>
              <div>
                <p className="font-bold text-green-400">R$ {bonusExtraMes.toFixed(2)}</p>
                <p className="text-xs text-slate-400">por mês</p>
              </div>
            </div>
          </div>

          <div className="card mb-6 flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">{feitasMes}</p>
              <p className="text-xs text-slate-400">feitas no mês</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{naoFeitasMes}</p>
              <p className="text-xs text-slate-400">não feitas no mês</p>
            </div>
          </div>

          {pendentesProprios.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Esperando decisão</h2>
              <ul className="space-y-2">
                {pendentesProprios.map((e) => {
                  const tarefa = catalog.find((t) => t.id === e.task_id);
                  return (
                    <li key={e.id} className="card flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{tarefa?.name ?? "Tarefa"}</p>
                        <p className="text-sm text-amber-400">
                          {e.status === "aguardando_autorizacao" ? "esperando liberação" : "aguardando confirmação"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-slate-500 underline shrink-0"
                        onClick={() => cancelarPropriaMarcacao(e.id)}
                      >
                        cancelar
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === "hoje" && (
        <Catalogo
          tarefas={catalog.filter((t) => t.categoria !== "coletiva" && t.frequencia === "diaria")}
          agruparPor="categoria"
        />
      )}

      {tab === "semana" && (
        <Catalogo
          tarefas={catalog.filter((t) => t.categoria !== "coletiva" && t.frequencia === "semanal")}
          agruparPor="categoria"
        />
      )}

      {tab === "coletivas" && (
        <Catalogo tarefas={catalog.filter((t) => t.categoria === "coletiva")} agruparPor="subcategoria" />
      )}

      {tab === "catalogo" && <Catalogo tarefas={catalog} agruparPor="categoria" />}

      {tab === "atividades" && <Atividades itens={atividades} permitirDesfazer={false} />}
    </div>
  );
}
