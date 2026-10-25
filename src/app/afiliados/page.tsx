import Link from "next/link";
import { getUserAndProfile, createClient, createAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Affiliates() {
  const { user, profile } = await getUserAndProfile();
  const pct = process.env.AFFILIATE_COMMISSION_PERCENT ?? "30";

  let referrals = 0;
  let pending = 0;
  let paid = 0;
  if (user) {
    const supabase = await createClient();
    const [{ count }, { data: commissions }] = await Promise.all([
      // RLS solo deja ver el perfil propio, así que el conteo va por service role.
      createAdmin().from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", user.id),
      supabase.from("affiliate_commissions").select("amount_cents, paid").eq("affiliate_id", user.id),
    ]);
    referrals = count ?? 0;
    for (const c of commissions ?? []) (c.paid ? (paid += c.amount_cents) : (pending += c.amount_cents));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-4xl font-bold">Programa de afiliados</h1>
      <p className="mb-8 text-muted">
        Gana el <b className="text-brand">{pct}%</b> de cada compra que hagan los usuarios que
        traigas con tu enlace. Cookie de 30 días.
      </p>
      {!user ? (
        <Link href="/registro" className="btn btn-primary">Crea una cuenta para empezar</Link>
      ) : (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-1 text-sm text-muted">Tu enlace</div>
            <code className="break-all text-brand">/?ref={profile?.referral_code}</code>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Referidos" value={String(referrals)} />
            <Stat label="Pendiente" value={`$${(pending / 100).toFixed(2)}`} />
            <Stat label="Pagado" value={`$${(paid / 100).toFixed(2)}`} />
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}
