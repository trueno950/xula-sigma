import { headers } from "next/headers";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";
import { origenDelRequest } from "./origen";
import { ROLES, type Rol } from "./roles";
import { sesionActual } from "./sesion";

/**
 * Quien pide y desde donde, resuelto del servidor.
 *
 * Es el `getTenantContext()` que nombran los documentos; este es el nombre
 * real. Compone las dos mitades que ya existen —`ayuntamientoActual()` de
 * tenancy y `sesionActual()` de aca— porque un caso de uso las necesita
 * juntas y siempre en el mismo orden.
 *
 * **Ni el ayuntamiento ni el rol salen de la peticion.** El ayuntamiento lo
 * resuelve el subdominio contra la base; el rol viaja en la sesion firmada,
 * y `input: false` en `configuracion.ts` impide que el cliente lo escriba.
 *
 * Vive aparte de `index.ts` porque ese archivo es superficie y nada mas:
 * una funcion con logica adentro de un barril es logica que nadie busca
 * donde esta.
 */

export type ContextoActual = {
  ayuntamientoId: AyuntamientoId;
  usuario: { id: string; rol: Rol };
  /**
   * De donde entro la peticion, para la columna `origen` de la bitacora.
   *
   * Viaja en el contexto y no lo arma cada caso de uso a mano. Es lo que
   * hace que la columna se llene sola: quien registra una traza ya recibe
   * el contexto, asi que no hay un dato mas del que acordarse. Cuando se
   * dejo librado al llamador, la columna quedo nula en todas las trazas
   * que existian.
   */
  origen: string;
};

const esRol = (valor: unknown): valor is Rol =>
  typeof valor === "string" && (ROLES as readonly string[]).includes(valor);

/**
 * `null` cuando no hay sesion. No lanza: quien decide si eso es 401, 404 o
 * una pantalla de acceso es el borde, no esta funcion.
 */
export async function contextoActual(): Promise<ContextoActual | null> {
  const sesion = await sesionActual();

  if (!sesion) return null;

  const { id, rol } = sesion.user;

  /**
   * El `rol` llega como `string` desde la libreria: `additionalFields` no
   * conoce la union. Si no es uno de los cuatro, la sesion no sirve para
   * autorizar nada y se trata como ausente — hay un CHECK en la base que
   * hace esto imposible, y precisamente por eso un valor raro aca significa
   * que algo mas se rompio.
   */
  if (!esRol(rol)) return null;

  const { id: ayuntamientoId } = await ayuntamientoActual();

  return {
    ayuntamientoId,
    usuario: { id, rol },
    origen: origenDelRequest(await headers()),
  };
}
