"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/activeProfile";

async function requireActiveProfile() {
  const active = await getActiveProfile();
  if (!active) redirect("/app");
  return active;
}

/** Menino marca uma tarefa individual/individual-coletiva como feita,
 * ou pede autorização para uma coletiva. */
export async function markOrRequest(taskId: string, familyId: string) {
  const active = await requireActiveProfile();
  const supabase = createClient();

  const { data: task } = await supabase
    .from("task_catalog")
    .select("categoria, valor_unitario")
    .eq("id", taskId)
    .single();
  if (!task) return;

  const status = task.categoria === "coletiva" ? "aguardando_autorizacao" : "aguardando_confirmacao";

  await supabase.from("task_events").insert({
    family_id: familyId,
    task_id: taskId,
    profile_id: active.profileId,
    status,
    valor: task.valor_unitario,
    origem: "menino",
  });

  revalidatePath(`/app/${active.profileId}`);
}

/** Menino confirma que fez uma coletiva que já tinha sido liberada. */
export async function markColetivaDone(eventId: string) {
  const active = await requireActiveProfile();
  const supabase = createClient();

  await supabase
    .from("task_events")
    .update({ status: "aguardando_confirmacao" })
    .eq("id", eventId)
    .eq("status", "liberada");

  revalidatePath(`/app/${active.profileId}`);
}

type Decisao = "autorizar" | "confirmar" | "nao_feito" | "refazer";

/** Um responsável decide sobre um evento pendente. */
export async function decidir(eventId: string, decisao: Decisao) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return; // só responsáveis decidem

  const supabase = createClient();

  const patch: Record<string, unknown> = {};
  if (decisao === "autorizar") patch.status = "liberada";
  if (decisao === "confirmar") {
    patch.status = "confirmado";
    patch.confirmado_por = active.profileId;
    patch.confirmado_em = new Date().toISOString();
  }
  if (decisao === "nao_feito") {
    patch.status = "nao_feito";
    patch.valor = 0;
  }
  if (decisao === "refazer") {
    patch.status = "pedido_para_refazer";
    patch.valor = 0;
  }

  await supabase.from("task_events").update(patch).eq("id", eventId);

  revalidatePath(`/app/${active.profileId}`);
}

/** O próprio menino cancela uma marcação/pedido que ele fez e que ainda
 * está esperando o responsável decidir — vira como se ele não tivesse
 * marcado nada, sem precisar esperar um "não feito" pra tentar de novo. */
export async function cancelarPropriaMarcacao(eventId: string) {
  const active = await requireActiveProfile();
  const supabase = createClient();

  await supabase
    .from("task_events")
    .delete()
    .eq("id", eventId)
    .eq("profile_id", active.profileId)
    .in("status", ["aguardando_autorizacao", "aguardando_confirmacao"]);

  revalidatePath(`/app/${active.profileId}`);
}

/** Um responsável desfaz qualquer evento já decidido (confirmado, não
 * feito, liberado, pedido para refazer) — corrige um clique errado a
 * qualquer momento, a partir do histórico de Atividades. */
export async function desfazerEvento(eventId: string) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const supabase = createClient();
  await supabase.from("task_events").delete().eq("id", eventId);

  revalidatePath(`/app/${active.profileId}`);
}

/** Um responsável desfaz um ajuste manual de saldo lançado por engano. */
export async function desfazerAjuste(ajusteId: string) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const supabase = createClient();
  await supabase.from("saldo_ajustes").delete().eq("id", ajusteId);

  revalidatePath(`/app/${active.profileId}`);
}

/** Um responsável registra diretamente o resultado de uma tarefa que nenhum
 * menino marcou ainda — usado na aba de Pendências, sem precisar passar
 * pelo fluxo normal de "menino marca → responsável confirma". */
export async function registrarDireto(
  taskId: string,
  profileId: string,
  familyId: string,
  decisao: "feito" | "nao_feito"
) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const supabase = createClient();
  const { data: task } = await supabase
    .from("task_catalog")
    .select("valor_unitario")
    .eq("id", taskId)
    .single();
  if (!task) return;

  if (decisao === "feito") {
    await supabase.from("task_events").insert({
      family_id: familyId,
      task_id: taskId,
      profile_id: profileId,
      status: "confirmado",
      valor: task.valor_unitario,
      origem: "responsavel",
      confirmado_por: active.profileId,
      confirmado_em: new Date().toISOString(),
    });
  } else {
    await supabase.from("task_events").insert({
      family_id: familyId,
      task_id: taskId,
      profile_id: profileId,
      status: "nao_feito",
      valor: 0,
      origem: "responsavel",
    });
  }

  revalidatePath(`/app/${active.profileId}`);
}

/** Um responsável edita nome, valor ou ícone de uma tarefa do catálogo —
 * vale a partir de agora, sem alterar valores de eventos já registrados. */
export async function editarTarefa(formData: FormData) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const taskId = String(formData.get("taskId") || "");
  const name = String(formData.get("name") || "").trim();
  const valorInformado = Number(String(formData.get("valor_unitario") || "0").replace(",", "."));
  const icone = String(formData.get("icone") || "").trim() || null;

  if (!taskId || !name || !Number.isFinite(valorInformado) || valorInformado < 0) {
    revalidatePath(`/app/${active.profileId}`);
    return;
  }

  const supabase = createClient();
  await supabase.from("task_catalog").update({ name, valor_unitario: valorInformado, icone }).eq("id", taskId);

  revalidatePath(`/app/${active.profileId}`);
}

/** Um responsável credita ou debita manualmente o saldo (mesada virtual)
 * de um menino — adiantamento, presente, correção de erro, etc. */
export async function ajustarSaldo(formData: FormData) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const profileId = String(formData.get("profileId") || "");
  const familyId = String(formData.get("familyId") || "");
  const tipo = String(formData.get("tipo") || "adicionar");
  const valorInformado = Number(String(formData.get("valor") || "0").replace(",", "."));
  const motivo = String(formData.get("motivo") || "").trim() || null;

  if (!profileId || !familyId || !Number.isFinite(valorInformado) || valorInformado <= 0) {
    revalidatePath(`/app/${active.profileId}`);
    return;
  }

  const valor = tipo === "remover" ? -Math.abs(valorInformado) : Math.abs(valorInformado);

  const supabase = createClient();
  await supabase.from("saldo_ajustes").insert({
    family_id: familyId,
    profile_id: profileId,
    valor,
    motivo,
    criado_por: active.profileId,
  });

  revalidatePath(`/app/${active.profileId}`);
}
