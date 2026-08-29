"use client";

import { useState } from "react";
import { mudarPin } from "@/app/app/actions";
import { BotaoAcao } from "@/components/Carregando";

export default function MudarPinButton({ profileId }: { profileId: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="text-sm text-slate-300 hover:text-white w-full text-left"
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? "cancelar" : "mudar o PIN"}
      </button>

      {aberto && (
        <form action={mudarPin} className="mt-2 space-y-2 text-left">
          <input type="hidden" name="profileId" value={profileId} />
          <input
            type="password"
            name="pinAtual"
            placeholder="PIN atual"
            inputMode="numeric"
            maxLength={4}
            required
          />
          <input
            type="password"
            name="novoPin"
            placeholder="Novo PIN (4 números)"
            inputMode="numeric"
            maxLength={4}
            required
          />
          <input
            type="password"
            name="confirmacao"
            placeholder="Confirme o novo PIN"
            inputMode="numeric"
            maxLength={4}
            required
          />
          <BotaoAcao className="btn-primary text-sm w-full" carregando="salvando…">
            Salvar novo PIN
          </BotaoAcao>
        </form>
      )}
    </div>
  );
}
