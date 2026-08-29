"use client";

import { useState } from "react";
import { mudarIcone } from "@/app/app/actions";

/** Botão que qualquer perfil (responsável ou criança) usa para escolher o
 * próprio emoji — digita ou cola um emoji e salva. Aparece no topo do
 * painel, ao lado de "trocar perfil"/"sair" (e do botão de PIN, quando
 * houver). */
export default function EmojiButton({ profileId, iconeAtual }: { profileId: string; iconeAtual?: string | null }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="text-sm text-slate-400 underline"
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? "cancelar" : "mudar emoji"}
      </button>

      {aberto && (
        <form action={mudarIcone} className="card absolute right-0 mt-2 z-50 w-56 space-y-2 text-left">
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
          <button className="btn-primary text-sm w-full" type="submit">
            Salvar emoji
          </button>
        </form>
      )}
    </div>
  );
}
