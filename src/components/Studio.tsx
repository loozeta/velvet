"use client";

import { useState } from "react";
import {
  AlertCircle, Check, Coins, Loader2, Plus, Search, SlidersHorizontal, Star, Trash2, User, Wand2, Layers,
} from "lucide-react";
import {
  DEFAULT_PARAMS, MODELS, SIZES, SPEEDS, TEMPLATES, TEMPLATE_TAGS, costOf, type StudioParams,
} from "@/lib/studio";
import { createClient } from "@/lib/supabase/client";
import Feed from "./Feed";

type Character = { id: string; name: string; description: string; faceUrl?: string | null };
type Tab = "prompt" | "personajes" | "modelo" | "plantillas" | "ajustes";

type Props = {
  kind: "image" | "video";
  initialTab?: Tab;
  characters: Character[];
  sourceId?: string; // "Hojear": imagen propia a animar
  sourceUrl?: string;
};

export default function Studio({ kind, initialTab = "prompt", characters: initial, sourceId, sourceUrl }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [notice, setNotice] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [params, setParams] = useState<StudioParams>(DEFAULT_PARAMS);
  const [characters, setCharacters] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const set = <K extends keyof StudioParams>(k: K, v: StudioParams[K]) =>
    setParams((p) => ({ ...p, [k]: v }));
  const cost = costOf(kind, params.speed);

  async function submit() {
    setLoading(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, prompt, sourceId, ...params }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(res.status === 401 ? "Inicia sesión para generar." : (data.error ?? "Error"));
      return;
    }
    setResult(data.url);
    setRefresh((n) => n + 1);
  }

  const tabs: { id: Tab; label: string; icon: typeof Wand2 }[] = [
    { id: "prompt", label: "Prompt", icon: Wand2 },
    { id: "personajes", label: "Personajes", icon: User },
    ...(kind === "image" ? [{ id: "modelo" as Tab, label: "Modelo IA", icon: Layers }] : []),
    ...(kind === "image" ? [{ id: "plantillas" as Tab, label: "Plantillas IA", icon: Star }] : []),
    { id: "ajustes", label: params.size, icon: SlidersHorizontal },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {notice && (
        <div className="mb-6 flex items-center gap-4 rounded-lg border-l-4 border-brand bg-surface p-4 text-sm">
          <AlertCircle className="shrink-0 text-brand" />
          <p className="flex-1">
            NO uses este servicio para crear contenido ilegal ni contenido que involucre a menores.
            NO intentes describir ni etiquetar como infantil ningún contenido. Tampoco subas ni
            imites a personas reales. Las infracciones se registran, suspenden la cuenta sin
            reembolso y pueden denunciarse ante las autoridades.
          </p>
          <button onClick={() => setNotice(false)} className="btn btn-primary !px-4 !py-2">Ok</button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${tab === id ? "bg-surface-2 text-brand" : "text-muted hover:text-foreground"}`}
          >
            <Icon size={18} className="text-brand" /> {label}
          </button>
        ))}
      </div>

      {tab === "prompt" && (
        <div>
          {sourceUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sourceUrl} alt="Imagen a animar" className="mb-3 h-32 rounded-lg object-cover" />
          )}
          <textarea
            className="input min-h-44 font-mono text-sm"
            placeholder={kind === "video" ? "Describe el movimiento y la escena…" : "Describe a tu personaje ficticio adulto y la escena…"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={3000}
          />
          <div className="mt-1 text-xs text-muted">{prompt.length}/3000</div>
          {characters.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Personaje activo: {characters.find((c) => c.id === params.characterId)?.name ?? "ninguno"}
            </p>
          )}
        </div>
      )}

      {tab === "personajes" && (
        <Characters
          characters={characters}
          setCharacters={setCharacters}
          active={params.characterId}
          onPick={(id) => set("characterId", id)}
        />
      )}

      {tab === "modelo" && (
        <div className="grid gap-6 md:grid-cols-2">
          {(["Realista", "Artístico"] as const).map((group) => (
            <div key={group} className="card p-5">
              <h3 className="text-xl font-bold">{group}</h3>
              <p className="mb-4 text-sm text-muted">
                {group === "Realista" ? "Modelos realistas, más calientes que la realidad." : "Resultados más artísticos y modernos."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {MODELS.filter((m) => m.group === group).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => set("model", m.id)}
                    className={`relative flex aspect-[3/4] items-end rounded-lg border-2 bg-gradient-to-br from-surface-2 to-background p-3 text-left font-semibold ${params.model === m.id ? "border-brand" : "border-transparent"}`}
                  >
                    {"isNew" in m && m.isNew && <span className="absolute left-2 top-2 rounded bg-brand px-1.5 text-xs">new</span>}
                    {params.model === m.id && <Check className="absolute right-2 top-2 text-brand" size={18} />}
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "plantillas" && <Templates onAdd={(t) => setPrompt((p) => (p ? `${p}, ${t}` : t))} />}

      {tab === "ajustes" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm">
            Tamaño
            <select className="input mt-1" value={params.size} onChange={(e) => set("size", e.target.value)}>
              {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            Efecto fotográfico: {params.photoEffect}
            <input type="range" min={0} max={10} className="mt-3 w-full accent-orange-500"
              value={params.photoEffect} onChange={(e) => set("photoEffect", Number(e.target.value))} />
          </label>
          <label className="block text-sm">
            CFG (creatividad): {params.cfg}
            <input type="range" min={1} max={20} className="mt-3 w-full accent-orange-500"
              value={params.cfg} onChange={(e) => set("cfg", Number(e.target.value))} />
          </label>
          {kind === "image" && (
            <label className="flex items-start gap-3 text-sm sm:col-span-2">
              <input type="checkbox" className="mt-1 accent-orange-500" checked={params.realism}
                onChange={(e) => set("realism", e.target.checked)} />
              <span>
                Realismo fotográfico (estilo iPhone)
                <span className="block text-xs text-muted">
                  Añade luz natural, poros, textura de piel e imperfecciones reales para un acabado de foto sin retocar.
                </span>
              </span>
            </label>
          )}
          <label className="block text-sm sm:col-span-2">
            Mensaje negativo
            <textarea className="input mt-1 min-h-32 font-mono text-xs" maxLength={3000}
              value={params.negative} onChange={(e) => set("negative", e.target.value)} />
          </label>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <button onClick={() => setTab("ajustes")} className="btn border border-border !py-2 text-sm">
          <SlidersHorizontal size={16} /> Configuración
        </button>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1 rounded bg-surface-2 px-2 py-1 text-brand">
            <Coins size={16} /> {cost}
          </span>
          {kind === "image" && (
            <div className="flex rounded-full bg-surface p-1 text-sm">
              {SPEEDS.map((s) => (
                <button key={s.id} onClick={() => set("speed", s.id)}
                  className={`rounded-full px-3 py-1 ${params.speed === s.id ? "bg-brand text-white" : "text-muted"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={submit} disabled={loading || prompt.trim().length < 5}
            className="btn btn-primary disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Generar
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="card mt-6 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result} alt="Resultado" className="mx-auto max-h-[70vh] object-contain" />
        </div>
      )}

      <Feed refreshKey={refresh} />
    </main>
  );
}

