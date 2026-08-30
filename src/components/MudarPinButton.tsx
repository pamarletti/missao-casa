"use client";

import { useState } from "react";
import { mudarPin } from "@/app/app/actions";
import { BotaoAcao } from "@/components/Carregando";
import CampoSegredo, { ParDeSegredos } from "@/components/CampoSegredo";

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
        <form
          action={async (formData) => {
            try {
              await mudarPin(formData);
            } finally {
              setAberto(false);
            }
          }}
          className="mt-2 space-y-2 text-left"
        >
          <input type="hidden" name="profileId" value={profileId} />
          <CampoSegredo
            name="pinAtual"
            placeholder="PIN atual"
            inputMode="numeric"
            maxLength={4}
            required
            autoComplete="current-password"
          />
          <ParDeSegredos
            name="novoPin"
            placeholder="Novo PIN (4 números)"
            placeholderConfirmacao="Confirme o novo PIN"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            required
            autoComplete="new-password"
            mensagemDivergencia="Os dois PINs precisam ser iguais."
          />
          <BotaoAcao className="btn-primary text-sm w-full" carregando="salvando…">
            Salvar novo PIN
          </BotaoAcao>
        </form>
      )}
    </div>
  );
}
