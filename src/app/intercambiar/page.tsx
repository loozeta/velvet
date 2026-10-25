import { redirect } from "next/navigation";
import SwapStudio from "@/components/SwapStudio";
import { loadCharacters } from "@/lib/characters";
import { createClient, getUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select("id, kind, result_url, params")
    .eq("user_id", user.id)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(60);

  const items = (data ?? [])
    .filter((g) => g.result_url && g.params?.purpose !== "face")
    .map((g) => ({ id: g.id, kind: g.kind as "image" | "video", url: g.result_url as string }));

  const models = (await loadCharacters())
    .filter((c) => c.faceUrl)
    .map((c) => ({ id: c.id, name: c.name, faceUrl: c.faceUrl as string }));

  return <SwapStudio items={items} models={models} />;
}
