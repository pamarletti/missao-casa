"use client";

import { registrarDireto } from "@/app/app/[profileId]/actions";
import { inicioDaJanela } from "@/lib/periodos";
import { iconeTarefa } from "@/lib/iconeTarefa";

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  frequencia: string;
  valor_unitario: number;
  icone: string | null;
};

type EventoSemana = { id: string; task_id: string; profile_id: string; status: string; data: string };
type Crianca = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  aguardando_autorizacao: "aguardando autorização",
  liberada: "liberada",
  aguardando_confirmacao: "aguardando confirmação",
  confirmado: "confirmado ✓",
  nao_feito: "não feito",
  pedido_para_refazer: "pedido para refazer",
  desconto_automatico: "descontado",
};

/** Pendências de hoje/semana — mesma regra de "silêncio total" usada no
 * painel do menino (nenhuma marcação ainda = pendente), só que aqui olhando
 * todas as crianças de uma vez, organizadas por tarefa. Uma tarefa só
 * aparece na lista enquanto pelo menos uma criança ainda não tiver decisão
 * registrada para ela. */
export default function PendenciasTab({
  familyId,
  criancas,
  catalog,
  eventos,
  hojeISO,
}: {
  familyId: string;
  criancas: Crianca[];
  catalog: Tarefa[];
  eventos: EventoSemana[];
  hojeISO: string;
}) {
  const obrigatorias = catalog.filter((t) => t.categoria !== "coletiva");

  function statusDoFilho(taskId: string, frequencia: string, profileId: string) {
    const janela = inicioDaJanela(frequencia, hojeISO);
    const relevantes = eventos.filter(
      (e) => e.task_id === taskId && e.profile_id === profileId && e.data >= janela
    );
    return relevantes[relevantes.length - 1];
  }

  function Bloco({ titulo, tarefas }: { titulo: string; tarefas: Tarefa[] }) {
    const linhas = tarefas
      .map((t) => ({
        tarefa: t,
        porFilho: criancas.map((c) => ({ crianca: c, evento: statusDoFilho(t.id, t.frequencia, c.id) })),
      }))
      .filter((linha) => linha.porFilho.some((pf) => !pf.evento));

    return (
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">{titulo}</h2>
        {linhas.length === 0 ? (
          <p className="text-sm text-green-400">Tudo marcado por aqui! 🎉</p>
        ) : (
          <ul className="space-y-3">
            {linhas.map(({ tarefa, porFilho }) => (
              <li key={tarefa.id} className="card">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{iconeTarefa(tarefa)}</span>
                  <p className="font-medium">{tarefa.name}</p>
                  <span className="text-xs text-slate-400 ml-auto">
                    R$ {Number(tarefa.valor_unitario).toFixed(2)}
                  </span>
                </div>
                <ul className="divide-y divide-slate-700/60">
                  {porFilho.map(({ crianca, evento }) => (
                    <li key={crianca.id} className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
                      <span className="text-sm">{crianca.name}</span>
                      {!evento ? (
                        <div className="flex gap-1.5">
                          <form action={registrarDireto.bind(null, tarefa.id, crianca.id, familyId, "feito")}>
                            <button className="btn-primary text-xs px-2 py-0.5" title="Marcar feito">
                              ✓
                            </button>
                          </form>
                          <form action={registrarDireto.bind(null, tarefa.id, crianca.id, familyId, "nao_feito")}>
                            <button className="btn-danger text-xs px-2 py-0.5" title="Marcar não feito">
                              ✗
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">{STATUS_LABEL[evento.status] ?? evento.status}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <div>
      <Bloco titulo="Hoje" tarefas={obrigatorias.filter((t) => t.frequencia === "diaria")} />
      <Bloco titulo="Esta semana" tarefas={obrigatorias.filter((t) => t.frequencia === "semanal")} />
    </div>
  );
}
