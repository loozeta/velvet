"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-outline !py-1.5 text-sm"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Cerrar sesión
    </button>
  );
}

export function PublicToggle({ id, isPublic }: { id: string; isPublic: boolean }) {
  const router = useRouter();
  return (
    <button
      className="text-xs text-brand"
      onClick={async () => {
        await createClient().from("generations").update({ is_public: !isPublic }).eq("id", id);
        router.refresh();
      }}
    >
      {isPublic ? "Hacer privada" : "Publicar en galería"}
    </button>
  );
}

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="text-xs text-red-400"
      onClick={async () => {
        await createClient().from("generations").delete().eq("id", id);
        router.refresh();
      }}
    >
      Borrar
    </button>
  );
}
