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

export function frequenciaLabel(t: TarefaClassificavel): string {
  if (t.frequencia === "diaria") {
    const vezes = t.ocorrencias_por_dia || 1;
    return vezes > 1 ? `Diária (${vezes}× por dia)` : "Diária";
  }
  if (t.frequencia === "semanal") return "Semanal";
  if (t.frequencia === "mensal") return "Mensal";
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
