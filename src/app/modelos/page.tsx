import { redirect } from "next/navigation";
import ModelsManager from "@/components/ModelsManager";
import { loadCharacters } from "@/lib/characters";
import { getUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");
  return <ModelsManager initial={await loadCharacters()} />;
}
