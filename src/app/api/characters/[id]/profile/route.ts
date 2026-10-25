import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { moderatePrompt } from "@/lib/moderation";
import { PROFILE_SYSTEM_PROMPT } from "@/lib/profilePrompt";

const COST = 1;

type ImageBlock =
  | { type: "image"; source: { type: "url"; url: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

function toBlock(url: string): ImageBlock | null {
  if (/^https:\/\//.test(url)) return { type: "image", source: { type: "url", url } };
  const m = url.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  return m ? { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } : null;
}

// Paso 2: analiza la cara y los ángulos del modelo (todo generado en Velvet) y
// guarda una descripción visual detallada, reutilizable como prompt.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (profile.banned) return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en el servidor" }, { status: 501 });
  }

  const { id } = await ctx.params;
  const db = createAdmin();
  const { data: ch } = await db
    .from("characters")
    .select("id, face_generation_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ch?.face_generation_id) {
    return NextResponse.json({ error: "Primero guarda una cara de referencia" }, { status: 400 });
  }

  const { data: face } = await db
    .from("generations").select("result_url").eq("id", ch.face_generation_id).eq("user_id", user.id).maybeSingle();
  const { data: angles } = await db
    .from("generations")
    .select("result_url, params")
    .eq("user_id", user.id)
    .eq("kind", "image")
    .eq("status", "done")
    .eq("params->>characterId", id)
    .eq("params->>purpose", "angle")
    .order("created_at", { ascending: false })
    .limit(12);

  // Una imagen por ángulo (la más reciente) además de la cara de referencia.
  const seen = new Set<string>();
  const urls = [face?.result_url];
  for (const a of angles ?? []) {
    const key = a.params?.angle;
    if (key && !seen.has(key)) { seen.add(key); urls.push(a.result_url); }
  }
  const blocks = urls.filter((u): u is string => !!u).map(toBlock).filter((b): b is ImageBlock => !!b);
  if (!blocks.length) {
    return NextResponse.json(
      { error: "Las imágenes de demostración no se pueden analizar: conecta un proveedor de imágenes real" },
      { status: 400 },
    );
  }

  const { data: spent } = await db.rpc("spend_credits", { uid: user.id, amount: COST });
  if (!spent) return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402 });
  const refund = () => db.rpc("spend_credits", { uid: user.id, amount: -COST });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 2000,
        system: PROFILE_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: [...blocks, { type: "text", text: "Describe this character." }] },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    const text: string = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    if (!text || text.startsWith("REFUSED")) {
      await refund();
      return NextResponse.json({ error: "No se pudo generar un perfil válido para este modelo" }, { status: 422 });
    }
    const mod = moderatePrompt(text);
    if (!mod.ok) {
      await refund();
      await db.from("moderation_log").insert({ user_id: user.id, prompt: text.slice(0, 1000), reason: mod.reason });
      return NextResponse.json({ error: mod.message }, { status: 422 });
    }

    const profileText = text.slice(0, 6000);
    await db.from("characters").update({ visual_profile: profileText }).eq("id", id).eq("user_id", user.id);
    return NextResponse.json({ visualProfile: profileText });
  } catch {
    await refund();
    return NextResponse.json({ error: "Falló el análisis, no se cobró" }, { status: 502 });
  }
}