function Templates({ onAdd }: { onAdd: (text: string) => void }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("tpl_favs") ?? "[]"); } catch { return []; }
  });
  const [onlyFavs, setOnlyFavs] = useState(false);

  function toggleFav(id: string) {
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    setFavs(next);
    try { localStorage.setItem("tpl_favs", JSON.stringify(next)); } catch {}
  }

  const list = TEMPLATES.filter(
    (t) =>
      (!tag || t.tag === tag) &&
      (!onlyFavs || favs.includes(t.id)) &&
      (t.name + t.tag).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <p className="mb-4 rounded-lg border border-border p-4 text-sm text-muted">
        Las plantillas son complementos para tu prompt: añaden estilo, escenario o detalles. Pulsa una para añadirla.
      </p>
      <div className="mb-3 flex gap-2 text-sm">
        <button onClick={() => setOnlyFavs(false)} className={`rounded-lg px-4 py-2 ${!onlyFavs ? "bg-surface-2 text-brand" : "text-muted"}`}>Todas</button>
        <button onClick={() => setOnlyFavs(true)} className={`rounded-lg px-4 py-2 ${onlyFavs ? "bg-surface-2 text-brand" : "text-muted"}`}>Favoritas</button>
      </div>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-3.5 text-muted" />
        <input className="input !pl-9" placeholder="Encontrar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TEMPLATE_TAGS.map((t) => (
          <button key={t} onClick={() => setTag(tag === t ? null : t)}
            className={`rounded border px-3 py-1 text-sm ${tag === t ? "border-brand text-brand" : "border-border text-muted"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((t) => (
          <div key={t.id} className="card relative flex aspect-[3/4] flex-col justify-end bg-gradient-to-br from-surface-2 to-background p-3">
            <span className="absolute left-2 top-2 rounded bg-surface px-1.5 text-xs">{t.tag}</span>
            <button onClick={() => toggleFav(t.id)} className="absolute bottom-2 right-2" aria-label="Favorita">
              <Star size={18} className={favs.includes(t.id) ? "fill-brand text-brand" : "text-muted"} />
            </button>
            <button onClick={() => onAdd(t.text)} className="pr-8 text-left font-semibold hover:text-brand">
              {t.name}
            </button>
          </div>
        ))}
        {!list.length && <p className="text-muted">Sin resultados.</p>}
      </div>
    </div>
  );
}

function Characters({
  characters, setCharacters, active, onPick,
}: {
  characters: Character[];
  setCharacters: (c: Character[]) => void;
  active?: string;
  onPick: (id: string | undefined) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function create() {
    setError("");
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Error");
    setCharacters([data, ...characters]);
    onPick(data.id);
    setName("");
    setDescription("");
  }

  async function remove(id: string) {
    await createClient().from("characters").delete().eq("id", id);
    setCharacters(characters.filter((c) => c.id !== id));
    if (active === id) onPick(undefined);
  }

  return (
    <div className="space-y-5">
      <p className="rounded-lg border border-border p-4 text-sm text-muted">
        Crea un personaje <b>original y ficticio</b> describiendo su aspecto (edad adulta, pelo, ojos,
        complexión, estilo). Se añadirá a tus prompts para mantenerlo consistente. No se pueden subir
        fotos ni caras de personas reales.
      </p>
      <div className="card space-y-3 p-4">
        <input className="input" placeholder="Nombre del personaje" value={name} maxLength={60}
          onChange={(e) => setName(e.target.value)} />
        <textarea className="input min-h-24" placeholder="Ej.: mujer adulta de 30 años, pelo rojo rizado, ojos verdes, pecas, complexión atlética…"
          value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} />
        <button onClick={create} disabled={!name.trim() || description.trim().length < 5} className="btn btn-primary disabled:opacity-50">
          <Plus size={16} /> Guardar personaje
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <p className="text-sm text-muted">
        Para guardar la cara de un modelo como referencia, ve a{" "}
        <a href="/modelos" className="text-brand">Mis modelos</a>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {characters.map((c) => (
          <div key={c.id} className={`card flex items-start gap-3 p-4 ${active === c.id ? "border-brand" : ""}`}>
            {c.faceUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.faceUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
            )}
            <button onClick={() => onPick(active === c.id ? undefined : c.id)} className="flex-1 text-left">
              <div className="font-semibold">{c.name} {active === c.id && <Check size={14} className="inline text-brand" />}</div>
              <div className="line-clamp-2 text-sm text-muted">{c.description}</div>
            </button>
            <button onClick={() => remove(c.id)} aria-label="Borrar" className="text-muted hover:text-red-400">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
