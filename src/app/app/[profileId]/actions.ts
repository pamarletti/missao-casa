"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveProfile, clearActiveProfile } from "@/lib/activeProfile";
import {
  valorMensalTotal,
  valorMensalPorCrianca,
  divisorDoRodizio,
  escalarParaTotalMensal,
} from "@/lib/valorBase";
import { inicioDaJanela, inicioDaSemana, hojeEmRecife } from "@/lib/periodos";
import {
  vezesNoPeriodo,
  vezesNoPeriodoSemRodizio,
  type PedidoDeTroca,
} from "@/lib/trocas";

async function requireActiveProfile() {
  const active = await getActiveProfile();
  if (!active) redirect("/app");
  return active;
}

/** Apaga a conta da família PARA SEMPRE: o login (usuário no Supabase
 * Auth), a família, todos os perfis (responsáveis e crianças), o catálogo
 * de tarefas, todo o histórico de eventos/ajustes e fechamentos. Todas as
 * tabelas têm `on delete cascade` até `auth.users` (ver supabase/schema.sql
 * e 002_saldo_ajustes.sql), então apagar o usuário de login já é
 * suficiente — o Postgres cuida do resto em cascata numa única operação
 * atômica. Só o responsável pode chamar isso, e só depois de confirmar na
 * tela (CancelarContaButton exige digitar "cancelar"). Ação irreversível:
 * não existe "desfazer" nem backup automático.
 */
export async function cancelarContaFamilia() {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Erro ao cancelar conta da família:", error.message);
    return;
  }

  await clearActiveProfile();
  await supabase.auth.signOut();
  redirect("/login?contaCancelada=1");
}

/** Menino marca uma tarefa individual/individual-coletiva como feita,
 * ou pede autorização para uma coletiva. */
/** "Não feito" e "pedido para refazer" não trancam a tarefa: enquanto a
 * janela dela não virar (o dia, pra diárias; a semana, pra semanais) ainda
 * dá tempo de fazer, e a tarefa volta a aceitar marcação como se nada
 * tivesse acontecido. Esta função acha o registro daquela janela pra ser
 * reaproveitado — atualizamos a linha existente em vez de criar uma
 * segunda pra mesma tarefa no mesmo dia, senão o app não teria como saber
 * qual das duas vale. Quando a janela vira, o registro sai de vista
 * sozinho e a tarefa começa do zero. */
