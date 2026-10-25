import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/server";

// Mercado Pago avisa con el id del pago; lo verificamos consultando su API
// (no confiamos en el cuerpo del webhook) y acreditamos una sola vez.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const mpId = body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (!mpId) return NextResponse.json({ ok: true });

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  });
  if (!res.ok) return NextResponse.json({ error: "No verificable" }, { status: 502 });
  const mp = await res.json();
  if (mp.status !== "approved" || !mp.external_reference) return NextResponse.json({ ok: true });

  const admin = createAdmin();
  // Transición atómica pending -> paid: si otro webhook ya la hizo, no devuelve fila.
  const { data: payment } = await admin
    .from("payments")
    .update({ status: "paid", provider_ref: String(mpId) })
    .eq("id", mp.external_reference)
    .eq("status", "pending")
    .select("id, user_id, credits, amount_cents")
    .maybeSingle();
  if (!payment) return NextResponse.json({ ok: true });

  await admin.rpc("spend_credits", { uid: payment.user_id, amount: -payment.credits });

  const { data: buyer } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", payment.user_id)
    .single();
  if (buyer?.referred_by) {
    const pct = Number(process.env.AFFILIATE_COMMISSION_PERCENT ?? 30);
    await admin.from("affiliate_commissions").insert({
      affiliate_id: buyer.referred_by,
      payment_id: payment.id,
      amount_cents: Math.round((payment.amount_cents * pct) / 100),
    });
  }
  return NextResponse.json({ ok: true });
}
