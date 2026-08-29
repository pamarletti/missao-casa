/** Helpers para calcular o valor mensal (e semanal) das tarefas
 * obrigatórias (individuais + individual-coletivas), usados tanto para
 * projetar o potencial de ganho das crianças quanto para o "valor base"
 * que o responsável pode ajustar no Catálogo editável.
 *
 * `pula_fim_de_semana` marca tarefas diárias que não valem na sexta e no
 * sábado (ex.: "cuidar da roupa da escola" e "arrumar a mochila" — não tem
 * aula nesses dois dias, então não tem o que fazer nem o que descontar).
 * Isso faz elas ocorrerem 5x/semana (20x/mês) em vez de 7x/semana (30x/mês). */

export type TarefaValorBase = {
  valor_unitario: number | string;
  frequencia: string;
  ocorrencias_por_dia?: number | null;
  pula_fim_de_semana?: boolean | null;
};

export function ocorrenciasPorMes(t: TarefaValorBase): number {
  if (t.frequencia === "diaria") return (t.ocorrencias_por_dia || 1) * (t.pula_fim_de_semana ? 20 : 30);
  if (t.frequencia === "semanal") return 4;
  if (t.frequencia === "mensal") return 1;
  return 0;
}

export function ocorrenciasPorSemana(t: TarefaValorBase): number {
  if (t.frequencia === "diaria") return (t.ocorrencias_por_dia || 1) * (t.pula_fim_de_semana ? 5 : 7);
  if (t.frequencia === "semanal") return 1;
  return 0; // mensal não entra na projeção semanal
}

export function valorMensalTotal(tarefas: TarefaValorBase[]): number {
  return tarefas.reduce((acc, t) => acc + Number(t.valor_unitario) * ocorrenciasPorMes(t), 0);
}

export function valorSemanalTotal(tarefas: TarefaValorBase[]): number {
  return tarefas.reduce((acc, t) => acc + Number(t.valor_unitario) * ocorrenciasPorSemana(t), 0);
}
