import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";

// Se llama justo tras registrarse: guarda la confirmación de edad y el afiliado.
export async function POST() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const update: Record<string, unknown> = {};
  if (!profile.age_confirmed_at) update.age_confirmed_at = new Date().toISOString();

  const ref = (await cookies()).get("ref")?.value;
  if (ref && !profile.referred_by) {
    const admin = createAdmin();
    const { data: affiliate } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", ref)
      .maybeSingle();
    if (affiliate && affiliate.id !== user.id) update.referred_by = affiliate.id;
  }

  if (Object.keys(update).length) {
    await createAdmin().from("profiles").update(update).eq("id", user.id);
  }
  return NextResponse.json({ ok: true });
}
