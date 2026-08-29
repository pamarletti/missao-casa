"use client";

import { registrarDireto, registrarAtrasada } from "@/app/app/[profileId]/actions";
import { inicioDaJanela } from "@/lib/periodos";
import { iconeTarefa } from "@/lib/iconeTarefa";
import { BotaoAcao } from "@/components/Carregando";

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

/** Uma tarefa obrigatória diária que ficou em silêncio total num dia que já
 * passou — nem o menino marcou nada, nem o responsável decidiu nada por
 * ele. Calculada no servidor (src/app/app/[profileId]/page.tsx), olhando
 * os últimos 14 dias. */
export type Atrasada = { data: string; taskId: string; profileId: string };

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
 * registrada para ela.
 *
 * "Atrasadas" é diferente: são tarefas de dias que já terminaram (não o dia
 * de hoje), que substituem o antigo desconto automático por silêncio —
 * agora o responsável decide manualmente, tarefa por tarefa: feito, não
 * feito (desconta) ou desconsiderar (não mexe no saldo). */
export default function PendenciasTab({
  familyId,
  criancas,
  catalog,
  eventos,
  hojeISO,
  atrasadas,
}: {
  familyId: string;
  criancas: Crianca[];
  catalog: Tarefa[];
  eventos: EventoSemana[];
  hojeISO: string;
  atrasadas: Atrasada[];
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
                            <BotaoAcao className="btn-primary text-xs px-2 py-0.5" title="Marcar feito">
                              ✓
                            </BotaoAcao>
                          </form>
                          <form action={registrarDireto.bind(null, tarefa.id, crianca.id, familyId, "nao_feito")}>
                            <BotaoAcao className="btn-danger text-xs px-2 py-0.5" title="Marcar não feito">
                              ✗
                            </BotaoAcao>
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

  function BlocoAtrasadas() {
    if (atrasadas.length === 0) {
      return (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Atrasadas</h2>
          <p className="text-sm text-green-400">Nada atrasado por aqui! 🎉</p>
        </section>
      );
    }

    const porDia = new Map<string, Atrasada[]>();
    for (const a of atrasadas) {
      if (!porDia.has(a.data)) porDia.set(a.data, []);
      porDia.get(a.data)!.push(a);
    }
    const dias = Array.from(porDia.keys()).sort((a, b) => (a < b ? 1 : -1));

    return (
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Atrasadas</h2>
        <p className="text-xs text-slate-500 mb-3">
          Tarefas obrigatórias diárias que ficaram sem nenhuma marcação em dias que já passaram. Decida cada uma:
          marque como feita, como não feita (desconta na hora) ou desconsidere (não mexe no saldo).
        </p>
        <ul className="space-y-4">
          {dias.map((dia) => (
            <li key={dia}>
              <p className="text-sm font-semibold text-slate-400 mb-2">
                {new Date(dia + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
              <ul className="space-y-2">
                {porDia.get(dia)!.map((a) => {
                  const tarefa = catalog.find((t) => t.id === a.taskId);
                  const crianca = criancas.find((c) => c.id === a.profileId);
                  return (
                    <li
                      key={`${a.taskId}|${a.profileId}|${a.data}`}
                      className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">{tarefa ? iconeTarefa(tarefa) : "❓"}</span>
                        <div>
                          <p className="font-medium">{tarefa?.name ?? "Tarefa"}</p>
                          <p className="text-xs text-slate-400">
                            {crianca?.name ?? "—"} · R$ {Number(tarefa?.valor_unitario ?? 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-1.5 sm:shrink-0">
                        <form
                          action={registrarAtrasada.bind(null, a.taskId, a.profileId, familyId, a.data, "feito")}
                          className="w-full sm:w-auto"
                        >
                          <BotaoAcao className="btn-primary text-xs px-2 py-1 w-full sm:w-auto" title="Marcar feito">
                            Feito
                          </BotaoAcao>
                        </form>
                        <form
                          action={registrarAtrasada.bind(null, a.taskId, a.profileId, familyId, a.data, "nao_feito")}
                          className="w-full sm:w-auto"
                        >
                          <BotaoAcao
                            className="btn-danger text-xs px-2 py-1 w-full sm:w-auto"
                            title="Marcar não feito (desconta)"
                          >
                            Não feito
                          </BotaoAcao>
                        </form>
                        <form
                          action={registrarAtrasada.bind(null, a.taskId, a.profileId, familyId, a.data, "desconsiderar")}
                          className="w-full sm:w-auto"
                        >
                          <BotaoAcao
                            className="btn-secondary text-xs px-2 py-1 w-full sm:w-auto"
                            title="Desconsiderar (não mexe no saldo)"
                          >
                            Desconsiderar
                          </BotaoAcao>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div>
      <BlocoAtrasadas />
      <Bloco titulo="Hoje" tarefas={obrigatorias.filter((t) => t.frequencia === "diaria")} />
      <Bloco titulo="Esta semana" tarefas={obrigatorias.filter((t) => t.frequencia === "semanal")} />
    </div>
  );
}
