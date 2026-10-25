import { NextResponse } from "next/server";
import { createAdmin, getUserAndProfile } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { profile } = await getUserAndProfile();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { action, id, reportId } = await request.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const db = createAdmin();

  switch (action) {
    case "remove":
      await db.from("generations").update({ status: "removed", is_public: false }).eq("id", id);
      if (reportId) await db.from("reports").update({ resolved: true }).eq("id", reportId);
      break;
    case "dismiss":
      if (reportId) await db.from("reports").update({ resolved: true }).eq("id", reportId);
      break;
    case "ban":
      await db.from("profiles").update({ banned: true }).eq("id", id);
      break;
    case "unban":
      await db.from("profiles").update({ banned: false }).eq("id", id);
      break;
    default:
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
