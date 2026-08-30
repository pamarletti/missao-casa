/** As quatro classificações que a planilha "Coeficientes das Tarefas"
 * trouxe, usadas para agrupar as listas do app: em vez de uma única
 * ordem fixa, a pessoa escolhe por qual delas quer ver as tarefas
 * agrupadas, e cada valor vira uma seção expansível.
 *
 * `tipo`, `finalidade` e `comodo` vêm direto do catálogo (colunas criadas
 * na migração 011). `frequencia` é derivada, pra aparecer em bom português.
 * Tarefas antigas, cadastradas antes da 011, podem ter esses campos vazios
 * — daí o "categoria" como plano B e o rótulo "Sem classificação". */

export type TarefaClassificavel = {
  categoria: string;
  subcategoria?: string | null;
  frequencia: string;
  ocorrencias_por_dia?: number | null;
  /** Dias em que a tarefa semanal acontece: 0 = domingo ... 6 = sábado.
   * Nulo ou vazio = uma vez por semana, em qualquer dia. */
  dias_da_semana?: number[] | null;
  tipo?: string | null;
  finalidade?: string | null;
  comodo?: string | null;
};

export type DimensaoKey = "tipo" | "frequencia" | "finalidade" | "comodo";

export const DIMENSOES: { key: DimensaoKey; label: string }[] = [
  { key: "tipo", label: "Tipo" },
  { key: "frequencia", label: "Frequência" },
  { key: "finalidade", label: "Finalidade" },
  { key: "comodo", label: "Cômodo/Área" },
];

const SEM = "Sem classificação";

/** "Obrigatória" / "Facultativa" — o valor cru, como está no banco e na
 * planilha. Com plano B pela categoria, para tarefas cadastradas antes da
 * migração que criou a coluna. */
export function tipoDa(t: TarefaClassificavel): string {
  if (t.tipo) return t.tipo;
  return t.categoria === "coletiva" ? "Facultativa" : "Obrigatória";
}

/** Na tela, "facultativa" vira "bônus": é a palavra que a família usa e que
 * os meninos entendem — diz o que a tarefa é (grana extra), não o que ela
 * deixa de ser. O banco e a planilha seguem com "Facultativa". */
export function tipoLabel(t: TarefaClassificavel): string {
  return tipoDa(t) === "Facultativa" ? "Bônus" : "Obrigatória";
}

export function ehObrigatoria(t: TarefaClassificavel): boolean {
  return tipoDa(t) === "Obrigatória";
}

/** ──────────────────────────────────────────────────────────────
 * O quadro de frequências
 *
 *   diária          — todo dia, 1, 2 ou 3 vezes por dia
 *   semanal         — nos dias marcados; sem dia marcado, uma vez por
 *                     semana, quando der
 *   mensal          — uma vez por mês
 *   não específica  — sem ritmo nenhum, só nas tarefas de bônus
 *
 * A semanal COM dias marcados é, na prática, uma tarefa de dia certo: o
 * prazo dela é o próprio dia, e não o fim da semana. É o que a casa quer
 * dizer com "o banheiro é às quartas" — se era quarta e não foi feito, na
 * quinta está atrasado. Sem dias marcados, a semanal continua valendo a
 * semana inteira, com prazo no domingo à noite.
 * ────────────────────────────────────────────────────────────── */

type TarefaComDias = {
  frequencia: string;
  ocorrencias_por_dia?: number | null;
  dias_da_semana?: number[] | null;
};

/** Os dias em que a tarefa acontece. Lista vazia numa semanal quer dizer
 * "qualquer dia da semana". */
export function diasDaSemana(t: TarefaComDias): number[] {
  if (t.frequencia !== "semanal") return [];
  return t.dias_da_semana ?? [];
}

/** Tem dia certo? É o que separa as duas semanais. */
export function temDiaCerto(t: TarefaComDias): boolean {
  return diasDaSemana(t).length > 0;
}

/** A frequência que vale para efeito de PRAZO.
 *
 * Uma semanal com dias marcados se comporta como diária: a janela dela é o
 * dia. Usar isto no lugar de `t.frequencia` em toda conta de janela é o que
 * mantém tela e servidor de acordo sobre quando a tarefa vira atrasada. */
export function frequenciaEfetiva(t: TarefaComDias): string {
  return t.frequencia === "semanal" && temDiaCerto(t) ? "diaria" : t.frequencia;
}

/** A tarefa vale neste dia da semana? */
export function valeNoDia(t: TarefaComDias, diaDaSemana: number): boolean {
  if (!temDiaCerto(t)) return true;
  return diasDaSemana(t).includes(diaDaSemana);
}

