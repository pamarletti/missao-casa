"use server";

import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile, setActiveProfile, clearActiveProfile } from "@/lib/activeProfile";

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

export async function selectChildProfile(profileId: string) {
  await setActiveProfile(profileId, "crianca");
  redirect(`/app/${profileId}`);
}

export async function verifyPinAndSelect(formData: FormData) {
  const profileId = String(formData.get("profileId") || "");
  const pin = String(formData.get("pin") || "");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, pin_hash")
    .eq("id", profileId)
    .eq("kind", "responsavel")
    .single();

  if (!profile || profile.pin_hash !== hashPin(pin)) {
    redirect(`/app?erro=PIN incorreto&perfil=${profileId}`);
  }

  await setActiveProfile(profileId, "responsavel");
  redirect(`/app/${profileId}`);
}

export async function mudarPin(formData: FormData) {
  const profileId = String(formData.get("profileId") || "");
  const pinAtual = String(formData.get("pinAtual") || "");
  const novoPin = String(formData.get("novoPin") || "");
  const confirmacao = String(formData.get("confirmacao") || "");

  if (!/^\d{4}$/.test(novoPin)) {
    redirect(`/app/${profileId}?erroPin=${encodeURIComponent("O novo PIN precisa ter exatamente 4 números")}`);
  }
  if (novoPin !== confirmacao) {
    redirect(`/app/${profileId}?erroPin=${encodeURIComponent("A confirmação não bate com o novo PIN")}`);
  }

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, pin_hash")
    .eq("id", profileId)
    .eq("kind", "responsavel")
    .single();

  if (!profile || profile.pin_hash !== hashPin(pinAtual)) {
    redirect(`/app/${profileId}?erroPin=${encodeURIComponent("PIN atual incorreto")}`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ pin_hash: hashPin(novoPin) })
    .eq("id", profileId);

  if (error) {
    redirect(`/app/${profileId}?erroPin=${encodeURIComponent("Não deu pra salvar o novo PIN, tenta de novo")}`);
  }

  redirect(`/app/${profileId}?pinAlterado=1`);
}

/** Qualquer perfil (responsável ou criança) escolhe o próprio emoji, que
 * passa a aparecer no lugar do ícone padrão na tela de seleção de perfil e
 * no topo do próprio painel. */
export async function mudarIcone(formData: FormData) {
  const profileId = String(formData.get("profileId") || "");
  const icone = String(formData.get("icone") || "").trim();

  const active = await getActiveProfile();
  if (!active || active.profileId !== profileId) return;
  if (!icone) return;

  const supabase = createClient();
  await supabase.from("profiles").update({ icon: icone }).eq("id", profileId);

  redirect(`/app/${profileId}`);
}

export async function logout() {
  const supabase = createClient();
  await clearActiveProfile();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function trocarPerfil() {
  await clearActiveProfile();
  redirect("/app");
}
