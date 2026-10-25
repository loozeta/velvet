import { redirect } from "next/navigation";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { AdminButton } from "./AdminButton";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const { profile } = await getUserAndProfile();
  if (profile?.role !== "admin") redirect("/");

  const db = createAdmin();
  const [users, reports, blocked, revenue] = await Promise.all([
    db.from("profiles").select("id, email, credits, banned, created_at").order("created_at", { ascending: false }).limit(50),
    db.from("reports").select("id, reason, generation_id, generations(result_url, prompt)").eq("resolved", false).limit(50),
    db.from("moderation_log").select("id, prompt, reason, user_id, created_at").order("created_at", { ascending: false }).limit(30),
    db.from("payments").select("amount_cents").eq("status", "paid"),
  ]);
  const total = (revenue.data ?? []).reduce((a, p) => a + p.amount_cents, 0);

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <h1 className="text-3xl font-bold">Administración</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><div className="text-2xl font-bold">{users.data?.length ?? 0}</div><div className="text-sm text-muted">Usuarios (últimos 50)</div></div>
        <div className="card p-4"><div className="text-2xl font-bold">{reports.data?.length ?? 0}</div><div className="text-sm text-muted">Reportes abiertos</div></div>
        <div className="card p-4"><div className="text-2xl font-bold">${(total / 100).toFixed(2)}</div><div className="text-sm text-muted">Ingresos</div></div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Reportes</h2>
        <div className="space-y-3">
          {reports.data?.map((r) => {
            const g = Array.isArray(r.generations) ? r.generations[0] : r.generations;
            return (
              <div key={r.id} className="card flex items-center gap-4 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g?.result_url ?? ""} alt="" className="size-20 rounded object-cover" />
                <div className="flex-1 text-sm"><b>{r.reason}</b><p className="line-clamp-2 text-muted">{g?.prompt}</p></div>
                <AdminButton action="remove" id={r.generation_id} reportId={r.id} label="Quitar contenido" danger />
                <AdminButton action="dismiss" id={r.generation_id} reportId={r.id} label="Descartar" />
              </div>
            );
          })}
          {!reports.data?.length && <p className="text-muted">Sin reportes pendientes.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Prompts bloqueados</h2>
        <div className="card divide-y divide-border text-sm">
          {blocked.data?.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-3">
              <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-brand">{b.reason}</span>
              <span className="line-clamp-1 flex-1 text-muted">{b.prompt}</span>
              {b.user_id && <AdminButton action="ban" id={b.user_id} label="Suspender usuario" danger />}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Usuarios</h2>
        <div className="card divide-y divide-border text-sm">
          {users.data?.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <span className="flex-1">{u.email}</span>
              <span className="text-muted">{u.credits} cr.</span>
              {u.banned ? <AdminButton action="unban" id={u.id} label="Reactivar" /> : <AdminButton action="ban" id={u.id} label="Suspender" danger />}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
