import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/edad", "/terminos", "/privacidad", "/contenido", "/api/webhooks"];

// Puerta de edad: sin la cookie de confirmación nada se muestra salvo /edad y
// las páginas legales. El ref de afiliado se guarda 30 días.
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const ageOk = request.cookies.get("age_ok")?.value === "1";

  let response: NextResponse;
  if (!ageOk && !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/edad";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  const ref = searchParams.get("ref");
  if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) {
    response.cookies.set("ref", ref, { maxAge: 60 * 60 * 24 * 30, path: "/" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
