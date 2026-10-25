import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { swapFace } from "@/lib/provider";
import { SWAP_COST } from "@/lib/studio";

// Cambia la cara de un contenido por la de uno de tus modelos. Origen y destino
// deben ser generaciones tuyas en Velvet: no se aceptan archivos subidos.
export async function POST(request: Request) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (profile.banned) return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });
  if (!profile.age_confirmed_at) return NextResponse.json({ error: "Edad no confirmada" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (typeof body?.targetId !== "string" || typeof body?.characterId !== "string") {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const db = createAdmin();

  const { data: target } = await db
    .from("generations")
    .select("id, kind, result_url, params")
    .eq("id", body.targetId)
    .eq("user_id", user.id)
    .eq("status", "done")
    .maybeSingle();
  if (!target?.result_url) {
    return NextResponse.json({ error: "El contenido de destino debe ser una creación tuya en Velvet" }, { status: 400 });
  }
  if (target.params?.purpose === "face") {
    return NextResponse.json({ error: "Elige una escena, no un retrato de cara" }, { status: 400 });
  }

  const { data: ch } = await db
    .from("characters")
    .select("id, face_generation_id")
    .eq("id", body.characterId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ch?.face_generation_id) {
    return NextResponse.json({ error: "Ese modelo no tiene cara de referencia" }, { status: 400 });
  }
  const { data: face } = await db
    .from("generations")
    .select("result_url")
    .eq("id", ch.face_generation_id)
    .eq("user_id", user.id)
    .eq("kind", "image")
    .eq("status", "done")
    .maybeSingle();
  if (!face?.result_url) return NextResponse.json({ error: "Cara de referencia no válida" }, { status: 400 });

  const kind = target.kind === "video" ? "video" : "image";
  const cost = SWAP_COST[kind];
  const { data: spent } = await db.rpc("spend_credits", { uid: user.id, amount: cost });
  if (!spent) return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402 });

  try {
    const out = await swapFace({ kind, targetUrl: target.result_url, faceUrl: face.result_url });
    const { data: row } = await db
      .from("generations")
      .insert({
        user_id: user.id,
        kind,
        prompt: "face swap",
        result_url: out.url,
        cost,
        params: { purpose: "swap", characterId: ch.id, sourceId: target.id },
      })
      .select("id")
      .single();
    return NextResponse.json({ id: row?.id, url: out.url, kind, cost });
  } catch {
    await db.rpc("spend_credits", { uid: user.id, amount: -cost }); // reembolso
    return NextResponse.json({ error: "Falló el proceso, no se cobró" }, { status: 502 });
  }
}
