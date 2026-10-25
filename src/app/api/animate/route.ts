import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { animateFrames } from "@/lib/provider";
import { moderatePrompt, SAFETY_PREFIX } from "@/lib/moderation";
import { FRAMES_COST } from "@/lib/studio";

// Vídeo a partir de un frame inicial y (opcional) uno final. Ambos deben ser
// imágenes generadas por el propio usuario en Velvet: no hay subidas.
export async function POST(request: Request) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (profile.banned) return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });
  if (!profile.age_confirmed_at) return NextResponse.json({ error: "Edad no confirmada" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const duration = [5, 8].includes(body?.duration) ? body.duration : 5;
  const engine = body?.engine === "kling" ? "kling" : "veo";
  if (typeof body?.startId !== "string" || prompt.length < 5 || prompt.length > 1000) {
    return NextResponse.json({ error: "Elige un frame inicial y describe el movimiento" }, { status: 400 });
  }

  const db = createAdmin();
  const ids = [body.startId, ...(typeof body?.endId === "string" ? [body.endId] : [])];
  const { data: frames } = await db
    .from("generations")
    .select("id, result_url")
    .in("id", ids)
    .eq("user_id", user.id)
    .eq("kind", "image")
    .eq("status", "done");
  const start = frames?.find((f) => f.id === body.startId);
  const end = frames?.find((f) => f.id === body.endId);
  if (!start?.result_url || (ids.length === 2 && !end?.result_url)) {
    return NextResponse.json({ error: "Los frames deben ser imágenes tuyas creadas en Velvet" }, { status: 400 });
  }

  const mod = moderatePrompt(prompt);
  if (!mod.ok) {
    await db.from("moderation_log").insert({ user_id: user.id, prompt, reason: mod.reason });
    return NextResponse.json({ error: mod.message }, { status: 422 });
  }

  const cost = FRAMES_COST;
  const { data: spent } = await db.rpc("spend_credits", { uid: user.id, amount: cost });
  if (!spent) return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402 });

  try {
    const out = await animateFrames({
      startUrl: start.result_url,
      endUrl: end?.result_url ?? undefined,
      prompt: SAFETY_PREFIX + prompt,
      duration,
      engine,
    });
    const { data: row } = await db
      .from("generations")
      .insert({
        user_id: user.id,
        kind: "video",
        prompt,
        result_url: out.url,
        cost,
        params: { purpose: "frames", startId: start.id, endId: end?.id, duration, engine },
      })
      .select("id")
      .single();
    return NextResponse.json({ id: row?.id, url: out.url, cost });
  } catch {
    await db.rpc("spend_credits", { uid: user.id, amount: -cost }); // reembolso
    return NextResponse.json({ error: "Falló la animación, no se cobró" }, { status: 502 });
  }
}
