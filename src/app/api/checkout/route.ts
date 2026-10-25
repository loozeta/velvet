import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";
import { PACKS } from "@/lib/plans";

// Crea una preferencia de Mercado Pago y devuelve la URL de pago.
export async function POST(request: Request) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (profile.banned) return NextResponse.json({ error: "Cuenta suspendida" }, { status: 403 });

  const { packId } = await request.json().catch(() => ({}));
  const pack = PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Pack inválido" }, { status: 400 });

  const admin = createAdmin();
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      provider: "mercadopago",
      amount_cents: pack.priceCents,
      credits: pack.credits,
    })
    .select("id")
    .single();
  if (error || !payment) return NextResponse.json({ error: "No se pudo crear el pago" }, { status: 500 });

  const origin = new URL(request.url).origin;
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: `Velvet ${pack.name} — ${pack.credits} créditos`,
          quantity: 1,
          unit_price: pack.priceCents / 100,
          currency_id: "USD",
        },
      ],
      external_reference: payment.id,
      notification_url: `${origin}/api/webhooks/mercadopago`,
      back_urls: { success: `${origin}/cuenta`, failure: `${origin}/precios`, pending: `${origin}/cuenta` },
      auto_return: "approved",
    }),
  });
  const pref = await res.json().catch(() => ({}));
  if (!res.ok || !pref.init_point) {
    return NextResponse.json({ error: "Mercado Pago rechazó la solicitud" }, { status: 502 });
  }
  await admin.from("payments").update({ provider_ref: String(pref.id) }).eq("id", payment.id);
  return NextResponse.json({ url: pref.init_point });
}
