"use client";

import { useState } from "react";
import { mudarPin } from "@/app/app/actions";

export default function MudarPinButton({ profileId }: { profileId: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="text-sm text-slate-400 underline"
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? "cancelar" : "mudar o pin"}
      </button>

      {aberto && (
        <form
          action={mudarPin}
          className="card absolute right-0 mt-2 z-50 w-64 space-y-2 text-left"
        >
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
          <button className="btn-primary text-sm w-full" type="submit">
            Salvar novo PIN
          </button>
        </form>
      )}
    </div>
  );
}
