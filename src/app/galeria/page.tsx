import { createClient } from "@/lib/supabase/server";
import ReportButton from "@/components/ReportButton";

export const dynamic = "force-dynamic";

export default async function Gallery() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("generations")
    .select("id, kind, prompt, result_url")
    .eq("is_public", true)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Galería</h1>
      {!items?.length ? (
        <p className="text-muted">Todavía no hay creaciones públicas.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((g) => (
            <figure key={g.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.result_url ?? ""} alt={g.prompt.slice(0, 80)} className="aspect-square w-full object-cover" />
              <figcaption className="flex items-center justify-between gap-2 p-3 text-xs text-muted">
                <span className="line-clamp-2">{g.prompt}</span>
                <ReportButton id={g.id} />
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}
