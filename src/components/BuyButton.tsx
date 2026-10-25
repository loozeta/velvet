"use client";

import { useState } from "react";

export default function BuyButton({ packId, featured }: { packId: string; featured?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setLoading(false);
    setError(res.status === 401 ? "Inicia sesión primero." : (data.error ?? "Error"));
  }

  return (
    <>
      <button onClick={buy} disabled={loading} className={`btn w-full ${featured ? "btn-primary" : "btn-outline"}`}>
        {loading ? "Redirigiendo…" : "Comprar"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </>
  );
}
