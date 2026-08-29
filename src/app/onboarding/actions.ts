"use server";

import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

export async function completeOnboarding(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: family } = await supabase
    .from("families")
    .select("id")
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  // Se a família ainda não existe (ex.: confirmação de e-mail estava ligada
  // no momento do cadastro, então não havia sessão para criá-la ali), cria
  // agora — o usuário já está autenticado nesse ponto.
  if (!family) {
    const { data: novaFamilia, error: criarFamiliaError } = await supabase
      .from("families")
      .insert({ owner_user_id: user!.id, name: "Minha família" })
      .select("id")
      .single();

    if (criarFamiliaError || !novaFamilia) {
      redirect(
        `/onboarding?erro=${encodeURIComponent(
          "Não consegui criar a família: " + (criarFamiliaError?.message ?? "erro desconhecido")
        )}`
      );
    }
    family = novaFamilia;
  }

  // Trava contra cadastro duplicado: se a família já tem algum perfil, o
  // cadastro já foi concluído antes (ex.: clique duplo em "Começar a usar",
  // ou reenvio depois de voltar a página) — não cria os perfis de novo, só
  // manda direto pro app. Existia um bug em que isso não era checado e cada
  // envio extra criava um conjunto duplicado de perfis (mesmos nomes,
  // saldo zerado) na mesma família.
  const { count: perfisExistentes } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("family_id", family!.id);

  if ((perfisExistentes ?? 0) > 0) {
    redirect("/app");
  }

  const profiles: {
    family_id: string;
    name: string;
    kind: "crianca" | "responsavel";
    pin_hash: string | null;
  }[] = [];

  for (const key of ["responsavel1", "responsavel2"]) {
    const nome = String(formData.get(`${key}_nome`) || "").trim();
    const pin = String(formData.get(`${key}_pin`) || "").trim();
    if (nome && pin) {
      profiles.push({ family_id: family!.id, name: nome, kind: "responsavel", pin_hash: hashPin(pin) });
    }
  }

  for (const key of ["crianca1", "crianca2", "crianca3", "crianca4"]) {
    const nome = String(formData.get(`${key}_nome`) || "").trim();
    if (nome) {
      profiles.push({ family_id: family!.id, name: nome, kind: "crianca", pin_hash: null });
    }
  }

  if (profiles.length === 0) {
    redirect(`/onboarding?erro=${encodeURIComponent("Cadastre pelo menos um responsável e uma criança.")}`);
  }

  const { error: profilesError } = await supabase.from("profiles").insert(profiles);
  if (profilesError) {
    redirect(`/onboarding?erro=${encodeURIComponent(profilesError.message)}`);
  }

  const { error: seedError } = await supabase.rpc("seed_default_catalog", {
    p_family_id: family!.id,
  });
  if (seedError) {
    redirect(`/onboarding?erro=${encodeURIComponent("Perfis criados, mas o catálogo padrão falhou: " + seedError.message)}`);
  }

  redirect("/app");
}
