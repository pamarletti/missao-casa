"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { BotaoDireto } from "@/components/Carregando";

/** Janela de aviso que cobre a tela até a pessoa dizer que entendeu.
 *
 * Usada nos pontos do app em que uma escolha tem consequência que não dá
 * pra adivinhar olhando a tela: a senha do cadastro (que vai ser
 * compartilhada com a família toda) e, no catálogo editável, o valor de uma
 * tarefa, a troca entre obrigatória e bônus, e o ligar/desligar de uma
 * tarefa — todos mexem no total mensal das obrigatórias.
 *
 * Serve nas duas situações:
 *
 *  - Só avisar (senha do cadastro, valor da tarefa, troca de tipo): a
 *    mudança já está feita no campo e o botão apenas fecha. Esc e clique
 *    fora fazem o mesmo.
 *  - Avisar antes de agir (tornar uma tarefa desnecessária, e voltar a
 *    usar): passe `acao`, e o botão passa a ser quem executa — com o mesmo
 *    "carregando" dos outros botões do app. Aí Esc, clique fora e o link
 *    "cancelar" desistem sem fazer nada, que é o que se espera de uma
 *    janela que apareceu por cima de uma decisão. */
export default function JanelaAviso({
  titulo,
  children,
  onFechar,
  rotuloBotao = "Entendi",
  acao,
}: {
  titulo: string;
  children: ReactNode;
  /** Fecha a janela: é o botão quando não há `acao`, e sempre o Esc, o
   * clique fora e o "cancelar". */
  onFechar: () => void;
  rotuloBotao?: string;
  /** Quando passado, o botão executa isto em vez de só fechar. */
  acao?: () => void | Promise<unknown>;
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
        {acao ? (
          <>
            <BotaoDireto className="btn-primary w-full" acao={acao}>
              {rotuloBotao}
            </BotaoDireto>
            <button
              ref={botaoRef}
              type="button"
              className="text-xs text-slate-400 underline w-full text-center"
              onClick={onFechar}
            >
              cancelar
            </button>
          </>
        ) : (
          <button ref={botaoRef} type="button" className="btn-primary w-full" onClick={onFechar}>
            {rotuloBotao}
          </button>
        )}
      </div>
    </div>
  );
}
