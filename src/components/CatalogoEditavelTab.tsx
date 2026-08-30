"use client";

import { useState } from "react";
import { editarTarefa, definirValorBase, marcarDesnecessaria } from "@/app/app/[profileId]/actions";
import { iconeTarefa } from "@/lib/iconeTarefa";
import { valorMensalTotal } from "@/lib/valorBase";
import ListaAgrupada from "@/components/ListaAgrupada";
import { tipoDa } from "@/lib/dimensoes";
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
  /** Crianças que se revezam nesta tarefa. Nulo/vazio = todas. */
  profile_ids: string[] | null;
};

/** Um <select> por classificação: uma opção só em cada, como pediu a
 * Paolla. As opções de Cômodo/Área vêm do próprio catálogo, então a lista
 * acompanha o que a família já usa. */
function CampoCategoria({
  nome,
  rotulo,
  valor,
  opcoes,
  onChange,
}: {
  nome: string;
  rotulo: string;
  valor: string;
  opcoes: { value: string; label: string }[];
  /** Quando passado, o campo vira controlado — usado pela Finalidade, que
   * precisa mostrar/esconder a lista de crianças na hora. */
  onChange?: (v: string) => void;
}) {
  return (
    <label className="text-xs text-slate-400">
      {rotulo}
      <select
        name={nome}
        {...(onChange ? { value: valor, onChange: (e) => onChange(e.target.value) } : { defaultValue: valor })}
        className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl px-2 py-1.5 text-sm text-slate-100"
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ItemEditavel({
  t,
  comodos,
  criancas,
}: {
  t: Tarefa;
  comodos: string[];
  criancas: { id: string; name: string }[];
}) {
  const [editando, setEditando] = useState(false);
  const [finalidade, setFinalidade] = useState(t.finalidade ?? "Para mim");

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

        <div className="border-t border-slate-700/60 pt-2 space-y-2">
          <CampoCategoria
            nome="tipo"
            rotulo="Tipo"
            valor={tipoDa(t)}
            opcoes={[
              { value: "Obrigatória", label: "Obrigatória" },
              { value: "Facultativa", label: "Bônus" },
            ]}
          />
          <CampoCategoria
            nome="frequencia"
            rotulo="Frequência"
            valor={t.frequencia}
            opcoes={[
              { value: "diaria", label: "Diária" },
              { value: "semanal", label: "Semanal" },
              { value: "mensal", label: "Mensal" },
            ]}
          />
          <CampoCategoria
            nome="finalidade"
            rotulo="Finalidade"
            valor={finalidade}
            onChange={setFinalidade}
            opcoes={[
              { value: "Para mim", label: "Para mim" },
              { value: "Compartilhadas", label: "Compartilhadas" },
              { value: "Para a família", label: "Para a família" },
            ]}
          />

          {finalidade === "Compartilhadas" && (
            <fieldset className="rounded-xl border border-slate-600 p-2">
              <legend className="text-xs text-slate-400 px-1">Quem se reveza nesta tarefa</legend>
              <div className="space-y-1">
                {criancas.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="profile_ids"
                      value={c.id}
                      defaultChecked={!t.profile_ids || t.profile_ids.length === 0 || t.profile_ids.includes(c.id)}
                      className="w-auto"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quem ficar de fora não vê a tarefa nem é cobrado por ela.
              </p>
            </fieldset>
          )}
          <CampoCategoria
            nome="comodo"
            rotulo="Cômodo/Área"
            valor={t.comodo ?? comodos[0] ?? ""}
            opcoes={comodos.map((x) => ({ value: x, label: x }))}
          />
        </div>

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
  criancas,
  familyId,
  valorBaseAtual,
}: {
  catalog: Tarefa[];
  criancas: { id: string; name: string }[];
  familyId: string;
  valorBaseAtual: number;
}) {
  // As desligadas ficam num bloco próprio no fim da página; a busca e o
  // filtro por categoria valem para os dois grupos.
  const ativas = catalog.filter((t) => t.ativo);
  const desnecessarias = catalog.filter((t) => !t.ativo);

  // Opções de Cômodo/Área saem do próprio catálogo, então a lista acompanha
  // o que a família já usa, sem precisar cadastrar nada à parte.
  const comodos = Array.from(new Set(catalog.map((t) => t.comodo).filter((x): x is string => !!x))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  const { abertas, alternar } = useSecoesExpansiveis();

  return (
    <div>
      <ValorBaseCard familyId={familyId} catalog={ativas} valorBaseAtual={valorBaseAtual} />

      <ListaAgrupada
        tarefas={ativas}
        chaveAba="catalogo-editavel"
        renderItem={(t) => (
          <ItemEditavel
            key={`${t.id}-${t.name}-${t.valor_unitario}-${t.icone ?? ""}-${t.tipo ?? ""}-${t.comodo ?? ""}`}
            t={t}
            comodos={comodos}
            criancas={criancas}
          />
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