async function eventoParaRefazer(
  supabase: ReturnType<typeof createClient>,
  taskId: string,
  profileId: string,
  frequencia: string
) {
  const janela = inicioDaJanela(frequencia, hojeEmRecife());

  const { data } = await supabase
    .from("task_events")
    .select("id")
    .eq("task_id", taskId)
    .eq("profile_id", profileId)
    .gte("data", janela)
    .in("status", ["nao_feito", "pedido_para_refazer"])
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

/** Quantas vezes a tarefa ainda pode ser marcada agora. Espelha a mesma
 * regra da tela (vagasRestantes em CriancaDashboard.tsx), pra o servidor
 * não aceitar mais marcações do que o combinado mesmo que o navegador
 * mande — dois toques rápidos, duas abas abertas.
 *
 * OBRIGATÓRIAS têm cota por janela: as que acontecem mais de uma vez por
 * dia (lavar a louça 3×, lavar panelas 2×...) voltam pra lista depois de
 * cada marcação, até completar as vezes do dia. "Não feito" e "pedido para
 * refazer" não ocupam vaga.
 *
 * COLETIVAS não têm cota: quem define o ritmo é o responsável, que autoriza
 * cada pedido. Uma coletiva só fica indisponível enquanto houver um pedido
 * em andamento; assim que é confirmada, volta a aceitar "Quero fazer". */
type TarefaParaVagas = {
  id: string;
  categoria: string;
  frequencia: string;
  ocorrencias_por_dia: number | null;
  finalidade?: string | null;
  profile_ids?: string[] | null;
};

/** Os pedidos de troca que valem pra esta tarefa neste período. */
async function trocasAceitas(
  supabase: ReturnType<typeof createClient>,
  familyId: string,
  taskId: string,
  periodo: string
): Promise<PedidoDeTroca[]> {
  const { data } = await supabase
    .from("pedidos_de_troca")
    .select("id, task_id, de_profile_id, para_profile_id, periodo, status")
    .eq("family_id", familyId)
    .eq("task_id", taskId)
    .eq("periodo", periodo)
    .eq("status", "aceito");
  return (data ?? []) as PedidoDeTroca[];
}

/** Ordem das crianças da família — precisa ser a mesma de todas as telas,
 * senão o rodízio das compartilhadas daria respostas diferentes aqui. */
async function criancasDaFamilia(supabase: ReturnType<typeof createClient>, familyId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("family_id", familyId)
    .eq("kind", "crianca")
    .order("name");
  return (data ?? []).map((c) => c.id as string);
}

async function vagasRestantes(
  supabase: ReturnType<typeof createClient>,
  task: TarefaParaVagas,
  profileId: string,
  familyId: string,
  /** Falso quando é o responsável lançando direto: ele pode registrar fora
   * da vez da criança, o menino não. */
  respeitarRodizio = true
) {
  const hoje = hojeEmRecife();
  const janela = inicioDaJanela(task.frequencia, hoje);
  const base = supabase
    .from("task_events")
    .select("id", { count: "exact", head: true })
    .eq("task_id", task.id)
    .eq("profile_id", profileId)
    .gte("data", janela);

  if (task.categoria === "coletiva") {
    const { count } = await base.in("status", [
      "aguardando_autorizacao",
      "liberada",
      "aguardando_confirmacao",
    ]);
    return (count ?? 0) > 0 ? 0 : 1;
  }

  const pedidos = await trocasAceitas(supabase, familyId, task.id, janela);
  const total = respeitarRodizio
    ? vezesNoPeriodo(task, profileId, await criancasDaFamilia(supabase, familyId), hoje, inicioDaSemana, pedidos)
    : vezesNoPeriodoSemRodizio(task, profileId, hoje, pedidos);

  const { count } = await base.not("status", "in", "(nao_feito,pedido_para_refazer)");
  return Math.max(0, total - (count ?? 0));
}

export async function markOrRequest(taskId: string, familyId: string) {
  const active = await requireActiveProfile();
  const supabase = createClient();

  const { data: task } = await supabase
    .from("task_catalog")
    .select("id, categoria, valor_unitario, frequencia, ocorrencias_por_dia, finalidade, profile_ids")
    .eq("id", taskId)
    .single();
  if (!task) return;

  const status = task.categoria === "coletiva" ? "aguardando_autorizacao" : "aguardando_confirmacao";
  const idParaRefazer = await eventoParaRefazer(supabase, taskId, active.profileId, task.frequencia);

  // Reaproveitar um "não feito" não consome vaga nova; fora isso, respeita
  // o limite de vezes por dia da tarefa.
  if (!idParaRefazer) {
    const vagas = await vagasRestantes(supabase, task, active.profileId, familyId);
    if (vagas <= 0) return;
  }

  if (idParaRefazer) {
    await supabase
      .from("task_events")
      .update({
        status,
        valor: task.valor_unitario,
        origem: "menino",
        confirmado_por: null,
        confirmado_em: null,
      })
      .eq("id", idParaRefazer);
  } else {
    await supabase.from("task_events").insert({
      family_id: familyId,
      task_id: taskId,
      profile_id: active.profileId,
      data: hojeEmRecife(),
      status,
      valor: task.valor_unitario,
      origem: "menino",
    });
  }

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
    .select("id, valor_unitario, categoria, frequencia, ocorrencias_por_dia, finalidade, profile_ids")
    .eq("id", taskId)
    .single();
  if (!task) return;

  // Se a tarefa já tinha sido marcada como não feita (ou pedida pra
  // refazer) nesta mesma janela, corrige aquele registro em vez de criar
  // um segundo — ver eventoParaRefazer, mais acima.
  const idParaRefazer = await eventoParaRefazer(supabase, taskId, profileId, task.frequencia);

  if (decisao === "feito") {
    const dadosFeito = {
      status: "confirmado",
      valor: task.valor_unitario,
      origem: "responsavel",
      confirmado_por: active.profileId,
      confirmado_em: new Date().toISOString(),
    };

    if (idParaRefazer) {
      await supabase.from("task_events").update(dadosFeito).eq("id", idParaRefazer);
    } else {
      const vagas = await vagasRestantes(supabase, task, profileId, familyId, false);
      if (vagas <= 0) {
        revalidatePath(`/app/${active.profileId}`);
        return;
      }
      await supabase.from("task_events").insert({
        family_id: familyId,
        task_id: taskId,
        profile_id: profileId,
        data: hojeEmRecife(),
        ...dadosFeito,
      });
    }
  } else if (idParaRefazer) {
    // Já estava como não feita nesta janela — nada muda.
    revalidatePath(`/app/${active.profileId}`);
    return;
  } else {
    await supabase.from("task_events").insert({
      family_id: familyId,
      task_id: taskId,
      profile_id: profileId,
      data: hojeEmRecife(),
      status: "nao_feito",
      valor: 0,
      origem: "responsavel",
    });
  }

  revalidatePath(`/app/${active.profileId}`);
}

/** Um responsável decide, um a um, o que fazer com uma tarefa obrigatória
 * diária que ficou em silêncio total num dia que já passou ("Atrasada" no
 * painel do responsável). Substitui o desconto automático por silêncio
 * (que rodava sozinho via Vercel Cron e não estava confiável no plano
 * gratuito — ver supabase/007_status_desconsiderada.sql): agora é sempre
 * uma decisão manual, tarefa por tarefa, com a data correta do dia
 * atrasado (não a de hoje):
 * - "feito": credita o valor normalmente, como se tivesse confirmado na
 *   hora.
 * - "nao_feito": desconta o valor da tarefa (multiplicado pelas ocorrências
 *   por dia, quando houver mais de uma) — o mesmo cálculo que o desconto
 *   automático fazia.
 * - "desconsiderar": não credita nem desconta (ex.: dia de viagem, doença
 *   etc.) — só tira a tarefa da lista de atrasadas. */
export async function registrarAtrasada(
  taskId: string,
  profileId: string,
  familyId: string,
  data: string,
  decisao: "feito" | "nao_feito" | "desconsiderar"
) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const supabase = createClient();
  const { data: task } = await supabase
    .from("task_catalog")
    .select("valor_unitario, ocorrencias_por_dia")
    .eq("id", taskId)
    .single();
  if (!task) return;

  if (decisao === "feito") {
    await supabase.from("task_events").insert({
      family_id: familyId,
      task_id: taskId,
      profile_id: profileId,
      data,
      status: "confirmado",
      valor: task.valor_unitario,
      origem: "responsavel",
      confirmado_por: active.profileId,
      confirmado_em: new Date().toISOString(),
    });
  } else if (decisao === "nao_feito") {
    await supabase.from("task_events").insert({
      family_id: familyId,
      task_id: taskId,
      profile_id: profileId,
      data,
      status: "desconto_automatico",
      valor: -(Number(task.valor_unitario) * (task.ocorrencias_por_dia || 1)),
      origem: "responsavel",
    });
  } else {
    await supabase.from("task_events").insert({
      family_id: familyId,
      task_id: taskId,
      profile_id: profileId,
      data,
      status: "desconsiderada",
      valor: 0,
      origem: "responsavel",
    });
  }

  revalidatePath(`/app/${active.profileId}`);
}

