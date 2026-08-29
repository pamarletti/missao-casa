import { completeOnboarding } from "./actions";

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-lg space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Quem mora na casa?</h1>
          <p className="text-slate-400 text-sm mt-1">
            Cadastre os responsáveis (com um PIN de 4 dígitos cada) e as
            crianças (sem senha — elas entram só escolhendo o próprio nome).
            Dá pra ajustar tudo isso depois.
          </p>
        </div>

        {searchParams.erro && <p className="text-red-400 text-sm">{searchParams.erro}</p>}

        <form action={completeOnboarding} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="font-semibold text-casa-accent">Responsáveis</legend>
            {[1, 2].map((n) => (
              <div key={n} className="grid grid-cols-2 gap-2">
                <input name={`responsavel${n}_nome`} placeholder={`Nome (ex.: Mãe)`} required={n === 1} />
                <input
                  type="password"
                  name={`responsavel${n}_pin`}
                  placeholder="PIN de 4 dígitos"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required={n === 1}
                />
              </div>
            ))}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-semibold text-casa-accent">Crianças</legend>
            {[1, 2, 3, 4].map((n) => (
              <input key={n} name={`crianca${n}_nome`} placeholder={`Nome da criança ${n}`} required={n === 1} />
            ))}
          </fieldset>

          <button type="submit" className="btn-primary w-full">
            Começar a usar
          </button>
        </form>
      </div>
    </main>
  );
}
