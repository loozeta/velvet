// Integración con OpenAI: verificación del token y generación de imágenes.

export class ProviderError extends Error {}

// Un modelo puede aparecer en /v1/models y aun así estar retirado, así que se
// prueban en orden y se salta el que OpenAI responda que "no existe".
const IMAGE_MODELS = ["gpt-image-1-mini", "gpt-image-1.5", "gpt-image-2", "gpt-image-1"];
const MODEL_BY_SPEED: Record<string, string> = {
  express: "gpt-image-1-mini",
  speed: "gpt-image-1.5",
  quality: "gpt-image-2",
};

function candidates(speed?: string) {
  const first = process.env.OPENAI_IMAGE_MODEL || MODEL_BY_SPEED[speed ?? "express"];
  return [first, ...IMAGE_MODELS].filter((m, i, a) => m && a.indexOf(m) === i);
}

export type VerifyResult = { ok: boolean; message: string; hasImageModel?: boolean };

// Comprueba el token con GET /v1/models (no consume saldo).
export async function verifyOpenAIKey(key: string): Promise<VerifyResult> {
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, message: "No se pudo conectar con OpenAI. Revisa tu conexión e inténtalo de nuevo." };
  }
  if (res.status === 401) return { ok: false, message: "Token inválido o revocado. Revisa que lo copiaste completo." };
  if (res.status === 403) return { ok: false, message: "El token no tiene permisos para listar modelos. Crea uno con acceso completo o de lectura de modelos." };
  if (res.status === 429) return { ok: false, message: "OpenAI limita esta cuenta (cuota o saldo agotado). Revisa Billing en platform.openai.com." };
  if (!res.ok) return { ok: false, message: `OpenAI respondió con el error ${res.status}.` };

  const data = (await res.json().catch(() => ({}))) as { data?: { id: string }[] };
  const ids = new Set((data.data ?? []).map((m) => m.id));
  const available = IMAGE_MODELS.filter((m) => ids.has(m) && m !== "gpt-image-1");
  const hasImageModel = available.length > 0;
  return hasImageModel
    ? { ok: true, hasImageModel, message: `Token válido. Modelos de imagen disponibles: ${available.join(", ")}.` }
    : {
        ok: true,
        hasImageModel,
        message:
          "Token válido, pero tu cuenta no muestra modelos de imagen (gpt-image). Puede requerir verificar tu organización en platform.openai.com.",
      };
}

const SIZES: Record<string, string> = {
  "1:1": "1024x1024",
  "9:16": "1024x1536",
  "3:4": "1024x1536",
  "16:9": "1536x1024",
  "4:3": "1536x1024",
};
const QUALITY: Record<string, string> = { express: "low", speed: "medium", quality: "high" };

async function toBlob(url: string): Promise<Blob | null> {
  const m = url.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (m) return new Blob([Buffer.from(m[2], "base64")], { type: m[1] });
  if (/^https:\/\//.test(url)) {
    const r = await fetch(url);
    return r.ok ? await r.blob() : null;
  }
  return null;
}

export async function openaiImage(opts: {
  key: string;
  prompt: string;
  size?: string;
  speed?: string;
  referenceUrl?: string;
}): Promise<string> {
  const size = SIZES[opts.size ?? "1:1"] ?? "1024x1024";
  const quality = QUALITY[opts.speed ?? "express"] ?? "low";
  const ref = opts.referenceUrl ? await toBlob(opts.referenceUrl) : null;

  const call = (model: string) => {
    if (ref) {
      // Con cara de referencia usamos edits para mantener la consistencia.
      const form = new FormData();
      form.set("model", model);
      form.set("prompt", opts.prompt);
      form.set("size", size);
      form.set("quality", quality);
      form.set("image", ref, "reference.png");
      return fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.key}` },
        body: form,
        signal: AbortSignal.timeout(170000),
      });
    }
    return fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: opts.prompt, size, quality, n: 1 }),
      signal: AbortSignal.timeout(170000),
    });
  };

  let res: Response | null = null;
  let lastErr = "";
  for (const model of candidates(opts.speed)) {
    const r = await call(model);
    if (r.ok) { res = r; break; }
    const err = (await r.clone().json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    const missing = /does not exist|model_not_found|not have access to model/i.test(`${err.error?.code} ${err.error?.message}`);
    if (!missing) { res = r; break; }
    lastErr = err.error?.message ?? "";
  }
  if (!res) throw new ProviderError(`Ningún modelo de imagen de OpenAI está disponible en tu cuenta. ${lastErr}`.trim());

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    const code = err.error?.code;
    if (res.status === 401) throw new ProviderError("Tu token de OpenAI no es válido. Revísalo en Configuración.");
    if (res.status === 429 || code === "billing_hard_limit_reached" || code === "insufficient_quota") {
      throw new ProviderError("Tu cuenta de OpenAI no tiene saldo o alcanzó su límite.");
    }
    if (code === "moderation_blocked" || code === "content_policy_violation") {
      throw new ProviderError(
        "OpenAI rechazó este prompt por su política de contenido (no permite contenido sexual explícito). Prueba con un prompt apto para comprobar que todo funciona.",
      );
    }
    if (res.status === 403) {
      throw new ProviderError("Tu cuenta de OpenAI no tiene acceso a los modelos de imagen (puede requerir verificar la organización).");
    }
    throw new ProviderError(`OpenAI devolvió el error ${res.status}${err.error?.message ? `: ${err.error.message}` : ""}`);
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new ProviderError("OpenAI no devolvió ninguna imagen.");
  return `data:image/png;base64,${b64}`;
}
