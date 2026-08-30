"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/erros";

export async function signup(formData: FormData) {
  const familyName = String(formData.get("familyName") || "Minha família");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const confirmacao = String(formData.get("confirmacao") || "");

  // O navegador já barra isso pelo campo de confirmação, mas quem decide é
  // o servidor: um formulário pode chegar aqui por outro caminho.
  if (password !== confirmacao) {
    redirect(`/signup?erro=${encodeURIComponent("As duas senhas precisam ser iguais.")}`);
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/signup?erro=${encodeURIComponent(mensagemDeErro(error.message))}`);
  }
  if (!data.user) {
    redirect(`/signup?erro=${encodeURIComponent("Não deu para criar a conta")}`);
  }

  // Quando o e-mail já pertence a uma conta confirmada, o Supabase não
  // devolve erro nenhum (pra não vazar pra quem tenta adivinhar e-mails
  // cadastrados) — em vez disso, devolve um usuário "fantasma" com
  // identities vazio. É assim que detectamos e avisamos com uma mensagem
  // clara, em vez de deixar a pessoa achando que criou a conta.
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    redirect(
      `/signup?erro=${encodeURIComponent(
        'Esse e-mail já tem uma conta cadastrada. Tenta entrar, ou usa "Esqueci minha senha" se não lembrar a senha.'
      )}`
    );
  }

  // Se a confirmação de e-mail estiver ligada no projeto Supabase, data.session
  // vem nula aqui — a família confirma pelo e-mail e depois faz login normal,
  // completando o onboarding na primeira entrada.
  if (data.session) {
    const { error: familyError } = await supabase
      .from("families")
      .insert({ owner_user_id: data.user!.id, name: familyName });

    if (familyError) {
      redirect(`/signup?erro=${encodeURIComponent(familyError.message)}`);
    }

    redirect("/onboarding");
  }

  redirect("/login?erro=Conta criada! Confirme seu e-mail e depois entre.");
}
