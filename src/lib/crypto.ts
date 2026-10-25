import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM. APP_ENCRYPTION_KEY: 32 bytes en base64.
function key() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : null;
  if (!buf || buf.length !== 32) throw new Error("APP_ENCRYPTION_KEY no configurada (32 bytes en base64)");
  return buf;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
