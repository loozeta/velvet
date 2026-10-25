import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";

// Fija la cara de referencia de un modelo. Solo vale una imagen generada por el
// propio usuario en Velvet: no existe ninguna vía para subir fotos.
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (profile.banned) return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const faceId = body?.faceGenerationId;
  const db = createAdmin();

  if (faceId !== null) {
    if (typeof faceId !== "string") return NextResponse.json({ error: "Cara no válida" }, { status: 400 });
    const { data: gen } = await db
      .from("generations")
      .select("id")
      .eq("id", faceId)
      .eq("user_id", user.id)
      .eq("kind", "image")
      .eq("status", "done")
      .maybeSingle();
    if (!gen) return NextResponse.json({ error: "Esa imagen no es tuya o no es válida" }, { status: 400 });
  }

  const { data, error } = await db
    .from("characters")
    .update({ face_generation_id: faceId })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Modelo no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
