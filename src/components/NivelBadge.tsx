import type { NivelInfo } from "@/lib/nivelConstancia";

/** Indicador mínimo do nível de constância: só o número (1 a 5) e uma
 * estrela — sem card, sem texto explicativo, sem percentual. Fica no topo
 * da página do perfil (ver page.tsx / SaldoCard.tsx). Não renderiza nada
 * enquanto o perfil ainda não tem histórico suficiente (ver
 * src/lib/nivelConstancia.ts). */
export default function NivelBadge({ info }: { info: NivelInfo }) {
  if (info.nivel === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-base font-semibold text-slate-200 shrink-0">
      <span aria-hidden>⭐</span>
      {info.nivel}
    </span>
  );
}
