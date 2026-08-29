/** Nível de constância — um retrato de 5 níveis (mais "sem dados
 * suficientes" pra quem acabou de começar) de quanto das tarefas
 * OBRIGATÓRIAS (individual + individual-coletiva; coletivas não entram,
 * são bônus sem meta) cada um cumpriu nos últimos 30 dias.
 *
 * Decisões de propósito (conversa com a Paolla em 29/08/2026):
 * - É só visual/motivacional — não abre nem fecha nenhum privilégio, não
 *   mexe no saldo, não é usado em nenhuma outra regra do app.
 * - 100% automático a partir do que a responsável já decide na revisão
 *   (confirmar / pedir pra refazer / marcar não feito / desconto
 *   automático) — nenhum passo manual novo de "dar nota".
 * - Janela móvel de 30 dias (não desde o início) — reflete "como está
 *   indo agora", não carrega pra sempre um mês ruim que já passou.
 * - Cada perfil é comparado só com o próprio potencial, nunca com o do
 *   irmão — evitar virar disputa/comparação entre os dois.
 * - Perfil muito novo (menos de 7 dias de histórico) não é jogado direto
 *   no nível mais baixo por falta de dado — mostra "ainda conhecendo o
 *   ritmo" até ter uma janela mínima pra avaliar.
 */

export type NivelInfo = {
  /** 1 a 5, ou null quando ainda não há histórico suficiente. */
  nivel: number | null;
  emoji: string;
  label: string;
  /** 0 a 100 — quanto do potencial das obrigatórias foi cumprido (líquido) nos últimos 30 dias. */
  percentual: number;
};

const DIAS_MINIMOS_PARA_NIVEL = 7;

const FAIXAS: { min: number; nivel: number; emoji: string; label: string }[] = [
  { min: 0.9, nivel: 5, emoji: "🏆", label: "Referência lá em casa" },
  { min: 0.75, nivel: 4, emoji: "🌟", label: "Muito de confiança" },
  { min: 0.55, nivel: 3, emoji: "⭐", label: "Consistente" },
  { min: 0.35, nivel: 2, emoji: "🔧", label: "Pegando o ritmo" },
  { min: 0, nivel: 1, emoji: "🌱", label: "Começando agora" },
];

/**
 * @param ganhoLiquido30Dias Soma do `valor` dos task_events das tarefas
 *   obrigatórias confirmadas ou descontadas automaticamente nos últimos
 *   30 dias (descontos, já negativos, sobem naturalmente a conta).
 * @param potencial30Dias Quanto seria possível ganhar nesse período se
 *   100% das obrigatórias tivessem sido cumpridas — na prática, o mesmo
 *   `valorMensalTotal` já usado na barra de progresso do mês.
 * @param diasDesdeCriacaoDoPerfil Dias corridos desde que o perfil foi criado.
 */
export function calcularNivel(
  ganhoLiquido30Dias: number,
  potencial30Dias: number,
  diasDesdeCriacaoDoPerfil: number
): NivelInfo {
  const bruto = potencial30Dias > 0 ? ganhoLiquido30Dias / potencial30Dias : 0;
  const percentual = Math.round(Math.max(0, Math.min(1, bruto)) * 100);

  if (diasDesdeCriacaoDoPerfil < DIAS_MINIMOS_PARA_NIVEL) {
    return { nivel: null, emoji: "🕒", label: "Ainda conhecendo o ritmo", percentual };
  }

  const faixa = FAIXAS.find((f) => percentual / 100 >= f.min) ?? FAIXAS[FAIXAS.length - 1];
  return { nivel: faixa.nivel, emoji: faixa.emoji, label: faixa.label, percentual };
}