/** Um responsável edita nome, valor ou ícone de uma tarefa do catálogo —
 * vale a partir de agora, sem alterar valores de eventos já registrados.
 * Se a tarefa editada for obrigatória (individual ou individual-coletiva),
 * o "valor base" da família (o total mensal que ela representa) é
 * recalculado automaticamente para refletir essa edição — sem mexer no
 * valor das outras tarefas. */
/** Liga/desliga uma tarefa do catálogo da família ("desnecessária
 * temporariamente"). Uma tarefa desligada some das listas de Hoje / Esta
 * semana / Coletivas dos meninos e da fila de Pendências do responsável,
 * mas continua existindo no banco (`ativo = false`, nunca excluída) — o
 * histórico do que já foi feito com ela fica intacto, e dá pra religar a
 * qualquer momento pelo bloco "Tarefas desnecessárias" do catálogo
 * editável.
 *
 * Como o valor base mensal da família é a soma das obrigatórias ATIVAS,
 * ligar/desligar uma obrigatória recalcula esse total — mesma regra de
 * editarTarefa: os valores das outras tarefas não mudam, só o total passa
 * a refletir o que está valendo de verdade. */
export async function marcarDesnecessaria(taskId: string, desnecessaria: boolean) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const supabase = createClient();
  await supabase.from("task_catalog").update({ ativo: !desnecessaria }).eq("id", taskId);

  const { data: tarefa } = await supabase
    .from("task_catalog")
    .select("family_id, categoria")
    .eq("id", taskId)
    .single();

  if (tarefa && (tarefa.categoria === "individual" || tarefa.categoria === "individual_coletiva")) {
    const { data: obrigatorias } = await supabase
      .from("task_catalog")
      .select("valor_unitario, frequencia, ocorrencias_por_dia, pula_fim_de_semana, finalidade, profile_ids")
      .eq("family_id", tarefa.family_id)
      .in("categoria", ["individual", "individual_coletiva"])
      .eq("ativo", true);

    const { count: numCriancasRaw } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("family_id", tarefa.family_id)
      .eq("kind", "crianca");

    // Teto de UMA criança: as compartilhadas entram pela fração que cabe a
    // cada uma, já que elas se revezam.
    const novoTotal = valorMensalPorCrianca(obrigatorias ?? [], numCriancasRaw && numCriancasRaw > 0 ? numCriancasRaw : 1);
    await supabase
      .from("families")
      .update({ valor_base_obrigatorias: Math.round(novoTotal * 100) / 100 })
      .eq("id", tarefa.family_id);
  }

  revalidatePath(`/app/${active.profileId}`);
}

