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
import { inicioDoMes, inicioDaSemana, diasAtras } from "@/lib/periodos";
import { valorMensalTotal } from "@/lib/valorBase";
import { calcularNivel, type NivelInfo } from "@/lib/nivelConstancia";
import NivelBadge from "@/components/NivelBadge";
import type { Atrasada } from "@/components/PendenciasTab";
import type { ResumoFeitas } from "@/components/ResumoFeitasCard";
import type { TotaisAtividades } from "@/components/TotaisAtividades";
import { BotaoAcao } from "@/components/Carregando";
import MenuPerfil, { ItemMenu } from "@/components/MenuPerfil";

// Recife não observa horário de verão: UTC-3 o ano todo (mesma lógica usada
// no antigo cron de desconto automático, agora substituído por decisão
// manual — ver "Atrasadas" mais abaixo).
function somaDiasISO(dataISO: string, dias: number): string {
  const d = new Date(dataISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diaDaSemanaISO(dataISO: string): number {
  return new Date(dataISO + "T00:00:00Z").getUTCDay(); // 0 = domingo, 1 = segunda
}

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
      .select("id, name, icon, created_at")
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

    // Traz o catálogo INTEIRO, inclusive as tarefas desligadas
    // ("desnecessárias") — só o Catálogo editável usa as desligadas, pra
    // poder listar e religar. Todo o resto trabalha com catalogoAtivo.
    const { data: catalogoFamilia } = await supabase
      .from("task_catalog")
      .select(
        "id, name, categoria, subcategoria, frequencia, valor_unitario, ocorrencias_por_dia, pula_fim_de_semana, icone, ativo"
      )
      .eq("family_id", familyId)
      .order("categoria");

    const catalogoAtivo = (catalogoFamilia ?? []).filter((t) => t.ativo);

    // Nível de constância (só visual/motivacional — ver src/lib/nivelConstancia.ts):
    // % líquido das tarefas obrigatórias (individual + individual-coletiva)
    // cumprido por cada criança nos últimos 30 dias corridos.
    const obrigatoriasCatalogo = catalogoAtivo.filter(
      (t) => t.categoria === "individual" || t.categoria === "individual_coletiva"
    );
    const obrigatoriasIds = obrigatoriasCatalogo.map((t) => t.id);
    const potencial30Dias = valorMensalTotal(obrigatoriasCatalogo);
    const inicioJanela30 = diasAtras(today, 29);

    const { data: eventos30DiasRaw, error: eventos30Error } = await supabase
      .from("task_events")
      .select("profile_id, valor")
      .eq("family_id", familyId)
      .gte("data", inicioJanela30)
      .in("status", ["confirmado", "desconto_automatico"])
      .in("task_id", obrigatoriasIds.length > 0 ? obrigatoriasIds : ["00000000-0000-0000-0000-000000000000"]);
    if (eventos30Error) console.error("Erro ao buscar eventos dos últimos 30 dias:", eventos30Error.message);

    const ganhoLiquido30PorPerfil: Record<string, number> = {};
    for (const e of eventos30DiasRaw ?? []) {
      ganhoLiquido30PorPerfil[e.profile_id] = (ganhoLiquido30PorPerfil[e.profile_id] ?? 0) + Number(e.valor);
    }

    const nivelPorPerfil: Record<string, NivelInfo> = {};
    for (const c of criancas ?? []) {
      const diasDesdeCriacao = Math.floor(
        (Date.now() - new Date(c.created_at).getTime()) / (24 * 60 * 60 * 1000)
      );
      nivelPorPerfil[c.id] = calcularNivel(ganhoLiquido30PorPerfil[c.id] ?? 0, potencial30Dias, diasDesdeCriacao);
    }

    // Resumo de tarefas feitas no mês, por criança, separado por tipo —
    // conta só o que o responsável já confirmou (uma marcação ainda
    // esperando decisão não entra). Pega a categoria/frequência pelo embed
    // em task_catalog, e não pelo catálogo ativo, pra continuar contando
    // certo tarefas que foram desativadas no meio do caminho.
    const { data: feitasMesRaw, error: feitasMesError } = await supabase
      .from("task_events")
      .select("profile_id, task_catalog(categoria, frequencia)")
      .eq("family_id", familyId)
      .gte("data", inicioDoMes(today))
      .eq("status", "confirmado");
    if (feitasMesError) console.error("Erro ao buscar tarefas feitas no mês:", feitasMesError.message);

    const resumoFeitasPorPerfil: Record<string, ResumoFeitas> = {};
    for (const crianca of criancas ?? []) {
      resumoFeitasPorPerfil[crianca.id] = { diarias: 0, semanais: 0, coletivas: 0, total: 0 };
    }
    for (const evento of feitasMesRaw ?? []) {
      const tarefa = evento.task_catalog as unknown as { categoria: string; frequencia: string } | null;
      const resumo = resumoFeitasPorPerfil[evento.profile_id];
      if (!tarefa || !resumo) continue;
      if (tarefa.categoria === "coletiva") resumo.coletivas += 1;
      else if (tarefa.frequencia === "semanal") resumo.semanais += 1;
      else resumo.diarias += 1;
      resumo.total += 1;
    }

    // "Atrasadas": tarefas obrigatórias DIÁRIAS que ficaram em silêncio total
    // em algum dia que já passou (nem o menino marcou nada, nem o
    // responsável decidiu nada) — substitui o desconto automático por
    // silêncio, que não estava rodando de forma confiável no plano
    // gratuito da Vercel. Agora é sempre uma decisão manual do responsável,
    // dia a dia, tarefa a tarefa (ver registrarAtrasada em actions.ts).
    // Olha só os últimos 14 dias (e nunca antes da criação do perfil do
    // menino) pra não acumular uma lista enorme de coisas muito antigas.
    const diariasObrigatorias = obrigatoriasCatalogo.filter((t) => t.frequencia === "diaria");
    const inicioJanelaAtrasadas = diasAtras(today, 13);

    const { data: eventosDiariosRaw, error: eventosDiariosError } = await supabase
      .from("task_events")
      .select("profile_id, task_id, data")
      .eq("family_id", familyId)
      .gte("data", inicioJanelaAtrasadas)
      .lt("data", today)
      .in(
        "task_id",
        diariasObrigatorias.length > 0 ? diariasObrigatorias.map((t) => t.id) : ["00000000-0000-0000-0000-000000000000"]
      );
    if (eventosDiariosError) console.error("Erro ao buscar eventos diários recentes:", eventosDiariosError.message);

    const jaTemRegistroDiario = new Set(
      (eventosDiariosRaw ?? []).map((e) => `${e.profile_id}|${e.task_id}|${e.data}`)
    );

    const atrasadas: Atrasada[] = [];
    for (const crianca of criancas ?? []) {
      const criacaoISO = new Date(crianca.created_at).toISOString().slice(0, 10);
      const inicioParaEssaCrianca = criacaoISO > inicioJanelaAtrasadas ? criacaoISO : inicioJanelaAtrasadas;
      for (let dia = inicioParaEssaCrianca; dia < today; dia = somaDiasISO(dia, 1)) {
        const diaDaSemana = diaDaSemanaISO(dia);
        const eraSextaOuSabado = diaDaSemana === 5 || diaDaSemana === 6;
        for (const tarefa of diariasObrigatorias) {
          if (tarefa.pula_fim_de_semana && eraSextaOuSabado) continue;
          if (jaTemRegistroDiario.has(`${crianca.id}|${tarefa.id}|${dia}`)) continue;
          atrasadas.push({ data: dia, taskId: tarefa.id, profileId: crianca.id });
        }
      }
    }
    atrasadas.sort((a, b) => (a.data < b.data ? 1 : -1));

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
          catalog={catalogoAtivo}
          catalogoCompleto={catalogoFamilia ?? []}
          atividades={atividades}
          hojeISO={today}
          eventosSemanaTodos={eventosSemanaTodos ?? []}
          atrasadas={atrasadas}
          resumoFeitas={resumoFeitasPorPerfil}
          valorBaseObrigatorias={valorBaseObrigatorias}
          nivelPorPerfil={nivelPorPerfil}
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

  // Nível de constância (só visual/motivacional) — mesma lógica do lado
  // do responsável, calculada aqui pro próprio perfil da criança.
  const obrigatoriasCatalogo = (catalog ?? []).filter(
    (t) => t.categoria === "individual" || t.categoria === "individual_coletiva"
  );
  const obrigatoriasIds = obrigatoriasCatalogo.map((t) => t.id);
  const potencial30Dias = valorMensalTotal(obrigatoriasCatalogo);
  const inicioJanela30 = diasAtras(today, 29);

  const { data: eventos30DiasProprioRaw, error: eventos30ProprioError } = await supabase
    .from("task_events")
    .select("valor")
    .eq("profile_id", profile.id)
    .gte("data", inicioJanela30)
    .in("status", ["confirmado", "desconto_automatico"])
    .in("task_id", obrigatoriasIds.length > 0 ? obrigatoriasIds : ["00000000-0000-0000-0000-000000000000"]);
  if (eventos30ProprioError) console.error("Erro ao buscar eventos dos últimos 30 dias:", eventos30ProprioError.message);

  const ganhoLiquido30 = (eventos30DiasProprioRaw ?? []).reduce((acc, e) => acc + Number(e.valor), 0);
  const diasDesdeCriacaoPerfil = Math.floor(
    (Date.now() - new Date(profile.created_at).getTime()) / (24 * 60 * 60 * 1000)
  );
  const nivel = calcularNivel(ganhoLiquido30, potencial30Dias, diasDesdeCriacaoPerfil);

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
    .select("valor, data")
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

  // Somatório das tarefas (obrigatórias + coletivas) em quatro janelas de
  // tempo, mostrado com filtro na aba "Histórico de Atividades" do menino.
  // Reaproveita a consulta acima, que já traz todos os eventos dele desde
  // sempre — descontos entram negativos, então o número sai líquido.
  const inicioSemanaProprio = inicioDaSemana(today);
  const totaisAtividades: TotaisAtividades = { hoje: 0, semana: 0, mes: 0, total: 0 };
  for (const evento of eventosConfirmadosTotal ?? []) {
    const valorEvento = Number(evento.valor);
    totaisAtividades.total += valorEvento;
    if (evento.data >= inicioMes) totaisAtividades.mes += valorEvento;
    if (evento.data >= inicioSemanaProprio) totaisAtividades.semana += valorEvento;
    if (evento.data === today) totaisAtividades.hoje += valorEvento;
  }

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
      nivelBadge={<NivelBadge info={nivel} />}
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
        totaisAtividades={totaisAtividades}
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
  nivelBadge,
}: {
  title: string;
  children: React.ReactNode;
  onLogout: () => void;
  onTrocarPerfil: () => void;
  pinButton?: React.ReactNode;
  emojiButton?: React.ReactNode;
  mensagemPin?: { texto: string; tipo: "erro" | "sucesso" };
  nivelBadge?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen p-4 max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
      <header className="flex items-center justify-between gap-3 mb-4">
        <p className="text-2xl font-bold text-slate-400 min-w-0">🏠 Missão Casa</p>

        <MenuPerfil>
          {emojiButton && <ItemMenu>{emojiButton}</ItemMenu>}
          {pinButton && <ItemMenu>{pinButton}</ItemMenu>}
          <ItemMenu>
            <form action={onTrocarPerfil}>
              <BotaoAcao className="text-sm text-slate-300 hover:text-white w-full text-left" carregando="trocando…">
                trocar perfil
              </BotaoAcao>
            </form>
          </ItemMenu>
          <ItemMenu>
            <form action={onLogout}>
              <BotaoAcao className="text-sm text-red-400 hover:text-red-300 w-full text-left" carregando="saindo…">
                sair
              </BotaoAcao>
            </form>
          </ItemMenu>
        </MenuPerfil>
      </header>

      <h1 className="text-xl font-bold flex items-center gap-2 mb-6 min-w-0">
        {title}
        {nivelBadge}
      </h1>
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
