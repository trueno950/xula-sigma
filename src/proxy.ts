import { type NextRequest, NextResponse } from "next/server";
import {
  CABECERA_RUTA,
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "@/shared/tenancy/cabeceras";
import {
  DOMINIO_BASE_POR_DEFECTO,
  leerSubdominio,
} from "@/shared/tenancy/subdominio";

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

/**
 * De donde sale el tenant, y el unico lugar donde sale.
 *
 * `host` manda siempre que nombre algo nuestro. `x-forwarded-host` se mira
 * en un solo caso: cuando `host` no cuelga del dominio base **en
 * absoluto**, que es la firma del render sintetico con el que Next
 * resuelve el destino del `redirect()` de un Server Action. Ese request lo
 * emite el propio servidor contra si mismo -medido: `host: localhost:3100`
 * con `DOMINIO_BASE=xula.localhost`- y trae el host original en
 * `x-forwarded-host`. Sin esto el proxy le responde 404 y la pantalla
 * muere justo despues de guardar.
 *
 * **El orden es la reja, y por eso vive aca y no en `contexto.ts`.** Una
 * peticion del cliente al dominio raiz pelado da `raiz`, no `invalido`, y
 * entonces `x-forwarded-host` ni se mira: un valor ajeno no puede mover el
 * municipio. Cuando esto vivia un nivel mas adentro, esa misma peticion
 * con `x-forwarded-host: motul.<base>` se servia como Motul -reproducido
 * con curl, y es lo que cierra `e2e/respaldoPorHost.spec.ts`-.
 *
 * De ahi que `DOMINIO_BASE` **no pueda ser nunca el host interno del
 * servidor**. Si lo fuera -`localhost` a secas, que era el valor por
 * defecto- el render sintetico daria `raiz` en vez de `invalido`: el
 * respaldo no correria y el redirect volveria a romperse. Por eso el
 * defecto es `xula.localhost`, que Chromium mapea igual al loopback sin
 * tocar `/etc/hosts` pero no colisiona con `localhost` pelado.
 */
function resolverHost(cabeceras: Headers) {
  const base = process.env.DOMINIO_BASE ?? DOMINIO_BASE_POR_DEFECTO;
  const delHost = leerSubdominio(cabeceras.get("host"), base);

  if (delHost.tipo !== "invalido") return delHost;

  return leerSubdominio(cabeceras.get("x-forwarded-host"), base);
}

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

  const resultado = resolverHost(request.headers);

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
