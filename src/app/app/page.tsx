import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { selectChildProfile, verifyPinAndSelect } from "./actions";

const ICONS: Record<string, string> = { crianca: "🧒", responsavel: "🛡️" };

export default async function ProfilePickerPage({
  searchParams,
}: {
  searchParams: { erro?: string; perfil?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: family } = await supabase
    .from("families")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .single();

  if (!family) redirect("/onboarding");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, kind")
    .eq("family_id", family.id)
    .order("kind", { ascending: true });

  if (!profiles || profiles.length === 0) redirect("/onboarding");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">{family.name}</h1>
        <p className="text-slate-400 text-sm text-center">Quem é você?</p>

        <div className="grid grid-cols-2 gap-4">
          {profiles.map((p) =>
            p.kind === "crianca" ? (
              <form key={p.id} action={selectChildProfile.bind(null, p.id)}>
                <button type="submit" className="card w-full flex flex-col items-center gap-2 hover:ring-2 ring-casa-accent">
                  <span className="text-4xl">{ICONS.crianca}</span>
                  <span className="font-semibold">{p.name}</span>
                </button>
              </form>
            ) : (
              <details key={p.id} className="card" open={searchParams.perfil === p.id}>
                <summary className="cursor-pointer flex flex-col items-center gap-2 list-none">
                  <span className="text-4xl">{ICONS.responsavel}</span>
                  <span className="font-semibold">{p.name}</span>
                </summary>
                <form action={verifyPinAndSelect} className="mt-3 space-y-2">
                  <input type="hidden" name="profileId" value={p.id} />
                  <input name="pin" placeholder="PIN" inputMode="numeric" maxLength={4} autoFocus />
                  <button type="submit" className="btn-secondary w-full text-sm">
                    Entrar
                  </button>
                  {searchParams.erro && searchParams.perfil === p.id && (
                    <p className="text-red-400 text-xs text-center">{searchParams.erro}</p>
                  )}
                </form>
              </details>
            )
          )}
        </div>
      </div>
    </main>
  );
}
