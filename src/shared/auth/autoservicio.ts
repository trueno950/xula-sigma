import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { cuentaConCredencial } from "./claveTemporalEnCuenta";

/**
 * Lo que el autoservicio de Better Auth **no** puede hacer con una sesion
 * abierta con la clave temporal (S2).
 *
 * La reja de S2 esta en `contextoActual()`: ninguna pagina, Server Action ni
 * Route Handler del panel resuelve contexto, asi que una sesion marcada no
 * toca datos del municipio. Pero Better Auth sirve sus propios endpoints
 * antes de que exista un caso de uso nuestro, y `POST /api/auth/update-user`
 * escribe el perfil de la persona sin pasar por ninguna de esas rejas.
 * S2 dice que lo unico que la temporal habilita es poner la propia clave, asi
 * que se rechaza aca.
 *
 * **El rechazo no es `disabledPaths`**: `update-user` es el control positivo
 * de `camposNoEscribibles.integration.test.ts` —la unica forma de provocar
 * que `rol` y `ayuntamientoId`, declarados como `additionalFields`, siguen
 * sin ser escribibles (`input: false`)—. Apagarlo entero dejaria esa
 * proteccion sin test, y lo que sobra es una sola cosa: editar el perfil
 * mientras la marca este puesta.
 *
 * **La marca se lee de la base, no de la sesion.** El rol y el tenant viajan
 * en la cookie, pero `claveTemporalEn` no: es de la credencial
 * (`claveTemporalEnEnCuenta.ts`), y la sesion se creo cuando la persona
 * entro. Una segunda lectura por clave primaria, en la misma transaccion que
 * el handler, es el precio de no confiar en un dato del cliente.
 *
 * **Un `APIError` lanzado aca llega al cliente con su status y su cuerpo.**
 * `createEndpoint` convierte el error en `Response` en
 * `better-call/dist/to-response.mjs:125-129` (en 1.4.0), llamado desde
 * `better-call/dist/endpoint.mjs:39` (en 1.4.0) cuando el contexto pide
 * respuesta; el cuerpo es el que se le pasa al constructor
 * (`better-call/dist/error.mjs:102-112`, en 1.4.0), asi que `{ code, message }`
 * sale tal cual y no depende de nada que armemos nosotros. Es el mismo hecho
 * que usa el rechazo de la temporal caducada: esta explicado una sola vez,
 * aca, y `instancia.ts` apunta a este archivo.
 */

export const AUTOSERVICIO_CON_CLAVE_TEMPORAL =
  "AUTOSERVICIO_CON_CLAVE_TEMPORAL";

/**
 * La ruta que reescribe el perfil. `/change-password` no esta aca porque no
 * se filtra: esta apagada para todo el mundo en `configuracion.ts`.
 */
const RUTA_DE_PERFIL = "/update-user";

export const sinEditarElPerfilConClaveTemporal = (tx: TransaccionTenant) =>
  createAuthMiddleware(async (ctx) => {
    if (ctx.path !== RUTA_DE_PERFIL) return;

    const sesion = await getSessionFromCtx(ctx);

    if (!sesion) return;

    const cuenta = await cuentaConCredencial(tx, sesion.user.id);

    if (cuenta?.claveTemporalEn == null) return;

    throw new APIError("FORBIDDEN", {
      code: AUTOSERVICIO_CON_CLAVE_TEMPORAL,
      message:
        "Mientras use la contraseña temporal, solo puede cambiar su contraseña.",
    });
  });
