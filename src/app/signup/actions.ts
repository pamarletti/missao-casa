"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const familyName = String(formData.get("familyName") || "Minha família");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    redirect(`/signup?erro=${encodeURIComponent(error?.message ?? "Não deu para criar a conta")}`);
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
