import { type NextRequest, NextResponse } from "next/server";
import {
  CABECERA_RUTA,
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "@/shared/tenancy/cabeceras";
import { leerSubdominio } from "@/shared/tenancy/subdominio";

/**
 * Resolucion de tenant en el borde del request.
 *
 * En Next 16 esto se llama `proxy.ts` y exporta `proxy()`; en 15 era
 * `middleware.ts`. Misma firma y mismo `config.matcher`.
 *
 * Lo unico que hace es leer el Host y dejar el resultado en cabeceras.
 * **No consulta la base**: el proxy corre en el runtime del borde, donde
 * no hay TCP hacia Postgres. La busqueda del ayuntamiento ocurre despues,
 * en servidor, con `ayuntamientoActual()`.
 */

export function proxy(request: NextRequest) {
  const cabeceras = new Headers(request.headers);

  /**
   * Esto es lo que sostiene todo lo demas.
   *
   * Las cabeceras entrantes las controla quien hace la peticion. Nada
   * impide que un cliente mande `x-xula-subdominio: ticul` por su cuenta.
   * Si no se borraran antes de escribir las nuestras, un usuario de Motul
   * elegiria contra que municipio corre su request — que es exactamente
   * la fuga que RLS existe para impedir.
   *
   * Se borran SIEMPRE, incluso en las ramas que no escriben ninguna. Un
   * `delete` de mas no cuesta nada; uno de menos cuesta el negocio.
   */
  cabeceras.delete(CABECERA_SUPERFICIE);
  cabeceras.delete(CABECERA_SUBDOMINIO);
  cabeceras.set(CABECERA_RUTA, request.nextUrl.pathname);

  const resultado = leerSubdominio(
    request.headers.get("host"),
    process.env.DOMINIO_BASE ?? "localhost",
  );

  switch (resultado.tipo) {
    case "ayuntamiento":
      cabeceras.set(CABECERA_SUPERFICIE, "ayuntamiento");
      cabeceras.set(CABECERA_SUBDOMINIO, resultado.subdominio);
      break;

    case "admin":
      // El panel de SUPER_ADMIN vive fuera del espacio de tenants: no
      // lleva subdominio de municipio porque no pertenece a ninguno.
      cabeceras.set(CABECERA_SUPERFICIE, "admin");
      break;

    case "raiz":
      cabeceras.set(CABECERA_SUPERFICIE, "raiz");
      break;

    case "invalido":
      // Un Host que no es nuestro, o un nombre reservado. No se sirve
      // nada: no hay superficie que corresponda y adivinar una seria
      // elegir un tenant por el cliente.
      return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next({ request: { headers: cabeceras } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
