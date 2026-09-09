"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { decidir } from "@/app/app/[profileId]/actions";
import { BotaoDireto } from "@/components/Carregando";
import SecaoExpansivel, { useSecoesExpansiveis } from "@/components/SecaoExpansivel";
import { iconeTarefa } from "@/lib/iconeTarefa";
import { type Atrasada } from "@/components/PendenciasTab";
import { reais } from "@/lib/moeda";

export type PendingEvent = {
  id: string;
  status: string;
  valor: number;
  data: string;
  task_catalog: { name: string; categoria: string; icone: string | null } | null;
  profiles: { name: string } | null;
};

type TarefaMinima = {
  id: string;
  name: string;
  categoria: string;
  icone: string | null;
  valor_unitario: number;
};

type Crianca = { id: string; name: string };

const DIA_MS = 86_400_000;

function diasDeAtraso(iso: string, hojeISO: string): number {
  return Math.round((Date.parse(hojeISO + "T00:00:00Z") - Date.parse(iso + "T00:00:00Z")) / DIA_MS);
}

function dataCurta(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** "Hoje", "Ontem" ou a data com há quantos dias — é o "de quando" de cada
 * grupo. Sempre o mesmo formato nas três listas, pra bater o olho e
 * comparar a idade de uma pendência com a de outra. */
function rotuloDoDia(iso: string, hojeISO: string): string {
  const dias = diasDeAtraso(iso, hojeISO);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return `${dataCurta(iso)} · há ${dias} dias`;
}

/** Vermelho a partir de três dias parados, âmbar antes disso: a cor sozinha
 * já diz o que está encalhando. */
function corDaIdade(dias: number): string {
  if (dias >= 3) return "text-red-400";
  if (dias >= 1) return "text-amber-400";
  return "text-slate-400";
}

/** Agrupa por dia, do mais antigo para o mais novo — o que está parado há
 * mais tempo é o que precisa de decisão primeiro. */
function porDia<T extends { data: string }>(itens: T[]): [string, T[]][] {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    if (!mapa.has(item.data)) mapa.set(item.data, []);
    mapa.get(item.data)!.push(item);
  }
  return Array.from(mapa.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/** Painel de Início do responsável: separa o que depende dele em três
 * listas — o que os meninos marcaram e espera confirmação, o que eles
 * pediram e espera autorização, e o que já venceu sem desfecho (atrasado).
 * Antes era uma fila só, misturando confirmação com autorização e sem
 * mostrar de quando era cada pedido.
 *
 * Também é aqui que mora a atualização ao vivo do painel do responsável:
 * escuta o Supabase Realtime e recarrega sozinho assim que qualquer
 * celular da família marca, cancela ou decide algo, sem F5.
 *
 * Para os avisos de DELETE (o menino cancelando o próprio pedido) chegarem
 * aqui, as tabelas precisam estar com REPLICA IDENTITY FULL — senão o
 * Postgres publica só a chave primária, o filtro por família não casa e o
 * aviso é descartado. Ver supabase/009_realtime_delete_replica_identity.sql.
 *
 * Como rede de segurança — aparelho que dormiu, aba aberta há horas,
 * conexão que caiu e voltou —, a tela também se atualiza quando volta a
 * ficar visível. */
export default function PainelInicioResponsavel({
  familyId,
  events,
  atrasadas,
  catalog,
  criancas,
  hojeISO,
  onIrParaPendencias,
}: {
  familyId: string;
  events: PendingEvent[];
  atrasadas: Atrasada[];
  catalog: TarefaMinima[];
  criancas: Crianca[];
  hojeISO: string;
  /** Leva pra aba Pendências, onde as atrasadas se resolvem. */
  onIrParaPendencias: () => void;
}) {
  const router = useRouter();
  const { abertas, alternar } = useSecoesExpansiveis();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`family-${familyId}-events`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_events", filter: `family_id=eq.${familyId}` },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saldo_ajustes", filter: `family_id=eq.${familyId}` },
        () => router.refresh()
      )
      .on(
        // Os meninos combinando trocas entre eles: muda quem deve fazer o
        // quê, então a aba Pendências precisa se refazer junto.
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_de_troca", filter: `family_id=eq.${familyId}` },
        () => router.refresh()
      )
      .subscribe();

    function aoVoltarParaTela() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", aoVoltarParaTela);
    window.addEventListener("focus", aoVoltarParaTela);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", aoVoltarParaTela);
      window.removeEventListener("focus", aoVoltarParaTela);
    };
  }, [familyId, router]);

  const aConfirmar = events.filter((e) => e.status === "aguardando_confirmacao");
  const aAutorizar = events.filter((e) => e.status === "aguardando_autorizacao");

  const totalAConfirmar = aConfirmar.reduce((acc, e) => acc + Number(e.valor), 0);
  const totalAAutorizar = aAutorizar.reduce((acc, e) => acc + Number(e.valor), 0);

  function Bloco({
    chave,
    titulo,
    contagem,
    children,
  }: {
    chave: string;
    titulo: string;
    contagem: number;
    children: React.ReactNode;
  }) {
    const id = `inicio-resp:${chave}`;
    return (
      <SecaoExpansivel
        titulo={titulo}
        contagem={contagem}
        aberta={!abertas.has(id)}
        onAlternar={() => alternar(id)}
      >
        {children}
      </SecaoExpansivel>
    );
  }

  /** Cada evento pendente, com o ícone e o valor da tarefa, e os botões da
   * decisão que cabe àquele estado. */
  function LinhaPendente({ e }: { e: PendingEvent }) {
    const tarefa = e.task_catalog;
    return (
      <li className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">
            {tarefa ? iconeTarefa({ name: tarefa.name, categoria: tarefa.categoria, icone: tarefa.icone }) : "❓"}
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{tarefa?.name ?? "Tarefa"}</p>
            <p className="text-sm text-slate-400">
              {e.profiles?.name ?? "—"} · R$ {reais(Number(e.valor))}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          {e.status === "aguardando_autorizacao" ? (
            <BotaoDireto className="btn-primary text-sm w-full sm:w-auto" acao={() => decidir(e.id, "autorizar")}>
              Liberar
            </BotaoDireto>
          ) : (
            <>
              <BotaoDireto className="btn-primary text-sm w-full sm:w-auto" acao={() => decidir(e.id, "confirmar")}>
                Confirmar
              </BotaoDireto>
              <BotaoDireto className="btn-secondary text-sm w-full sm:w-auto" acao={() => decidir(e.id, "refazer")}>
                Refazer
              </BotaoDireto>
              <BotaoDireto className="btn-danger text-sm w-full sm:w-auto" acao={() => decidir(e.id, "nao_feito")}>
                Não feito
              </BotaoDireto>
            </>
          )}
        </div>
      </li>
    );
  }

  /** Lista de pendentes já quebrada por dia, com o cabeçalho dizendo de
   * quando é cada grupo. */
  function ListaPorDia({ itens, vazio }: { itens: PendingEvent[]; vazio: string }) {
    if (itens.length === 0) return <p className="text-sm text-green-400">{vazio}</p>;

    return (
      <ul className="space-y-4">
        {porDia(itens).map(([dia, doDia]) => (
          <li key={dia}>
            <p className={`text-sm font-semibold mb-2 ${corDaIdade(diasDeAtraso(dia, hojeISO))}`}>
              {rotuloDoDia(dia, hojeISO)}
            </p>
            <ul className="space-y-2">
              {doDia.map((e) => (
                <LinhaPendente key={e.id} e={e} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  // ── Atrasadas: só o resumo aqui, do período mais antigo para o mais
  // recente. Resolver (feito / não feito / desconsiderar) continua sendo
  // na aba Pendências, pra decisão morar num lugar só.
  const porPeriodo = new Map<string, Atrasada[]>();
  for (const a of atrasadas) {
    // A frequência entra na chave porque uma semanal guarda a segunda-feira
    // como data, e ela pode coincidir com o dia de uma diária.
    const chave = `${a.frequencia}|${a.data}`;
    if (!porPeriodo.has(chave)) porPeriodo.set(chave, []);
    porPeriodo.get(chave)!.push(a);
  }
  const periodos = Array.from(porPeriodo.keys()).sort((a, b) => {
    const [, dataA] = a.split("|");
    const [, dataB] = b.split("|");
    if (dataA !== dataB) return dataA < dataB ? -1 : 1;
    return a < b ? -1 : 1;
  });

  const tituloDoPeriodo = (chave: string) => {
    const [freq, data] = chave.split("|");
    if (freq === "semanal") {
      const fim = new Date(Date.parse(data + "T00:00:00Z") + 6 * DIA_MS).toISOString().slice(0, 10);
      return `Semana de ${dataCurta(data)} a ${dataCurta(fim)}`;
    }
    return rotuloDoDia(data, hojeISO);
  };

  const valorAtrasado = atrasadas.reduce((acc, a) => {
    const tarefa = catalog.find((t) => t.id === a.taskId);
    return acc + Number(tarefa?.valor_unitario ?? 0) * a.pendentes;
  }, 0);

  return (
    <>
      <Bloco
        chave="confirmacao"
        titulo="✅ Esperando sua confirmação"
        contagem={aConfirmar.length}
      >
        <p className="text-sm text-slate-400 mb-3">
          Os meninos marcaram como feito. Confira se foi feito — e bem feito; talvez tenha algo para ensinar.
          {aConfirmar.length > 0 && (
            <span className="text-amber-400 font-semibold"> R$ {reais(totalAConfirmar)} dependem de você.</span>
          )}
        </p>
        <ListaPorDia itens={aConfirmar} vazio="Nada esperando confirmação. 🎉" />
      </Bloco>

      <Bloco
        chave="autorizacao"
        titulo="🔓 Esperando sua autorização"
        contagem={aAutorizar.length}
      >
        <p className="text-sm text-slate-400 mb-3">
          Bônus que os meninos pediram para fazer e ainda não foram liberados.
          {aAutorizar.length > 0 && (
            <span className="text-amber-400 font-semibold"> R$ {reais(totalAAutorizar)} em jogo.</span>
          )}
        </p>
        <ListaPorDia itens={aAutorizar} vazio="Nenhum pedido esperando liberação. 🎉" />
      </Bloco>

      <Bloco chave="atrasadas" titulo="⏰ Atrasadas" contagem={atrasadas.length}>
        {atrasadas.length === 0 ? (
          <p className="text-sm text-green-400">Nada atrasado por aqui! 🎉</p>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-3">
              Tarefas obrigatórias de dias e semanas que já terminaram sem desfecho — ninguém marcou, ou ficou
              esperando sua confirmação, ou ficou como não feita e o prazo passou.{" "}
              <span className="text-amber-400 font-semibold">R$ {reais(valorAtrasado)} sem decisão.</span>
            </p>
            <ul className="space-y-3">
              {periodos.map((chave) => {
                const [, data] = chave.split("|");
                const dias = diasDeAtraso(data, hojeISO);
                return (
                  <li key={chave}>
                    <p className={`text-sm font-semibold mb-1 ${corDaIdade(dias)}`}>{tituloDoPeriodo(chave)}</p>
                    <ul className="space-y-1">
                      {porPeriodo.get(chave)!.map((a) => {
                        const tarefa = catalog.find((t) => t.id === a.taskId);
                        const crianca = criancas.find((c) => c.id === a.profileId);
                        return (
                          <li
                            key={`${a.frequencia}|${a.taskId}|${a.profileId}|${a.data}`}
                            className="flex items-center gap-2 text-sm text-slate-300"
                          >
                            <span className="shrink-0">
                              {tarefa
                                ? iconeTarefa({
                                    name: tarefa.name,
                                    categoria: tarefa.categoria,
                                    icone: tarefa.icone,
                                  })
                                : "❓"}
                            </span>
                            <span className="min-w-0 truncate">
                              {tarefa?.name ?? "Tarefa"}
                              <span className="text-slate-500">
                                {" · "}
                                {crianca?.name ?? "—"}
                                {a.devidas > 1 && ` · faltam ${a.pendentes} de ${a.devidas}`}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={onIrParaPendencias}
              className="btn-secondary text-sm mt-4 w-full sm:w-auto"
            >
              Resolver em Pendências
            </button>
          </>
        )}
      </Bloco>
    </>
  );
}
