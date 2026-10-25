"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Loader2, Play, Plus, Trash2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LIFESTYLE_THEMES } from "@/lib/studio";

type Model = { id: string; name: string; faceUrl: string | null };
type Collection = { id: string; name: string; theme: string | null };
type Item = { id: string; result_url: string; prompt: string };

export default function LifestyleStudio({ models, initial }: { models: Model[]; initial: Collection[] }) {
  const [collections, setCollections] = useState(initial);
  const [colId, setColId] = useState<string | null>(initial[0]?.id ?? null);
  const [newName, setNewName] = useState("");
  const [modelId, setModelId] = useState<string | null>(models[0]?.id ?? null);
  const [themeId, setThemeId] = useState<string>(LIFESTYLE_THEMES[0].id);
  const [scenes, setScenes] = useState<string[]>([...LIFESTYLE_THEMES[0].scenes]);
  const [realism, setRealism] = useState(true);
  const [size, setSize] = useState("3:4");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  const loadItems = useCallback(async () => {
    if (!colId) return setItems([]);
    const { data } = await createClient()
      .from("generations")
      .select("id, result_url, prompt")
      .eq("params->>collectionId", colId)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []).filter((i): i is Item => !!i.result_url));
  }, [colId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  function pickTheme(id: string) {
    setThemeId(id);
    setScenes([...(LIFESTYLE_THEMES.find((t) => t.id === id)?.scenes ?? [])]);
  }

  async function createCollection() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newName.trim()) return;
    const theme = LIFESTYLE_THEMES.find((t) => t.id === themeId)?.name ?? null;
    const { data } = await supabase
      .from("collections").insert({ user_id: user.id, name: newName.trim(), theme }).select("id, name, theme").single();
    if (data) {
      setCollections([data, ...collections]);
      setColId(data.id);
      setNewName("");
    }
  }

  async function removeCollection(id: string) {
    await createClient().from("collections").delete().eq("id", id);
    const rest = collections.filter((c) => c.id !== id);
    setCollections(rest);
    if (colId === id) setColId(rest[0]?.id ?? null);
  }

  async function runBatch() {
    if (!colId || !modelId) return;
    setRunning(true);
    setError("");
    setProgress(0);
    const list = scenes.map((s) => s.trim()).filter((s) => s.length >= 5);
    for (let i = 0; i < list.length; i++) {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "image", prompt: list[i], characterId: modelId, collectionId: colId,
          realism, size, speed: "express",
        }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Error");
        break;
      }
      setProgress(i + 1);
      await loadItems();
    }
    setRunning(false);
  }

  const total = scenes.filter((s) => s.trim().length >= 5).length;

  if (!models.length) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-3 text-3xl font-bold">Contenido lifestyle</h1>
        <p className="text-muted">
          Primero crea un modelo con cara de referencia en <Link href="/modelos" className="text-brand">Mis modelos</Link>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Contenido lifestyle</h1>
      <p className="mb-6 max-w-3xl text-muted">
        Genera tandas de escenas de tu modelo (café, viajes, gimnasio…) con la misma cara y estilo, y
        organízalas por colecciones. Las referencias son descripciones de texto o tus propias imágenes
        generadas: no se aceptan fotos externas.
      </p>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className="card p-4">
            <h2 className="mb-3 font-semibold">1. Modelo</h2>
            <div className="space-y-2">
              {models.map((m) => (
                <button key={m.id} onClick={() => setModelId(m.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border-2 p-2 text-left ${modelId === m.id ? "border-brand" : "border-border"}`}>
                  {m.faceUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.faceUrl} alt="" className="size-10 rounded-md object-cover" />
                  ) : <UserRound className="size-10 text-muted" />}
                  <span className="text-sm font-medium">{m.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-semibold">2. Colección</h2>
            <div className="mb-3 flex gap-2">
              <input className="input !py-2 text-sm" placeholder="Nueva colección" value={newName}
                onChange={(e) => setNewName(e.target.value)} maxLength={80} />
              <button onClick={createCollection} disabled={!newName.trim()} aria-label="Crear colección"
                className="btn btn-primary !px-3 !py-2 disabled:opacity-50"><FolderPlus size={16} /></button>
            </div>
            <div className="space-y-1">
              {collections.map((c) => (
                <div key={c.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${colId === c.id ? "bg-surface-2 text-brand" : "text-muted"}`}>
                  <button onClick={() => setColId(c.id)} className="flex-1 text-left">{c.name}</button>
                  <button onClick={() => removeCollection(c.id)} aria-label="Borrar colección" className="hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {!collections.length && <p className="text-xs text-muted">Crea una colección para empezar.</p>}
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <section className="card p-4">
            <h2 className="mb-3 font-semibold">3. Tema y escenas</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {LIFESTYLE_THEMES.map((t) => (
                <button key={t.id} onClick={() => pickTheme(t.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${themeId === t.id ? "border-brand text-brand" : "border-border text-muted"}`}>
                  {t.name}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {scenes.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input !py-2 text-sm" value={s} maxLength={500}
                    onChange={(e) => setScenes(scenes.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button onClick={() => setScenes(scenes.filter((_, j) => j !== i))} aria-label="Quitar escena"
                    className="text-muted hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              ))}
              <button onClick={() => setScenes([...scenes, ""])} className="flex items-center gap-1 text-sm text-brand">
                <Plus size={14} /> Añadir escena
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-orange-500" checked={realism} onChange={(e) => setRealism(e.target.checked)} />
                Realismo fotográfico
              </label>
              <select className="input !w-auto !py-1.5 text-sm" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="3:4">3:4 Retrato</option>
                <option value="1:1">1:1 Cuadrado</option>
                <option value="9:16">9:16 Vertical</option>
                <option value="16:9">16:9 Horizontal</option>
              </select>
              <button onClick={runBatch} disabled={running || !colId || !total} className="btn btn-primary ml-auto disabled:opacity-50">
                {running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                {running ? `Generando ${progress}/${total}` : `Generar ${total} escenas (${total} créditos)`}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Colección</h2>
            {!items.length ? (
              <p className="text-muted">Esta colección está vacía.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {items.map((i) => (
                  <figure key={i.id} className="overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.result_url} alt={i.prompt.slice(0, 80)} className="w-full" />
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
