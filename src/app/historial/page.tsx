import { redirect } from "next/navigation";
import { createClient, getUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations").select("id, kind, prompt, cost, created_at, status")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Historial</h1>
      <div className="card divide-y divide-border text-sm">
        {data?.map((g) => (
          <div key={g.id} className="flex items-center gap-3 p-3">
            <span className="w-14 rounded bg-surface-2 px-2 py-0.5 text-center text-xs text-brand">{g.kind === "video" ? "vídeo" : "imagen"}</span>
            <span className="line-clamp-1 flex-1 text-muted">{g.prompt}</span>
            <span>{g.cost} cr.</span>
            <span className="text-xs text-muted">{new Date(g.created_at).toLocaleString("es")}</span>
          </div>
        ))}
        {!data?.length && <p className="p-4 text-muted">Sin actividad todavía.</p>}
      </div>
    </main>
  );
}
