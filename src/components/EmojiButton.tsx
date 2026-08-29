"use client";

import { useState } from "react";
import { mudarIcone } from "@/app/app/actions";
import { BotaoAcao } from "@/components/Carregando";

/** Botão que qualquer perfil (responsável ou criança) usa para escolher o
 * próprio emoji — digita ou cola um emoji e salva. Aparece no topo do
 * painel, ao lado de "trocar perfil"/"sair" (e do botão de PIN, quando
 * houver). */
export default function EmojiButton({ profileId, iconeAtual }: { profileId: string; iconeAtual?: string | null }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="text-sm text-slate-300 hover:text-white w-full text-left"
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? "cancelar" : "escolher emoji"}
      </button>

      {aberto && (
        <form action={mudarIcone} className="mt-2 space-y-2 text-left">
          <input type="hidden" name="profileId" value={profileId} />
          <p className="text-xs text-slate-400">Escolha um emoji para o seu perfil</p>
          <input
            type="text"
            name="icone"
            placeholder="Ex.: 🐯"
            defaultValue={iconeAtual ?? ""}
            maxLength={4}
            autoFocus
            required
          />
          <BotaoAcao className="btn-primary text-sm w-full" carregando="salvando…">
            Salvar emoji
          </BotaoAcao>
        </form>
      )}
    </div>
  );
}
