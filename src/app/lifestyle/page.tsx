import { redirect } from "next/navigation";
import LifestyleStudio from "@/components/LifestyleStudio";
import { loadCharacters } from "@/lib/characters";
import { createClient, getUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data: collections } = await supabase
    .from("collections").select("id, name, theme").eq("user_id", user.id).order("created_at", { ascending: false });
  const models = (await loadCharacters()).map((c) => ({ id: c.id, name: c.name, faceUrl: c.faceUrl }));
  return <LifestyleStudio models={models} initial={collections ?? []} />;
}
