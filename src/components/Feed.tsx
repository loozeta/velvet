"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, ThumbsUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; result_url: string | null; prompt: string; is_public: boolean };
type Tab = "private" | "public" | "liked";

export default function Feed({ refreshKey = 0 }: { refreshKey?: number }) {
  const [tab, setTab] = useState<Tab>("private");
  const [items, setItems] = useState<Item[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setMe(user?.id ?? null);

      const cols = "id, result_url, prompt, is_public";
      let rows: Item[] = [];
      if (tab === "public") {
        const { data } = await supabase.from("generations").select(cols)
          .eq("is_public", true).eq("status", "done").order("created_at", { ascending: false }).limit(40);
        rows = data ?? [];
      } else if (user && tab === "private") {
        const { data } = await supabase.from("generations").select(cols)
          .eq("user_id", user.id).neq("status", "removed").order("created_at", { ascending: false }).limit(40);
        rows = data ?? [];
      } else if (user && tab === "liked") {
        const { data } = await supabase.from("likes").select(`generations(${cols})`)
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(40);
        rows = (data ?? []).flatMap((r) => {
          const g = r.generations as unknown as Item | Item[] | null;
          return g ? (Array.isArray(g) ? g : [g]) : [];
        });
      }
      if (cancelled) return;
      setItems(rows);
      if (user) {
        const { data } = await supabase.from("likes").select("generation_id").eq("user_id", user.id);
        if (!cancelled) setLiked(new Set((data ?? []).map((l) => l.generation_id)));
      }
    })();
    return () => { cancelled = true; };
  }, [tab, refreshKey]);

  async function toggleLike(id: string) {
    if (!me) return;
    const supabase = createClient();
    const next = new Set(liked);
    if (next.has(id)) {
      next.delete(id);
      await supabase.from("likes").delete().eq("user_id", me).eq("generation_id", id);
    } else {
      next.add(id);
      await supabase.from("likes").insert({ user_id: me, generation_id: id });
    }
    setLiked(next);
    if (tab === "liked") setItems((list) => list.filter((i) => next.has(i.id)));
  }

  async function togglePublic(item: Item) {
    await createClient().from("generations").update({ is_public: !item.is_public }).eq("id", item.id);
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, is_public: !i.is_public } : i)));
  }

  const tabs: { id: Tab; label: string; icon: typeof Eye }[] = [
    { id: "private", label: "Feed privado", icon: EyeOff },
    { id: "public", label: "Feed público", icon: Eye },
    { id: "liked", label: "Me ha gustado", icon: ThumbsUp },
  ];

  return (
    <section className="mt-10">
      <div className="mb-4 flex gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${tab === id ? "bg-surface-2 text-brand" : "text-muted"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      {!me && tab !== "public" ? (
        <p className="text-muted">Inicia sesión para ver tu contenido.</p>
      ) : !items.length ? (
        <p className="text-muted">Nada por aquí todavía.</p>
      ) : (
        <div className="columns-2 gap-3 md:columns-3 lg:columns-5">
          {items.map((g) => (
            <figure key={g.id} className="group relative mb-3 break-inside-avoid overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.result_url ?? ""} alt={g.prompt.slice(0, 80)} className="w-full" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-2 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => toggleLike(g.id)} aria-label="Me gusta">
                  <ThumbsUp size={16} className={liked.has(g.id) ? "fill-brand text-brand" : ""} />
                </button>
                {tab === "private" && (
                  <button onClick={() => togglePublic(g)} className="text-xs">
                    {g.is_public ? "Hacer privada" : "Publicar"}
                  </button>
                )}
              </div>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
