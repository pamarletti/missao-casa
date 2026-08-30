"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Campo de senha ou PIN com um olho pra mostrar o que foi digitado.
 *
 * Por que existe: os campos do app são todos `type="password"`, então o que
 * a pessoa digita vira bolinha. Numa senha que vai ser passada pra família
 * toda, e num PIN de 4 dígitos digitado no celular, errar uma tecla sem
 * perceber é o caso comum — e o erro só aparece depois, na hora de entrar.
 *
 * O olho é SVG desenhado à mão, não um emoji: caractere com variação de
 * emoji vira desenho colorido no iPhone (foi o que aconteceu com a seta de
 * refazer). */
function Olho({ aberto }: { aberto: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" />
      {!aberto && <path d="M4 20 20 4" strokeLinecap="round" />}
    </svg>
  );
}

type PropsCampo = {
  name: string;
  placeholder: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  inputMode?: "numeric" | "text";
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  /** "senha" é uma senha de verdade, que a família QUER que o navegador
   * guarde. "pin" é o contrário: não pode ser memorizado nem oferecido por
   * gerenciador de senhas — é um segredo curto, de uso interno, que só faz
   * sentido digitado na hora. */
  tipo?: "senha" | "pin";
  /** Reportado ao componente de par, pra comparar os dois valores. */
  onValor?: (v: string) => void;
  refCampo?: React.RefObject<HTMLInputElement>;
};

export default function CampoSegredo({
  name,
  placeholder,
  minLength,
  maxLength,
  pattern,
  inputMode,
  required,
  autoComplete,
  autoFocus,
  tipo = "senha",
  onValor,
  refCampo,
}: PropsCampo) {
  const [visivel, setVisivel] = useState(false);
  const ehPin = tipo === "pin";

  // Plano B para navegador antigo: se ele não souber mascarar um campo de
  // texto por CSS, o PIN volta a ser type="password". Some a proteção
  // contra o gerenciador de senhas, mas o PIN nunca aparece na tela — entre
  // as duas coisas, esconder é a que não pode falhar. Começa em `true`
  // porque hoje todos os navegadores atuais sabem fazer isso; a checagem só
  // corrige o caso raro.
  const [mascaraPorCss, setMascaraPorCss] = useState(true);
  useEffect(() => {
    if (!ehPin) return;
    const suporta =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      (CSS.supports("-webkit-text-security", "disc") || CSS.supports("text-security", "disc"));
    setMascaraPorCss(suporta);
  }, [ehPin]);

  const comoTexto = ehPin && mascaraPorCss;

  return (
    <div className="relative">
      <input
        ref={refCampo}
        type={visivel || comoTexto ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        inputMode={inputMode}
        required={required}
        // Num PIN, dizer ao navegador para não completar E pedir a cada
        // gerenciador conhecido que ignore o campo. Cada um tem o seu
        // atributo próprio; não existe um que sirva para todos.
        autoComplete={ehPin ? "off" : autoComplete}
        {...(ehPin
          ? {
              "data-1p-ignore": "true",
              "data-lpignore": "true",
              "data-bwignore": "true",
              "data-form-type": "other",
            }
          : {})}
        autoFocus={autoFocus}
        onChange={(e) => onValor?.(e.target.value)}
        className={"pr-11 w-full" + (comoTexto && !visivel ? " mascarado" : "")}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Esconder" : "Mostrar"}
        title={visivel ? "Esconder" : "Mostrar"}
        aria-pressed={visivel}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition"
      >
        <Olho aberto={visivel} />
      </button>
    </div>
  );
}

/** Dois campos: o segredo e a confirmação dele.
 *
 * A conferência é feita aqui, na hora da digitação, via `setCustomValidity`
 * — assim o próprio navegador barra o envio e mostra a mensagem, do mesmo
 * jeito que já faz com "campo obrigatório". O servidor confere de novo, que
 * é quem realmente decide. */
export function ParDeSegredos({
  name,
  placeholder,
  placeholderConfirmacao,
  nomeConfirmacao = "confirmacao",
  mensagemDivergencia,
  ...resto
}: PropsCampo & {
  placeholderConfirmacao: string;
  nomeConfirmacao?: string;
  mensagemDivergencia: string;
}) {
  const [valor, setValor] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const refConfirmacao = useRef<HTMLInputElement>(null);
  const idAviso = useId();

  const divergem = confirmacao.length > 0 && valor !== confirmacao;

  useEffect(() => {
    refConfirmacao.current?.setCustomValidity(valor !== confirmacao ? mensagemDivergencia : "");
  }, [valor, confirmacao, mensagemDivergencia]);

  return (
    <div className="space-y-2">
      <CampoSegredo {...resto} name={name} placeholder={placeholder} onValor={setValor} />
      <CampoSegredo
        {...resto}
        name={nomeConfirmacao}
        placeholder={placeholderConfirmacao}
        onValor={setConfirmacao}
        refCampo={refConfirmacao}
      />
      {divergem && (
        <p id={idAviso} className="text-xs text-amber-400">
          {mensagemDivergencia}
        </p>
      )}
    </div>
  );
}
