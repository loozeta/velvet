import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUserAndProfile } from "@/lib/supabase/server";
import { DeleteButton, LogoutButton, PublicToggle } from "@/components/AccountActions";

export const dynamic = "force-dynamic";

export default async function Account() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("generations")
    .select("id, kind, prompt, result_url, is_public")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mi cuenta</h1>
          <p className="text-muted">{profile.email} · {profile.credits} créditos</p>
        </div>
        <div className="flex gap-3">
          <Link href="/precios" className="btn btn-primary !py-1.5 text-sm">Comprar créditos</Link>
          <Link href="/afiliados" className="btn btn-outline !py-1.5 text-sm">Afiliados</Link>
          <LogoutButton />
        </div>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Mis creaciones</h2>
      {!items?.length ? (
        <p className="text-muted">Aún no has generado nada.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((g) => (
            <figure key={g.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.result_url ?? ""} alt="" className="aspect-square w-full object-cover" />
              <figcaption className="flex items-center justify-between p-3">
                <PublicToggle id={g.id} isPublic={g.is_public} />
                <DeleteButton id={g.id} />
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}
