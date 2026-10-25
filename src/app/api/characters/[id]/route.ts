import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { moderatePrompt } from "@/lib/moderation";

// Actualiza un modelo: cara de referencia y/o prompt visual. La cara solo puede
// ser una imagen generada por el propio usuario en Velvet: no hay subidas.
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (profile.banned) return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const db = createAdmin();
  const update: Record<string, unknown> = {};

  if (body && "faceGenerationId" in body) {
    const faceId = body.faceGenerationId;
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
    update.face_generation_id = faceId;
  }

  if (body && "visualProfile" in body) {
    const vp = body.visualProfile;
    if (vp !== null && (typeof vp !== "string" || vp.length > 6000)) {
      return NextResponse.json({ error: "Prompt no válido" }, { status: 400 });
    }
    if (typeof vp === "string") {
      const mod = moderatePrompt(vp);
      if (!mod.ok) {
        await db.from("moderation_log").insert({ user_id: user.id, prompt: vp.slice(0, 1000), reason: mod.reason });
        return NextResponse.json({ error: mod.message }, { status: 422 });
      }
    }
    update.visual_profile = vp;
  }

  if (!Object.keys(update).length) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const { data, error } = await db
    .from("characters")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Modelo no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
