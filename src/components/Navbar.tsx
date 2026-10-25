import Link from "next/link";
import {
  Image as ImageIcon, Video, Sparkles, Images, Star, LogIn, Coins, ChevronDown, History,
} from "lucide-react";
import { getUserAndProfile } from "@/lib/supabase/server";

const generateMenu = [
  { href: "/generar", label: "Imagen", sub: "Generar imagen de IA", icon: ImageIcon },
  { href: "/video", label: "Vídeo", sub: "Generar vídeo de IA", icon: Video },
  { href: "/hojear", label: "Hojear", sub: "Dar vida a tus imágenes", icon: Sparkles },
];

export default async function Navbar() {
  const { user, profile } = await getUserAndProfile();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="rounded-lg bg-brand px-3 py-1 text-xl font-extrabold text-white">
          velvet
        </Link>
        <div className="hidden flex-1 items-center gap-5 md:flex">
          <div className="group relative">
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
              <ImageIcon size={18} className="text-brand" /> Generar <ChevronDown size={14} />
            </button>
            <div className="invisible absolute left-0 top-full w-72 rounded-xl border border-border bg-surface p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {generateMenu.map(({ href, label, sub, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-lg p-3 hover:bg-surface-2">
                  <span className="rounded-lg bg-surface-2 p-2"><Icon size={20} className="text-brand" /></span>
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="block text-sm text-muted">{sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <Link href="/personajes" className="flex items-center gap-2 text-sm hover:text-brand">
            <Star size={18} className="text-brand" /> Personajes
          </Link>
          <Link href="/galeria" className="flex items-center gap-2 text-sm hover:text-brand">
            <Images size={18} className="text-brand" /> Galería
          </Link>
          {user && (
            <Link href="/historial" className="flex items-center gap-2 text-sm hover:text-brand">
              <History size={18} className="text-brand" /> Historial
            </Link>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link href="/precios" className="flex items-center gap-1 text-sm text-brand">
                <Coins size={16} /> {profile?.credits ?? 0}
              </Link>
              <Link href="/cuenta" className="btn btn-outline !py-1.5 text-sm">Mi cuenta</Link>
              {profile?.role === "admin" && (
                <Link href="/admin" className="text-sm text-muted hover:text-brand">Admin</Link>
              )}
            </>
          ) : (
            <>
              <Link href="/registro" className="btn btn-outline !py-1.5 text-sm">
                <Star size={16} /> Pruébalo gratis
              </Link>
              <Link href="/login" aria-label="Entrar" className="text-muted hover:text-brand">
                <LogIn size={20} />
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
