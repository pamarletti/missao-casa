"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/** Existe só pra evitar o bug de perfis duplicados: se a pessoa clicar
 * duas vezes em "Começar a usar" (dedo lento, rede lenta, dois toques por
 * engano), o botão já fica desabilitado depois do primeiro clique, então o
 * cadastro não é enviado duas vezes. O servidor (completeOnboarding) também
 * ganhou uma trava própria, independente desta aqui — ver comentário lá. */
export default function OnboardingForm({
  action,
  children,
}: {
  action: (formData: FormData) => void;
  children: ReactNode;
}) {
  const [enviando, setEnviando] = useState(false);

  return (
    <form action={action} className="space-y-6" onSubmit={() => setEnviando(true)}>
      {children}
      <button type="submit" disabled={enviando} className="btn-primary w-full disabled:opacity-50">
        {enviando ? "Cadastrando..." : "Começar a usar"}
      </button>
    </form>
  );
}
