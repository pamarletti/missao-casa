"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Olho de mostrar/esconder, desenhado em SVG e não com um caractere: os
 * que existem em texto têm variação de emoji e viram desenho colorido no
 * iPhone (foi o que aconteceu com a seta de refazer). */
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
   * guarde. "pin" é o contrário — ver CampoPin, logo abaixo. */
  tipo?: "senha" | "pin";
  /** Reportado ao componente de par, pra comparar os dois valores. */
  onValor?: (v: string) => void;
  refCampo?: React.RefObject<HTMLInputElement>;
  /** Mensagem de erro vinda de fora (ex.: "os dois PINs não batem"). */
  mensagemExtra?: string;
};

/** ──────────────────────────────────────────────────────────────
 * PIN: uma caixinha por dígito.
 *
 * Por que não é um campo só, escondido como senha: o Safari (e o Senhas do
 * iCloud junto) classifica como senha qualquer campo obscurecido, mesmo sem
 * ser type="password" — e aí oferece gravar o PIN por cima da senha da
 * conta da família. Nesses campos ele ignora `autocomplete="off"`, então
 * não existe atributo que resolva.
 *
 * Quatro caixas de um dígito não têm a forma de uma credencial: nenhum
 * gerenciador se oferece para guardar, e o navegador não pergunta nada. E
 * de quebra é melhor no celular — teclado numérico, um toque por dígito, o
 * cursor pulando sozinho.
 *
 * O que aparece na caixa é um "•" desenhado por nós; o dígito de verdade
 * fica só na memória da página e é enviado por um campo escondido. Nem o
 * valor visível é o segredo.
 * ────────────────────────────────────────────────────────────── */
function CampoPin({
  name,
  placeholder,
  maxLength = 4,
  required,
  autoFocus,
  onValor,
  refCampo,
  mensagemExtra,
}: PropsCampo) {
  const tamanho = maxLength;
  const [digitos, setDigitos] = useState<string[]>(() => Array(tamanho).fill(""));
  const [visivel, setVisivel] = useState(false);
  const caixas = useRef<(HTMLInputElement | null)[]>([]);
  const valor = digitos.join("");

  useEffect(() => {
    onValor?.(valor);
  }, [valor, onValor]);

  // A validação mora na primeira caixa: é ela que o navegador foca e onde
  // mostra o balãozinho quando o envio é barrado.
  useEffect(() => {
    const primeira = caixas.current[0];
    if (!primeira) return;
    const faltando = required && valor.length !== tamanho;
    primeira.setCustomValidity(faltando ? `Digite os ${tamanho} números.` : mensagemExtra || "");
  }, [valor, required, tamanho, mensagemExtra]);

  function escrever(i: number, bruto: string) {
    const novos = bruto.replace(/[^0-9]/g, "");
    const copia = [...digitos];

    if (novos.length === 0) {
      copia[i] = "";
      setDigitos(copia);
      return;
    }

    // Aceita colagem: os dígitos vão caindo nas caixas seguintes.
    let j = i;
    for (const d of novos) {
      if (j >= tamanho) break;
      copia[j] = d;
      j += 1;
    }
    setDigitos(copia);
    caixas.current[Math.min(j, tamanho - 1)]?.focus();
  }

  function aoTeclar(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digitos[i] && i > 0) {
      e.preventDefault();
      const copia = [...digitos];
      copia[i - 1] = "";
      setDigitos(copia);
      caixas.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) caixas.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < tamanho - 1) caixas.current[i + 1]?.focus();
  }

  return (
    <div>
      <input type="hidden" name={name} value={valor} />
      <div className="flex items-center gap-2" role="group" aria-label={placeholder}>
        {digitos.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              caixas.current[i] = el;
              if (i === 0 && refCampo) {
                (refCampo as React.MutableRefObject<HTMLInputElement | null>).current = el;
              }
            }}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            aria-label={`${placeholder} — ${i + 1}º número`}
            autoFocus={autoFocus && i === 0}
            value={d ? (visivel ? d : "•") : ""}
            onChange={(e) => escrever(i, e.target.value)}
            onKeyDown={(e) => aoTeclar(i, e)}
            onFocus={(e) => e.target.select()}
            className="w-12 text-center text-lg px-0"
          />
        ))}
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Esconder" : "Mostrar"}
          title={visivel ? "Esconder" : "Mostrar"}
          aria-pressed={visivel}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition"
        >
          <Olho aberto={visivel} />
        </button>
      </div>
    </div>
  );
}

/** Campo de senha comum, com o olho. Quando `tipo` é "pin", vira as
 * caixinhas acima — assim nenhum lugar que usa este componente precisa
 * saber da diferença. */
export default function CampoSegredo(props: PropsCampo) {
  const {
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
  } = props;

  const [visivel, setVisivel] = useState(false);

  if (tipo === "pin") return <CampoPin {...props} />;

  return (
    <div className="relative">
      <input
        ref={refCampo}
        type={visivel ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        inputMode={inputMode}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onChange={(e) => onValor?.(e.target.value)}
        className="pr-11 w-full"
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
 * A conferência é feita aqui, na hora da digitação — o navegador barra o
 * envio e mostra a mensagem, do mesmo jeito que já faz com "campo
 * obrigatório". O servidor confere de novo, que é quem realmente decide. */
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
  const erro = valor !== confirmacao ? mensagemDivergencia : "";

  // Num campo de senha comum a validação é posta aqui; no PIN, quem cuida
  // dela é o próprio CampoPin, que recebe a mensagem por `mensagemExtra`.
  useEffect(() => {
    if (resto.tipo === "pin") return;
    refConfirmacao.current?.setCustomValidity(erro);
  }, [erro, resto.tipo]);

  return (
    <div className="space-y-2">
      <CampoSegredo {...resto} name={name} placeholder={placeholder} onValor={setValor} />
      <CampoSegredo
        {...resto}
        name={nomeConfirmacao}
        placeholder={placeholderConfirmacao}
        onValor={setConfirmacao}
        refCampo={refConfirmacao}
        mensagemExtra={erro}
      />
      {divergem && (
        <p id={idAviso} className="text-xs text-amber-400">
          {mensagemDivergencia}
        </p>
      )}
    </div>
  );
}
