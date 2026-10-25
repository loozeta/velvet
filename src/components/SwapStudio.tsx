"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Coins, Loader2, ShieldAlert, UserRound, Wand2 } from "lucide-react";
import { SWAP_COST } from "@/lib/studio";

type Item = { id: string; kind: "image" | "video"; url: string };
type Model = { id: string; name: string; faceUrl: string };

function Media({ item, className }: { item: { kind: string; url: string }; className?: string }) {
  if (item.kind === "video" && !item.url.startsWith("data:")) {
    return <video src={item.url} className={className} controls muted loop playsInline />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.url} alt="" className={className} />;
}

export default function SwapStudio({ items, models }: { items: Item[]; models: Model[] }) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(models[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ kind: string; url: string } | null>(null);

  const target = items.find((i) => i.id === targetId);
  const cost = target ? SWAP_COST[target.kind] : SWAP_COST.image;

  async function apply() {
    setLoading(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, characterId: modelId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Error");
    setResult({ kind: data.kind, url: data.url });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Intercambiar cara</h1>
      <p className="mb-6 max-w-3xl text-muted">
        Elige una imagen o un vídeo que hayas creado en Velvet y aplica la cara de uno de tus modelos.
        El contenido de origen y la cara salen siempre de tus propias creaciones: no se pueden subir
        archivos ni fotos de otras personas.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">1. Tu modelo</h2>
        {!models.length ? (
          <p className="text-muted">
            Aún no tienes ningún modelo con cara de referencia. Créalo en{" "}
            <Link href="/modelos" className="text-brand">Mis modelos</Link>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {models.map((m) => (
              <button key={m.id} onClick={() => setModelId(m.id)}
                className={`flex items-center gap-3 rounded-xl border-2 p-2 pr-4 ${modelId === m.id ? "border-brand" : "border-border"}`}>
                {m.faceUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.faceUrl} alt="" className="size-12 rounded-lg object-cover" />
                ) : <UserRound />}
                <span className="font-medium">{m.name}</span>
                {modelId === m.id && <Check size={16} className="text-brand" />}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">2. Contenido de destino</h2>
        {!items.length ? (
          <p className="text-muted">
            Aún no has creado nada. Genera una escena en <Link href="/generar" className="text-brand">Generar</Link> o{" "}
            <Link href="/video" className="text-brand">Vídeo</Link>.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
            {items.map((i) => (
              <button key={i.id} onClick={() => setTargetId(i.id)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 ${targetId === i.id ? "border-brand" : "border-transparent"}`}>
                <Media item={i} className="size-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs">{i.kind === "video" ? "vídeo" : "imagen"}</span>
                {targetId === i.id && <Check size={18} className="absolute right-1 top-1 rounded-full bg-brand p-0.5 text-white" />}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={apply} disabled={loading || !targetId || !modelId} className="btn btn-primary disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />} Aplicar cara
        </button>
        <span className="flex items-center gap-1 text-brand"><Coins size={16} /> {cost}</span>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {result && (
        <div className="card mt-6 overflow-hidden">
          <Media item={result} className="mx-auto max-h-[70vh] object-contain" />
        </div>
      )}

      <p className="mt-8 flex items-start gap-2 text-xs text-muted">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
        Solo contenido y caras creados por ti en Velvet. Está prohibido usar el resultado para suplantar
        o hacerse pasar por una persona real.
      </p>
    </main>
  );
}
