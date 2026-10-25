import Link from "next/link";
import { ChevronRight, Image as ImageIcon, Video, UserRound, ShieldCheck } from "lucide-react";

const features = [
  {
    title: "Imágenes",
    icon: ImageIcon,
    href: "/generar",
    cta: "Genera imágenes gratis",
    text: "Escribe una descripción y obtén en segundos imágenes de personajes ficticios adultos, en el estilo que elijas.",
  },
  {
    title: "Vídeos",
    icon: Video,
    href: "/video",
    cta: "Crear vídeo con IA",
    text: "Convierte una idea en una escena animada corta. Movimiento fluido y alta calidad.",
  },
  {
    title: "Personajes",
    icon: UserRound,
    href: "/personajes",
    cta: "Crear personaje",
    text: "Diseña tu propio personaje original y mantenlo en distintas escenas.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="mb-6 text-5xl font-extrabold text-brand md:text-6xl">
          Generador de contenido adulto con IA
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-muted">
          Imágenes y vídeos para adultos creados desde texto, con personajes 100% ficticios.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/registro" className="btn btn-primary">
            Empieza gratis <ChevronRight size={18} />
          </Link>
          <Link href="/galeria" className="btn btn-outline">
            Ver la galería
          </Link>
        </div>
      </section>

      <section className="bg-surface py-10">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="text-center">
              <h3 className="text-2xl font-bold text-brand">{f.title}</h3>
              <p className="mt-2 text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {features.map((f, i) => (
        <section
          key={f.title}
          className={`mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 py-16 md:flex-row ${i % 2 ? "md:flex-row-reverse" : ""}`}
        >
          <div className="card flex aspect-square w-full max-w-sm items-center justify-center bg-gradient-to-br from-surface-2 to-background">
            <f.icon size={72} className="text-brand/70" />
          </div>
          <div className="flex-1">
            <h2 className="mb-4 text-3xl font-bold">
              IA <span className="text-brand">{f.title}</span>
            </h2>
            <p className="mb-6 text-muted">{f.text}</p>
            <Link href={f.href} className="btn btn-primary">
              {f.cta} <ChevronRight size={18} />
            </Link>
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="card flex gap-4 p-6">
          <ShieldCheck className="shrink-0 text-brand" size={28} />
          <div>
            <h3 className="mb-1 font-semibold">Seguridad y consentimiento</h3>
            <p className="text-sm text-muted">
              Solo se permiten personajes ficticios adultos. No se puede subir ni imitar a personas
              reales. Todo prompt pasa por moderación automática y las cuentas que lo intentan se
              suspenden.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
