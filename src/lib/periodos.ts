/** Helpers de janela de tempo — decidem, pra cada tarefa, a partir de
 * quando um evento antigo ainda "vale" pro status atual dela, de acordo
 * com a frequência (diária reseta todo dia, semanal toda semana, mensal
 * todo mês). */

export function inicioDaSemana(hojeISO: string): string {
  const d = new Date(hojeISO + "T00:00:00");
  const dia = d.getDay(); // 0 = domingo, 1 = segunda...
  const offset = dia === 0 ? 6 : dia - 1; // dias desde a última segunda-feira
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

export function inicioDoMes(hojeISO: string): string {
  return hojeISO.slice(0, 8) + "01";
}

export function inicioDaJanela(frequencia: string, hojeISO: string): string {
  if (frequencia === "semanal") return inicioDaSemana(hojeISO);
  if (frequencia === "mensal") return inicioDoMes(hojeISO);
  return hojeISO; // diária
}

/** Data ISO de N dias atrás — usado pra janelas móveis (ex.: os últimos
 * 30 dias, pro nível de constância), diferente de inicioDoMes/inicioDaSemana
 * que são "desde o início do período calendário atual". */
export function diasAtras(hojeISO: string, dias: number): string {
  const d = new Date(hojeISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}