/** Nomes na ordem do getDay do JavaScript, que é a mesma da coluna
 * task_catalog.dias_da_semana. */
export const DIAS_DA_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Versão curta, para caber no cartão: "seg, qui". Vazio quando a tarefa
 * não tem dia marcado. */
export function diasLabel(t: TarefaClassificavel): string {
  const dias = diasDaSemana(t);
  if (dias.length === 0) return "";
  // Da segunda ao domingo, que é como a semana do app começa.
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  return ordem
    .filter((d) => dias.includes(d))
    .map((d) => DIAS_DA_SEMANA[d].slice(0, 3))
    .join(", ");
}

export function frequenciaLabel(t: TarefaClassificavel): string {
  if (t.frequencia === "diaria") {
    const vezes = t.ocorrencias_por_dia || 1;
    return vezes > 1 ? `Diária (${vezes}× por dia)` : "Diária";
  }
  if (t.frequencia === "semanal") {
    const dias = diasLabel(t);
    return dias ? `Semanal (${dias})` : "Semanal";
  }
  if (t.frequencia === "mensal") return "Mensal";
  if (t.frequencia === "nao_especifica") return "Não específica";
  return t.frequencia;
}

export function valorDaDimensao(t: TarefaClassificavel, dim: DimensaoKey): string {
  if (dim === "tipo") return tipoLabel(t);
  if (dim === "frequencia") return frequenciaLabel(t);
  if (dim === "finalidade") return t.finalidade || SEM;
  return t.comodo || t.subcategoria || SEM;
}

/** Ordem de exibição das seções: alfabética, mas com "Sem classificação"
 * sempre por último. */
export function ordenarGrupos(a: string, b: string): number {
  if (a === SEM) return 1;
  if (b === SEM) return -1;
  return a.localeCompare(b, "pt-BR");
}

/** Uma tarefa compartilhada pode indicar QUAIS crianças se revezam nela.
 * Lista nula ou vazia = todas as crianças da família, que é o
 * comportamento de sempre (e o das 97 tarefas já cadastradas). */
export function valeParaCrianca(t: { profile_ids?: string[] | null }, profileId: string): boolean {
  if (!t.profile_ids || t.profile_ids.length === 0) return true;
  return t.profile_ids.includes(profileId);
}

/** Quem participa da tarefa, na ordem da lista de crianças da família (que
 * vem ordenada por nome) — a ordem precisa ser a mesma em todo lugar, senão
 * o rodízio daria respostas diferentes em cada tela. */
export function participantes(
  t: { profile_ids?: string[] | null },
  todasAsCriancas: string[]
): string[] {
  if (!t.profile_ids || t.profile_ids.length === 0) return todasAsCriancas;
  return todasAsCriancas.filter((id) => t.profile_ids!.includes(id));
}

/** Número do período a que a data pertence, contado desde sempre: muda de
 * 1 em 1 a cada dia, semana ou mês, conforme a frequência da tarefa. É o
 * que faz a vez virar sozinha, sem precisar guardar nada. */
function indiceDoPeriodo(frequencia: string, dataISO: string, inicioDaSemanaISO: (d: string) => string): number {
  const emDias = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  };
  if (frequencia === "mensal") {
    const [y, m] = dataISO.split("-").map(Number);
    return y * 12 + (m - 1);
  }
  if (frequencia === "semanal") return Math.floor(emDias(inicioDaSemanaISO(dataISO)) / 7);
  return emDias(dataISO);
}

/** É a vez desta criança nesta data?
 *
 * O rodízio vale SÓ para tarefas de finalidade "Compartilhadas" — as que os
 * meninos dividem de verdade (o quarto, o guarda-roupa). Tarefa "Para mim"
 * é de cada um: os dois arrumam a própria cama todo dia, nada alterna. E
 * tarefa de bônus é de quem quiser fazer.
 *
 * A vez vira junto com o período da própria tarefa: diária alterna a cada
 * dia, semanal a cada segunda-feira, mensal a cada mês. */
export function ehAVezDaCrianca(
  t: { finalidade?: string | null; frequencia: string; profile_ids?: string[] | null },
  profileId: string,
  todasAsCriancas: string[],
  dataISO: string,
  inicioDaSemanaISO: (d: string) => string
): boolean {
  const participa = participantes(t, todasAsCriancas);
  if (!participa.includes(profileId)) return false;
  if (t.finalidade !== "Compartilhadas" || participa.length < 2) return true;
  const i = indiceDoPeriodo(t.frequencia, dataISO, inicioDaSemanaISO) % participa.length;
  return participa[i] === profileId;
}
