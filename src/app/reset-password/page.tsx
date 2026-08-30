import { resetPassword } from "./actions";
import { BotaoAcao } from "@/components/Carregando";
import { ParDeSegredos } from "@/components/CampoSegredo";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Nova senha</h1>
        <p className="text-slate-400 text-sm text-center">Escolha uma nova senha para a conta da família.</p>

        {searchParams.erro && <p className="text-red-400 text-sm text-center">{searchParams.erro}</p>}

        <form action={resetPassword} className="space-y-3">
          <ParDeSegredos
            name="password"
            placeholder="Nova senha"
            placeholderConfirmacao="Confirme a nova senha"
            minLength={6}
            required
            autoComplete="new-password"
            mensagemDivergencia="As duas senhas precisam ser iguais."
          />
          <BotaoAcao className="btn-primary w-full" carregando="salvando…">
            Salvar nova senha
          </BotaoAcao>
        </form>
      </div>
    </main>
  );
}
