import Studio from "@/components/Studio";
import { loadCharacters } from "@/lib/characters";

export default async function Page() {
  return <Studio kind="video" characters={await loadCharacters()} />;
}
