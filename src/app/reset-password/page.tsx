import { resetPassword } from "./actions";
import { BotaoAcao } from "@/components/Carregando";

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
          <input type="password" name="password" placeholder="Nova senha" minLength={6} required />
          <input type="password" name="confirmacao" placeholder="Confirme a nova senha" minLength={6} required />
          <BotaoAcao className="btn-primary w-full" carregando="salvando…">
            Salvar nova senha
          </BotaoAcao>
        </form>
      </div>
    </main>
  );
}
