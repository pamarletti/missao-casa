/** Trocas de tarefa entre as crianças.
 *
 * Uma criança pode pedir que a outra faça uma tarefa obrigatória dela. Se a
 * outra aceitar, a tarefa passa a ser responsabilidade dela NAQUELE período
 * — some da lista de quem pediu, aparece na de quem aceitou, e o crédito
 * vai pra quem fizer.
 *
 * Vale uma ocorrência de cada vez, e só do período corrente (o dia, pras
 * diárias; a semana, pras semanais; o mês, pras mensais). Quando o período
 * vira, tudo volta ao normal sozinho — nada precisa ser desfeito, do mesmo
 * jeito que o rodízio das compartilhadas não guarda estado.
 *
 * Este arquivo é a fonte única da conta "quantas vezes ESTA criança deve
 * fazer ESTA tarefa neste período". Tela e servidor usam a mesma função,
 * pra nunca discordarem: se o painel do menino mostra o botão, o servidor
 * aceita a marcação; se não mostra, o servidor recusa. */

import { inicioDaJanela } from "./periodos";
import { ehAVezDaCrianca } from "./dimensoes";

export type PedidoDeTroca = {
  id: string;
  task_id: string;
  de_profile_id: string;
  para_profile_id: string;
  /** Início da janela da tarefa: o dia, a segunda-feira, ou o dia 1. */
  periodo: string;
  status: string;
};

type TarefaTrocavel = {
  id: string;
  frequencia: string;
  ocorrencias_por_dia?: number | null;
  finalidade?: string | null;
  profile_ids?: string[] | null;
};

/** Quantas vezes a tarefa acontece num período, pra quem é dono dela: o
 * `ocorrencias_por_dia` das diárias (lavar a louça é 3×), 1 nas outras. */
export function ocorrenciasDoPeriodo(t: TarefaTrocavel): number {
  return t.frequencia === "diaria" ? t.ocorrencias_por_dia || 1 : 1;
}

/** Aplica as trocas já aceitas sobre um número de vezes de partida: cada
 * pedido aceito tira uma vez de quem pediu e dá uma vez a quem aceitou. */
function comTrocas(
  base: number,
  t: TarefaTrocavel,
  profileId: string,
  dataISO: string,
  pedidos: PedidoDeTroca[]
): number {
  const periodo = inicioDaJanela(t.frequencia, dataISO);
  const doPeriodo = pedidos.filter(
    (p) => p.task_id === t.id && p.periodo === periodo && p.status === "aceito"
  );
  const passadas = doPeriodo.filter((p) => p.de_profile_id === profileId).length;
  const recebidas = doPeriodo.filter((p) => p.para_profile_id === profileId).length;
  return Math.max(0, base - passadas + recebidas);
}

/** Quantas vezes esta criança deve fazer esta tarefa neste período, já
 * considerando o rodízio das compartilhadas E as trocas aceitas.
 *
 * Zero significa "não é com ela": ou a tarefa não é dela, ou não é a vez
 * dela hoje, ou ela passou a vez adiante. É este número que decide se a
 * tarefa aparece nas abas Hoje / Esta semana, se entra no "valor em risco",
 * se conta como atrasada e quantas marcações o servidor aceita. */
export function vezesNoPeriodo(
  t: TarefaTrocavel,
  profileId: string,
  todasAsCriancas: string[],
  dataISO: string,
  inicioDaSemanaISO: (d: string) => string,
  pedidos: PedidoDeTroca[]
): number {
  const ehDela = ehAVezDaCrianca(t, profileId, todasAsCriancas, dataISO, inicioDaSemanaISO);
  return comTrocas(ehDela ? ocorrenciasDoPeriodo(t) : 0, t, profileId, dataISO, pedidos);
}

/** Igual à de cima, mas sem o rodízio — usada quando é o RESPONSÁVEL quem
 * registra direto pela aba Pendências. Ele pode lançar um "feito" pra
 * qualquer criança, mesmo fora da vez dela (o menino ajudou o irmão, a
 * escala mudou no meio do dia): quem manda ali é o adulto, não a regra. */
export function vezesNoPeriodoSemRodizio(
  t: TarefaTrocavel,
  profileId: string,
  dataISO: string,
  pedidos: PedidoDeTroca[]
): number {
  return comTrocas(ocorrenciasDoPeriodo(t), t, profileId, dataISO, pedidos);
}

/** Os pedidos que ainda valem agora: os do período corrente de cada tarefa.
 * A consulta traz uma janela larga (pra cobrir semanais e mensais de uma
 * vez só), então a tela filtra o que sobrou de períodos que já viraram. */
export function pedidosVigentes(
  pedidos: PedidoDeTroca[],
  catalogo: { id: string; frequencia: string }[],
  hojeISO: string
): PedidoDeTroca[] {
  return pedidos.filter((p) => {
    const t = catalogo.find((x) => x.id === p.task_id);
    return t ? p.periodo === inicioDaJanela(t.frequencia, hojeISO) : false;
  });
}
