import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/activeProfile";
import { trocarPerfil, logout } from "@/app/app/actions";
import ResponsavelDashboard from "@/components/ResponsavelDashboard";
import CriancaDashboard from "@/components/CriancaDashboard";
import BackToTopButton from "@/components/BackToTopButton";
import MudarPinButton from "@/components/MudarPinButton";
import EmojiButton from "@/components/EmojiButton";
import type { PendingEvent } from "@/components/ConfirmQueue";
import type { AtividadeItem } from "@/components/Atividades";
import { inicioDoMes, inicioDaSemana } from "@/lib/periodos";

const STATUS_LABEL: Record<string, string> = {
  aguardando_autorizacao: "aguardando autorização",
  liberada: "liberada",
  aguardando_confirmacao: "aguardando confirmação",
  confirmado: "confirmado",
  nao_feito: "não feito",
  pedido_para_refazer: "pedido para refazer",
  desconto_automatico: "desconto automático",
};

export default async function Dashboard({
  params,
  searchParams,
}: {
  params: { profileId: string };
  searchParams: { erroPin?: string; pinAlterado?: string };
}) {
  const active = await getActiveProfile();
  if (!active || active.profileId !== params.profileId) redirect("/app");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, kind, icon, family_id, created_at, families(name, valor_base_obrigatorias)")
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
      .select(
        "id, name, categoria, subcategoria, frequencia, valor_unitario, ocorrencias_por_dia, pula_fim_de_semana, icone, ativo"
      )
      .eq("family_id", familyId)
      .eq("ativo", true)
      .order("categoria");

    const { data: eventosHistorico, error: histEventosError } = await supabase
      .from("task_events")
      .select("id, status, valor, created_at, profile_id, task_catalog(name), profiles!task_events_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (histEventosError) console.error("Erro ao buscar histórico de eventos:", histEventosError.message);

    const { data: ajustesHistorico, error: histAjustesError } = await supabase
      .from("saldo_ajustes")
      .select("id, valor, motivo, criado_em, profile_id, profiles!saldo_ajustes_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .order("criado_em", { ascending: false })
      .limit(300);
    if (histAjustesError) console.error("Erro ao buscar histórico de ajustes:", histAjustesError.message);

    const atividades: AtividadeItem[] = [
      ...(eventosHistorico ?? []).map((e) => ({
        id: e.id,
        quando: e.created_at,
        quemNome: (e.profiles as unknown as { name: string } | null)?.name,
        profileId: e.profile_id,
        descricao: (e.task_catalog as unknown as { name: string } | null)?.name ?? "Tarefa",
        valor: Number(e.valor),
        statusLabel: STATUS_LABEL[e.status] ?? e.status,
        tipo: "tarefa" as const,
      })),
      ...(ajustesHistorico ?? []).map((a) => ({
        id: a.id,
        quando: a.criado_em,
        quemNome: (a.profiles as unknown as { name: string } | null)?.name,
        profileId: a.profile_id,
        descricao: a.motivo ? `Ajuste manual — ${a.motivo}` : "Ajuste manual",
        valor: Number(a.valor),
        statusLabel: Number(a.valor) >= 0 ? "crédito" : "débito",
        tipo: "ajuste" as const,
      })),
    ]
      .sort((a, b) => (a.quando < b.quando ? 1 : -1))
      .slice(0, 300);

    // Pendências: todos os eventos da semana corrente (cobre tanto as
    // diárias quanto as semanais), de todas as crianças, pra aplicar a
    // mesma regra de "silêncio total" olhando tarefa por tarefa.
    const inicioSemana = inicioDaSemana(today);
    const { data: eventosSemanaTodos, error: semanaTodosError } = await supabase
      .from("task_events")
      .select("id, task_id, profile_id, status, data")
      .eq("family_id", familyId)
      .gte("data", inicioSemana)
      .order("data", { ascending: true });
    if (semanaTodosError) console.error("Erro ao buscar eventos da semana:", semanaTodosError.message);

    // Descontos por dia: descontos automáticos (silêncio total) + retiradas
    // manuais negativas, com o suficiente pra montar o agrupamento por dia.
    const { data: descontosEventosRaw, error: descEventosError } = await supabase
      .from("task_events")
      .select("id, data, valor, profile_id, task_catalog(name), profiles!task_events_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .eq("status", "desconto_automatico")
      .order("data", { ascending: false })
      .limit(300);
    if (descEventosError) console.error("Erro ao buscar descontos automáticos:", descEventosError.message);

    const { data: descontosAjustesRaw, error: descAjustesError } = await supabase
      .from("saldo_ajustes")
      .select("id, criado_em, valor, motivo, profile_id, profiles!saldo_ajustes_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .lt("valor", 0)
      .order("criado_em", { ascending: false })
      .limit(300);
    if (descAjustesError) console.error("Erro ao buscar descontos manuais:", descAjustesError.message);

    const descontosEventos = (descontosEventosRaw ?? []).map((e) => ({
      id: e.id,
      data: e.data,
      valor: Number(e.valor),
      profileId: e.profile_id,
      profileName: (e.profiles as unknown as { name: string } | null)?.name ?? "—",
      descricao: (e.task_catalog as unknown as { name: string } | null)?.name ?? "Tarefa",
    }));

    const descontosAjustes = (descontosAjustesRaw ?? []).map((a) => ({
      id: a.id,
      data: String(a.criado_em).slice(0, 10),
      valor: Number(a.valor),
      profileId: a.profile_id,
      profileName: (a.profiles as unknown as { name: string } | null)?.name ?? "—",
      descricao: a.motivo ? `Ajuste manual — ${a.motivo}` : "Ajuste manual",
    }));

    // Revisar tarefas: tudo que já está confirmado ou autorizado (liberada),
    // com contagem total e lista pra corrigir qualquer registro.
    const { data: revisarEventosRaw, error: revisarError } = await supabase
      .from("task_events")
      .select("id, data, status, valor, task_catalog(name), profiles!task_events_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .in("status", ["confirmado", "liberada"])
      .order("data", { ascending: false })
      .limit(300);
    if (revisarError) console.error("Erro ao buscar tarefas para revisão:", revisarError.message);

    const { count: revisarCountRaw, error: revisarCountError } = await supabase
      .from("task_events")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .in("status", ["confirmado", "liberada"]);
    if (revisarCountError) console.error("Erro ao contar tarefas revisáveis:", revisarCountError.message);

    const revisarEventos = (revisarEventosRaw ?? []).map((e) => ({
      id: e.id,
      data: e.data,
      status: e.status,
      valor: Number(e.valor),
      profileName: (e.profiles as unknown as { name: string } | null)?.name ?? "—",
      descricao: (e.task_catalog as unknown as { name: string } | null)?.name ?? "Tarefa",
    }));
    const revisarCount = revisarCountRaw ?? 0;

    const valorBaseObrigatorias = Number(
      (profile.families as unknown as { valor_base_obrigatorias: number } | null)?.valor_base_obrigatorias ?? 90
    );

    return (
      <Shell
        title={profile.name}
        onLogout={logout}
        onTrocarPerfil={trocarPerfil}
        pinButton={<MudarPinButton profileId={profile.id} />}
        emojiButton={<EmojiButton profileId={profile.id} iconeAtual={profile.icon} />}
        mensagemPin={
          searchParams.erroPin
            ? { texto: searchParams.erroPin, tipo: "erro" }
            : searchParams.pinAlterado
              ? { texto: "PIN alterado com sucesso!", tipo: "sucesso" }
              : undefined
        }
      >
        <ResponsavelDashboard
          familyId={familyId}
          criancas={criancas ?? []}
          saldoPorPerfil={saldoPorPerfil}
          pending={(pending ?? []) as unknown as PendingEvent[]}
          catalog={catalogoFamilia ?? []}
          atividades={atividades}
          hojeISO={today}
          eventosSemanaTodos={eventosSemanaTodos ?? []}
          descontosEventos={descontosEventos}
          descontosAjustes={descontosAjustes}
          revisarEventos={revisarEventos}
          revisarCount={revisarCount}
          valorBaseObrigatorias={valorBaseObrigatorias}
        />
      </Shell>
    );
  }

  // Perfil criança
  const { data: catalog } = await supabase
    .from("task_catalog")
    .select("id, name, categoria, subcategoria, frequencia, valor_unitario, ocorrencias_por_dia, pula_fim_de_semana, icone")
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

  // Ganhos = tudo que somou no saldo desde o início (tarefas confirmadas +
  // créditos manuais). Descontos = tudo que tirou do saldo (descontos
  // automáticos por silêncio + retiradas/remoções manuais), mostrado como
  // valor positivo. Ganhos - Descontos bate exatamente com o saldo atual.
  const todosValoresProprios = [
    ...(eventosConfirmadosTotal ?? []).map((e) => Number(e.valor)),
    ...(ajustesTotalProprio ?? []).map((a) => Number(a.valor)),
  ];
  const ganhosAtual = todosValoresProprios.filter((v) => v > 0).reduce((acc, v) => acc + v, 0);
  const descontosAtual = Math.abs(
    todosValoresProprios.filter((v) => v < 0).reduce((acc, v) => acc + v, 0)
  );

  const desdeInicio = new Date(profile.created_at).toLocaleDateString("pt-BR", {
    timeZone: "America/Recife",
  });

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
    <Shell
      title={`Vamos trabalhar, ${profile.name}?`}
      onLogout={logout}
      onTrocarPerfil={trocarPerfil}
      emojiButton={<EmojiButton profileId={profile.id} iconeAtual={profile.icon} />}
    >
      <CriancaDashboard
        nome={profile.name}
        familyId={familyId}
        today={today}
        catalog={catalog ?? []}
        eventosMes={eventos}
        atividades={atividades}
        saldoAtual={saldoAtual}
        ganhosAtual={ganhosAtual}
        descontosAtual={descontosAtual}
        desdeInicio={desdeInicio}
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
  pinButton,
  emojiButton,
  mensagemPin,
}: {
  title: string;
  children: React.ReactNode;
  onLogout: () => void;
  onTrocarPerfil: () => void;
  pinButton?: React.ReactNode;
  emojiButton?: React.ReactNode;
  mensagemPin?: { texto: string; tipo: "erro" | "sucesso" };
}) {
  return (
    <main className="min-h-screen p-4 max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
      <p className="text-center text-2xl font-bold text-slate-400 mb-1">🏠 Missão Casa</p>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          {emojiButton}
          {pinButton}
          <form action={onTrocarPerfil}>
            <button className="text-sm text-slate-400 underline">trocar perfil</button>
          </form>
          <form action={onLogout}>
            <button className="text-sm text-slate-500 underline">sair</button>
          </form>
        </div>
      </header>
      {mensagemPin && (
        <p className={`text-sm -mt-4 mb-6 ${mensagemPin.tipo === "erro" ? "text-red-400" : "text-green-400"}`}>
          {mensagemPin.texto}
        </p>
      )}
      {children}

      <p className="text-center text-2xl font-bold text-slate-400 mt-10 mb-4">Missão cumprida! 🎉</p>

      <BackToTopButton />
    </main>
  );
}
