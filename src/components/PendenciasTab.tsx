"use client";

import { registrarDireto, registrarAtrasada, decidir, desfazerEvento } from "@/app/app/[profileId]/actions";
import { inicioDaJanela, inicioDaSemana } from "@/lib/periodos";
import { iconeTarefa } from "@/lib/iconeTarefa";
import { BotaoAcao, BotaoDireto } from "@/components/Carregando";
import { vezesNoPeriodo, pedidosVigentes, type PedidoDeTroca } from "@/lib/trocas";
import { reais } from "@/lib/moeda";
import { diaCombinadoLabel } from "@/lib/dimensoes";

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  frequencia: string;
  ocorrencias_por_dia: number;
  valor_unitario: number;
  icone: string | null;
  finalidade: string | null;
  /** Crianças que se revezam nesta tarefa. Nulo/vazio = todas. */
  profile_ids: string[] | null;
  /** Dia combinado, nas semanais: 0 = domingo ... 6 = sábado. Nulo = qualquer. */
  dia_da_semana: number | null;
};

type EventoSemana = { id: string; task_id: string; profile_id: string; status: string; data: string };
type Crianca = { id: string; name: string };

/** Uma tarefa obrigatória de um período que JÁ TERMINOU e ficou sem
 * desfecho: sem confirmação, sem desconto e sem ter sido desconsiderada.
 * Calculada no servidor (src/app/app/[profileId]/page.tsx), olhando os
 * últimos 14 dias — dia a dia nas diárias, semana fechada nas semanais. */
export type Atrasada = {
  /** O dia, nas diárias; a segunda-feira da semana, nas semanais. */
  data: string;
  taskId: string;
  profileId: string;
  frequencia: string;
  /** Quantas vezes ainda faltam resolver naquele período. */
  pendentes: number;
  /** Quantas vezes eram devidas no total (3, numa tarefa de 3× por dia). */
  devidas: number;
  /** Por que caiu na lista — vira o rótulo mostrado ao lado da tarefa.
   * "desconsiderada" é a única que já está resolvida: fica na lista só como
   * registro de que foi tirada do cálculo de propósito. */
  motivo: "sem_marcacao" | "aguardando" | "nao_feito" | "desconsiderada";
};

const MOTIVO_LABEL: Record<Atrasada["motivo"], string | null> = {
  sem_marcacao: null,
  aguardando: "marcou e ficou sem sua confirmação",
  nao_feito: "ficou como não feita e o prazo passou",
  desconsiderada: null,
};

/** Status em que a bola está com o responsável: a tarefa continua na lista
 * de Pendências até ele decidir, com um botão pra resolver ali mesmo. */
const ESPERANDO_DECISAO = ["aguardando_confirmacao", "aguardando_autorizacao"];

/** Marcar como não feita (ou pedir pra refazer) não fecha o assunto:
 * enquanto o dia (ou a semana) não virar, ainda dá tempo de fazer. A
 * tarefa segue na lista com os botões ✓/✗ disponíveis, então dá pra
 * mudar de ideia — inclusive pra corrigir um ✗ clicado por engano. */
const AINDA_DA_TEMPO = ["nao_feito", "pedido_para_refazer"];

/** Estados em que alguém já decidiu alguma coisa — e que, por isso, dá pra
 * desfazer ali mesmo, sem ter que caçar o registro no Histórico. Fica de
 * fora só o que ainda está esperando decisão: ali os botões ✓ e ↺ já
 * resolvem, e apagar o pedido do menino é papel dele, não do adulto. */
const JA_DECIDIDO = [
  "confirmado",
  "nao_feito",
  "pedido_para_refazer",
  "desconto_automatico",
  "desconsiderada",
  "liberada",
];

