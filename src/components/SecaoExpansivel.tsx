"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

/** Guarda quais seções estão abertas. Fica no componente de cima (não
 * dentro de cada seção) por dois motivos: o Catálogo do menino é uma
 * função declarada dentro do painel, que é recriada a cada atualização da
 * tela (inclusive na batida de relógio de 30 em 30 segundos) e perderia o
 * estado; e assim dá pra abrir tudo de uma vez quando há busca ativa. */
export function useSecoesExpansiveis() {
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  const alternar = useCallback((chave: string) => {
    setAbertas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(chave)) proxima.delete(chave);
      else proxima.add(chave);
      return proxima;
    });
  }, []);

  return { abertas, alternar };
}

/** Seta desenhada em SVG, e não com um caractere de texto — evita o risco
 * de o celular resolver desenhar um emoji no lugar (já aconteceu com a
 * seta de "refazer"). Aponta pra baixo quando fechada e gira pra cima
 * quando abre. */
function Seta({ aberta }: { aberta: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={"h-4 w-4 shrink-0 transition-transform duration-200 " + (aberta ? "rotate-180" : "")}
    >
      <path
        d="M5 7.5 L10 12.5 L15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SecaoExpansivel({
  titulo,
  contagem,
  aberta,
  onAlternar,
  children,
}: {
  titulo: string;
  contagem: number;
  aberta: boolean;
  onAlternar: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mb-3 border-b border-slate-700/60 pb-3 last:border-b-0">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberta}
        className="w-full flex items-center justify-between gap-3 text-left py-1 text-slate-100 hover:text-white transition"
      >
        <h2 className="text-lg font-semibold min-w-0">{titulo}</h2>
        <span className="flex items-center gap-2 shrink-0 text-slate-400">
          <span className="text-sm">{contagem}</span>
          <Seta aberta={aberta} />
        </span>
      </button>

      {aberta && <div className="mt-3">{children}</div>}
    </section>
  );
}
