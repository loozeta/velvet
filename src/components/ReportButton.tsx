"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ReportButton({ id }: { id: string }) {
  const [done, setDone] = useState(false);

  async function report() {
    const reason = prompt("¿Por qué lo reportas? (menor, persona real, sin consentimiento, otro)");
    if (!reason) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Inicia sesión para reportar.");
    await supabase.from("reports").insert({ generation_id: id, reporter_id: user.id, reason });
    setDone(true);
  }

  return (
    <button onClick={report} disabled={done} title="Reportar" className="shrink-0 hover:text-red-400">
      <Flag size={14} />
    </button>
  );
}
