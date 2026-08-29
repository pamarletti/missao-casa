"use client";

import { useState } from "react";
import { editarTarefa } from "@/app/app/[profileId]/actions";

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  subcategoria: string | null;
  valor_unitario: number;
  icone: string | null;
};

const CATEGORIA_LABEL: Record<string, string> = {
  individual: "Obrigatórias — individuais",
  individual_coletiva: "Obrigatórias — do quarto (individual-coletivas)",
  coletiva: "Coletivas (bônus)",
};

function ItemEditavel({ t }: { t: Tarefa }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <li className="card p-3 flex flex-col items-center text-center gap-1">
        <span className="text-2xl">{t.icone || "•"}</span>
        <p className="font-medium text-sm leading-tight">{t.name}</p>
        <p className="text-xs text-slate-400">R$ {Number(t.valor_unitario).toFixed(2)}</p>
        <button type="button" className="text-xs text-slate-500 underline mt-1" onClick={() => setEditando(true)}>
          editar
        </button>
      </li>
    );
  }

  return (
    <li className="card p-3">
      <form action={editarTarefa} className="flex flex-col gap-2">
        <input type="hidden" name="taskId" value={t.id} />
        <input name="name" defaultValue={t.name} className="text-sm" placeholder="Nome" required />
        <input
          name="valor_unitario"
          defaultValue={t.valor_unitario}
          className="text-sm"
          placeholder="Valor"
          inputMode="decimal"
          required
        />
        <input
          name="icone"
          defaultValue={t.icone ?? ""}
          className="text-sm"
          placeholder="Ícone (emoji)"
          maxLength={4}
        />
        <div className="flex gap-2">
          <button className="btn-primary text-xs flex-1" type="submit">
            Salvar
          </button>
          <button type="button" className="text-xs text-slate-500 underline" onClick={() => setEditando(false)}>
            cancelar
          </button>
        </div>
      </form>
    </li>
  );
}

/** Catálogo editável — todas as tarefas por tipo, com nome, ícone e valor
 * ajustáveis a qualquer momento. A mudança vale a partir da edição: não
 * altera valores de tarefas já registradas antes dela. */
export default function CatalogoEditavelTab({ catalog }: { catalog: Tarefa[] }) {
  const grupos = new Map<string, Tarefa[]>();
  for (const t of catalog) {
    const chave = CATEGORIA_LABEL[t.categoria] ?? t.categoria;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(t);
  }

  return (
    <div>
      {Array.from(grupos.entries()).map(([titulo, tarefas]) => (
        <section key={titulo} className="mb-6">
          <h2 className="text-lg font-semibold mb-3">{titulo}</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tarefas.map((t) => (
              <ItemEditavel key={`${t.id}-${t.name}-${t.valor_unitario}-${t.icone ?? ""}`} t={t} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
