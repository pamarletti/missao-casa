"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function resetPassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmacao = String(formData.get("confirmacao") || "");

  if (password.length < 6) {
    redirect(`/reset-password?erro=${encodeURIComponent("A senha precisa ter pelo menos 6 caracteres.")}`);
  }
  if (password !== confirmacao) {
    redirect(`/reset-password?erro=${encodeURIComponent("As senhas não são iguais.")}`);
  }

  const supabase = createClient();

  // Só chega até aqui com sessão de verdade se veio do link de e-mail (que
  // passa por src/app/auth/callback/route.ts antes). Se não tiver sessão,
  // o link expirou ou já foi usado.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?erro=${encodeURIComponent(
        'O link de redefinição expirou ou já foi usado. Peça um novo em "Esqueci minha senha".'
      )}`
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?erro=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect(`/login?erro=${encodeURIComponent("Senha alterada! Entre com a nova senha.")}`);
}
