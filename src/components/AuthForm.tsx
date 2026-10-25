"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "registro" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signup = mode === "registro";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = signup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    if (signup) await fetch("/api/onboard", { method: "POST" });
    router.push("/generar");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <h1 className="text-2xl font-bold">{signup ? "Crear cuenta" : "Entrar"}</h1>
        <input className="input" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Contraseña" minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {signup && (
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} required />
            <span>
              Confirmo que soy mayor de 18 años, acepto los{" "}
              <Link href="/terminos" className="text-brand">términos</Link> y me comprometo a no
              generar contenido de menores, de personas reales ni sin consentimiento.
            </span>
          </label>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={loading || (signup && !adult)} className="btn btn-primary w-full disabled:opacity-60">
          {signup ? "Registrarme (10 créditos gratis)" : "Entrar"}
        </button>
        <p className="text-center text-sm text-muted">
          {signup ? (
            <>¿Ya tienes cuenta? <Link href="/login" className="text-brand">Entra</Link></>
          ) : (
            <>¿Nuevo? <Link href="/registro" className="text-brand">Crea tu cuenta</Link></>
          )}
        </p>
      </form>
    </main>
  );
}