const STATUS_LABEL: Record<string, string> = {
  aguardando_autorizacao: "aguardando autorização",
  liberada: "liberada",
  aguardando_confirmacao: "aguardando confirmação",
  confirmado: "confirmado ✓",
  nao_feito: "não feito",
  pedido_para_refazer: "pedido para refazer",
  desconto_automatico: "não feito — descontado",
  desconsiderada: "desconsiderada",
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
  pedidos,
}: {
  familyId: string;
  criancas: Crianca[];
  catalog: Tarefa[];
  eventos: EventoSemana[];
  hojeISO: string;
  atrasadas: Atrasada[];
  /** Trocas combinadas entre os meninos: mudam de quem é a tarefa hoje. */
  pedidos: PedidoDeTroca[];
}) {
  const obrigatorias = catalog.filter((t) => t.categoria !== "coletiva");
  // Mesma ordem usada no servidor, pro rodízio bater entre as telas.
  const idsDasCriancas = criancas.map((c) => c.id);

  // Só as trocas que ainda valem, e só as já aceitas — um pedido pendente
  // não muda nada: até o irmão responder, a tarefa continua de quem pediu.
  const trocasAceitas = pedidosVigentes(pedidos, catalog, hojeISO).filter((p) => p.status === "aceito");

  /** Quantas vezes esta tarefa é desta criança hoje (ou nesta semana), já
   * com o rodízio das compartilhadas e as trocas aplicados. Ver
   * src/lib/trocas.ts — é a mesma conta que o painel do menino faz. */
  const vezesDe = (t: Tarefa, profileId: string) =>
    vezesNoPeriodo(t, profileId, idsDasCriancas, hojeISO, inicioDaSemana, trocasAceitas);

  /** De quem esta criança pegou a tarefa, quando pegou de alguém. */
  const pegouDe = (t: Tarefa, profileId: string) => {
    const troca = trocasAceitas.find((p) => p.task_id === t.id && p.para_profile_id === profileId);
    return troca ? criancas.find((c) => c.id === troca.de_profile_id)?.name : undefined;
  };

  /** Situação de uma tarefa para uma criança, nesta janela.
   *
   * Tarefas que acontecem mais de uma vez por dia (lavar a louça 3×, lavar
   * panelas 2×...) continuam na lista até completar as vezes do dia — por
   * isso conta vagas, e não só "tem ou não tem registro". */
  function situacaoDoFilho(t: Tarefa, profileId: string) {
    const janela = inicioDaJanela(t.frequencia, hojeISO);
    const doFilho = eventos.filter(
      (e) => e.task_id === t.id && e.profile_id === profileId && e.data >= janela
    );

    const total = vezesDe(t, profileId);
    const ocupadas = doFilho.filter((e) => !AINDA_DA_TEMPO.includes(e.status)).length;
    const emAberto = doFilho.filter((e) => AINDA_DA_TEMPO.includes(e.status));

    return {
      total,
      ocupadas,
      vagas: Math.max(0, total - ocupadas),
      /** Marcação do menino esperando a decisão do responsável. */
      esperando: doFilho.find((e) => ESPERANDO_DECISAO.includes(e.status)),
      /** As duas situações em que ainda dá tempo são diferentes na tela: o
       * menino nem fez ("não feito"), ou fez e você mandou fazer de novo
       * ("está refazendo"). Vale o último dos dois que aconteceu. */
      naoFeito: emAberto[emAberto.length - 1]?.status === "nao_feito",
      refazendo: emAberto[emAberto.length - 1]?.status === "pedido_para_refazer",
      ultimo: doFilho[doFilho.length - 1],
    };
  }

  /** O "desfazer" que faltava fora do Histórico: apaga o registro e deixa a
   * tarefa como se nada tivesse acontecido, pra corrigir um ✓ ou um ✗
   * clicado por engano na hora em que se percebe o erro. */
  function Desfazer({ evento }: { evento?: EventoSemana }) {
    if (!evento || !JA_DECIDIDO.includes(evento.status)) return null;
    return (
      <BotaoDireto
        className="text-xs text-slate-500 underline shrink-0 disabled:opacity-40"
        title="Desfazer esta decisão"
        acao={() => desfazerEvento(evento.id)}
      >
        desfazer
      </BotaoDireto>
    );
  }

  function Bloco({ titulo, descricao, tarefas }: { titulo: string; descricao: string; tarefas: Tarefa[] }) {
    const linhas = tarefas
      .map((t) => ({
        tarefa: t,
        porFilho: criancas
          .filter((c) => vezesDe(t, c.id) > 0)
          .map((c) => ({ crianca: c, situacao: situacaoDoFilho(t, c.id) })),
      }))
      .filter((linha) => linha.porFilho.some((pf) => pf.situacao.vagas > 0 || pf.situacao.esperando));

    return (
      <section className="mb-6">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-slate-400 mb-3">{descricao}</p>
        {linhas.length === 0 ? (
          <p className="text-sm text-green-400">Tudo marcado por aqui! 🎉</p>
        ) : (
          <ul className="space-y-3">
            {linhas.map(({ tarefa, porFilho }) => (
              <li key={tarefa.id} className="card">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{iconeTarefa(tarefa)}</span>
                  <p className="font-medium">{tarefa.name}</p>
                  {diaCombinadoLabel(tarefa) && (
                    <span className="text-xs text-sky-400">{diaCombinadoLabel(tarefa)}</span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">
                    R$ {reais(Number(tarefa.valor_unitario))}
                  </span>
                </div>
                <ul className="divide-y divide-slate-700/60">
                  {porFilho.map(({ crianca, situacao }) => {
                    const { total, ocupadas, vagas, esperando, naoFeito, refazendo, ultimo } = situacao;
                    // Enquanto está refazendo, os botões mudam de tom: é a
                    // mesma decisão de sempre (✓ feito, ✗ não feito), mas
                    // sobre uma segunda tentativa — e dá pra ver isso de
                    // relance, sem ler o texto ao lado.
                    const classeFeito = refazendo
                      ? "btn bg-amber-300 text-slate-900 hover:bg-amber-200 text-xs px-2 py-0.5"
                      : "btn-primary text-xs px-2 py-0.5";
                    const classeNaoFeito = refazendo
                      ? "btn bg-red-400 text-slate-900 hover:bg-red-300 text-xs px-2 py-0.5"
                      : "btn-danger text-xs px-2 py-0.5";
                    return (
                      <li
                        key={crianca.id}
                        className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                      >
                        {/* Em âmbar quando a bola está com o responsável: a
                            criança já marcou e está esperando o ✓ dele. É o
                            que separa, de relance, "ainda não fez" de "fez e
                            está esperando você conferir" — e aí o nome vira o
                            sujeito de uma frase que diz o que fazer. */}
                        <span className={"text-sm min-w-0 " + (esperando ? "text-amber-400" : "")}>
                          <span className={esperando ? "font-semibold" : ""}>{crianca.name}</span>
                          {esperando && " já fez. Confirme ou peça que ele refaça."}
                          {total > 1 && (
                            <span className="text-xs text-slate-500 ml-1">
                              ({ocupadas} de {total})
                            </span>
                          )}
                          {pegouDe(tarefa, crianca.id) && (
                            <span className="text-xs text-sky-400 ml-1">
                              (no lugar de {pegouDe(tarefa, crianca.id)})
                            </span>
                          )}
                        </span>

                        {esperando ? (
                          <div className="flex gap-1.5 shrink-0">
                            <BotaoDireto
                              className="btn-primary text-xs px-2 py-0.5"
                              title={
                                esperando.status === "aguardando_autorizacao"
                                  ? "Autorizar que ele faça"
                                  : "Confirmar que foi feita"
                              }
                              acao={() =>
                                decidir(
                                  esperando.id,
                                  esperando.status === "aguardando_autorizacao" ? "autorizar" : "confirmar"
                                )
                              }
                            >
                              ✓
                            </BotaoDireto>
                            {esperando.status === "aguardando_confirmacao" && (
                              <BotaoDireto
                                className="btn bg-gray-600 text-slate-100 hover:bg-gray-500 text-xs px-2 py-0.5"
                                title="Pedir para refazer"
                                acao={() => decidir(esperando.id, "refazer")}
                              >
                                ↺
                              </BotaoDireto>
                            )}
                          </div>
                        ) : vagas > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {refazendo && <span className="text-xs text-sky-400 mr-1">está refazendo</span>}
                            {naoFeito && <span className="text-xs text-amber-400 mr-1">não feito</span>}
                            <form action={registrarDireto.bind(null, tarefa.id, crianca.id, familyId, "feito")}>
                              <BotaoAcao className={classeFeito} title="Marcar feito">
                                ✓
                              </BotaoAcao>
                            </form>
                            <form action={registrarDireto.bind(null, tarefa.id, crianca.id, familyId, "nao_feito")}>
                              <BotaoAcao className={classeNaoFeito} title="Marcar não feito">
                                ✗
                              </BotaoAcao>
                            </form>
                            <Desfazer evento={ultimo} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {total > 1 ? "tudo feito ✓" : STATUS_LABEL[ultimo?.status ?? ""] ?? ultimo?.status}
                            </span>
                            <Desfazer evento={ultimo} />
                          </div>
                        )}
                      </li>
                    );
                  })}
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

    // Agrupa por período. A frequência entra na chave porque uma semanal
    // guarda a segunda-feira como data, e ela pode coincidir com o dia de
    // uma diária — seriam dois blocos diferentes com o mesmo cabeçalho.
    const porPeriodo = new Map<string, Atrasada[]>();
    for (const a of atrasadas) {
      const chave = `${a.frequencia}|${a.data}`;
      if (!porPeriodo.has(chave)) porPeriodo.set(chave, []);
      porPeriodo.get(chave)!.push(a);
    }
    const periodos = Array.from(porPeriodo.keys()).sort((a, b) => {
      const [, dataA] = a.split("|");
      const [, dataB] = b.split("|");
      if (dataA !== dataB) return dataA < dataB ? 1 : -1;
      return a < b ? 1 : -1;
    });

    const formatarData = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
    const tituloDoPeriodo = (chave: string) => {
      const [freq, data] = chave.split("|");
      if (freq === "semanal") {
        return `Semana de ${formatarData(data)} a ${formatarData(
          new Date(new Date(data + "T00:00:00Z").getTime() + 6 * 86400000).toISOString().slice(0, 10)
        )}`;
      }
      return formatarData(data);
    };

    return (
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Atrasadas</h2>
        <p className="text-xs text-slate-500 mb-3">
          Tarefas obrigatórias de dias e semanas que já terminaram e ficaram sem desfecho — ninguém marcou nada, ou
          o menino marcou e ficou esperando confirmação, ou ficou como não feita e o prazo passou. Decida cada uma:
          marque como feita, como não feita (desconta na hora) ou desconsidere (não mexe no saldo).
        </p>
        <ul className="space-y-4">
          {periodos.map((chave) => (
            <li key={chave}>
              <p className="text-sm font-semibold text-slate-400 mb-2">{tituloDoPeriodo(chave)}</p>
              <ul className="space-y-2">
                {porPeriodo.get(chave)!.map((a) => {
                  const tarefa = catalog.find((t) => t.id === a.taskId);
                  const crianca = criancas.find((c) => c.id === a.profileId);
                  return (
                    <li
                      key={`${a.frequencia}|${a.taskId}|${a.profileId}|${a.data}`}
                      className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">{tarefa ? iconeTarefa(tarefa) : "❓"}</span>
                        <div>
                          <p className="font-medium">{tarefa?.name ?? "Tarefa"}</p>
                          <p className="text-xs text-slate-400">
                            {crianca?.name ?? "—"} · R$ {reais(Number(tarefa?.valor_unitario ?? 0))}
                            {a.devidas > 1 && a.motivo !== "desconsiderada" && (
                              <span className="text-slate-500">
                                {" "}
                                · faltam {a.pendentes} de {a.devidas}
                              </span>
                            )}
                          </p>
                          {MOTIVO_LABEL[a.motivo] && (
                            <p className="text-xs text-amber-400">{MOTIVO_LABEL[a.motivo]}</p>
                          )}
                        </div>
                      </div>
                      {a.motivo === "desconsiderada" ? (
                        <span className="text-xs text-slate-400 sm:shrink-0">desconsiderado</span>
                      ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-1.5 sm:shrink-0">
                        <form
                          action={registrarAtrasada.bind(null, a.taskId, a.profileId, familyId, a.data, "feito", a.pendentes)}
                          className="w-full sm:w-auto"
                        >
                          <BotaoAcao className="btn-primary text-xs px-2 py-1 w-full sm:w-auto" title="Marcar feito">
                            Feito
                          </BotaoAcao>
                        </form>
                        <form
                          action={registrarAtrasada.bind(null, a.taskId, a.profileId, familyId, a.data, "nao_feito", a.pendentes)}
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
                          action={registrarAtrasada.bind(null, a.taskId, a.profileId, familyId, a.data, "desconsiderar", a.pendentes)}
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
                      )}
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
      <Bloco
        titulo="Hoje"
        descricao="Tudo o que é obrigatório para ser feito ainda hoje."
        tarefas={obrigatorias.filter((t) => t.frequencia === "diaria")}
      />
      <Bloco
        titulo="Esta semana"
        descricao="Tudo o que é obrigatório para ser feito até o final da semana."
        tarefas={obrigatorias.filter((t) => t.frequencia === "semanal")}
      />
    </div>
  );
}
