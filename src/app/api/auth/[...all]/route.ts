import { manejarAuth } from "@/shared/auth";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";

/**
 * Catch-all de autenticacion. Delega todo en `manejarAuth`; por que esa es
 * la unica puerta y que garantiza, en `shared/auth/instancia.ts`.
 */

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
    console.error("[auth] fallo no manejado", datosSegurosDeError(error));

    return Response.json(
      { message: "No se pudo completar la operacion." },
      { status: 500 },
    );
  }
}

export const POST = (request: Request) => conBorde(() => manejarAuth(request));
export const GET = (request: Request) => conBorde(() => manejarAuth(request));
