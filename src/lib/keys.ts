import { createAdmin } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

export async function getOpenAIKey(userId: string): Promise<string | null> {
  const { data } = await createAdmin()
    .from("provider_keys")
    .select("key_enc")
    .eq("user_id", userId)
    .eq("provider", "openai")
    .maybeSingle();
  if (!data) return null;
  try {
    return decrypt(data.key_enc);
  } catch {
    return null;
  }
}
