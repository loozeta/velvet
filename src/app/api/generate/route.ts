import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { moderatePrompt, SAFETY_PREFIX } from "@/lib/moderation";
import { generate, type GenerationKind } from "@/lib/provider";
import { costOf, MODELS, SIZES, SPEEDS, type Speed } from "@/lib/studio";

const clamp = (n: unknown, min: number, max: number, fallback: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;

export async function POST(request: Request) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (profile.banned) return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });
  if (!profile.age_confirmed_at) {
    return NextResponse.json({ error: "Edad no confirmada" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const kind: GenerationKind = body?.kind === "video" ? "video" : "image";
  const isFace = body?.purpose === "face";
  let prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (isFace && prompt.length < 5) prompt = "front-facing face portrait, neutral expression";
  const negative = typeof body?.negative === "string" ? body.negative.slice(0, 3000) : "";
  const speed: Speed = SPEEDS.some((s) => s.id === body?.speed) ? body.speed : "express";
  const model = MODELS.some((m) => m.id === body?.model) ? body.model : "real-nude";
  const size = SIZES.some((s) => s.id === body?.size) ? body.size : "1:1";
  const cfg = clamp(body?.cfg, 1, 20, 5);
  const photoEffect = clamp(body?.photoEffect, 0, 10, 5);

  if (prompt.length < 5 || prompt.length > 3000) {
    return NextResponse.json({ error: "El prompt debe tener entre 5 y 3000 caracteres" }, { status: 400 });
  }

  const admin = createAdmin();

  // Personaje guardado: su descripción se antepone al prompt y también se modera.
  let characterText = "";
  let referenceUrl: string | undefined;
  if (typeof body?.characterId === "string") {
    const { data: ch } = await admin
      .from("characters")
      .select("description, face_generation_id")
      .eq("id", body.characterId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (ch) {
      characterText = ch.description + ". ";
      // La cara de referencia solo puede ser una imagen generada por el propio usuario.
      if (ch.face_generation_id && !isFace) {
        const { data: face } = await admin
          .from("generations")
          .select("result_url")
          .eq("id", ch.face_generation_id)
          .eq("user_id", user.id)
          .eq("kind", "image")
          .eq("status", "done")
          .maybeSingle();
        referenceUrl = face?.result_url ?? undefined;
      }
    }
  }

  // "Hojear": animar solo una imagen generada por el propio usuario en Velvet.
  let sourceUrl: string | undefined;
  if (typeof body?.sourceId === "string") {
    const { data: src } = await admin
      .from("generations")
      .select("result_url")
      .eq("id", body.sourceId)
      .eq("user_id", user.id)
      .eq("kind", "image")
      .eq("status", "done")
      .maybeSingle();
    if (!src?.result_url) {
      return NextResponse.json({ error: "Imagen de origen no válida" }, { status: 400 });
    }
    sourceUrl = src.result_url;
  }

  const mod = moderatePrompt(`${characterText}${prompt}`);
  if (!mod.ok) {
    await admin.from("moderation_log").insert({ user_id: user.id, prompt, reason: mod.reason });
    // Tres bloqueos por menores/no consentido en 24 h => suspensión para revisión.
    if (mod.reason !== "real_person") {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count } = await admin
        .from("moderation_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("reason", "real_person")
        .gte("created_at", since);
      if ((count ?? 0) >= 3) await admin.from("profiles").update({ banned: true }).eq("id", user.id);
    }
    return NextResponse.json({ error: mod.message }, { status: 422 });
  }

  const cost = costOf(kind, speed);
  const { data: spent } = await admin.rpc("spend_credits", { uid: user.id, amount: cost });
  if (!spent) return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402 });

  const params = {
    model, speed, size, cfg, photoEffect, negative,
    characterId: body?.characterId,
    purpose: isFace ? "face" : "scene",
  };
  try {
    const out = await generate({
      kind,
      prompt: SAFETY_PREFIX + characterText + (isFace ? "Close-up face portrait, plain background. " : "") + prompt,
      negative,
      model,
      speed,
      size,
      cfg,
      photoEffect,
      sourceUrl,
      referenceUrl,
    });
    const { data: row } = await admin
      .from("generations")
      .insert({ user_id: user.id, kind, prompt, result_url: out.url, cost, params })
      .select("id")
      .single();
    return NextResponse.json({ id: row?.id, url: out.url, cost });
  } catch {
    await admin.rpc("spend_credits", { uid: user.id, amount: -cost }); // reembolso
    return NextResponse.json({ error: "Falló la generación, no se cobró" }, { status: 502 });
  }
}
