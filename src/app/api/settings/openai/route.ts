import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { verifyOpenAIKey } from "@/lib/openai";

async function auth() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return null;
  return user;
}

// Estado: nunca devuelve el token, solo los últimos 4 caracteres.
export async function GET() {
  const user = await auth();
  if (!user) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  const { data } = await createAdmin()
    .from("provider_keys")
    .select("last4, verified_at")
    .eq("user_id", user.id)
    .eq("provider", "openai")
    .maybeSingle();
  return NextResponse.json({ configured: !!data, last4: data?.last4 ?? null, verifiedAt: data?.verified_at ?? null });
}

// Guarda un token nuevo: solo se almacena si OpenAI lo acepta.
export async function PUT(request: Request) {
  const user = await auth();
  if (!user) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!/^sk-[A-Za-z0-9_\-]{20,}$/.test(key)) {
    return NextResponse.json({ ok: false, message: "Formato no válido: el token de OpenAI empieza por «sk-»." }, { status: 400 });
  }

  const result = await verifyOpenAIKey(key);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  try {
    await createAdmin().from("provider_keys").upsert({
      user_id: user.id,
      provider: "openai",
      key_enc: encrypt(key),
      last4: key.slice(-4),
      verified_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "No se pudo guardar de forma segura (falta APP_ENCRYPTION_KEY en el servidor)." }, { status: 500 });
  }
  return NextResponse.json({ ...result, last4: key.slice(-4), verifiedAt: new Date().toISOString() });
}

// Prueba el token ya guardado.
export async function POST() {
  const user = await auth();
  if (!user) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  const db = createAdmin();
  const { data } = await db
    .from("provider_keys").select("key_enc").eq("user_id", user.id).eq("provider", "openai").maybeSingle();
  if (!data) return NextResponse.json({ ok: false, message: "No hay ningún token guardado." }, { status: 404 });

  let key: string;
  try {
    key = decrypt(data.key_enc);
  } catch {
    return NextResponse.json({ ok: false, message: "No se pudo descifrar el token guardado. Vuelve a introducirlo." }, { status: 500 });
  }
  const result = await verifyOpenAIKey(key);
  if (result.ok) {
    await db.from("provider_keys").update({ verified_at: new Date().toISOString() }).eq("user_id", user.id).eq("provider", "openai");
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE() {
  const user = await auth();
  if (!user) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  await createAdmin().from("provider_keys").delete().eq("user_id", user.id).eq("provider", "openai");
  return NextResponse.json({ ok: true });
}
