import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PUBLICAS = ["/login"];

// Refresca la sesión de Supabase en cada request y protege las rutas privadas.
// Se invoca desde src/proxy.ts (en Next.js 16 "middleware" pasó a llamarse "proxy").
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // No escribir código entre createServerClient y getClaims():
  // getClaims() valida el JWT y refresca la sesión si hace falta.
  const { data } = await supabase.auth.getClaims();
  const usuario = data?.claims;

  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );

  if (!usuario && !esPublica) {
    return redirigir(request, supabaseResponse, "/login");
  }

  if (usuario && (esPublica || pathname === "/")) {
    return redirigir(request, supabaseResponse, "/panel");
  }

  return supabaseResponse;
}

// Redirige conservando las cookies de sesión que Supabase haya actualizado.
function redirigir(
  request: NextRequest,
  supabaseResponse: NextResponse,
  destino: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";
  const respuesta = NextResponse.redirect(url);
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => respuesta.cookies.set(cookie));
  return respuesta;
}
