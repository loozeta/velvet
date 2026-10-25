"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Gate() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";

  function accept() {
    document.cookie = "age_ok=1; path=/; max-age=31536000; samesite=lax";
    router.replace(next.startsWith("/") ? next : "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mb-4 text-5xl font-extrabold text-brand">18+</div>
        <h1 className="mb-3 text-2xl font-bold">Contenido para adultos</h1>
        <p className="mb-6 text-muted">
          Este sitio contiene material sexual explícito generado con IA. Debes tener al menos 18
          años (o la mayoría de edad en tu país) y que ver este contenido sea legal donde vives.
        </p>
        <button onClick={accept} className="btn btn-primary mb-3 w-full">
          Soy mayor de edad — Entrar
        </button>
        <a href="https://www.google.com" className="btn w-full border border-border text-muted">
          Salir
        </a>
      </div>
    </main>
  );
}

export default function AgePage() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
