"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/siteUrl";

export async function forgotPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    redirect(`/forgot-password?erro=${encodeURIComponent("Digite o e-mail da conta.")}`);
  }

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });

  // Mensagem sempre igual, exista ou não conta com esse e-mail — evita
  // vazar pra quem está tentando adivinhar quais e-mails têm conta (mesmo
  // cuidado que o próprio Supabase toma no cadastro).
  redirect(
    `/login?erro=${encodeURIComponent("Se esse e-mail tiver uma conta cadastrada, mandamos um link pra redefinir a senha.")}`
  );
}
