"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, Sparkles, Trash2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CharacterRow } from "@/lib/characters";

type Face = { id: string; result_url: string };

export default function ModelsManager({ initial }: { initial: CharacterRow[] }) {
  const [models, setModels] = useState(initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    setError("");
    setCreating(true);
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) return setError(res.status === 401 ? "Inicia sesión primero." : (data.error ?? "Error"));
    setModels([{ ...data, face_generation_id: null, faceUrl: null }, ...models]);
    setName("");
    setDescription("");
  }

  async function remove(id: string) {
    await createClient().from("characters").delete().eq("id", id);
    setModels((m) => m.filter((x) => x.id !== id));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Mis modelos IA</h1>
      <p className="mb-6 max-w-3xl text-muted">
        Crea tus modelos originales: descríbelos, genera varias caras, elige la que más te guste y
        guárdala como referencia. Después, cada vez que actives el modelo en el generador, su cara se
        usará para mantenerlo consistente. Las caras salen siempre de la IA de Velvet: no se pueden
        subir fotos de personas reales.
      </p>

      <div className="card mb-8 space-y-3 p-5">
        <h2 className="font-semibold">Nuevo modelo</h2>
        <input className="input" placeholder="Nombre del modelo" value={name} maxLength={60}
          onChange={(e) => setName(e.target.value)} />
        <textarea className="input min-h-24"
          placeholder="Mujer adulta de 28 años, pelo castaño largo, ojos verdes, pecas, rasgos suaves…"
          value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} />
        <button onClick={create} disabled={creating || !name.trim() || description.trim().length < 5}
          className="btn btn-primary disabled:opacity-50">
          {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Crear modelo
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {!models.length ? (
        <p className="text-muted">Aún no tienes modelos.</p>
      ) : (
        <div className="space-y-6">
          {models.map((m) => (
            <ModelCard key={m.id} model={m} onRemove={() => remove(m.id)}
              onFace={(faceId, url) =>
                setModels((all) => all.map((x) => (x.id === m.id ? { ...x, face_generation_id: faceId, faceUrl: url } : x)))
              } />
          ))}
        </div>
      )}
    </main>
  );
}

function ModelCard({
  model, onRemove, onFace,
}: {
  model: CharacterRow;
  onRemove: () => void;
  onFace: (faceId: string | null, url: string | null) => void;
}) {
  const [faces, setFaces] = useState<Face[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("generations")
      .select("id, result_url")
      .eq("params->>characterId", model.id)
      .eq("params->>purpose", "face")
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(12);
    setFaces((data ?? []).filter((f): f is Face => !!f.result_url));
  }, [model.id]);

  useEffect(() => { load(); }, [load]);

  async function generateFace() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "image", purpose: "face", characterId: model.id, prompt: "", size: "1:1", speed: "express" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Error");
    await load();
  }

  async function setReference(face: Face | null) {
    setError("");
    const res = await fetch(`/api/characters/${model.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faceGenerationId: face?.id ?? null }),
    });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Error");
    onFace(face?.id ?? null, face?.result_url ?? null);
  }

  return (
    <section className="card p-5">
      <div className="flex gap-4">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
          {model.faceUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.faceUrl} alt={`Cara de ${model.name}`} className="size-full object-cover" />
          ) : (
            <UserRound className="text-muted" size={40} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">{model.name}</h3>
              <p className="line-clamp-2 text-sm text-muted">{model.description}</p>
              <p className="mt-1 text-xs text-brand">
                {model.faceUrl ? "Cara de referencia guardada" : "Sin cara de referencia"}
              </p>
            </div>
            <button onClick={onRemove} aria-label="Borrar modelo" className="text-muted hover:text-red-400">
              <Trash2 size={18} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={generateFace} disabled={busy} className="btn btn-outline !px-4 !py-2 text-sm disabled:opacity-50">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Generar cara (1 crédito)
            </button>
            {model.faceUrl && (
              <button onClick={() => setReference(null)} className="btn border border-border !px-4 !py-2 text-sm text-muted">
                Quitar referencia
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {faces.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">Caras generadas: pulsa una para usarla como referencia.</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {faces.map((f) => {
              const active = f.id === model.face_generation_id;
              return (
                <button key={f.id} onClick={() => setReference(f)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 ${active ? "border-brand" : "border-transparent hover:border-border"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.result_url} alt="" className="size-full object-cover" />
                  {active && <Check size={18} className="absolute right-1 top-1 rounded-full bg-brand p-0.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
