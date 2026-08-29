import Link from "next/link";
import { forgotPassword } from "./actions";
import { BotaoAcao } from "@/components/Carregando";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Esqueci minha senha</h1>
        <p className="text-slate-400 text-sm text-center">
          Digite o e-mail da conta da família. Se ele tiver cadastro, mandamos um link pra você
          escolher uma senha nova.
        </p>

        {searchParams.erro && <p className="text-amber-400 text-sm text-center">{searchParams.erro}</p>}

        <form action={forgotPassword} className="space-y-3">
          <input type="email" name="email" placeholder="Seu e-mail" required />
          <BotaoAcao className="btn-primary w-full" carregando="enviando…">
            Enviar link de redefinição
          </BotaoAcao>
        </form>

        <p className="text-sm text-slate-400 text-center">
          <Link href="/login" className="text-casa-accent underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
