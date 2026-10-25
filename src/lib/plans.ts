export const PACKS = [
  { id: "starter", name: "Starter", credits: 100, priceCents: 500 },
  { id: "pro", name: "Pro", credits: 500, priceCents: 2000, featured: true },
  { id: "max", name: "Max", credits: 1500, priceCents: 5000 },
] as const;

export type PackId = (typeof PACKS)[number]["id"];
