import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { exigirAyuntamiento } from "@/shared/tenancy/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import { usuarios } from "./esquema";
import { origenDelRequest } from "./origen";
import { esRol, type Rol } from "./roles";
import { sesionActual } from "./sesion";

/**
 * Quien pide y desde donde, resuelto del servidor.
 *
 * Es el `getTenantContext()` que nombran los documentos; este es el nombre
 * real. Compone las dos mitades que ya existen —`exigirAyuntamiento()` de
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

/**
 * Si la cuenta sigue activa, leida del lado del servidor.
 *
 * **Segunda mitad de S6.** La baja borra las sesiones y bloquea el alta de
 * nuevas, pero una sesion que sobreviva —creada en la misma carrera que la
 * baja, o por un camino que todavia no existe— no debe servir para operar:
 * el rol y el tenant salen de la cookie, y sin esta consulta nadie volveria
 * a mirar la fila. Es un `SELECT` por clave primaria, en el mismo request
 * que ya resolvio el subdominio.
 */
const sigueActiva = (
  ayuntamientoId: AyuntamientoId,
  usuarioId: string,
): Promise<boolean> =>
  withTenant(ayuntamientoId, (tx) =>
    tx
      .select({ bajaEn: usuarios.bajaEn })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1),
  ).then(([fila]) => fila !== undefined && fila.bajaEn === null);

/**
 * `null` cuando no hay sesion.
 *
 * **La unica excepcion a "no lanza" es el municipio inexistente**: con sesion
 * valida y un subdominio que no existe no hay contexto que devolver, y
 * `exigirAyuntamiento` corta en 404. Sin sesion no se toca tenancy, asi que
 * ese caso sigue siendo `null` y lo decide el borde.
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

  const { id: ayuntamientoId } = await exigirAyuntamiento();

  if (!(await sigueActiva(ayuntamientoId, id))) return null;

  return {
    ayuntamientoId,
    usuario: { id, rol },
    origen: origenDelRequest(await headers()),
  };
}
