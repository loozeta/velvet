// Interfaz con el proveedor de generación. Sin GENERATION_API_URL devuelve un
// placeholder, para poder probar todo el flujo (créditos, galería, moderación)
// sin gastar dinero. Para producción, apunta GENERATION_API_URL a tu proveedor
// (que debe permitir contenido adulto y tener sus propios filtros).

export type GenerationKind = "image" | "video";

export type GenerationInput = {
  kind: GenerationKind;
  prompt: string;
  negative?: string;
  model?: string;
  speed?: string;
  size?: string;
  cfg?: number;
  photoEffect?: number;
  // Solo para animar una imagen generada previamente en esta plataforma.
  sourceUrl?: string;
  // Cara de referencia del personaje (imagen generada en la plataforma).
  referenceUrl?: string;
};

export type GenerationOutput = { url: string };

export async function generate(input: GenerationInput): Promise<GenerationOutput> {
  const endpoint = process.env.GENERATION_API_URL;
  if (!endpoint) return mock(input);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GENERATION_API_KEY ?? ""}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Proveedor respondió ${res.status}`);
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Respuesta del proveedor sin url");
  return { url: data.url };
}

function dims(size?: string): [number, number] {
  switch (size) {
    case "9:16": return [576, 1024];
    case "16:9": return [1024, 576];
    case "3:4": return [768, 1024];
    case "4:3": return [1024, 768];
    default: return [768, 768];
  }
}

function mock(input: GenerationInput): GenerationOutput {
  const hue = [...input.prompt].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const [w, h] = dims(input.size);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue},70%,35%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},70%,15%)"/>
</linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<text x="50%" y="50%" fill="#fff" fill-opacity=".7" font-family="sans-serif" font-size="28" text-anchor="middle">${input.kind} (demo)</text>
</svg>`;
  return { url: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` };
}
