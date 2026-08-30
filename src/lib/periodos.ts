/** Helpers de janela de tempo — decidem, pra cada tarefa, a partir de
 * quando um evento antigo ainda "vale" pro status atual dela, de acordo
 * com a frequência (diária reseta todo dia, semanal toda semana, mensal
 * todo mês). */

/** Recife não observa horário de verão: UTC-3 o ano todo. */
const OFFSET_RECIFE_MS = 3 * 60 * 60 * 1000;

/** A data de um momento qualquer, no fuso de Recife (YYYY-MM-DD). */
export function dataEmRecife(momento: Date): string {
  return new Date(momento.getTime() - OFFSET_RECIFE_MS).toISOString().slice(0, 10);
}

/** A data de hoje em Recife.
 *
 * O app INTEIRO precisa usar esta função em vez de `new Date()` direto: o
 * servidor roda em UTC, que está 3 horas à frente. Com UTC, o dia virava
 * às 21h de Recife — uma tarefa diária feita às 19h voltava pra lista de
 * "Hoje" às 21h da mesma noite, e as semanais reiniciavam no domingo à
 * noite em vez da segunda de manhã. */
export function hojeEmRecife(): string {
  return dataEmRecife(new Date());
}

export function inicioDaSemana(hojeISO: string): string {
  const d = new Date(hojeISO + "T00:00:00Z");
  const dia = d.getUTCDay(); // 0 = domingo, 1 = segunda...
  const offset = dia === 0 ? 6 : dia - 1; // dias desde a última segunda-feira
  d.setUTCDate(d.getUTCDate() - offset);
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
