"use client";

import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import SecaoExpansivel, { useSecoesExpansiveis } from "@/components/SecaoExpansivel";
import {
  DIMENSOES,
  ordenarGrupos,
  valorDaDimensao,
  type DimensaoKey,
  type TarefaClassificavel,
} from "@/lib/dimensoes";

/** Ignora acento e maiúscula, pra "cafe" achar "Café" e vice-versa. */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type Base = TarefaClassificavel & { id: string; name: string };

/** Busca por nome + botões para escolher por qual classificação agrupar a
 * lista. A classificação escolhida vira um conjunto de seções expansíveis,
 * uma por valor (ex.: agrupando por Cômodo/Área, sai uma seção "Cozinha",
 * outra "Banheiro"...).
 *
 * Substitui o antigo menu suspenso: com quatro classificações e ~100
 * tarefas, escolher a lente de leitura é mais útil do que filtrar por um
 * valor só. */
export default function ListaAgrupada<T extends Base>({
  tarefas,
  dimensoes = DIMENSOES.map((d) => d.key),
  dimensaoInicial,
  renderItem,
  chaveAba,
}: {
  tarefas: T[];
  /** Quais classificações oferecer como botão. */
  dimensoes?: DimensaoKey[];
  dimensaoInicial?: DimensaoKey;
  renderItem: (t: T) => ReactNode;
  /** Prefixo das chaves de "aberto/fechado", pra cada aba lembrar a sua. */
  chaveAba: string;
}) {
  const opcoes = DIMENSOES.filter((d) => dimensoes.includes(d.key));
  const [dimensao, setDimensao] = useState<DimensaoKey>(dimensaoInicial ?? opcoes[0].key);
  const [busca, setBusca] = useState("");
  const { abertas, alternar } = useSecoesExpansiveis();

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return tarefas;
    return tarefas.filter(
      (t) => normalizar(t.name).includes(termo) || normalizar(t.comodo ?? t.subcategoria ?? "").includes(termo)
    );
  }, [tarefas, busca]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, T[]>();
    for (const t of filtradas) {
      const chave = valorDaDimensao(t, dimensao);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(t);
    }
    return Array.from(mapa.entries()).sort((a, b) => ordenarGrupos(a[0], b[0]));
  }, [filtradas, dimensao]);

  const buscando = busca.trim() !== "";

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
          <p className="text-xs text-slate-400 mb-2">Agrupar por:</p>
          <div className="flex flex-wrap gap-2">
            {opcoes.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDimensao(d.key)}
                aria-pressed={dimensao === d.key}
                className={
                  "text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition " +
                  (dimensao === d.key
                    ? "bg-casa-accent text-slate-900 font-semibold"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {buscando && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {filtradas.length === 0
                ? "Nenhuma tarefa encontrada"
                : `Mostrando ${filtradas.length} de ${tarefas.length} ${tarefas.length === 1 ? "tarefa" : "tarefas"}`}
            </p>
            <button type="button" className="text-xs text-slate-400 underline shrink-0" onClick={() => setBusca("")}>
              limpar busca
            </button>
          </div>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="text-slate-400 text-sm">Nada por aqui.</p>
      ) : (
        grupos.map(([titulo, doGrupo]) => (
          <SecaoExpansivel
            key={titulo}
            titulo={titulo}
            contagem={doGrupo.length}
            // Buscando, tudo abre: senão a busca mostraria só títulos fechados.
            aberta={buscando || abertas.has(`${chaveAba}:${dimensao}:${titulo}`)}
            onAlternar={() => alternar(`${chaveAba}:${dimensao}:${titulo}`)}
          >
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {doGrupo.map((t) => (
                <Fragment key={t.id}>{renderItem(t)}</Fragment>
              ))}
            </ul>
          </SecaoExpansivel>
        ))
      )}
    </div>
  );
}
