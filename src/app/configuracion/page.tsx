import { redirect } from "next/navigation";
import OpenAISettings from "@/components/OpenAISettings";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");
  const { data } = await createAdmin()
    .from("provider_keys")
    .select("last4, verified_at")
    .eq("user_id", user.id)
    .eq("provider", "openai")
    .maybeSingle();
  return (
    <OpenAISettings
      initial={{ configured: !!data, last4: data?.last4 ?? null, verifiedAt: data?.verified_at ?? null }}
    />
  );
}
