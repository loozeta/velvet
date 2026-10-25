"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Coins, Film, Loader2 } from "lucide-react";
import { FRAMES_COST } from "@/lib/studio";

type Img = { id: string; url: string };

function FramePicker({ title, hint, items, value, onChange, optional }: {
  title: string; hint: string; items: Img[]; value: string | null; onChange: (id: string | null) => void; optional?: boolean;
}) {
  return (
    <section className="card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {optional && value && <button onClick={() => onChange(null)} className="text-xs text-muted hover:text-brand">Quitar</button>}
      </div>
      <p className="mb-3 text-sm text-muted">{hint}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {items.map((i) => (
          <button key={i.id} onClick={() => onChange(i.id === value ? null : i.id)}
            className={`relative aspect-square overflow-hidden rounded-lg border-2 ${value === i.id ? "border-brand" : "border-transparent"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.url} alt="" className="size-full object-cover" />
            {value === i.id && <Check size={16} className="absolute right-1 top-1 rounded-full bg-brand p-0.5 text-white" />}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function AnimateStudio({ items }: { items: Img[] }) {
  const [startId, setStartId] = useState<string | null>(null);
  const [endId, setEndId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [engine, setEngine] = useState<"veo" | "kling">("veo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/animate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startId, endId, prompt, duration, engine }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Error");
    setResult(data.url);
  }

  if (!items.length) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-3 text-3xl font-bold">Animar</h1>
        <p className="text-muted">
          Aún no tienes imágenes. Crea escenas en <Link href="/lifestyle" className="text-brand">Lifestyle</Link> o{" "}
          <Link href="/generar" className="text-brand">Generar</Link>.
        </p>
      </main>
    );
  }

  const isVideo = result && !result.startsWith("data:");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Animar con frame inicial y final</h1>
      <p className="mb-6 max-w-3xl text-muted">
        Elige dos imágenes de tu modelo y la IA creará el movimiento entre ellas. Con un solo frame
        inicial, la IA improvisa el movimiento. Los frames son siempre creaciones tuyas en Velvet.
      </p>

      <div className="space-y-5">
        <FramePicker title="Frame inicial" hint="La primera imagen del vídeo." items={items} value={startId} onChange={setStartId} />
        <FramePicker title="Frame final (opcional)" hint="La última imagen: la IA animará la transición." items={items} value={endId} onChange={setEndId} optional />

        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Movimiento</h2>
          <textarea className="input min-h-24" maxLength={1000} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej.: la cámara se acerca despacio mientras sonríe y se aparta el pelo de la cara…" />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex rounded-full bg-surface-2 p-1">
              {(["veo", "kling"] as const).map((e) => (
                <button key={e} onClick={() => setEngine(e)}
                  className={`rounded-full px-4 py-1 ${engine === e ? "bg-brand text-white" : "text-muted"}`}>
                  {e === "veo" ? "Veo 3.1" : "Kling 2.6"}
                </button>
              ))}
            </div>
            <div className="flex rounded-full bg-surface-2 p-1">
              {[5, 8].map((d) => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`rounded-full px-4 py-1 ${duration === d ? "bg-brand text-white" : "text-muted"}`}>
                  {d}s
                </button>
              ))}
            </div>
            <span className="flex items-center gap-1 text-brand"><Coins size={16} /> {FRAMES_COST}</span>
            <button onClick={run} disabled={loading || !startId || prompt.trim().length < 5}
              className="btn btn-primary ml-auto disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Film size={18} />} Crear vídeo
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>

        {result && (
          <div className="card overflow-hidden">
            {isVideo ? (
              <video src={result} controls loop playsInline className="mx-auto max-h-[70vh]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result} alt="Resultado" className="mx-auto max-h-[70vh] object-contain" />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
