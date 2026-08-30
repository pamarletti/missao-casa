"use client";

import { useMemo, useState } from "react";

/** Busca por nome + filtro por categoria, compartilhado pelo Catálogo
 * Completo do menino e pelo Catálogo editável do responsável. Com 86
 * tarefas no catálogo padrão, rolar a lista inteira pra achar uma coisa
 * específica ficou inviável.
 *
 * O menu suspenso tem dois níveis: as três categorias grandes e, embaixo,
 * as áreas das coletivas (subcategoria) — que é onde estão quase todas as
 * tarefas. */
export type TarefaFiltravel = {
  name: string;
  categoria: string;
  subcategoria: string | null;
  /** false = desligada ("desnecessária"). Só o catálogo editável recebe
   * tarefas desligadas; no painel das crianças vem tudo ativo. */
  ativo?: boolean;
};

/** Rótulos das categorias no painel do responsável (catálogo editável e
 * filtro). O painel das crianças usa os próprios rótulos, mais diretos
 * ("Suas tarefas", "Seu espaço compartilhado"). */
export const CATEGORIA_LABEL: Record<string, string> = {
  individual: "Obrigatórias — individuais",
  individual_coletiva: "Obrigatórias — compartilhadas",
  coletiva: "Coletivas",
};

/** Ignora acento e maiúscula, pra "cafe" achar "Café" e vice-versa. */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function useFiltroCatalogo<T extends TarefaFiltravel>(tarefas: T[]) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");

  // A opção "Desnecessárias" só faz sentido onde existem tarefas
  // desligadas — ou seja, no catálogo editável do responsável.
  const temDesnecessarias = useMemo(() => tarefas.some((t) => t.ativo === false), [tarefas]);

  const subcategorias = useMemo(() => {
    const encontradas = new Set<string>();
    for (const t of tarefas) if (t.subcategoria) encontradas.add(t.subcategoria);
    return Array.from(encontradas).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [tarefas]);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    return tarefas.filter((t) => {
      if (filtro === "desnecessarias" && t.ativo !== false) return false;
      if (filtro.startsWith("cat:") && t.categoria !== filtro.slice(4)) return false;
      if (filtro.startsWith("sub:") && t.subcategoria !== filtro.slice(4)) return false;
      if (!termo) return true;
      return normalizar(t.name).includes(termo) || normalizar(t.subcategoria ?? "").includes(termo);
    });
  }, [tarefas, busca, filtro]);

  return { busca, setBusca, filtro, setFiltro, subcategorias, temDesnecessarias, filtradas };
}

export function ControlesCatalogo({
  busca,
  setBusca,
  filtro,
  setFiltro,
  subcategorias,
  temDesnecessarias = false,
  mostrando,
  total,
}: {
  busca: string;
  setBusca: (v: string) => void;
  filtro: string;
  setFiltro: (v: string) => void;
  subcategorias: string[];
  temDesnecessarias?: boolean;
  mostrando: number;
  total: number;
}) {
  const filtrando = busca.trim() !== "" || filtro !== "";

  return (
    <div className="card mb-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔎 Buscar tarefa pelo nome..."
          className="sm:flex-1"
          aria-label="Buscar tarefa pelo nome"
        />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          aria-label="Filtrar por categoria"
          className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 w-full sm:w-auto sm:max-w-[16rem]"
        >
          <option value="">Todas as categorias</option>
          <optgroup label="Por tipo">
            <option value="cat:individual">{CATEGORIA_LABEL.individual}</option>
            <option value="cat:individual_coletiva">{CATEGORIA_LABEL.individual_coletiva}</option>
            <option value="cat:coletiva">{CATEGORIA_LABEL.coletiva}</option>
            {temDesnecessarias && <option value="desnecessarias">Desnecessárias</option>}
          </optgroup>
          {subcategorias.length > 0 && (
            <optgroup label="Coletivas por área">
              {subcategorias.map((s) => (
                <option key={s} value={`sub:${s}`}>
                  {s}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {filtrando && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {mostrando === 0
              ? "Nenhuma tarefa encontrada"
              : `Mostrando ${mostrando} de ${total} ${total === 1 ? "tarefa" : "tarefas"}`}
          </p>
          <button
            type="button"
            className="text-xs text-slate-400 underline shrink-0"
            onClick={() => {
              setBusca("");
              setFiltro("");
            }}
          >
            limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
