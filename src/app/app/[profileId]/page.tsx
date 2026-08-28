import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/activeProfile";
import { trocarPerfil, logout } from "@/app/app/actions";
import ResponsavelDashboard from "@/components/ResponsavelDashboard";
import CriancaDashboard from "@/components/CriancaDashboard";
import type { PendingEvent } from "@/components/ConfirmQueue";
import type { AtividadeItem } from "@/components/Atividades";
import { inicioDoMes } from "@/lib/periodos";

const STATUS_LABEL: Record<string, string> = {
  aguardando_autorizacao: "aguardando autorização",
  liberada: "liberada",
  aguardando_confirmacao: "aguardando confirmação",
  confirmado: "confirmado",
  nao_feito: "não feito",
  pedido_para_refazer: "pedido para refazer",
  desconto_automatico: "desconto automático",
};

export default async function Dashboard({ params }: { params: { profileId: string } }) {
  const active = await getActiveProfile();
  if (!active || active.profileId !== params.profileId) redirect("/app");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, kind, family_id, families(name)")
    .eq("id", params.profileId)
    .single();

  if (!profile) redirect("/app");

  const familyId = profile.family_id as string;
  const today = new Date().toISOString().slice(0, 10);
  const inicioMes = inicioDoMes(today);

  if (profile.kind === "responsavel") {
    const { data: pending, error: pendingError } = await supabase
      .from("task_events")
      .select("id, status, valor, data, task_catalog(name), profiles!task_events_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .in("status", ["aguardando_autorizacao", "aguardando_confirmacao"])
      .order("created_at", { ascending: true });
    if (pendingError) console.error("Erro ao buscar pendências:", pendingError.message);

    const { data: criancas } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("family_id", familyId)
      .eq("kind", "crianca")
      .order("name");

    // Saldo é acumulado (não zera no fim do mês) — só diminui quando o
    // responsável registra uma retirada (usando "Remover" no ajuste manual
    // de saldo). Por isso essas duas consultas não têm filtro de data.
    const { data: confirmadosTotal, error: confirmadosError } = await supabase
      .from("task_events")
      .select("profile_id, valor")
      .eq("family_id", familyId)
      .in("status", ["confirmado", "desconto_automatico"]);
    if (confirmadosError) console.error("Erro ao buscar tarefas confirmadas:", confirmadosError.message);

    const { data: ajustesTotal, error: ajustesError } = await supabase
      .from("saldo_ajustes")
      .select("profile_id, valor")
      .eq("family_id", familyId);
    if (ajustesError) console.error("Erro ao buscar ajustes de saldo:", ajustesError.message);

    const saldoPorPerfil: Record<string, number> = {};
    for (const e of confirmadosTotal ?? []) {
      saldoPorPerfil[e.profile_id] = (saldoPorPerfil[e.profile_id] ?? 0) + Number(e.valor);
    }
    for (const a of ajustesTotal ?? []) {
      saldoPorPerfil[a.profile_id] = (saldoPorPerfil[a.profile_id] ?? 0) + Number(a.valor);
    }

    const { data: catalogoFamilia } = await supabase
      .from("task_catalog")
      .select("id, name, categoria, subcategoria, valor_unitario")
      .eq("family_id", familyId)
      .eq("ativo", true)
      .order("categoria");

    const { data: eventosHistorico, error: histEventosError } = await supabase
      .from("task_events")
      .select("id, status, valor, created_at, task_catalog(name), profiles!task_events_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (histEventosError) console.error("Erro ao buscar histórico de eventos:", histEventosError.message);

    const { data: ajustesHistorico, error: histAjustesError } = await supabase
      .from("saldo_ajustes")
      .select("id, valor, motivo, criado_em, profiles!saldo_ajustes_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .order("criado_em", { ascending: false })
      .limit(60);
    if (histAjustesError) console.error("Erro ao buscar histórico de ajustes:", histAjustesError.message);

    const atividades: AtividadeItem[] = [
      ...(eventosHistorico ?? []).map((e) => ({
        id: e.id,
        quando: e.created_at,
        quemNome: (e.profiles as unknown as { name: string } | null)?.name,
        descricao: (e.task_catalog as unknown as { name: string } | null)?.name ?? "Tarefa",
        valor: Number(e.valor),
        statusLabel: STATUS_LABEL[e.status] ?? e.status,
        tipo: "tarefa" as const,
      })),
      ...(ajustesHistorico ?? []).map((a) => ({
        id: a.id,
        quando: a.criado_em,
        quemNome: (a.profiles as unknown as { name: string } | null)?.name,
        descricao: a.motivo ? `Ajuste manual — ${a.motivo}` : "Ajuste manual",
        valor: Number(a.valor),
        statusLabel: Number(a.valor) >= 0 ? "crédito" : "débito",
        tipo: "ajuste" as const,
      })),
    ]
      .sort((a, b) => (a.quando < b.quando ? 1 : -1))
      .slice(0, 60);

    return (
      <Shell title={`Olá, ${profile.name}`} onLogout={logout} onTrocarPerfil={trocarPerfil}>
        <ResponsavelDashboard
          familyId={familyId}
          criancas={criancas ?? []}
          saldoPorPerfil={saldoPorPerfil}
          pending={(pending ?? []) as unknown as PendingEvent[]}
          catalog={catalogoFamilia ?? []}
          atividades={atividades}
        />
      </Shell>
    );
  }

  // Perfil criança
  const { data: catalog } = await supabase
    .from("task_catalog")
    .select("id, name, categoria, subcategoria, frequencia, valor_unitario, ocorrencias_por_dia")
    .eq("family_id", familyId)
    .eq("ativo", true)
    .order("categoria");

  const { data: eventosMes, error: eventosMesError } = await supabase
    .from("task_events")
    .select("id, task_id, status, valor, data")
    .eq("profile_id", profile.id)
    .gte("data", inicioMes)
    .order("data", { ascending: true });
  if (eventosMesError) console.error("Erro ao buscar eventos do mês:", eventosMesError.message);

  const eventos = eventosMes ?? [];
  const feitasMes = eventos.filter((e) => e.status === "confirmado").length;
  const naoFeitasMes = eventos.filter((e) => ["nao_feito", "desconto_automatico"].includes(e.status)).length;

  // Saldo é acumulado (não zera no fim do mês) — só diminui quando o
  // responsável registra uma retirada. Por isso essas duas consultas não
  // têm filtro de data, diferente de "eventosMes" acima (que é só pra
  // acompanhar o progresso do mês corrente).
  const { data: eventosConfirmadosTotal, error: eventosTotalError } = await supabase
    .from("task_events")
    .select("valor")
    .eq("profile_id", profile.id)
    .in("status", ["confirmado", "desconto_automatico"]);
  if (eventosTotalError) console.error("Erro ao buscar total de tarefas confirmadas:", eventosTotalError.message);

  const { data: ajustesTotalProprio, error: ajustesTotalError } = await supabase
    .from("saldo_ajustes")
    .select("valor")
    .eq("profile_id", profile.id);
  if (ajustesTotalError) console.error("Erro ao buscar total de ajustes:", ajustesTotalError.message);

  const saldoAtual =
    (eventosConfirmadosTotal ?? []).reduce((acc, e) => acc + Number(e.valor), 0) +
    (ajustesTotalProprio ?? []).reduce((acc, a) => acc + Number(a.valor), 0);

  const { count: numCriancasCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("kind", "crianca");
  const numCriancas = numCriancasCount && numCriancasCount > 0 ? numCriancasCount : 1;

  const { data: eventosHistoricoProprio, error: histProprioError } = await supabase
    .from("task_events")
    .select("id, status, valor, created_at, task_catalog(name)")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(40);
  if (histProprioError) console.error("Erro ao buscar histórico próprio:", histProprioError.message);

  const { data: ajustesProprios, error: ajustesProprioError } = await supabase
    .from("saldo_ajustes")
    .select("id, valor, motivo, criado_em")
    .eq("profile_id", profile.id)
    .order("criado_em", { ascending: false })
    .limit(40);
  if (ajustesProprioError) console.error("Erro ao buscar ajustes próprios:", ajustesProprioError.message);

  const atividades: AtividadeItem[] = [
    ...(eventosHistoricoProprio ?? []).map((e) => ({
      id: e.id,
      quando: e.created_at,
      descricao: (e.task_catalog as unknown as { name: string } | null)?.name ?? "Tarefa",
      valor: Number(e.valor),
      statusLabel: STATUS_LABEL[e.status] ?? e.status,
      tipo: "tarefa" as const,
    })),
    ...(ajustesProprios ?? []).map((a) => ({
      id: a.id,
      quando: a.criado_em,
      descricao: a.motivo ? `Ajuste manual — ${a.motivo}` : "Ajuste manual",
      valor: Number(a.valor),
      statusLabel: Number(a.valor) >= 0 ? "crédito" : "débito",
      tipo: "ajuste" as const,
    })),
  ]
    .sort((a, b) => (a.quando < b.quando ? 1 : -1))
    .slice(0, 40);

  return (
    <Shell title={`Oi, ${profile.name}!`} onLogout={logout} onTrocarPerfil={trocarPerfil}>
      <CriancaDashboard
        familyId={familyId}
        today={today}
        catalog={catalog ?? []}
        eventosMes={eventos}
        atividades={atividades}
        saldoAtual={saldoAtual}
        feitasMes={feitasMes}
        naoFeitasMes={naoFeitasMes}
        numCriancas={numCriancas}
      />
    </Shell>
  );
}

function Shell({
  title,
  children,
  onLogout,
  onTrocarPerfil,
}: {
  title: string;
  children: React.ReactNode;
  onLogout: () => void;
  onTrocarPerfil: () => void;
}) {
  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      <p className="text-center text-sm font-semibold text-slate-400 mb-1">🏠 Missão Casa</p>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex gap-2">
          <form action={onTrocarPerfil}>
            <button className="text-sm text-slate-400 underline">trocar perfil</button>
          </form>
          <form action={onLogout}>
            <button className="text-sm text-slate-500 underline">sair</button>
          </form>
        </div>
      </header>
      {children}

      <p className="text-center text-sm font-semibold text-slate-500 mt-10 mb-2">Missão cumprida! 🎉</p>
    </main>
  );
}
