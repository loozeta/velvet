import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <h3 className="mb-3 font-semibold">Documentación</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/terminos">Términos y condiciones</Link></li>
            <li><Link href="/privacidad">Política de privacidad</Link></li>
            <li><Link href="/contenido">Política de contenido</Link></li>
            <li><Link href="/eliminar">Eliminación de contenido</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Empresa</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/afiliados">Programa de afiliados</Link></li>
            <li><Link href="/precios">Precios</Link></li>
            <li><Link href="/contacto">Contacto</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Herramientas</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/generar">Generador de imágenes</Link></li>
            <li><Link href="/video">Generador de vídeos</Link></li>
            <li><Link href="/personajes">Personajes IA</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted">
        © Velvet 2026 · Solo personajes ficticios adultos · Restringido a mayores de 18 años ·
        Prohibido subir o imitar a personas reales.
      </div>
    </footer>
  );
}
