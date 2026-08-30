"use client";

import { useState } from "react";
import { editarTarefa, definirValorBase, marcarDesnecessaria } from "@/app/app/[profileId]/actions";
import { iconeTarefa } from "@/lib/iconeTarefa";
import { valorMensalTotal } from "@/lib/valorBase";
import ListaAgrupada from "@/components/ListaAgrupada";
import SecaoExpansivel, { useSecoesExpansiveis } from "@/components/SecaoExpansivel";
import { BotaoAcao, BotaoDireto } from "@/components/Carregando";

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  subcategoria: string | null;
  frequencia: string;
  ocorrencias_por_dia: number;
  pula_fim_de_semana: boolean;
  valor_unitario: number;
  icone: string | null;
  /** false = "desnecessária": some das listas dos meninos e das Pendências. */
  ativo: boolean;
  tipo: string | null;
  finalidade: string | null;
  comodo: string | null;
};

function ItemEditavel({ t }: { t: Tarefa }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <li className="card p-3 flex flex-col items-center text-center gap-1">
        <span className="text-2xl">{iconeTarefa(t)}</span>
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
          <BotaoAcao className="btn-primary text-xs flex-1" carregando="salvando…">
            Salvar
          </BotaoAcao>
          <button type="button" className="text-xs text-slate-500 underline" onClick={() => setEditando(false)}>
            cancelar
          </button>
        </div>
      </form>

      <div className="mt-2 border-t border-slate-700/60 pt-2">
        <BotaoDireto
          className="text-xs text-slate-400 underline disabled:opacity-40"
          title="Tira a tarefa das listas, sem apagar o histórico. Dá pra voltar depois."
          carregando="tirando…"
          acao={() => marcarDesnecessaria(t.id, true)}
        >
          tornar desnecessária
        </BotaoDireto>
      </div>
    </li>
  );
}

/** Tarefa desligada: fica só aqui embaixo, fora das listas dos meninos, com
 * um botão pra voltar a valer. Nada é apagado — o que já foi feito com ela
 * continua no histórico e no saldo. */
function ItemDesnecessario({ t }: { t: Tarefa }) {
  return (
    <li className="card p-3 flex flex-col items-center text-center gap-1 opacity-60">
      <span className="text-2xl grayscale">{iconeTarefa(t)}</span>
      <p className="font-medium text-sm leading-tight">{t.name}</p>
      <p className="text-xs text-slate-400">R$ {Number(t.valor_unitario).toFixed(2)}</p>
      <BotaoDireto
        className="text-xs text-casa-accent underline mt-1 disabled:opacity-40"
        title="Voltar a usar esta tarefa"
        carregando="voltando…"
        acao={() => marcarDesnecessaria(t.id, false)}
      >
        voltar a usar
      </BotaoDireto>
    </li>
  );
}

/** Card no topo do catálogo editável: mostra quanto as tarefas obrigatórias
 * (individuais + do quarto) somam por mês hoje, e deixa o responsável
 * definir um novo valor base — os valores de cada tarefa são recalculados
 * proporcionalmente para que a soma bata com o novo total. Editar uma
 * tarefa individualmente (abaixo) também atualiza esse total sozinho. */
function ValorBaseCard({ familyId, catalog, valorBaseAtual }: { familyId: string; catalog: Tarefa[]; valorBaseAtual: number }) {
  const [aberto, setAberto] = useState(false);
  const obrigatorias = catalog.filter((t) => t.categoria === "individual" || t.categoria === "individual_coletiva");
  const totalAtual = valorMensalTotal(obrigatorias);

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-slate-400 text-sm">Valor base mensal das tarefas obrigatórias</p>
          <p className="text-2xl font-bold text-casa-accent">R$ {totalAtual.toFixed(2)}</p>
          {Math.abs(totalAtual - Number(valorBaseAtual)) > 0.01 && (
            <p className="text-xs text-slate-500 mt-1">
              (valor base registrado: R$ {Number(valorBaseAtual).toFixed(2)})
            </p>
          )}
        </div>
        <button type="button" className="btn-secondary text-sm shrink-0" onClick={() => setAberto((v) => !v)}>
          {aberto ? "cancelar" : "Mudar valor base"}
        </button>
      </div>

      {aberto && (
        <form action={definirValorBase} className="mt-3 space-y-2 border-t border-slate-700 pt-3">
          <input type="hidden" name="familyId" value={familyId} />
          <p className="text-xs text-slate-400">
            Ao mudar esse valor, cada tarefa obrigatória é recalculada proporcionalmente para que a soma de todas
            passe a bater com o novo total.
          </p>
          <input
            name="valorBase"
            defaultValue={totalAtual.toFixed(2)}
            inputMode="decimal"
            placeholder="Novo valor base (R$)"
            required
          />
          <BotaoAcao className="btn-primary text-sm w-full" carregando="recalculando…">
            Recalcular tarefas obrigatórias
          </BotaoAcao>
        </form>
      )}
    </div>
  );
}

/** Catálogo editável — todas as tarefas por tipo, com nome, ícone e valor
 * ajustáveis a qualquer momento. A mudança vale a partir da edição: não
 * altera valores de tarefas já registradas antes dela. */
export default function CatalogoEditavelTab({
  catalog,
  familyId,
  valorBaseAtual,
}: {
  catalog: Tarefa[];
  familyId: string;
  valorBaseAtual: number;
}) {
  // As desligadas ficam num bloco próprio no fim da página; a busca e o
  // filtro por categoria valem para os dois grupos.
  const ativas = catalog.filter((t) => t.ativo);
  const desnecessarias = catalog.filter((t) => !t.ativo);

  const { abertas, alternar } = useSecoesExpansiveis();

  return (
    <div>
      <ValorBaseCard familyId={familyId} catalog={ativas} valorBaseAtual={valorBaseAtual} />

      <ListaAgrupada
        tarefas={ativas}
        chaveAba="catalogo-editavel"
        renderItem={(t) => (
          <ItemEditavel key={`${t.id}-${t.name}-${t.valor_unitario}-${t.icone ?? ""}`} t={t} />
        )}
      />

      <SecaoExpansivel
        titulo="Desnecessárias"
        contagem={desnecessarias.length}
        aberta={abertas.has("Desnecessárias")}
        onAlternar={() => alternar("Desnecessárias")}
      >
        <p className="text-sm text-slate-400 mb-3">
          Tarefas desligadas por enquanto: não aparecem para os meninos nem na fila de Pendências, e não contam no
          valor base do mês. Nada foi apagado — o que já foi feito continua no histórico, e é só clicar em &ldquo;voltar
          a usar&rdquo; para ligar de novo.
        </p>
        {desnecessarias.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma por enquanto. Para desligar uma tarefa, clique em &ldquo;editar&rdquo; nela e depois em &ldquo;tornar
            desnecessária&rdquo;.
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {desnecessarias.map((t) => (
              <ItemDesnecessario key={t.id} t={t} />
            ))}
          </ul>
        )}
      </SecaoExpansivel>

    </div>
  );
}
