import { manejarAuth } from "@/shared/auth";
import { limitarRitmoDeAcceso } from "@/shared/auth/limitarRitmo";
import { RitmoExcedidoError } from "@/shared/auth/ritmo";
import { AyuntamientoInexistenteError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { CABECERA_SUPERFICIE } from "@/shared/tenancy/cabeceras";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";

/**
 * Catch-all de autenticacion. Delega todo en `manejarAuth`; por que esa es
 * la unica puerta y que garantiza, en `shared/auth/instancia.ts`.
 */

/** La unica superficie de fuerza bruta del catch-all. */
const RUTA_DE_ACCESO = "/api/auth/sign-in/email";

/**
 * La IP del cliente, no la del ultimo salto.
 *
 * `x-forwarded-for` llega como lista: el primero es quien pidio, los
 * siguientes son los proxies que atravieso. Tomar el ultimo contaria a
 * Railway y meteria a todos los municipios en la misma ventana.
 */
const ipDe = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";

/**
 * El correo del cuerpo, o `null` si no hay uno legible. Que el correo sea
 * **valido** lo decide Better Auth; aca solo se busca con que contar.
 *
 * El `catch` es de `SyntaxError` y nada mas: es lo que lanza `json()` con
 * un cuerpo que no es JSON, y ese caso es esperable —cualquiera puede
 * mandar basura a la ruta. Cualquier otro error si sale, porque seria un
 * fallo distinto y tragarselo lo volveria invisible.
 *
 * Devolver `null` **no saltea la limitacion**: la ventana por IP se aplica
 * igual. Ver `limitarRitmo`.
 */
async function correoDe(request: Request): Promise<string | null> {
  try {
    const cuerpo = (await request.json()) as { email?: unknown };

    return typeof cuerpo.email === "string" ? cuerpo.email : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;

    throw error;
  }
}

/**
 * Limitacion de ritmo, **antes** de construir la instancia.
 *
 * El orden es la mitad de para que existe: con el limitador despues, cada
 * intento frenado igual habria abierto una transaccion y verificado un hash
 * argon2id —26 ms medidos en el spike— y la ruta seguiria siendo un lugar
 * comodo para probar contrasenias.
 *
 * **Se clona el request.** Leer el cuerpo para sacar el correo lo consume:
 * un `Request` no se lee dos veces. Sin el clon, `manejarAuth` recibe un
 * cuerpo vacio y ningun acceso funciona.
 */
async function conRitmo(request: Request): Promise<Request> {
  if (new URL(request.url).pathname !== RUTA_DE_ACCESO) return request;

  const correo = await correoDe(request.clone());
  const { id } = await ayuntamientoActual();

  await limitarRitmoDeAcceso(id, { correo, ip: ipDe(request) });

  return request;
}

/**
 * El borde de error.
 *
 * Consecuencia de correr el handler adentro de la transaccion: cuando el
 * adaptador falla, Better Auth **no** alcanza a convertir el error en
 * respuesta HTTP. La excepcion sale de `manejarAuth` y se lleva la
 * transaccion —lo cual esta bien, no se escribe nada— pero la ruta queda
 * con una excepcion cruda en la mano. Verificado en PR 2: un alta con
 * `rol` ausente salio como excepcion, no como respuesta de la libreria.
 *
 * El motivo NO sale al cliente. `null value in column "rol" of relation
 * "usuarios"` o `new row violates row-level security policy for table
 * "usuarios"` en un cuerpo de respuesta le regala a cualquiera el esquema
 * y el modelo de aislamiento, y basta con provocar el error para leerlo.
 *
 * Al servidor va lo que `datosSegurosDeError` deja pasar, no el error
 * crudo: el texto de un error de Postgres incrusta los valores de la fila
 * —`Key (email)=(...)`— y un correo en el log queda ahi para siempre, sin
 * RLS y sin registro de quien lo leyo.
 *
 * La bitacora no sirve aca: es una tabla con RLS, y si lo que fallo fue
 * justamente la transaccion con el tenant, escribir ahi vuelve a fallar.
 * `console.error` lo toma el runtime de Railway.
 */
async function conBorde(trabajo: () => Promise<Response>): Promise<Response> {
  try {
    return await trabajo();
  } catch (error) {
    /**
     * El ritmo excedido no es un fallo del sistema: es la respuesta. Sale
     * como 429 y **sin decir cual de las dos ventanas se lleno** — "para
     * este correo" confirmaria que la cuenta existe, y distinguirla de la
     * ventana por IP le diria a quien prueba cual esquivar.
     */
    if (error instanceof RitmoExcedidoError) {
      return Response.json({ message: error.message }, { status: 429 });
    }

    // Mismo 404 que la guarda de superficie de `manejar`: un subdominio sin
    // municipio no es un fallo del sistema.
    if (error instanceof AyuntamientoInexistenteError) {
      return new Response(null, { status: 404 });
    }

    console.error("[auth] fallo no manejado", datosSegurosDeError(error));

    return Response.json(
      { message: "No se pudo completar la operación." },
      { status: 500 },
    );
  }
}

const manejar = (request: Request) => {
  // Misma guarda de superficie que los layouts de las paginas: sin tenant
  // (dominio pelado, `admin`, `raiz`), 404 y no 500 — un 500 en superficie
  // publica delata que ahi adentro hay algo que espera un tenant.
  if (request.headers.get(CABECERA_SUPERFICIE) !== "ayuntamiento") {
    return new Response(null, { status: 404 });
  }

  return conBorde(async () => manejarAuth(await conRitmo(request)));
};

export const POST = manejar;
export const GET = manejar;