/** Valores aceitos nas classificações — o servidor não grava nada fora
 * desta lista, mesmo que o navegador mande. "Facultativa" é o valor no
 * banco; na tela ele aparece como "Bônus". */
const TIPOS = ["Obrigatória", "Facultativa"];
const FINALIDADES = ["Para mim", "Compartilhadas", "Para a família"];
const FREQUENCIAS = ["diaria", "semanal", "mensal"];

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

  const patch: Record<string, unknown> = { name, valor_unitario: valorInformado, icone };

  // Reclassificação: cada uma das quatro categorias vem do formulário com
  // uma opção só. Campos ausentes não são tocados.
  const tipo = String(formData.get("tipo") || "").trim();
  const finalidade = String(formData.get("finalidade") || "").trim();
  const comodo = String(formData.get("comodo") || "").trim();
  const frequencia = String(formData.get("frequencia") || "").trim();

  if (TIPOS.includes(tipo)) patch.tipo = tipo;
  if (FINALIDADES.includes(finalidade)) patch.finalidade = finalidade;
  if (comodo) patch.comodo = comodo;
  if (FREQUENCIAS.includes(frequencia)) {
    patch.frequencia = frequencia;
    // "vezes por dia" só faz sentido em tarefa diária; nas outras volta a 1.
    if (frequencia !== "diaria") {
      patch.ocorrencias_por_dia = 1;
    } else {
      const vezes = Math.floor(Number(formData.get("ocorrencias_por_dia") || 1));
      patch.ocorrencias_por_dia = Number.isFinite(vezes) && vezes >= 1 && vezes <= 12 ? vezes : 1;
    }
  }

  // `categoria` é a coluna antiga, que ainda comanda regras do app (quem
  // precisa de autorização, quem tem cota por dia, como as listas de Hoje e
  // Esta semana se agrupam). Ela passa a ser derivada das classificações
  // novas, pra as duas nunca discordarem: bônus vira "coletiva" (pede
  // autorização, sem cota); obrigatória só sua vira "individual"; obrigatória
  // compartilhada ou da família vira "individual_coletiva".
  // Quem se reveza na tarefa. Só vale pra compartilhadas; nas outras
  // finalidades a lista é limpa, pra não sobrar restrição escondida de uma
  // classificação anterior. Marcar todo mundo grava nulo — é o mesmo que
  // "vale pra todas", e assim uma criança nova entra na tarefa sozinha.
  if (finalidade) {
    if (finalidade === "Compartilhadas") {
      const escolhidos = formData.getAll("profile_ids").map(String).filter(Boolean);
      const { data: tarefa } = await supabase.from("task_catalog").select("family_id").eq("id", taskId).single();
      const { count: totalCriancas } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("family_id", tarefa?.family_id ?? "")
        .eq("kind", "crianca");
      patch.profile_ids =
        escolhidos.length === 0 || escolhidos.length === (totalCriancas ?? 0) ? null : escolhidos;
    } else {
      patch.profile_ids = null;
    }
  }

  if (patch.tipo || patch.finalidade) {
    const { data: antes } = await supabase
      .from("task_catalog")
      .select("tipo, finalidade")
      .eq("id", taskId)
      .single();
    const tipoFinal = (patch.tipo as string) ?? antes?.tipo ?? "Obrigatória";
    const finalFinal = (patch.finalidade as string) ?? antes?.finalidade ?? "Para mim";
    patch.categoria =
      tipoFinal === "Facultativa" ? "coletiva" : finalFinal === "Para mim" ? "individual" : "individual_coletiva";
  }

  await supabase.from("task_catalog").update(patch).eq("id", taskId);

  const { data: tarefaEditada } = await supabase
    .from("task_catalog")
    .select("family_id")
    .eq("id", taskId)
    .single();

  // Recalcula sempre: mudar valor, frequência ou o tipo de uma tarefa muda a
  // soma real das obrigatórias, pra qualquer lado.
  if (tarefaEditada) {
    const { data: obrigatorias } = await supabase
      .from("task_catalog")
      .select("valor_unitario, frequencia, ocorrencias_por_dia, pula_fim_de_semana, finalidade, profile_ids")
      .eq("family_id", tarefaEditada.family_id)
      .in("categoria", ["individual", "individual_coletiva"])
      .eq("ativo", true);

    const { count: numCriancasRaw } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("family_id", tarefaEditada.family_id)
      .eq("kind", "crianca");

    // Teto de UMA criança: as compartilhadas entram pela fração que cabe a
    // cada uma, já que elas se revezam.
    const novoTotal = valorMensalPorCrianca(obrigatorias ?? [], numCriancasRaw && numCriancasRaw > 0 ? numCriancasRaw : 1);
    await supabase
      .from("families")
      .update({ valor_base_obrigatorias: Math.round(novoTotal * 100) / 100 })
      .eq("id", tarefaEditada.family_id);
  }

  revalidatePath(`/app/${active.profileId}`);
}

