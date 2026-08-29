"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** ──────────────────────────────────────────────────────────────
 * Feedback de "carregando" para o app inteiro.
 *
 * Problema que isso resolve: entre apertar um botão e a ação acontecer de
 * verdade (ida e volta até o servidor) passa quase sempre um tempinho, e
 * até aqui a tela não dava nenhum sinal — a família ficava na dúvida se
 * tinha funcionado, e às vezes clicava de novo (foi assim que os perfis
 * duplicados apareceram no cadastro de uma família de teste).
 *
 * São duas camadas de aviso, e as duas vêm juntas em qualquer botão que
 * use os componentes daqui:
 *  1. No próprio botão: ele desabilita e troca o texto por "…" enquanto a
 *     ação roda — impede clique duplo e mostra exatamente qual botão está
 *     trabalhando.
 *  2. Na tela toda: uma faixa fixa no topo escrita "carregando…", pra
 *     quem estiver olhando para outro canto da página perceber que tem
 *     algo em andamento.
 * ────────────────────────────────────────────────────────────── */

type CarregandoContexto = {
  /** Avisa a faixa do topo que começou (true) ou terminou (false) uma ação. */
  registrar: (ativo: boolean) => void;
};

const Contexto = createContext<CarregandoContexto | null>(null);

/** Envolve o app inteiro (em src/app/layout.tsx) e desenha a faixa do topo.
 * Conta quantas ações estão em andamento ao mesmo tempo, pra faixa não
 * sumir cedo demais quando duas coisas rodam juntas. */
export function CarregandoProvider({ children }: { children: ReactNode }) {
  const [emAndamento, setEmAndamento] = useState(0);

  const registrar = useCallback((ativo: boolean) => {
    setEmAndamento((n) => Math.max(0, n + (ativo ? 1 : -1)));
  }, []);

  const valor = useMemo(() => ({ registrar }), [registrar]);

  return (
    <Contexto.Provider value={valor}>
      {emAndamento > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-[100] flex justify-center pointer-events-none"
        >
          <p className="mt-2 rounded-full bg-casa-accent px-4 py-1 text-sm font-semibold text-slate-900 shadow-lg">
            carregando…
          </p>
        </div>
      )}
      {children}
    </Contexto.Provider>
  );
}

/** Liga/desliga a faixa do topo conforme `ativo`, e garante que ela seja
 * desligada se o botão sumir da tela no meio da ação (o que acontece o
 * tempo todo aqui: a lista se refaz e o item que você clicou desaparece). */
function useAvisarFaixa(ativo: boolean) {
  const contexto = useContext(Contexto);
  const registradoRef = useRef(false);

  useEffect(() => {
    const registrar = contexto?.registrar;
    if (!registrar) return;

    if (ativo && !registradoRef.current) {
      registradoRef.current = true;
      registrar(true);
    } else if (!ativo && registradoRef.current) {
      registradoRef.current = false;
      registrar(false);
    }
  }, [ativo, contexto]);

  // Se o botão for desmontado enquanto ainda estava "carregando", desconta
  // assim mesmo — senão a faixa ficaria presa na tela para sempre.
  useEffect(() => {
    const registrar = contexto?.registrar;
    return () => {
      if (registradoRef.current && registrar) {
        registradoRef.current = false;
        registrar(false);
      }
    };
  }, [contexto]);
}

/** Botão de enviar de um <form action={...}>. Troque `<button>` por este
 * dentro de qualquer formulário e ele ganha o estado de carregando
 * sozinho — o `useFormStatus` do React sabe se o formulário em volta está
 * enviando. Precisa estar DENTRO do <form> (não no mesmo componente que
 * declara o form) pra funcionar. */
export function BotaoAcao({
  children,
  className = "btn-primary",
  carregando,
  title,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  /** O que mostrar no lugar do texto enquanto envia. Padrão: "…" */
  carregando?: ReactNode;
  title?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  useAvisarFaixa(pending);

  return (
    <button type="submit" disabled={pending || disabled} className={className} title={title} aria-busy={pending}>
      {pending ? (carregando ?? "…") : children}
    </button>
  );
}

/** Botão que chama uma ação de servidor direto no clique, sem formulário
 * em volta (ex.: os ✓/✗ da fila de confirmação, o "desfazer" do
 * histórico). Mesmo comportamento visual do BotaoAcao. */
export function BotaoDireto({
  acao,
  children,
  className = "btn-primary",
  carregando,
  title,
  disabled,
}: {
  /** A ação de servidor a chamar. Pode ser assíncrona. */
  acao: () => void | Promise<unknown>;
  children: ReactNode;
  className?: string;
  carregando?: ReactNode;
  title?: string;
  disabled?: boolean;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  useAvisarFaixa(pendente);

  return (
    <button
      type="button"
      disabled={pendente || disabled}
      className={className}
      title={title}
      aria-busy={pendente}
      onClick={() => {
        iniciarTransicao(() => {
          void acao();
        });
      }}
    >
      {pendente ? (carregando ?? "…") : children}
    </button>
  );
}
