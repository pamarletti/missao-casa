"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Menu expansível no canto direito do cabeçalho, onde ficam as ações do
 * perfil (escolher emoji, mudar PIN, trocar perfil e sair). Antes eles eram
 * quatro links soltos que espremiam o cabeçalho no celular. Fecha ao clicar
 * fora ou apertar Esc; "sair" fica sempre por último. */
export default function MenuPerfil({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    function aoApertarEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoApertarEsc);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoApertarEsc);
    };
  }, [aberto]);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        className="flex items-center gap-2 rounded-full bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 transition"
      >
        <span aria-hidden>{aberto ? "✕" : "☰"}</span>
        <span className="hidden sm:inline">menu</span>
      </button>

      {aberto && (
        <div className="card absolute right-0 mt-2 z-50 w-64 space-y-1 text-left p-3">{children}</div>
      )}
    </div>
  );
}

/** Cada linha do menu, pra todas ficarem com o mesmo tamanho e alinhamento
 * (inclusive as que são formulário com botão dentro). */
export function ItemMenu({ children }: { children: ReactNode }) {
  return <div className="border-b border-slate-700/60 py-2 last:border-b-0">{children}</div>;
}
