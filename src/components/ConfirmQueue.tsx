"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { decidir } from "@/app/app/[profileId]/actions";
import { BotaoDireto } from "@/components/Carregando";
import { reais } from "@/lib/moeda";

export type PendingEvent = {
  id: string;
  status: string;
  valor: number;
  data: string;
  task_catalog: { name: string } | null;
  profiles: { name: string } | null;
};

/** Fila de confirmação dos pais — atualiza sozinha via Supabase Realtime
 * assim que qualquer celular da família marca, cancela ou decide algo, sem
 * precisar de F5.
 *
 * Para os avisos de DELETE (o menino cancelando o próprio pedido) chegarem
 * aqui, as tabelas precisam estar com REPLICA IDENTITY FULL — senão o
 * Postgres publica só a chave primária, o filtro por família não casa e o
 * aviso é descartado. Ver supabase/009_realtime_delete_replica_identity.sql.
 *
 * Como rede de segurança — aparelho que dormiu, aba aberta há horas,
 * conexão que caiu e voltou —, a tela também se atualiza quando volta a
 * ficar visível. */
export default function ConfirmQueue({
  familyId,
  events,
}: {
  familyId: string;
  events: PendingEvent[];
}) {
  const router = useRouter();

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

  if (events.length === 0) {
    return <p className="text-slate-400 text-sm">Nada pendente por enquanto. 🎉</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold">{e.task_catalog?.name ?? "Tarefa"}</p>
            <p className="text-sm text-slate-400">
              {e.profiles?.name} · R$ {reais(Number(e.valor))} ·{" "}
              {e.status === "aguardando_autorizacao" ? "pedindo autorização" : "aguardando confirmação"}
            </p>
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
      ))}
    </ul>
  );
}
