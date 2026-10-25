import Studio from "@/components/Studio";
import { loadCharacters } from "@/lib/characters";

export default async function Page() {
  return <Studio kind="image" initialTab="personajes" characters={await loadCharacters()} />;
}
