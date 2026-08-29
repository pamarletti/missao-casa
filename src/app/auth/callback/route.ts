import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Depois de clicar num link de e-mail do Supabase que precisa deixar a
 * pessoa de fato logada no navegador (hoje: "Esqueci minha senha") — o
 * Supabase manda pra cá com um "code" na URL. Trocamos esse code pela
 * sessão de verdade (guardada em cookies) e só depois mandamos pra frente,
 * pra página que pediu o redirecionamento (`next`). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
