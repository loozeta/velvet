"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2, ShieldAlert, Trash2, XCircle } from "lucide-react";

type Status = { configured: boolean; last4: string | null; verifiedAt: string | null };
type Msg = { ok: boolean; text: string } | null;

export default function OpenAISettings({ initial }: { initial: Status }) {
  const [status, setStatus] = useState(initial);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  async function save() {
    setBusy("save");
    setMsg(null);
    const res = await fetch("/api/settings/openai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setMsg({ ok: !!data.ok, text: data.message ?? data.error ?? "Error" });
    if (data.ok) {
      setKey("");
      setStatus({ configured: true, last4: data.last4, verifiedAt: data.verifiedAt });
    }
  }

  async function test() {
    setBusy("test");
    setMsg(null);
    const res = await fetch("/api/settings/openai", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setMsg({ ok: !!data.ok, text: data.message ?? data.error ?? "Error" });
    if (data.ok) setStatus((s) => ({ ...s, verifiedAt: new Date().toISOString() }));
  }

  async function remove() {
    await fetch("/api/settings/openai", { method: "DELETE" });
    setStatus({ configured: false, last4: null, verifiedAt: null });
    setMsg({ ok: true, text: "Token eliminado." });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Configuración</h1>
      <p className="mb-6 text-muted">Conecta tus propios proveedores para generar con tu cuenta.</p>

      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <KeyRound className="text-brand" />
          <h2 className="text-xl font-semibold">OpenAI</h2>
          {status.configured && (
            <span className="ml-auto rounded-full bg-surface-2 px-3 py-1 text-xs text-brand">
              Guardado · …{status.last4}
            </span>
          )}
        </div>
        <p className="text-sm text-muted">
          Pega tu token de <b>platform.openai.com</b> (empieza por <code>sk-</code>). Se comprueba con OpenAI
          antes de guardarlo y se almacena cifrado en el servidor: nunca vuelve al navegador. Las imágenes se
          generan con <code>gpt-image-1</code> y el coste lo paga tu cuenta de OpenAI.
        </p>

        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="input font-mono text-sm"
          placeholder={status.configured ? "Pega un token nuevo para reemplazar el guardado" : "sk-…"}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={!key.trim() || busy !== null} className="btn btn-primary disabled:opacity-50">
            {busy === "save" ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />} Guardar y probar
          </button>
          {status.configured && (
            <>
              <button onClick={test} disabled={busy !== null} className="btn btn-outline disabled:opacity-50">
                {busy === "test" ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Probar token guardado
              </button>
              <button onClick={remove} className="btn border border-border text-muted hover:text-red-400">
                <Trash2 size={16} /> Eliminar
              </button>
            </>
          )}
        </div>

        {msg && (
          <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${msg.ok ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400"}`}>
            {msg.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
            {msg.text}
          </div>
        )}
        {!msg && status.verifiedAt && (
          <p className="text-xs text-muted">Última verificación: {new Date(status.verifiedAt).toLocaleString("es")}</p>
        )}

        <p className="flex items-start gap-2 text-xs text-muted">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          OpenAI no permite contenido sexual explícito y rechazará esos prompts. Usa este proveedor para probar
          el flujo con prompts normales desde <Link href="/generar" className="text-brand">Generar</Link>.
        </p>
      </section>
    </main>
  );
}
