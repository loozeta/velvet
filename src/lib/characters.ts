import { createClient, getUserAndProfile } from "@/lib/supabase/server";

export type CharacterRow = {
  id: string;
  name: string;
  description: string;
  face_generation_id: string | null;
  visual_profile: string | null;
  faceUrl: string | null;
};

export async function loadCharacters(): Promise<CharacterRow[]> {
  const { user } = await getUserAndProfile();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("id, name, description, face_generation_id, visual_profile, face:generations!face_generation_id(result_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => {
    const face = Array.isArray(c.face) ? c.face[0] : c.face;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      face_generation_id: c.face_generation_id,
      visual_profile: c.visual_profile,
      faceUrl: face?.result_url ?? null,
    };
  });
}
