import { createClient, getUserAndProfile } from "@/lib/supabase/server";

export async function loadCharacters() {
  const { user } = await getUserAndProfile();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("id, name, description")
    .order("created_at", { ascending: false });
  return data ?? [];
}
