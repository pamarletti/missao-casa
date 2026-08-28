import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/activeProfile";
import { trocarPerfil, logout } from "@/app/app/actions";
import { markOrRequest, markColetivaDone } from "./actions";
import ConfirmQueue, { type PendingEvent } from "@/components/ConfirmQueue";

const CATEGORIA_LABEL: Record<string, string> = {
  individual: "Suas tarefas",
  individual_coletiva: "Do seu espaço (quarto)",
  coletiva: "Tarefas coletivas (bônus)",
};

export default async function Dashboard({ params }: { params: { profileId: string } }) {
  const active = await getActiveProfile();
  if (!active || active.profileId !== params.profileId) redirect("/app");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, kind, family_id, families(name)")
    .eq("id", params.profileId)
    .single();

  if (!profile) redirect("/app");

  const familyId = profile.family_id as string;
  const today = new Date().toISOString().slice(0, 10);

  if (profile.kind === "responsavel") {
    const { data: pending, error: pendingError } = await supabase
      .from("task_events")
      .select("id, status, valor, data, task_catalog(name), profiles!task_events_profile_id_fkey(name)")
      .eq("family_id", familyId)
      .in("status", ["aguardando_autorizacao", "aguardando_confirmacao"])
      .order("created_at", { ascending: true });

    if (pendingError) {
      console.error("Erro ao buscar pendências:", pendingError.message);
    }

    return (
      <Shell title={`Olá, ${profile.name}`} onLogout={logout} onTrocarPerfil={trocarPerfil}>
        <h2 className="text-lg font-semibold mb-3">Pendências</h2>
        <ConfirmQueue familyId={familyId} events={(pending ?? []) as unknown as PendingEvent[]} />
      </Shell>
    );
  }

  // Perfil criança
  const { data: catalog } = await supabase
    .from("task_catalog")
    .select("id, name, categoria, valor_unitario")
    .eq("family_id", familyId)
    .eq("ativo", true)
    .order("categoria");

  const { data: meusEventosHoje } = await supabase
    .from("task_events")
    .select("task_id, status, id")
    .eq("profile_id", profile.id)
    .eq("data", today);

  const statusPorTarefa = new Map((meusEventosHoje ?? []).map((e) => [e.task_id, e]));

  const { data: mesEventos } = await supabase
    .from("task_events")
    .select("valor, status")
    .eq("profile_id", profile.id)
    .eq("status", "confirmado")
    .gte("data", today.slice(0, 8) + "01");

  const saldoDoMes = (mesEventos ?? []).reduce((acc, e) => acc + Number(e.valor), 0);

  const categorias = ["individual", "individual_coletiva", "coletiva"] as const;

  return (
    <Shell title={`Oi, ${profile.name}!`} onLogout={logout} onTrocarPerfil={trocarPerfil}>
      <div className="card mb-6">
        <p className="text-slate-400 text-sm">Saldo confirmado este mês</p>
        <p className="text-3xl font-bold text-casa-accent">R$ {saldoDoMes.toFixed(2)}</p>
      </div>

      {categorias.map((cat) => {
        const tarefas = (catalog ?? []).filter((t) => t.categoria === cat);
        if (tarefas.length === 0) return null;
        return (
          <section key={cat} className="mb-6">
            <h2 className="text-lg font-semibold mb-3">{CATEGORIA_LABEL[cat]}</h2>
            <ul className="space-y-2">
              {tarefas.map((t) => {
                const evento = statusPorTarefa.get(t.id);
                return (
                  <li key={t.id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-slate-400">R$ {Number(t.valor_unitario).toFixed(2)}</p>
                    </div>
                    {!evento && cat !== "coletiva" && (
                      <form action={markOrRequest.bind(null, t.id, familyId)}>
                        <button className="btn-primary text-sm">Feito</button>
                      </form>
                    )}
                    {!evento && cat === "coletiva" && (
                      <form action={markOrRequest.bind(null, t.id, familyId)}>
                        <button className="btn-secondary text-sm">Quero fazer</button>
                      </form>
                    )}
                    {evento?.status === "liberada" && (
                      <form action={markColetivaDone.bind(null, evento.id)}>
                        <button className="btn-primary text-sm">Feito</button>
                      </form>
                    )}
                    {evento && ["aguardando_confirmacao", "aguardando_autorizacao"].includes(evento.status) && (
                      <span className="text-sm text-amber-400">
                        {evento.status === "aguardando_autorizacao" ? "esperando liberação" : "aguardando confirmação"}
                      </span>
                    )}
                    {evento?.status === "confirmado" && <span className="text-sm text-green-400">confirmado ✓</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Shell>
  );
}

function Shell({
  title,
  children,
  onLogout,
  onTrocarPerfil,
}: {
  title: string;
  children: React.ReactNode;
  onLogout: () => void;
  onTrocarPerfil: () => void;
}) {
  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex gap-2">
          <form action={onTrocarPerfil}>
            <button className="text-sm text-slate-400 underline">trocar perfil</button>
          </form>
          <form action={onLogout}>
            <button className="text-sm text-slate-500 underline">sair</button>
          </form>
        </div>
      </header>
      {children}
    </main>
  );
}
