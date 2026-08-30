import Link from "next/link";
import { signup } from "./actions";
import { BotaoAcao } from "@/components/Carregando";
import AvisoSenhaSimples from "@/components/AvisoSenhaSimples";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Criar conta da família</h1>
        <p className="text-slate-400 text-sm text-center">
          Só o responsável faz este cadastro, uma vez. As crianças e o resto
          da família entram depois escolhendo o próprio perfil dentro do app —
          sem precisar de e-mail próprio.
        </p>

        {searchParams.erro && (
          <p className="text-amber-400 text-sm text-center">{searchParams.erro}</p>
        )}

        <form action={signup} className="space-y-3">
          <input name="familyName" placeholder="Nome da família (ex.: Família Silva)" required />
          <input type="email" name="email" placeholder="Seu e-mail" required />
          <input type="password" name="password" placeholder="Crie uma senha" minLength={6} required />
          <BotaoAcao className="btn-primary w-full" carregando="criando conta…">
            Criar conta
          </BotaoAcao>
        </form>

        <AvisoSenhaSimples />

        <p className="text-sm text-slate-400 text-center">
          Já tem conta?{" "}
          <Link href="/login" className="text-casa-accent underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
