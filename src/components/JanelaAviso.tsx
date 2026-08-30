"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** Janela de aviso que cobre a tela até a pessoa dizer que entendeu.
 *
 * Usada nos dois pontos do app em que uma escolha tem consequência que não
 * dá pra adivinhar olhando a tela: a senha do cadastro (que vai ser
 * compartilhada com a família toda) e o valor de uma tarefa no catálogo
 * editável (que mexe no total mensal das obrigatórias).
 *
 * Fecha pelo botão "Entendi", pelo Esc ou clicando fora — as três saídas
 * levam de volta pra mesma tela, sem perder nada do que estava preenchido. */
export default function JanelaAviso({
  titulo,
  children,
  onFechar,
  rotuloBotao = "Entendi",
}: {
  titulo: string;
  children: ReactNode;
  onFechar: () => void;
  rotuloBotao?: string;
}) {
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botaoRef.current?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="card w-full max-w-sm space-y-3 text-left">
        <h2 className="text-lg font-bold">{titulo}</h2>
        {children}
        <button ref={botaoRef} type="button" className="btn-primary w-full" onClick={onFechar}>
          {rotuloBotao}
        </button>
      </div>
    </div>
  );
}
