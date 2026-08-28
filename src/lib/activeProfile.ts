import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "mc_active_profile";

function sign(value: string) {
  const secret = process.env.PROFILE_COOKIE_SECRET!;
  return createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * Marca qual perfil (André, Hugo, Mãe, Pai) está "logado" no app neste
 * dispositivo/navegador, assinado para que não dê para forjar no cliente.
 * Não é uma autenticação de verdade (a família toda compartilha 1 login no
 * Supabase Auth) — é o suficiente para separar quem está usando o app agora
 * e para as Server Actions saberem quem confirmou o quê.
 */
export async function setActiveProfile(profileId: string, kind: "crianca" | "responsavel") {
  const value = `${profileId}:${kind}`;
  const signature = sign(value);
  cookies().set(COOKIE_NAME, `${value}:${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
}

export async function getActiveProfile(): Promise<{ profileId: string; kind: "crianca" | "responsavel" } | null> {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const parts = raw.split(":");
  if (parts.length !== 3) return null;
  const [profileId, kind, signature] = parts;

  const expected = sign(`${profileId}:${kind}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (kind !== "crianca" && kind !== "responsavel") return null;

  return { profileId, kind };
}

export async function clearActiveProfile() {
  cookies().delete(COOKIE_NAME);
}
