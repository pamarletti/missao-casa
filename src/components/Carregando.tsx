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

function rotaAtual() {
  return window.location.pathname + window.location.search;
}

/** Envolve o app inteiro (em src/app/layout.tsx) e desenha a faixa do topo.
 * Conta quantas ações estão em andamento ao mesmo tempo, pra faixa não
 * sumir cedo demais quando duas coisas rodam juntas.
 *
 * Também é aqui que fica a guarda do lugar da página (ver `restaurar`
 * abaixo): como todo botão de ação do app passa por este contador, ele é o
 * único ponto que sabe exatamente quando uma ação começou e quando ela
 * terminou de aparecer na tela. */
export function CarregandoProvider({ children }: { children: ReactNode }) {
  const [emAndamento, setEmAndamento] = useState(0);

  // Contador de verdade num ref, além do estado: o estado só existe pra
  // desenhar a faixa, e a conta precisa estar certa no instante do clique,
  // sem esperar re-render.
  const contadorRef = useRef(0);
  const posicaoRef = useRef<{ y: number; rota: string } | null>(null);

  /** Devolve a página para onde ela estava antes da ação.
   *
   * Por que isso é necessário: quando uma ação de servidor termina, ela
   * marca a página como desatualizada (`revalidatePath`) e o Next busca o
   * conteúdo novo como se fosse uma navegação — e navegação, por padrão,
   * começa no topo. Na prática, abrir uma lista lá no fim do catálogo ou
   * marcar uma tarefa no meio da tela jogava a pessoa de volta pro começo
   * da página, e ela tinha que rolar tudo de novo pra continuar de onde
   * parou.
   *
   * Fica de olho por meio segundo depois que a ação termina (o pulo pro
   * topo às vezes acontece um instante depois) e só age se realmente
   * pularam. As travas, pra nunca puxar a tela de volta na hora errada:
   *  1. Se a ação levou pra OUTRA página (trocar perfil, sair, mudar PIN),
   *     o topo é o certo mesmo — não mexe.
   *  2. Enquanto a página não estiver no topo, ninguém a moveu — não mexe.
   *  3. Só volta quando o conteúdo novo já cresceu o bastante pra aquela
   *     altura existir; enquanto não crescer, espera o próximo quadro.
   *  4. Passado o meio segundo, desiste — se nada pulou, não pula mais. */
  const restaurar = useCallback(() => {
    const alvo = posicaoRef.current;
    posicaoRef.current = null;
    if (!alvo || alvo.y <= 8) return;

    let quadros = 0;
    const tentar = () => {
      if (rotaAtual() !== alvo.rota) return;

      if (window.scrollY <= 4) {
        const alturaDisponivel = document.documentElement.scrollHeight - window.innerHeight;
        if (alturaDisponivel >= alvo.y - 4) {
          window.scrollTo(0, alvo.y);
          return;
        }
      }

      if (quadros++ < 30) requestAnimationFrame(tentar);
    };
    requestAnimationFrame(tentar);
  }, []);

  const registrar = useCallback(
    (ativo: boolean) => {
      if (ativo) {
        contadorRef.current += 1;
        // Guarda o lugar no clique da primeira ação — ações encadeadas não
        // sobrescrevem o ponto de partida.
        if (contadorRef.current === 1) {
          posicaoRef.current = { y: window.scrollY, rota: rotaAtual() };
        }
      } else {
        contadorRef.current = Math.max(0, contadorRef.current - 1);
        if (contadorRef.current === 0) restaurar();
      }
      setEmAndamento(contadorRef.current);
    },
    [restaurar]
  );

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
