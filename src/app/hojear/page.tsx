import Link from "next/link";
import { redirect } from "next/navigation";
import Studio from "@/components/Studio";
import { loadCharacters } from "@/lib/characters";
import { createClient, getUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// "Hojear": dar vida a imágenes. Solo se pueden animar imágenes generadas por el
// propio usuario en Velvet; no se aceptan subidas externas.
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");
  const { id } = await searchParams;
  const supabase = await createClient();

  if (id) {
    const { data: src } = await supabase
      .from("generations").select("id, result_url")
      .eq("id", id).eq("user_id", user.id).eq("kind", "image").eq("status", "done").maybeSingle();
    if (src) {
      return <Studio kind="video" sourceId={src.id} sourceUrl={src.result_url ?? undefined}
        characters={await loadCharacters()} />;
    }
  }

  const { data: items } = await supabase
    .from("generations").select("id, result_url")
    .eq("user_id", user.id).eq("kind", "image").eq("status", "done")
    .order("created_at", { ascending: false }).limit(40);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Hojear</h1>
      <p className="mb-6 text-muted">Elige una de tus imágenes generadas para darle vida como vídeo.</p>
      {!items?.length ? (
        <p className="text-muted">Primero genera alguna imagen en <Link href="/generar" className="text-brand">Generar</Link>.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((g) => (
            <Link key={g.id} href={`/hojear?id=${g.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.result_url ?? ""} alt="" className="aspect-square w-full rounded-lg object-cover hover:ring-2 hover:ring-brand" />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
