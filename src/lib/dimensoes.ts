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
  /** Dia combinado, nas semanais: 0 = domingo ... 6 = sábado. Nulo = qualquer. */
  dia_da_semana?: number | null;
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

/** Nomes na ordem do getDay do JavaScript, que é a mesma da coluna
 * task_catalog.dia_da_semana. */
export const DIAS_DA_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** "às segundas", "aos domingos" — o combinado da casa, escrito do jeito
 * que se fala. Vazio quando a tarefa não tem dia marcado. */
export function diaCombinadoLabel(t: TarefaClassificavel): string {
  if (t.frequencia !== "semanal" || t.dia_da_semana == null) return "";
  const nome = DIAS_DA_SEMANA[t.dia_da_semana];
  if (!nome) return "";
  if (nome === "domingo" || nome === "sábado") return `aos ${nome}s`;
  return `às ${nome.replace("-feira", "s")}`;
}

export function frequenciaLabel(t: TarefaClassificavel): string {
  if (t.frequencia === "diaria") {
    const vezes = t.ocorrencias_por_dia || 1;
    return vezes > 1 ? `Diária (${vezes}× por dia)` : "Diária";
  }
  if (t.frequencia === "semanal") {
    const dia = diaCombinadoLabel(t);
    return dia ? `Semanal (${dia})` : "Semanal";
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
