"use client";

import { useEffect, useRef, useState } from "react";

/** Aviso que abre sozinho ao chegar na tela de cadastro.
 *
 * Existe porque a senha desta conta não é uma senha pessoal: é UMA conta por
 * família, e o e-mail e a senha vão ser passados para todo mundo que
 * participa da missão. Quem cadastra costuma escolher uma senha difícil por
 * reflexo, e depois a casa inteira tropeça nela.
 *
 * Vale dizer junto o que essa senha NÃO abre: ela leva só até a tela de
 * escolher perfil. O que protege as decisões de dinheiro é o PIN de 4
 * dígitos dos responsáveis, esse sim individual. */
export default function AvisoSenhaSimples() {
  const [aberto, setAberto] = useState(true);
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    botaoRef.current?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs text-slate-400 underline w-full text-center"
      >
        por que uma senha simples?
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-aviso-senha"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAberto(false);
      }}
    >
      <div className="card w-full max-w-sm space-y-3">
        <h2 id="titulo-aviso-senha" className="text-lg font-bold">
          Escolha uma senha simples
        </h2>
        <p className="text-sm text-slate-300">
          Esta senha vai ser compartilhada com as outras pessoas da família que vão participar da missão — todo
          mundo entra com o mesmo e-mail e a mesma senha. Escolha uma que seja fácil de todo mundo lembrar.
        </p>
        <p className="text-sm text-slate-300">
          Ela dá acesso só à conta da família, não ao perfil de ninguém. Depois de entrar, cada pessoa escolhe o
          próprio perfil — e os responsáveis ainda têm um PIN de 4 dígitos só deles, que é o que protege as
          decisões sobre as tarefas e o dinheiro.
        </p>
        <button
          ref={botaoRef}
          type="button"
          className="btn-primary w-full"
          onClick={() => setAberto(false)}
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
