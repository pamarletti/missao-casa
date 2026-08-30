"use client";

import { useState } from "react";
import JanelaAviso from "@/components/JanelaAviso";

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
    <JanelaAviso titulo="Escolha uma senha simples" onFechar={() => setAberto(false)}>
      <p className="text-sm text-slate-300">
        Esta senha vai ser compartilhada com as outras pessoas da família que vão participar da missão — todo
        mundo entra com o mesmo e-mail e a mesma senha. Escolha uma que seja fácil de todo mundo lembrar.
      </p>
      <p className="text-sm text-slate-300">
        Ela dá acesso só à conta da família, não ao perfil de ninguém. Depois de entrar, cada pessoa escolhe o
        próprio perfil — e os responsáveis ainda têm um PIN de 4 dígitos só deles, que é o que protege as
        decisões sobre as tarefas e o dinheiro.
      </p>
    </JanelaAviso>
  );
}
