import Link from "next/link";
import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { erro?: string; contaCancelada?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">🏠 Missão Casa</h1>
        <p className="text-slate-400 text-sm text-center">
          Entre com a conta da família (o e-mail e senha que o responsável
          cadastrou).
        </p>

        {searchParams.contaCancelada && (
          <p className="text-green-400 text-sm text-center">
            A conta da família foi cancelada e todos os dados foram apagados.
          </p>
        )}

        {searchParams.erro && (
          <p className="text-red-400 text-sm text-center">{searchParams.erro}</p>
        )}

        <form action={login} className="space-y-3">
          <input type="email" name="email" placeholder="E-mail da família" required />
          <input type="password" name="password" placeholder="Senha" required />
          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>
        </form>

        <p className="text-sm text-slate-400 text-center">
          Primeira vez por aqui?{" "}
          <Link href="/signup" className="text-casa-accent underline">
            Criar conta da família
          </Link>
        </p>
      </div>
    </main>
  );
}
