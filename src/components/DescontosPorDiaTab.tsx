"use client";

import { useState } from "react";
import { reais } from "@/lib/moeda";

type Item = { id: string; data: string; valor: number; profileId: string; profileName: string; descricao: string };

/** Descontos por dia — junta descontos automáticos (silêncio total) e
 * retiradas/remoções manuais negativas, agrupados por dia e por criança.
 * Um botão "ver" revela, secundariamente, a que tarefas ou ajustes cada
 * total corresponde. */
export default function DescontosPorDiaTab({ eventos, ajustes }: { eventos: Item[]; ajustes: Item[] }) {
  const [aberto, setAberto] = useState<string | null>(null);

  const todos = [...eventos, ...ajustes];

  const grupos = new Map<string, Map<string, { total: number; itens: Item[] }>>();
  for (const item of todos) {
    if (!grupos.has(item.data)) grupos.set(item.data, new Map());
    const porDia = grupos.get(item.data)!;
    if (!porDia.has(item.profileId)) porDia.set(item.profileId, { total: 0, itens: [] });
    const entrada = porDia.get(item.profileId)!;
    entrada.total += item.valor;
    entrada.itens.push(item);
  }

  const dias = Array.from(grupos.keys()).sort((a, b) => (a < b ? 1 : -1));

  if (dias.length === 0) {
    return <p className="text-slate-400 text-sm">Nenhum desconto registrado ainda.</p>;
  }

  return (
    <ul className="space-y-3">
      {dias.map((dia) => {
        const porCrianca = grupos.get(dia)!;
        return (
          <li key={dia} className="card">
            <p className="font-semibold mb-2">{new Date(dia + "T00:00:00").toLocaleDateString("pt-BR")}</p>
            <ul className="space-y-2">
              {Array.from(porCrianca.entries()).map(([profileId, { total, itens }]) => {
                const chave = `${dia}-${profileId}`;
                return (
                  <li key={chave}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">{itens[0].profileName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-red-400">-R$ {reais(Math.abs(total))}</span>
                        <button
                          type="button"
                          className="text-xs text-slate-500 underline"
                          onClick={() => setAberto(aberto === chave ? null : chave)}
                        >
                          {aberto === chave ? "ocultar" : "ver"}
                        </button>
                      </div>
                    </div>
                    {aberto === chave && (
                      <ul className="mt-2 ml-3 space-y-1 border-l border-slate-700 pl-3">
                        {itens.map((it) => (
                          <li key={it.id} className="text-xs text-slate-400 flex justify-between gap-3">
                            <span>{it.descricao}</span>
                            <span>-R$ {reais(Math.abs(it.valor))}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
