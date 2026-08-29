"use client";

import type { ReactNode } from "react";
import { BotaoAcao } from "@/components/Carregando";

/** Existe por dois motivos, os dois ligados ao bug de perfis duplicados
 * que aconteceu com uma família de teste: o botão "Começar a usar" precisa
 * (a) avisar que está trabalhando, e (b) desabilitar depois do primeiro
 * clique, pra o cadastro não ser enviado duas vezes. O BotaoAcao faz as
 * duas coisas sozinho. O servidor (completeOnboarding) também tem uma
 * trava própria, independente desta — ver comentário lá. */
export default function OnboardingForm({
  action,
  children,
}: {
  action: (formData: FormData) => void;
  children: ReactNode;
}) {
  return (
    <form action={action} className="space-y-6">
      {children}
      <BotaoAcao className="btn-primary w-full" carregando="cadastrando…">
        Começar a usar
      </BotaoAcao>
    </form>
  );
}
