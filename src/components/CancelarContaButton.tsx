"use client";

import { useState } from "react";
import { cancelarContaFamilia } from "@/app/app/[profileId]/actions";

/** Zona de perigo do responsável: apaga a conta da família inteira, para
 * sempre (login, perfis, catálogo, histórico e saldo de todo mundo). Exige
 * digitar "cancelar" antes de habilitar o botão final, pra evitar clique
 * acidental numa ação que não tem volta. */
export default function CancelarContaButton() {
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <button type="button" className="text-xs text-red-500/80 underline" onClick={() => setAberto(true)}>
        cancelar conta da família
      </button>
    );
  }

  const habilitado = confirmacao.trim().toLowerCase() === "cancelar";

  return (
    <div className="card border border-red-500/40 space-y-3 max-w-md">
      <p className="text-sm font-semibold text-red-400">⚠️ Isso é irreversível</p>
      <p className="text-sm text-slate-300">
        Ao confirmar, a conta da família é apagada para sempre: o login, todos os perfis
        (responsáveis e crianças), o catálogo de tarefas, todo o histórico de atividades e o saldo
        acumulado de cada menino. Não tem como desfazer nem recuperar depois.
      </p>
      <label className="block text-xs text-slate-400">
        Para confirmar, digite <span className="font-mono text-slate-300">cancelar</span> abaixo:
        <input
          type="text"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          placeholder="digite: cancelar"
          className="mt-1"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => {
            setAberto(false);
            setConfirmacao("");
          }}
        >
          Voltar
        </button>
        <form action={cancelarContaFamilia} onSubmit={() => setEnviando(true)}>
          <button type="submit" disabled={!habilitado || enviando} className="btn-danger text-sm disabled:opacity-40">
            {enviando ? "Cancelando..." : "Sim, cancelar conta definitivamente"}
          </button>
        </form>
      </div>
    </div>
  );
}