/** Um responsável define um novo "valor base" mensal para as tarefas
 * obrigatórias (individuais + individual-coletivas) — o valor de cada
 * tarefa é recalculado proporcionalmente ao peso que ela já tinha, de
 * forma que a soma de todas passe a bater exatamente com o novo valor. */
export async function definirValorBase(formData: FormData) {
  const active = await requireActiveProfile();
  if (active.kind !== "responsavel") return;

  const familyId = String(formData.get("familyId") || "");
  const novoValor = Number(String(formData.get("valorBase") || "0").replace(",", "."));

  if (!familyId || !Number.isFinite(novoValor) || novoValor <= 0) {
    revalidatePath(`/app/${active.profileId}`);
    return;
  }

  const supabase = createClient();
  const { data: obrigatorias } = await supabase
    .from("task_catalog")
    .select("id, valor_unitario, frequencia, ocorrencias_por_dia, pula_fim_de_semana, finalidade, profile_ids")
    .eq("family_id", familyId)
    .in("categoria", ["individual", "individual_coletiva"])
    .eq("ativo", true);

  if (!obrigatorias || obrigatorias.length === 0) {
    revalidatePath(`/app/${active.profileId}`);
    return;
  }

  const { count: numCriancasRaw } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("kind", "crianca");
  const numCriancas = numCriancasRaw && numCriancasRaw > 0 ? numCriancasRaw : 1;

  // As compartilhadas se revezam, então cada menino só pega uma fração
  // delas. Elas ficam fora da escala (o rodízio é que define a parte de
  // cada um), e o alvo a distribuir entre as outras é o que sobra depois de
  // descontar o que já vem delas.
  const seRevezam = obrigatorias.filter((t) => divisorDoRodizio(t, numCriancas) > 1);
  const escalaveis = obrigatorias.filter((t) => divisorDoRodizio(t, numCriancas) === 1);
  const jaVemDasCompartilhadas = valorMensalPorCrianca(seRevezam, numCriancas);
  const alvoDasOutras = novoValor - jaVemDasCompartilhadas;

  if (escalaveis.length === 0 || alvoDasOutras <= 0) {
    revalidatePath(`/app/${active.profileId}`);
    return;
  }

  // Escala mantendo os valores em centavos redondos E fazendo a soma bater
  // exata com o alvo — ver escalarParaTotalMensal para o porquê de não ser
  // só multiplicar cada valor pelo fator e arredondar.
  const escalonadas = escalarParaTotalMensal(escalaveis, alvoDasOutras);
  if (escalonadas.length === 0) {
    revalidatePath(`/app/${active.profileId}`);
    return;
  }

  for (const { tarefa, valorUnitario } of escalonadas) {
    if (Number(tarefa.valor_unitario) === valorUnitario) continue;
    await supabase.from("task_catalog").update({ valor_unitario: valorUnitario }).eq("id", tarefa.id);
  }

  // Grava o total realmente alcançado, não o que foi digitado: nos catálogos
  // normais os dois são idênticos, e quando não dá para fechar exato (alvo de
  // centavo ímpar) isso evita que o card fique acusando divergência para
  // sempre.
  const totalAlcancado =
    valorMensalTotal(escalonadas.map(({ tarefa, valorUnitario }) => ({ ...tarefa, valor_unitario: valorUnitario }))) +
    jaVemDasCompartilhadas;
  await supabase
    .from("families")
    .update({ valor_base_obrigatorias: Math.round(totalAlcancado * 100) / 100 })
    .eq("id", familyId);

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

/** ──────────────────────────────────────────────────────────────
 * Trocas entre as crianças
 *
 * Uma criança pede que a outra faça uma tarefa obrigatória dela. Enquanto o
 * pedido está "pendente" nada muda: quem pediu continua responsável, e pode
 * cancelar. Quando a outra aceita, a tarefa passa pra ela NAQUELE período —
 * some da lista de quem pediu, aparece na de quem aceitou, e o crédito vai
 * pra quem fizer. Quando o dia (ou a semana) vira, tudo volta ao normal
 * sozinho. Ver src/lib/trocas.ts pra conta que sustenta isso.
 * ────────────────────────────────────────────────────────────── */

/** A criança pede que outra faça a tarefa no lugar dela. */
export async function pedirTroca(taskId: string, paraProfileId: string, familyId: string) {
  const active = await requireActiveProfile();
  if (active.kind !== "crianca") return; // é combinado entre eles
  if (!taskId || !paraProfileId || paraProfileId === active.profileId) return;

  const supabase = createClient();
  const { data: task } = await supabase
    .from("task_catalog")
    .select("id, categoria, frequencia, ocorrencias_por_dia, finalidade, profile_ids, ativo, family_id")
    .eq("id", taskId)
    .single();
  // Só obrigatórias ativas: as de bônus não têm dono nem obrigação — quem
  // quiser fazer, faz, não há o que passar adiante.
  if (!task || !task.ativo || task.categoria === "coletiva" || task.family_id !== familyId) return;

  const criancas = await criancasDaFamilia(supabase, familyId);
  if (!criancas.includes(paraProfileId) || !criancas.includes(active.profileId)) return;

  const hoje = hojeEmRecife();
  const periodo = inicioDaJanela(task.frequencia, hoje);

  const { data: pedidosRaw } = await supabase
    .from("pedidos_de_troca")
    .select("id, task_id, de_profile_id, para_profile_id, periodo, status")
    .eq("family_id", familyId)
    .eq("task_id", taskId)
    .eq("periodo", periodo)
    .in("status", ["pendente", "aceito"]);
  const pedidos = (pedidosRaw ?? []) as PedidoDeTroca[];

  // Um pedido em aberto de cada vez, por tarefa e período — senão daria pra
  // encher a tela do irmão com o mesmo pedido repetido.
  if (pedidos.some((p) => p.status === "pendente" && p.de_profile_id === active.profileId)) return;

  // E não dá pra passar adiante mais vezes do que ainda faltam pra ela.
  const vezes = vezesNoPeriodo(task, active.profileId, criancas, hoje, inicioDaSemana, pedidos);
  const { count: jaResolvidas } = await supabase
    .from("task_events")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("profile_id", active.profileId)
    .gte("data", periodo)
    .not("status", "in", "(nao_feito,pedido_para_refazer)");
  if (vezes - (jaResolvidas ?? 0) <= 0) return;

  await supabase.from("pedidos_de_troca").insert({
    family_id: familyId,
    task_id: taskId,
    de_profile_id: active.profileId,
    para_profile_id: paraProfileId,
    periodo,
    status: "pendente",
  });

  revalidatePath(`/app/${active.profileId}`);
}

/** A criança convidada aceita ou recusa. Aceitou, a tarefa é dela. */
export async function responderTroca(pedidoId: string, resposta: "aceito" | "recusado") {
  const active = await requireActiveProfile();
  if (active.kind !== "crianca") return;
  if (resposta !== "aceito" && resposta !== "recusado") return;

  const supabase = createClient();
  await supabase
    .from("pedidos_de_troca")
    .update({ status: resposta, respondido_em: new Date().toISOString() })
    .eq("id", pedidoId)
    .eq("para_profile_id", active.profileId)
    .eq("status", "pendente");

  revalidatePath(`/app/${active.profileId}`);
}

/** Quem pediu desiste, antes de o outro responder. */
export async function cancelarTroca(pedidoId: string) {
  const active = await requireActiveProfile();
  const supabase = createClient();

  await supabase
    .from("pedidos_de_troca")
    .delete()
    .eq("id", pedidoId)
    .eq("de_profile_id", active.profileId)
    .eq("status", "pendente");

  revalidatePath(`/app/${active.profileId}`);
}
