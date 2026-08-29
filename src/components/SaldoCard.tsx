"use client";

import { useState } from "react";
import { ajustarSaldo } from "@/app/app/[profileId]/actions";
import { BotaoAcao } from "@/components/Carregando";

export default function SaldoCard({
  profileId,
  familyId,
  name,
  saldo,
  nivelBadge,
}: {
  profileId: string;
  familyId: string;
  name: string;
  saldo: number;
  nivelBadge?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            Saldo acumulado por {name}
            {nivelBadge}
          </p>
          <p className="text-2xl font-bold text-casa-accent">R$ {saldo.toFixed(2)}</p>
        </div>
        <button className="btn-secondary text-sm shrink-0" onClick={() => setAberto((v) => !v)}>
          {aberto ? "cancelar" : "Ajustar saldo"}
        </button>
      </div>

      {aberto && (
        <form
          action={async (formData) => {
            await ajustarSaldo(formData);
            setAberto(false);
          }}
          className="mt-3 space-y-2 border-t border-slate-700 pt-3"
        >
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="familyId" value={familyId} />
          <div className="flex gap-2">
            <select
              name="tipo"
              defaultValue="adicionar"
              className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-slate-100"
            >
              <option value="adicionar">Adicionar (crédito extra)</option>
              <option value="remover">Retirar / remover (pagamento)</option>
            </select>
            <input type="number" step="0.01" min="0" name="valor" placeholder="Valor" required className="flex-1" />
          </div>
          <input type="text" name="motivo" placeholder="Motivo (opcional)" />
          <BotaoAcao className="btn-primary text-sm w-full" carregando="salvando…">
            Confirmar ajuste
          </BotaoAcao>
        </form>
      )}
    </div>
  );
}
