"use client";

import { useState } from "react";
import { cancelarContaFamilia } from "@/app/app/[profileId]/actions";
import { BotaoAcao } from "@/components/Carregando";

/** Apaga a conta da família inteira, para sempre. Fica no menu do topo, na
 * última posição (abaixo de "sair") e em vermelho, pra ser encontrável sem
 * ser confundida com as ações do dia a dia. Abre em linha dentro do menu,
 * e exige digitar "cancelar" antes de liberar o botão final — clique
 * acidental numa ação sem volta não pode ser possível. */
export default function CancelarContaButton() {
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");

  if (!aberto) {
    return (
      <button
        type="button"
        className="text-sm text-red-500 hover:text-red-400 w-full text-left"
        onClick={() => setAberto(true)}
      >
        cancelar conta da família
      </button>
    );
  }

  const habilitado = confirmacao.trim().toLowerCase() === "cancelar";

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-red-400">⚠️ Isso é irreversível</p>
      <p className="text-xs text-slate-300">
        Apaga para sempre o login, todos os perfis, o catálogo, todo o histórico e o saldo acumulado de cada menino.
        Não tem como desfazer.
      </p>
      <label className="block text-xs text-slate-400">
        Digite <span className="font-mono text-slate-200">cancelar</span> para confirmar:
        <input
          type="text"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          placeholder="cancelar"
          className="mt-1 text-sm"
        />
      </label>

      <form action={cancelarContaFamilia}>
        <BotaoAcao
          className="btn-danger text-xs w-full disabled:opacity-40"
          disabled={!habilitado}
          carregando="cancelando…"
        >
          Sim, cancelar conta definitivamente
        </BotaoAcao>
      </form>

      <button
        type="button"
        className="text-xs text-slate-400 underline w-full text-left"
        onClick={() => {
          setAberto(false);
          setConfirmacao("");
        }}
      >
        voltar
      </button>
    </div>
  );
}
