import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Rotina de desconto automático por silêncio — chamada uma vez por dia pelo
 * Vercel Cron (veja vercel.json), sempre por volta da meia-noite em
 * Recife (Vercel roda em algum minuto dentro da hora agendada, não no
 * segundo exato).
 *
 * Regra: só desconta quando NÃO existe nenhum registro para aquela tarefa
 * naquele dia/semana — ou seja, silêncio total. Se o menino marcou e está
 * esperando confirmação, ou se o responsável já decidiu "não feito" /
 * "pedido para refazer" (que já zeram o valor), não desconta de novo.
 *
 * Diárias: ao virar o dia, avalia o dia que acabou de terminar (ontem).
 * Semanais: só às segundas-feiras (semana começa na segunda, por decisão
 * da família), avalia a semana que acabou de terminar (segunda a domingo
 * anteriores).
 *
 * Cada desconto vira uma linha normal em task_events, com
 * status = 'desconto_automatico' e valor negativo — por isso um
 * responsável pode desfazer qualquer um deles a qualquer momento pela aba
 * Atividades, do mesmo jeito que desfaz qualquer outro evento.
 */

// Recife não observa horário de verão: UTC-3 o ano todo.
const OFFSET_RECIFE_HORAS = 3;

function hojeRecife(): string {
  const agora = new Date();
  const recife = new Date(agora.getTime() - OFFSET_RECIFE_HORAS * 60 * 60 * 1000);
  return recife.toISOString().slice(0, 10);
}

function somaDias(dataISO: string, dias: number): string {
  const d = new Date(dataISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diaDaSemanaUTC(dataISO: string): number {
  // 0 = domingo, 1 = segunda, ...
  return new Date(dataISO + "T00:00:00Z").getUTCDay();
}

type Tarefa = {
  id: string;
  family_id: string;
  frequencia: string;
  valor_unitario: number;
  ocorrencias_por_dia: number | null;
};

type Crianca = { id: string; family_id: string };

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const hoje = hojeRecife(); // dia que está começando agora
  const ontem = somaDias(hoje, -1); // dia que acabou de terminar

  const [{ data: criancas }, { data: tarefas }] = await Promise.all([
    supabase.from("profiles").select("id, family_id").eq("kind", "crianca") as unknown as Promise<{ data: Crianca[] | null }>,
    supabase
      .from("task_catalog")
      .select("id, family_id, frequencia, valor_unitario, ocorrencias_por_dia")
      .eq("ativo", true)
      .in("categoria", ["individual", "individual_coletiva"]) as unknown as Promise<{ data: Tarefa[] | null }>,
  ]);

  const listaCriancas = criancas ?? [];
  const listaTarefas = tarefas ?? [];
  const idsCriancas = listaCriancas.map((c) => c.id);

  // ── Diárias: penaliza o silêncio do dia que acabou de terminar ──
  const tarefasDiarias = listaTarefas.filter((t) => t.frequencia === "diaria");
  let descontosDiarios = 0;

  if (idsCriancas.length > 0 && tarefasDiarias.length > 0) {
    const { data: eventosOntem } = await supabase
      .from("task_events")
      .select("profile_id, task_id")
      .eq("data", ontem)
      .in("profile_id", idsCriancas);

    const jaTemRegistro = new Set((eventosOntem ?? []).map((e) => `${e.profile_id}|${e.task_id}`));

    const novos = [];
    for (const crianca of listaCriancas) {
      for (const tarefa of tarefasDiarias) {
        if (tarefa.family_id !== crianca.family_id) continue;
        if (jaTemRegistro.has(`${crianca.id}|${tarefa.id}`)) continue;
        novos.push({
          family_id: tarefa.family_id,
          task_id: tarefa.id,
          profile_id: crianca.id,
          data: ontem,
          status: "desconto_automatico",
          valor: -(Number(tarefa.valor_unitario) * (tarefa.ocorrencias_por_dia || 1)),
          origem: "sistema",
        });
      }
    }
    if (novos.length > 0) {
      const { error } = await supabase.from("task_events").insert(novos);
      if (!error) descontosDiarios = novos.length;
      else console.error("Erro ao inserir descontos diários:", error.message);
    }
  }

  // ── Semanais: só às segundas, penaliza o silêncio da semana anterior ──
  let descontosSemanais = 0;
  const ehSegunda = diaDaSemanaUTC(hoje) === 1;

  if (ehSegunda) {
    const semanaFim = ontem; // domingo
    const semanaInicio = somaDias(semanaFim, -6); // segunda anterior

    const tarefasSemanais = listaTarefas.filter((t) => t.frequencia === "semanal");

    if (idsCriancas.length > 0 && tarefasSemanais.length > 0) {
      const { data: eventosSemana } = await supabase
        .from("task_events")
        .select("profile_id, task_id")
        .gte("data", semanaInicio)
        .lte("data", semanaFim)
        .in("profile_id", idsCriancas);

      const jaTemRegistro = new Set((eventosSemana ?? []).map((e) => `${e.profile_id}|${e.task_id}`));

      const novos = [];
      for (const crianca of listaCriancas) {
        for (const tarefa of tarefasSemanais) {
          if (tarefa.family_id !== crianca.family_id) continue;
          if (jaTemRegistro.has(`${crianca.id}|${tarefa.id}`)) continue;
          novos.push({
            family_id: tarefa.family_id,
            task_id: tarefa.id,
            profile_id: crianca.id,
            data: semanaFim,
            status: "desconto_automatico",
            valor: -Number(tarefa.valor_unitario),
            origem: "sistema",
          });
        }
      }
      if (novos.length > 0) {
        const { error } = await supabase.from("task_events").insert(novos);
        if (!error) descontosSemanais = novos.length;
        else console.error("Erro ao inserir descontos semanais:", error.message);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dia_processado: ontem,
    descontos_diarios: descontosDiarios,
    semana_processada: ehSegunda,
    descontos_semanais: descontosSemanais,
  });
}
