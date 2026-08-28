"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { decidir } from "@/app/app/[profileId]/actions";

export type PendingEvent = {
  id: string;
  status: string;
  valor: number;
  data: string;
  task_catalog: { name: string } | null;
  profiles: { name: string } | null;
};

/** Fila de confirmação dos pais — atualiza sozinha via Supabase Realtime
 * assim que qualquer celular da família marca algo, sem precisar de F5. */
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, router]);

  if (events.length === 0) {
    return <p className="text-slate-400 text-sm">Nada pendente por enquanto. 🎉</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="card flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{e.task_catalog?.name ?? "Tarefa"}</p>
            <p className="text-sm text-slate-400">
              {e.profiles?.name} · R$ {Number(e.valor).toFixed(2)} ·{" "}
              {e.status === "aguardando_autorizacao" ? "pedindo autorização" : "aguardando confirmação"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {e.status === "aguardando_autorizacao" ? (
              <button className="btn-primary text-sm" onClick={() => decidir(e.id, "autorizar")}>
                Liberar
              </button>
            ) : (
              <>
                <button className="btn-primary text-sm" onClick={() => decidir(e.id, "confirmar")}>
                  Confirmar
                </button>
                <button className="btn-secondary text-sm" onClick={() => decidir(e.id, "refazer")}>
                  Refazer
                </button>
                <button className="btn-danger text-sm" onClick={() => decidir(e.id, "nao_feito")}>
                  Não feito
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
