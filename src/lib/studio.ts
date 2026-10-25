export type Speed = "express" | "speed" | "quality";

export const SPEEDS: { id: Speed; label: string; cost: number }[] = [
  { id: "express", label: "Exprés", cost: 1 },
  { id: "speed", label: "Velocidad", cost: 2 },
  { id: "quality", label: "Calidad", cost: 4 },
];

export const MODELS = [
  { id: "real-dark", group: "Realista", name: "Reina Oscura", isNew: true },
  { id: "real-nude", group: "Realista", name: "Estudio Natural" },
  { id: "real-glam", group: "Realista", name: "Glamour" },
  { id: "real-cine", group: "Realista", name: "Cinematográfico" },
  { id: "art-fantasy", group: "Artístico", name: "Fantasía Hardcore" },
  { id: "art-anime", group: "Artístico", name: "Anime de Deseo" },
  { id: "art-ill", group: "Artístico", name: "Ilustración Digital" },
  { id: "art-3d", group: "Artístico", name: "Render 3D" },
] as const;

export const SIZES = [
  { id: "1:1", label: "1:1 Cuadrado" },
  { id: "9:16", label: "9:16 Vertical" },
  { id: "16:9", label: "16:9 Horizontal" },
  { id: "3:4", label: "3:4 Retrato" },
  { id: "4:3", label: "4:3 Paisaje" },
] as const;

// Plantillas: fragmentos de prompt reutilizables, agrupados por etiqueta.
export const TEMPLATE_TAGS = [
  "Bikini", "Anime", "Lencería", "Hentai", "Lésbico", "Playa", "Oficina", "Fantasía",
  "Cyberpunk", "Gótico", "Disfraz", "Ducha", "Dormitorio", "Piscina",
] as const;

export const TEMPLATES = [
  { id: "t1", name: "Bikini de verano", tag: "Bikini", text: "adult woman in a small bikini, sunny beach, golden hour" },
  { id: "t2", name: "Anime clásico", tag: "Anime", text: "adult anime character, cel shading, vibrant colors" },
  { id: "t3", name: "Lencería de encaje", tag: "Lencería", text: "adult woman in black lace lingerie, soft bedroom light" },
  { id: "t4", name: "Hentai ilustrado", tag: "Hentai", text: "adult hentai style illustration, detailed linework" },
  { id: "t5", name: "Pareja lésbica", tag: "Lésbico", text: "two adult women, intimate, soft natural light" },
  { id: "t6", name: "Atardecer en la playa", tag: "Playa", text: "adult couple on a secluded beach at sunset" },
  { id: "t7", name: "Secretaria", tag: "Oficina", text: "adult woman in office attire, modern office, evening" },
  { id: "t8", name: "Elfa guerrera", tag: "Fantasía", text: "adult elf warrior, fantasy armor, ornate forest background" },
  { id: "t9", name: "Neón urbano", tag: "Cyberpunk", text: "adult cyberpunk character, neon city, rain, reflections" },
  { id: "t10", name: "Vampira", tag: "Gótico", text: "adult gothic vampire, candlelit mansion, velvet and lace" },
  { id: "t11", name: "Enfermera", tag: "Disfraz", text: "adult woman in nurse costume, studio lighting" },
  { id: "t12", name: "Bajo la ducha", tag: "Ducha", text: "adult person in a steamy shower, glass, water droplets" },
  { id: "t13", name: "Suite de hotel", tag: "Dormitorio", text: "adult couple in a luxury hotel suite, warm lamps" },
  { id: "t14", name: "Piscina infinita", tag: "Piscina", text: "adult woman by an infinity pool, villa, midday sun" },
] as const;

export const DEFAULT_NEGATIVE =
  "ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, body out of frame, blurry, bad anatomy, blurred, watermark, grainy, signature, cut off, draft, text, logo";

export type StudioParams = {
  model: string;
  speed: Speed;
  size: string;
  cfg: number;
  photoEffect: number;
  negative: string;
  characterId?: string;
};

export const DEFAULT_PARAMS: StudioParams = {
  model: "real-nude",
  speed: "express",
  size: "1:1",
  cfg: 5,
  photoEffect: 5,
  negative: DEFAULT_NEGATIVE,
};

export function costOf(kind: "image" | "video", speed: Speed) {
  if (kind === "video") return 5;
  return SPEEDS.find((s) => s.id === speed)!.cost;
}
