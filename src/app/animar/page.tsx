import { redirect } from "next/navigation";
import AnimateStudio from "@/components/AnimateStudio";
import { createClient, getUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select("id, result_url, params")
    .eq("user_id", user.id)
    .eq("kind", "image")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(60);
  const items = (data ?? [])
    .filter((g) => g.result_url && g.params?.purpose !== "face")
    .map((g) => ({ id: g.id, url: g.result_url as string }));
  return <AnimateStudio items={items} />;
}
