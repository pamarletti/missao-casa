"use client";

/** Quantas tarefas cada menino já teve confirmadas no mês corrente,
 * separadas por tipo. Conta só o que o responsável confirmou de fato —
 * marcação ainda esperando decisão não entra, pra o número não subir antes
 * da conferência. Calculado no servidor, em
 * src/app/app/[profileId]/page.tsx. */
export type ResumoFeitas = {
  diarias: number;
  semanais: number;
  coletivas: number;
  total: number;
};

type Crianca = { id: string; name: string; icon?: string | null };

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <li className="text-center">
      <p className={"text-2xl font-bold " + (valor > 0 ? "text-casa-accent" : "text-slate-600")}>{valor}</p>
      <p className="text-xs text-slate-400">{rotulo}</p>
    </li>
  );
}

export default function ResumoFeitasCard({
  criancas,
  resumo,
}: {
  criancas: Crianca[];
  resumo: Record<string, ResumoFeitas>;
}) {
  const vazio: ResumoFeitas = { diarias: 0, semanais: 0, coletivas: 0, total: 0 };

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mt-6">Tarefas feitas neste mês</h2>
      <p className="text-sm text-slate-400 mb-3">Só conta o que já foi confirmado por um responsável.</p>

      <ul className="space-y-2">
        {criancas.map((c) => {
          const r = resumo[c.id] ?? vazio;
          return (
            <li key={c.id} className="card">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="font-semibold flex items-center gap-2 min-w-0">
                  <span>{c.icon || "🧒"}</span>
                  {c.name}
                </p>
                <span className="text-sm text-slate-400 shrink-0">
                  {r.total} {r.total === 1 ? "tarefa" : "tarefas"}
                </span>
              </div>
              <ul className="grid grid-cols-3 gap-2">
                <Numero valor={r.diarias} rotulo="diárias" />
                <Numero valor={r.semanais} rotulo="semanais" />
                <Numero valor={r.coletivas} rotulo="coletivas" />
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
