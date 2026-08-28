"use server";

import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { setActiveProfile, clearActiveProfile } from "@/lib/activeProfile";

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
