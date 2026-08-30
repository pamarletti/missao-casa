"use client";

import { useState, useEffect } from "react";
import { markOrRequest, markColetivaDone, cancelarPropriaMarcacao } from "@/app/app/[profileId]/actions";
import { inicioDaJanela } from "@/lib/periodos";
import { iconeTarefa } from "@/lib/iconeTarefa";
import { ocorrenciasPorMes, ocorrenciasPorSemana } from "@/lib/valorBase";
import TabBar from "@/components/TabBar";
import Atividades, { type AtividadeItem } from "@/components/Atividades";
import TotaisAtividadesCard, { type TotaisAtividades } from "@/components/TotaisAtividades";
import ListaAgrupada from "@/components/ListaAgrupada";
import ListaPorArea from "@/components/ListaPorArea";
import { ehObrigatoria } from "@/lib/dimensoes";
import SecaoExpansivel, { useSecoesExpansiveis } from "@/components/SecaoExpansivel";
import { BotaoAcao, BotaoDireto } from "@/components/Carregando";

// Recife não observa horário de verão: UTC-3 o ano todo (mesma lógica da
// rotina de desconto automático em src/app/api/cron/desconto/route.ts).
const OFFSET_RECIFE_MS = 3 * 60 * 60 * 1000;

function somaDiasISO(dataISO: string, dias: number): string {
  const d = new Date(dataISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function formatTempoRestante(ms: number): string {
  if (ms <= 0) return "encerrando...";
  const totalMinutos = Math.floor(ms / 60000);
  const dias = Math.floor(totalMinutos / (60 * 24));
  const horas = Math.floor((totalMinutos % (60 * 24)) / 60);
  const minutos = totalMinutos % 60;
  if (dias > 0) return `${dias}d ${horas}h ${minutos}min`;
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${minutos}min`;
}

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  subcategoria: string | null;
  frequencia: string;
  valor_unitario: number;
  ocorrencias_por_dia: number;
  pula_fim_de_semana: boolean;
  icone: string | null;
  tipo: string | null;
  finalidade: string | null;
  comodo: string | null;
  profile_ids: string[] | null;
};

type EventoMes = {
  id: string;
  task_id: string;
  status: string;
  valor: number;
  data: string;
};

const CATEGORIA_LABEL: Record<string, string> = {
  individual: "Suas tarefas",
  individual_coletiva: "Seu espaço compartilhado",
  coletiva: "Tarefas de bônus",
};

// Obrigatórias sempre antes das coletivas (bônus), quando o catálogo é
// mostrado agrupado por categoria (aba "Catálogo Completo").
const ORDEM_CATEGORIA: Record<string, number> = {
  individual: 0,
  individual_coletiva: 1,
  coletiva: 2,
};

const TABS = [
  { key: "inicio", label: "Início" },
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Esta semana" },
  { key: "coletivas", label: "Bônus" },
  { key: "catalogo", label: "Catálogo Completo" },
  { key: "atividades", label: "Histórico de Atividades" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Frase curta no topo de cada aba, explicando pro menino o que ele está
 * vendo ali. A aba Início não tem — os próprios cards já se explicam. */
function TextoDaAba({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400 mb-4">{children}</p>;
}

export default function CriancaDashboard({
  nome,
  familyId,
  today,
  catalog,
  eventosMes,
  atividades,
  saldoAtual,
  ganhosAtual,
  descontosAtual,
  desdeInicio,
  feitasMes,
  naoFeitasMes,
  totaisAtividades,
  numCriancas,
}: {
  nome: string;
  familyId: string;
  today: string;
  catalog: Tarefa[];
  eventosMes: EventoMes[];
  atividades: AtividadeItem[];
  saldoAtual: number;
  ganhosAtual: number;
  descontosAtual: number;
  desdeInicio: string;
  feitasMes: number;
  naoFeitasMes: number;
  totaisAtividades: TotaisAtividades;
  numCriancas: number;
}) {
  const [tab, setTab] = useState<TabKey>("inicio");
  const { abertas: secoesAbertas, alternar: alternarSecao } = useSecoesExpansiveis();

  // Relógio ao vivo (atualiza a cada 30s) pra contagem regressiva do fim do
  // dia e do fim da semana funcionar sozinha na tela, sem precisar recarregar.
  const [agora, setAgora] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Horário e dia da semana reais de Recife (mesma lógica da rotina de
  // desconto automático), usados tanto na contagem regressiva quanto para
  // saber se hoje é sexta ou sábado — dias em que "cuidar da roupa da
  // escola" e "arrumar a mochila" não valem (não tem aula).
  const agoraRecifeMs = agora.getTime() - OFFSET_RECIFE_MS;
  const hojeRecife = new Date(agoraRecifeMs).toISOString().slice(0, 10);
  const diaDaSemanaRecife = new Date(agoraRecifeMs).getUTCDay(); // 0 = domingo, 1 = segunda
  const ehSextaOuSabado = diaDaSemanaRecife === 5 || diaDaSemanaRecife === 6;

  /** Todos os registros daquela tarefa na janela atual — hoje, pras
   * diárias; a semana corrente, pras semanais. */
  function eventosDaJanela(taskId: string, frequencia: string) {
    const janela = inicioDaJanela(frequencia, today);
    return eventosMes.filter((e) => e.task_id === taskId && e.data >= janela);
  }

  /** Estados em que o pedido ainda está correndo: ou esperando o
   * responsável decidir, ou já liberado esperando o menino fazer. */
  const EM_ANDAMENTO = ["aguardando_autorizacao", "liberada", "aguardando_confirmacao"];

  /** Quantas vezes a tarefa ainda pode ser marcada agora.
   *
   * OBRIGATÓRIAS têm cota por janela: as que acontecem várias vezes por dia
   * (lavar a louça e pôr a mesa são 3× ao dia, lavar panelas 2×) voltam pra
   * lista depois de cada marcação, até completarem as vezes do dia — é o
   * `ocorrencias_por_dia` do catálogo, o mesmo número usado pra calcular
   * quanto a tarefa rende por mês. "Não feito" e "pedido para refazer" não
   * ocupam vaga: enquanto a janela não virar, ainda dá tempo de fazer.
   *
   * COLETIVAS não têm cota nenhuma. Quem define o ritmo delas é o
   * responsável, que autoriza (ou não) cada pedido — então, assim que uma é
   * confirmada, ela volta pra lista com "Quero fazer", sem esperar o dia ou
   * a semana virar. O único momento em que ela some da lista é enquanto um
   * pedido está em andamento. */
  function vagasRestantes(t: Tarefa) {
    const eventos = eventosDaJanela(t.id, t.frequencia);

    if (t.categoria === "coletiva") {
      const emAndamento = eventos.filter((e) => EM_ANDAMENTO.includes(e.status)).length;
      return { total: 1, ocupadas: emAndamento, vagas: emAndamento > 0 ? 0 : 1 };
    }

    const total = t.frequencia === "diaria" ? t.ocorrencias_por_dia || 1 : 1;
    const ocupadas = eventos.filter(
      (e) => !["nao_feito", "pedido_para_refazer"].includes(e.status)
    ).length;
    return { total, ocupadas, vagas: Math.max(0, total - ocupadas) };
  }

  /** A tarefa ainda aceita ser marcada nesta janela? */
  function aindaDaTempo(t: Tarefa) {
    return vagasRestantes(t).vagas > 0;
  }

  function TarefaRow({ t }: { t: Tarefa }) {
    const eventos = eventosDaJanela(t.id, t.frequencia);
    const { total, ocupadas, vagas } = vagasRestantes(t);

    // Coletiva já autorizada, esperando o "Feito" do menino.
    const liberada = eventos.find((e) => e.status === "liberada");
    // Marcação dele que ainda está na mão do responsável (dá pra cancelar).
    const esperando = eventos.find((e) =>
      ["aguardando_confirmacao", "aguardando_autorizacao"].includes(e.status)
    );
    const naoFeito = eventos.some((e) => e.status === "nao_feito");
    const pedidoRefazer = eventos.some((e) => e.status === "pedido_para_refazer");
    const confirmadas = eventos.filter((e) => e.status === "confirmado").length;

    return (
      <li className="card p-3 flex flex-col items-center text-center gap-1 h-full">
        <span className="text-3xl">{iconeTarefa(t)}</span>
        <p className="font-medium text-sm leading-tight">{t.name}</p>
        <p className="text-xs text-slate-400">
          R$ {Number(t.valor_unitario).toFixed(2)}
          {total > 1 && <span className="text-slate-500"> · {total}× por dia</span>}
        </p>

        <div className="flex flex-col items-center gap-1 mt-auto pt-1 w-full">
          {total > 1 && (
            <span className="text-xs text-slate-400">
              {ocupadas} de {total} hoje
            </span>
          )}

          {naoFeito && <span className="text-xs text-amber-400">não feito — ainda dá tempo!</span>}
          {pedidoRefazer && <span className="text-xs text-amber-400">pedido para refazer</span>}

          {liberada && (
            <form action={markColetivaDone.bind(null, liberada.id)} className="w-full">
              <BotaoAcao className="btn-primary text-xs w-full">Feito</BotaoAcao>
            </form>
          )}

          {!liberada && vagas > 0 && (
            <form action={markOrRequest.bind(null, t.id, familyId)} className="w-full">
              <BotaoAcao
                className={(t.categoria === "coletiva" ? "btn-secondary" : "btn-primary") + " text-xs w-full"}
              >
                {t.categoria === "coletiva" ? "Quero fazer" : "Feito"}
              </BotaoAcao>
            </form>
          )}

          {esperando && (
            <>
              <span className="text-xs text-amber-400">
                {esperando.status === "aguardando_autorizacao" ? "esperando liberação" : "aguardando confirmação"}
              </span>
              <BotaoDireto
                className="text-xs text-slate-500 underline disabled:opacity-40"
                acao={() => cancelarPropriaMarcacao(esperando.id)}
              >
                cancelar
              </BotaoDireto>
            </>
          )}

          {t.categoria === "coletiva" && confirmadas > 0 && (
            <span className="text-xs text-green-400">
              {confirmadas === 1 ? "feita 1× ✓" : `feita ${confirmadas}× ✓`}
            </span>
          )}

          {t.categoria !== "coletiva" && vagas === 0 && !esperando && !liberada && confirmadas > 0 && (
            <span className="text-xs text-green-400">
              {total > 1 ? "tudo feito hoje ✓" : "confirmado ✓"}
            </span>
          )}
        </div>
      </li>
    );
  }

  /** Lista de Hoje / Esta semana: agrupada por categoria (as tarefas só
   * suas, as do espaço compartilhado, as da família), com as seções já
   * abertas — é a lista do dia, o menino precisa ver na hora. O Bônus e o
   * Catálogo Completo usam o ListaAgrupada, que deixa escolher por qual
   * classificação agrupar. */
  function Catalogo({
    tarefas,
    aba,
  }: {
    tarefas: Tarefa[];
    /** Prefixo da chave: cada aba lembra as próprias categorias abertas. */
    aba: string;
  }) {
    if (tarefas.length === 0) return <p className="text-slate-400 text-sm">Nada por aqui.</p>;

    const grupos = new Map<string, Tarefa[]>();
    for (const t of tarefas) {
      const chave = CATEGORIA_LABEL[t.categoria] ?? t.categoria;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(t);
    }

    const categoriaDoTitulo = (titulo: string) =>
      Object.entries(CATEGORIA_LABEL).find(([, label]) => label === titulo)?.[0] ?? titulo;
    const entradas = Array.from(grupos.entries()).sort(
      (a, b) => (ORDEM_CATEGORIA[categoriaDoTitulo(a[0])] ?? 99) - (ORDEM_CATEGORIA[categoriaDoTitulo(b[0])] ?? 99)
    );

    return (
      <>
        {entradas.map(([titulo, tarefasDoGrupo]) => {
          const chave = `${aba}:${titulo}`;
          // O padrão de cada aba vale até a pessoa clicar: a partir daí a
          // escolha dela é que manda (a chave passa a existir no conjunto).
          const aberta = !secoesAbertas.has(chave);

          return (
            <SecaoExpansivel
              key={titulo}
              titulo={titulo}
              contagem={tarefasDoGrupo.length}
              aberta={aberta}
              onAlternar={() => alternarSecao(chave)}
            >
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {tarefasDoGrupo.map((t) => (
                  <TarefaRow key={t.id} t={t} />
                ))}
              </ul>
            </SecaoExpansivel>
          );
        })}
      </>
    );
  }

  const pendentesProprios = eventosMes.filter((e) =>
    ["aguardando_autorizacao", "aguardando_confirmacao"].includes(e.status)
  );
  const valorPendente = pendentesProprios.reduce((acc, e) => acc + Number(e.valor), 0);

  // Progresso e projeção: quanto dá pra ganhar fazendo tudo que é
  // obrigatório (individual + individual-coletiva — as coletivas são
  // bônus à parte, sem obrigação nem teto). Tarefas diárias que não valem
  // na sexta/sábado (ex.: mochila, roupa da escola) só entram na conta de
  // "hoje" quando hoje é um dia em que elas realmente valem.
  const obrigatorias = catalog.filter((t) => t.categoria !== "coletiva");
  const obrigatoriasHoje = obrigatorias.filter((t) => !(t.pula_fim_de_semana && ehSextaOuSabado));
  const potencialDia = obrigatoriasHoje
    .filter((t) => t.frequencia === "diaria")
    .reduce((acc, t) => acc + Number(t.valor_unitario) * (t.ocorrencias_por_dia || 1), 0);
  const potencialSemana = obrigatorias.reduce((acc, t) => acc + Number(t.valor_unitario) * ocorrenciasPorSemana(t), 0);
  const potencialMes = obrigatorias.reduce((acc, t) => acc + Number(t.valor_unitario) * ocorrenciasPorMes(t), 0);

  const idsObrigatorias = new Set(obrigatorias.map((t) => t.id));
  // Só conta no progresso do dia o que já foi confirmado pelo responsável —
  // uma marcação ainda "aguardando confirmação" não mexe na barra.
  const feitoHoje = eventosMes
    .filter((e) => e.data === today && idsObrigatorias.has(e.task_id) && e.status === "confirmado")
    .reduce((acc, e) => acc + Number(e.valor), 0);
  const progressoPct = potencialDia > 0 ? Math.min(100, (feitoHoje / potencialDia) * 100) : 0;

  // Progresso do mês: só o que já foi confirmado (mais os descontos
  // automáticos, que tiram valor quando a tarefa fica em silêncio total) —
  // uma marcação ainda esperando confirmação não move a barra.
  const obrigatoriasFeitasMes = eventosMes
    .filter((e) => idsObrigatorias.has(e.task_id) && ["confirmado", "desconto_automatico"].includes(e.status))
    .reduce((acc, e) => acc + Number(e.valor), 0);
  const progressoMesPct = potencialMes > 0 ? Math.min(100, Math.max(0, (obrigatoriasFeitasMes / potencialMes) * 100)) : 0;
  const faltaMes = Math.max(0, potencialMes - obrigatoriasFeitasMes);
  const metaMesBatida = potencialMes > 0 && obrigatoriasFeitasMes >= potencialMes;

  // Bônus extra: quanto as tarefas coletivas (bônus, sem teto) dariam a
  // mais por mês, em média por criança — dividido pelo número de meninos
  // da família, já que as coletivas são feitas e repartidas entre eles.
  const coletivas = catalog.filter((t) => t.categoria === "coletiva");
  const coletivasDia = coletivas
    .filter((t) => t.frequencia === "diaria")
    .reduce((acc, t) => acc + Number(t.valor_unitario) * (t.ocorrencias_por_dia || 1), 0);
  const coletivasSemana = coletivas
    .filter((t) => t.frequencia === "semanal")
    .reduce((acc, t) => acc + Number(t.valor_unitario), 0);
  const coletivasMensal = coletivas
    .filter((t) => t.frequencia === "mensal")
    .reduce((acc, t) => acc + Number(t.valor_unitario), 0);
  const coletivasTotalMes = coletivasDia * 30 + coletivasSemana * 4 + coletivasMensal;
  const divisorCriancas = numCriancas > 0 ? numCriancas : 1;
  const bonusExtraDia = coletivasDia / divisorCriancas;
  const bonusExtraSemana = (coletivasDia * 7 + coletivasSemana) / divisorCriancas;
  const bonusExtraMes = coletivasTotalMes / divisorCriancas;

  // Contagem regressiva pro fim do dia e pro fim da semana (segunda a
  // domingo), calculada a partir do horário real de Recife — igual à
  // rotina de desconto automático — e não do fuso do aparelho de quem
  // está usando o app.
  const amanhaRecife = somaDiasISO(hojeRecife, 1);
  const msAteFimDoDia = new Date(amanhaRecife + "T03:00:00Z").getTime() - agora.getTime();

  let diasAteFimDaSemana = (1 - diaDaSemanaRecife + 7) % 7;
  if (diasAteFimDaSemana === 0) diasAteFimDaSemana = 7;
  const proximaSegundaRecife = somaDiasISO(hojeRecife, diasAteFimDaSemana);
  const msAteFimDaSemana = new Date(proximaSegundaRecife + "T03:00:00Z").getTime() - agora.getTime();

  // Quanto vai ser descontado se as obrigatórias de hoje/desta semana
  // continuarem sem nenhuma marcação até o prazo — mesma regra de
  // ainda não foram feitas — inclusive as marcadas como "não feito", que
  // continuam valendo enquanto a janela não virar. Tarefas que não valem
  // hoje (sexta/sábado, pra quem pula fim de semana) nunca entram aqui.
  const diariasEmRisco = obrigatoriasHoje.filter((t) => t.frequencia === "diaria" && aindaDaTempo(t));
  const valorEmRiscoHoje = diariasEmRisco.reduce(
    (acc, t) => acc + Number(t.valor_unitario) * (t.ocorrencias_por_dia || 1),
    0
  );

  const semanaisEmRisco = obrigatorias.filter((t) => t.frequencia === "semanal" && aindaDaTempo(t));
  const valorEmRiscoSemana = semanaisEmRisco.reduce((acc, t) => acc + Number(t.valor_unitario), 0);

  // "Tem um tempinho?": até 4 sugestões de tarefas rápidas pra fazer agora,
  // priorizando obrigatórias diárias, depois semanais, depois coletivas.
  // Só entram tarefas com alguma ação disponível nesse momento — sem
  // nenhuma marcação ainda, ou coletivas já liberadas esperando só o
  // "Feito" — nunca as que já foram feitas ou já estão decididas.
  const coletivasSugeridas = coletivas.filter(
    (t) => aindaDaTempo(t) || eventosDaJanela(t.id, t.frequencia).some((e) => e.status === "liberada")
  );
  const sugestoesTempinho = [...diariasEmRisco, ...semanaisEmRisco, ...coletivasSugeridas].slice(0, 4);

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "inicio" && (
        <>
          <div className="card mb-4">
            <p className="text-slate-400 text-sm">Saldo disponível para {nome}</p>
            <p className="text-3xl font-bold text-casa-accent">R$ {saldoAtual.toFixed(2)}</p>

            <div className="flex justify-between text-center mt-3 pt-3 border-t border-slate-700">
              <div>
                <p className="text-xs text-slate-400">Ganhos</p>
                <p className="font-semibold text-green-400">R$ {ganhosAtual.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Descontos</p>
                <p className="font-semibold text-red-400">-R$ {descontosAtual.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Desde o início em</p>
                <p className="font-semibold">{desdeInicio}</p>
              </div>
            </div>
          </div>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">🙌 Tem um tempinho? Aí vão algumas sugestões:</h2>
            {sugestoesTempinho.length > 0 ? (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sugestoesTempinho.map((t) => (
                  <TarefaRow key={t.id} t={t} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-400">Você já deu conta de tudo por enquanto! 🎉</p>
            )}
          </section>

          <div className="card mb-4">
            <p className="text-sm text-slate-400 mb-3">⏰ Tempo restante</p>

            <div className="flex justify-between items-center gap-3">
              <div>
                <p className="font-medium">Hoje</p>
                <p className="text-xs text-slate-400">{formatTempoRestante(msAteFimDoDia)} até meia-noite</p>
              </div>
              {valorEmRiscoHoje > 0 ? (
                <p className="text-sm font-bold text-red-400 text-right shrink-0">
                  -R$ {valorEmRiscoHoje.toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-green-400 text-right shrink-0">tudo em dia ✓</p>
              )}
            </div>

            <div className="flex justify-between items-center gap-3 mt-3 pt-3 border-t border-slate-700">
              <div>
                <p className="font-medium">Esta semana</p>
                <p className="text-xs text-slate-400">{formatTempoRestante(msAteFimDaSemana)} até o fim</p>
              </div>
              {valorEmRiscoSemana > 0 ? (
                <p className="text-sm font-bold text-red-400 text-right shrink-0">
                  -R$ {valorEmRiscoSemana.toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-green-400 text-right shrink-0">tudo em dia ✓</p>
              )}
            </div>

            {(valorEmRiscoHoje > 0 || valorEmRiscoSemana > 0) && (
              <p className="text-xs text-slate-500 mt-3">
                É o quanto você deixa de ganhar se não fizer as tarefas obrigatórias até o prazo.
              </p>
            )}
          </div>

          <div className="card mb-4">
            <div className="flex justify-between text-sm text-slate-400 mb-1">
              <span>Progresso de hoje</span>
              <span>
                R$ {feitoHoje.toFixed(2)} / R$ {potencialDia.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-casa-accent h-3 rounded-full transition-all"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
          </div>

          <div className="card mb-4">
            <div className="flex justify-between text-sm text-slate-400 mb-1">
              <span>Progresso do mês</span>
              <span>
                R$ {obrigatoriasFeitasMes.toFixed(2)} / R$ {potencialMes.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-casa-accent h-3 rounded-full transition-all"
                style={{ width: `${progressoMesPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {metaMesBatida
                ? "Você já garantiu o valor cheio do mês! 🎉"
                : `Faltam R$ ${faltaMes.toFixed(2)} para completar o mês fazendo as obrigatórias.`}
            </p>
          </div>

          <div className="card mb-6 flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">{feitasMes}</p>
              <p className="text-xs text-slate-400">feitas no mês</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{naoFeitasMes}</p>
              <p className="text-xs text-slate-400">não feitas no mês</p>
            </div>
          </div>

          <div className="card mb-6">
            <p className="text-sm text-slate-400 mb-2">Se fizer tudo que é obrigatório, dá pra chegar a:</p>
            <div className="flex justify-around text-center">
              <div>
                <p className="font-bold text-casa-accent">R$ {potencialDia.toFixed(2)}</p>
                <p className="text-xs text-slate-400">hoje</p>
              </div>
              <div>
                <p className="font-bold text-casa-accent">R$ {potencialSemana.toFixed(2)}</p>
                <p className="text-xs text-slate-400">essa semana</p>
              </div>
              <div>
                <p className="font-bold text-casa-accent">R$ {potencialMes.toFixed(2)}</p>
                <p className="text-xs text-slate-400">esse mês</p>
              </div>
            </div>
          </div>

          <div className="card mb-6">
            <p className="text-sm text-slate-400 mb-2">Ainda dá para ganhar bônus sem limite:</p>
            <div className="flex justify-around text-center">
              <div>
                <p className="font-bold text-green-400">R$ {bonusExtraDia.toFixed(2)}</p>
                <p className="text-xs text-slate-400">por dia</p>
              </div>
              <div>
                <p className="font-bold text-green-400">R$ {bonusExtraSemana.toFixed(2)}</p>
                <p className="text-xs text-slate-400">por semana</p>
              </div>
              <div>
                <p className="font-bold text-green-400">R$ {bonusExtraMes.toFixed(2)}</p>
                <p className="text-xs text-slate-400">por mês</p>
              </div>
            </div>
          </div>

          <section className="mb-6">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-lg font-semibold">Confirmações e autorizações pendentes</h2>
              {pendentesProprios.length > 0 && (
                <span className="text-sm font-semibold text-amber-400 shrink-0">
                  R$ {valorPendente.toFixed(2)} pendente
                </span>
              )}
            </div>
            {pendentesProprios.length > 0 ? (
              <ul className="space-y-2">
                {pendentesProprios.map((e) => {
                  const tarefa = catalog.find((t) => t.id === e.task_id);
                  return (
                    <li key={e.id} className="card flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{tarefa?.name ?? "Tarefa"}</p>
                        <p className="text-sm text-amber-400">
                          {e.status === "aguardando_autorizacao" ? "esperando liberação" : "aguardando confirmação"}
                        </p>
                      </div>
                      <BotaoDireto
                        className="text-xs text-slate-500 underline shrink-0 disabled:opacity-40"
                        acao={() => cancelarPropriaMarcacao(e.id)}
                      >
                        cancelar
                      </BotaoDireto>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-green-400">Tudo confirmado e autorizado por aqui! ✓</p>
            )}
          </section>
        </>
      )}

      {tab === "hoje" && (
        <>
          <TextoDaAba>Essas são suas tarefas obrigatórias para fazer ainda hoje.</TextoDaAba>
          <Catalogo
            tarefas={catalog.filter(
              (t) =>
                ehObrigatoria(t) &&
                t.frequencia === "diaria" &&
                !(t.pula_fim_de_semana && ehSextaOuSabado)
            )}
            aba="hoje"
          />
        </>
      )}

      {tab === "semana" && (
        <>
          <TextoDaAba>Essas são suas tarefas obrigatórias para fazer até o fim da semana.</TextoDaAba>
          <Catalogo
            tarefas={catalog.filter((t) => ehObrigatoria(t) && t.frequencia === "semanal")}
            aba="semana"
          />
        </>
      )}

      {tab === "coletivas" && (
        <>
          <TextoDaAba>Essas são tarefas que você pode fazer que vão garantir uma grana extra.</TextoDaAba>
          <ListaPorArea
            tarefas={catalog.filter((t) => !ehObrigatoria(t))}
            renderItem={(t) => <TarefaRow t={t} />}
          />
        </>
      )}

      {tab === "catalogo" && (
        <>
          <TextoDaAba>Aqui está a lista de todas as tarefas.</TextoDaAba>
          <ListaAgrupada tarefas={catalog} chaveAba="catalogo" renderItem={(t) => <TarefaRow t={t} />} />
        </>
      )}

      {tab === "atividades" && (
        <>
          <TextoDaAba>Aqui está a lista de tudo o que já aconteceu nessa missão.</TextoDaAba>
          <TotaisAtividadesCard totais={totaisAtividades} />
          <Atividades itens={atividades} permitirDesfazer={false} />
        </>
      )}
    </div>
  );
}
