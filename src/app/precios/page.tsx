import BuyButton from "@/components/BuyButton";
import { PACKS } from "@/lib/plans";

export default function Pricing() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-2 text-center text-4xl font-bold">Precios</h1>
      <p className="mb-10 text-center text-muted">
        1 crédito = 1 imagen · 5 créditos = 1 vídeo. Los créditos no caducan.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {PACKS.map((p) => (
          <div key={p.id} className={`card p-6 text-center ${"featured" in p ? "border-brand" : ""}`}>
            <h2 className="text-xl font-bold">{p.name}</h2>
            <div className="my-4 text-4xl font-extrabold text-brand">${p.priceCents / 100}</div>
            <p className="mb-6 text-muted">{p.credits} créditos</p>
            <BuyButton packId={p.id} featured={"featured" in p} />
          </div>
        ))}
      </div>
    </main>
  );
}
