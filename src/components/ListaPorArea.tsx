"use client";

import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ordenarGrupos, valorDaDimensao, type TarefaClassificavel } from "@/lib/dimensoes";

/** Ignora acento e maiúscula, pra "cafe" achar "Café" e vice-versa. */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type Base = TarefaClassificavel & { id: string; name: string };

/** Um botão por Cômodo/Área; ao apertar, a lista daquele lugar aparece
 * direto, sem seção pra abrir. Pensado pro Bônus, onde o menino escolhe
 * onde quer ajudar e vê na hora o que tem pra fazer ali.
 *
 * A busca é global de propósito: procurar "louça" com o Banheiro
 * selecionado não pode dar lista vazia. Enquanto há texto na busca, os
 * resultados vêm de todos os lugares; ao limpar, volta pro lugar escolhido. */
export default function ListaPorArea<T extends Base>({
  tarefas,
  renderItem,
}: {
  tarefas: T[];
  renderItem: (t: T) => ReactNode;
}) {
  const areas = useMemo(() => {
    const encontradas = new Map<string, number>();
    for (const t of tarefas) {
      const a = valorDaDimensao(t, "comodo");
      encontradas.set(a, (encontradas.get(a) ?? 0) + 1);
    }
    return Array.from(encontradas.entries()).sort((a, b) => ordenarGrupos(a[0], b[0]));
  }, [tarefas]);

  const [area, setArea] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const buscando = busca.trim() !== "";

  const areaAtual = area && areas.some(([a]) => a === area) ? area : areas[0]?.[0] ?? null;

  const visiveis = useMemo(() => {
    if (buscando) {
      const termo = normalizar(busca.trim());
      return tarefas.filter((t) => normalizar(t.name).includes(termo));
    }
    return tarefas.filter((t) => valorDaDimensao(t, "comodo") === areaAtual);
  }, [tarefas, busca, buscando, areaAtual]);

  return (
    <div>
      <div className="card mb-4 space-y-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔎 Buscar tarefa pelo nome..."
          aria-label="Buscar tarefa pelo nome"
        />

        <div>
          <p className="text-xs text-slate-400 mb-2">Escolha o lugar:</p>
          <div className="flex flex-wrap gap-2">
            {areas.map(([nome, quantas]) => (
              <button
                key={nome}
                type="button"
                onClick={() => {
                  setArea(nome);
                  setBusca("");
                }}
                aria-pressed={!buscando && nome === areaAtual}
                className={
                  "text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition " +
                  (!buscando && nome === areaAtual
                    ? "bg-casa-accent text-slate-900 font-semibold"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600")
                }
              >
                {nome} <span className="opacity-60">{quantas}</span>
              </button>
            ))}
          </div>
        </div>

        {buscando && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {visiveis.length === 0
                ? "Nenhuma tarefa encontrada"
                : `${visiveis.length} ${visiveis.length === 1 ? "tarefa" : "tarefas"} em todos os lugares`}
            </p>
            <button type="button" className="text-xs text-slate-400 underline shrink-0" onClick={() => setBusca("")}>
              limpar busca
            </button>
          </div>
        )}
      </div>

      {!buscando && areaAtual && <h2 className="text-lg font-semibold mb-3">{areaAtual}</h2>}

      {visiveis.length === 0 ? (
        <p className="text-slate-400 text-sm">Nada por aqui.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visiveis.map((t) => (
            <Fragment key={t.id}>{renderItem(t)}</Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
