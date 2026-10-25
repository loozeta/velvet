import { randomUUID } from "node:crypto";
import { createAdmin } from "@/lib/supabase/server";

// Las imágenes en base64 son demasiado pesadas para guardarlas en la tabla:
// se suben al bucket "media" y se guarda la URL pública (nombre aleatorio).
export async function persistMedia(userId: string, url: string): Promise<string> {
  const m = url.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) return url; // URL externa o placeholder SVG: se deja tal cual
  const ext = m[1].split("/")[1];
  const path = `${userId}/${randomUUID()}.${ext}`;
  const db = createAdmin();
  const { error } = await db.storage.from("media").upload(path, Buffer.from(m[2], "base64"), {
    contentType: m[1],
  });
  if (error) throw new Error("No se pudo guardar la imagen");
  return db.storage.from("media").getPublicUrl(path).data.publicUrl;
}
