import { type NextRequest, NextResponse } from "next/server";
import {
  CABECERA_RUTA,
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "@/shared/tenancy/cabeceras";
import {
  firmarRespaldoDeHost,
  leerSecreto,
  NOMBRE_COOKIE_RESPALDO,
  verificarRespaldoDeHost,
} from "@/shared/tenancy/respaldoDeHost";
import {
  DOMINIO_BASE_POR_DEFECTO,
  esHostInterno,
  leerSubdominio,
  type Subdominio,
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

type ResultadoDeHost = Subdominio & { readonly viaRespaldo: boolean };

/**
 * De donde sale el tenant, y el unico lugar donde sale.
 *
 * `host` manda siempre que nombre algo nuestro. Cuando no -y `host`
 * parece el propio servidor, `esHostInterno`- se prueba el respaldo: la
 * cookie firmada de `respaldoDeHost.ts`, nunca `x-forwarded-host` a
 * secas.
 *
 * **Por que no `x-forwarded-host`.** Existia un respaldo mas viejo que
 * confiaba en esa cabecera con solo `esHostInterno(host)` de condicion:
 * la firma del render sintetico con el que Next resuelve el destino del
 * `redirect()` de un Server Action -medido: `host: localhost:3100` con
 * `x-forwarded-host: motul.xula.localhost`-. El problema es que
 * `x-forwarded-host` la escribe quien hace la peticion, igual que
 * `Host`: un `curl -H "Host: localhost" -H "x-forwarded-host:
 * motul.xulasigma.mx"` arma el mismo request que el render sintetico, sin
 * haber pasado nunca por el servidor. Documentado como deuda en
 * `docs/architecture/invariantes-criticos.md` hasta que se cerro aca.
 *
 * La cookie la firma el propio servidor con `BETTER_AUTH_SECRET`
 * (`respaldoDeHost.ts`) en cada respuesta que resuelve un municipio por
 * `Host` directo, asi que ya esta puesta cuando el navegador manda el
 * POST del Server Action. Sin el secreto no hay forma de producir una
 * firma que verifique, sea cual sea el subdominio que se intente
 * falsificar -a diferencia de `x-forwarded-host`, que cualquiera escribe.
 *
 * **El orden es la reja, y por eso vive aca y no en `contexto.ts`.** Una
 * peticion del cliente al dominio raiz pelado da `raiz`, no `invalido`, y
 * entonces el respaldo ni se prueba: un valor ajeno no puede mover el
 * municipio. Cuando esto vivia un nivel mas adentro, esa misma peticion
 * con `x-forwarded-host: motul.<base>` se servia como Motul -reproducido
 * con curl, y es lo que cierra `e2e/respaldoPorHost.spec.ts`-.
 *
 * **Y la condicion previa sigue siendo `esHostInterno`, no "el host no
 * cuelga de la base".** El hosting sirve la misma aplicacion en mas de un
 * nombre -en Railway, `<app>.up.railway.app` ademas del dominio propio-,
 * y ninguno de esos cuelga de la base: con la condicion ancha, una
 * peticion ahi probaria el respaldo con su propia cookie. El caso esta en
 * `proxyRespaldo.test.ts`.
 *
 * De ahi que `DOMINIO_BASE` **no pueda ser nunca el host interno del
 * servidor**. Si lo fuera -`localhost` a secas, que era el valor por
 * defecto- el render sintetico daria `raiz` en vez de `invalido`: el
 * respaldo no correria y el redirect volveria a romperse. Por eso el
 * defecto es `xula.localhost`, que Chromium mapea igual al loopback sin
 * tocar `/etc/hosts` pero no colisiona con `localhost` pelado.
 */
async function resolverHost(request: NextRequest): Promise<ResultadoDeHost> {
  const base = process.env.DOMINIO_BASE ?? DOMINIO_BASE_POR_DEFECTO;
  const host = request.headers.get("host");
  const delHost = leerSubdominio(host, base);

  if (delHost.tipo !== "invalido") return { ...delHost, viaRespaldo: false };
  if (!esHostInterno(host)) return { ...delHost, viaRespaldo: false };

  const subdominio = await verificarRespaldoDeHost(
    request.cookies.get(NOMBRE_COOKIE_RESPALDO)?.value,
    leerSecreto(),
  );

  return subdominio
    ? { tipo: "ayuntamiento", subdominio, viaRespaldo: true }
    : { ...delHost, viaRespaldo: false };
}

export async function proxy(request: NextRequest) {
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

  const resultado = await resolverHost(request);

  if (resultado.tipo === "invalido") {
    // Un Host que no es nuestro, o un nombre reservado. No se sirve
    // nada: no hay superficie que corresponda y adivinar una seria
    // elegir un tenant por el cliente.
    return new NextResponse(null, { status: 404 });
  }

  if (resultado.tipo === "admin") {
    // El panel de SUPER_ADMIN vive fuera del espacio de tenants: no
    // lleva subdominio de municipio porque no pertenece a ninguno.
    cabeceras.set(CABECERA_SUPERFICIE, "admin");
    return NextResponse.next({ request: { headers: cabeceras } });
  }

  if (resultado.tipo === "raiz") {
    cabeceras.set(CABECERA_SUPERFICIE, "raiz");
    return NextResponse.next({ request: { headers: cabeceras } });
  }

  cabeceras.set(CABECERA_SUPERFICIE, "ayuntamiento");
  cabeceras.set(CABECERA_SUBDOMINIO, resultado.subdominio);

  const respuesta = NextResponse.next({ request: { headers: cabeceras } });

  // Solo se refirma en la rama directa. Refirmar tambien en la rama del
  // respaldo alargaria la cookie con cada render sintetico -que no lo
  // trae un navegador, no hay quien la guarde- en vez de dejarla vencer,
  // y el vencimiento es la unica limpieza que este mecanismo tiene.
  if (!resultado.viaRespaldo) {
    const firmado = await firmarRespaldoDeHost(
      resultado.subdominio,
      leerSecreto(),
    );

    respuesta.cookies.set(NOMBRE_COOKIE_RESPALDO, firmado, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  return respuesta;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
