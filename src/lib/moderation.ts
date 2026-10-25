// Filtro de prompts. Es una primera barrera, no sustituye a un servicio de
// moderación (ver MODERATION_API_URL en .env.example) ni a la revisión humana.

const MINOR_TERMS = [
  "niñ", "nino", "nina", "menor", "infan", "pequeñ", "colegial", "escolar",
  "preadolesc", "adolescente", "lolita", "loli", "shota", "bebe", "bebé",
  "child", "kid", "minor", "underage", "under age", "teen", "schoolgirl",
  "schoolboy", "toddler", "preteen", "young girl", "young boy", "jailbait",
  "13 años", "14 años", "15 años", "16 años", "17 años",
];

const REAL_PERSON_TERMS = [
  "famosa", "famoso", "celebridad", "actriz", "cantante", "influencer",
  "mi vecina", "mi ex", "mi novia", "mi jefa", "compañera", "mi hermana",
  "mi madre", "mi mamá", "mi prima", "celebrity", "my ex", "my neighbor",
  "my coworker", "my sister", "my mom", "politician", "político",
  "foto de", "photo of", "face of", "cara de", "rostro de",
];

const VIOLENCE_TERMS = [
  "violación", "violacion", "rape", "no consent", "sin consentimiento",
  "forced", "forzada", "drogada", "drugged", "inconsciente", "unconscious",
  "bestialidad", "zoofilia", "beastiality", "bestiality",
];

export type ModerationResult =
  | { ok: true }
  | { ok: false; reason: "minor" | "real_person" | "non_consensual"; message: string };

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

function hits(text: string, terms: string[]) {
  const t = normalize(text);
  return terms.some((term) => t.includes(normalize(term)));
}

export function moderatePrompt(prompt: string): ModerationResult {
  if (hits(prompt, MINOR_TERMS)) {
    return {
      ok: false,
      reason: "minor",
      message: "Solo se permite contenido de personajes ficticios adultos (+18).",
    };
  }
  if (hits(prompt, REAL_PERSON_TERMS)) {
    return {
      ok: false,
      reason: "real_person",
      message: "No se permite generar contenido de personas reales ni basado en sus fotos.",
    };
  }
  if (hits(prompt, VIOLENCE_TERMS)) {
    return {
      ok: false,
      reason: "non_consensual",
      message: "No se permite contenido no consentido.",
    };
  }
  return { ok: true };
}

// Todos los prompts se envían al proveedor con este prefijo para reforzar la
// política también del lado del modelo.
export const SAFETY_PREFIX =
  "Fictional adult character, clearly over 18 years old, fully synthetic, not resembling any real person. ";
