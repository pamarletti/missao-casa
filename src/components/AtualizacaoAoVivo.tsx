"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Mantém a tela do menino em dia sozinha, sem F5.
 *
 * O painel do responsável já fazia isso pela fila de confirmação
 * (ConfirmQueue). Faltava do lado das crianças — e passou a fazer falta com
 * as trocas de tarefa: André pede que Hugo faça a louça, e o pedido precisa
 * aparecer no celular do Hugo na hora, não na próxima vez que ele recarregar
 * a página.
 *
 * Escuta as três tabelas que mexem no que o menino vê: os pedidos de troca,
 * os eventos (o responsável confirmando, pedindo pra refazer) e os ajustes
 * de saldo. Como rede de segurança — celular que dormiu, aba aberta há
 * horas —, também recarrega quando a tela volta a ficar visível. */
export default function AtualizacaoAoVivo({ familyId }: { familyId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const filtro = `family_id=eq.${familyId}`;
    const channel = supabase
      .channel(`family-${familyId}-crianca`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_de_troca", filter: filtro },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_events", filter: filtro },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saldo_ajustes", filter: filtro },
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

  return null;
}
