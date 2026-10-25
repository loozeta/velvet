import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { moderatePrompt } from "@/lib/moderation";

// Los personajes se definen solo con texto (nada de subir caras), y la
// descripción pasa por el mismo filtro que los prompts.
export async function POST(request: Request) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (profile.banned) return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (name.length < 1 || name.length > 60 || description.length < 5 || description.length > 600) {
    return NextResponse.json({ error: "Nombre y descripción no válidos" }, { status: 400 });
  }

  const db = createAdmin();
  const mod = moderatePrompt(`${name}. ${description}`);
  if (!mod.ok) {
    await db.from("moderation_log").insert({ user_id: user.id, prompt: description, reason: mod.reason });
    return NextResponse.json({ error: mod.message }, { status: 422 });
  }

  const { count } = await db
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= 30) return NextResponse.json({ error: "Máximo 30 personajes" }, { status: 400 });

  const { data, error } = await db
    .from("characters")
    .insert({ user_id: user.id, name, description })
    .select("id, name, description")
    .single();
  if (error) return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  return NextResponse.json(data);
}
