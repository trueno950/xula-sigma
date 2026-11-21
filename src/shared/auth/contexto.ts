import { headers } from "next/headers";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { exigirAyuntamiento } from "@/shared/tenancy/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type CuentaConCredencial,
  cuentaConCredencial,
} from "./claveTemporalEnCuenta";
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
 * La sesion con su cuenta, cuando la cuenta esta activa.
 *
 * **Segunda mitad de S6.** La baja borra las sesiones y bloquea el alta de
 * nuevas, pero una sesion que sobreviva —creada en la misma carrera que la
 * baja, o por un camino que todavia no existe— no debe servir para operar:
 * el rol y el tenant salen de la cookie, y sin esta consulta nadie volveria
 * a mirar la fila. Es un `SELECT` por clave primaria, en el mismo request
 * que ya resolvio el subdominio.
 */
async function sesionConSuCuenta(): Promise<{
  sesion: NonNullable<Awaited<ReturnType<typeof sesionActual>>>;
  usuario: { id: string; rol: Rol };
  ayuntamientoId: AyuntamientoId;
  cuenta: CuentaConCredencial;
} | null> {
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
  const cuenta = await withTenant(ayuntamientoId, (tx) =>
    cuentaConCredencial(tx, id),
  );

  if (!cuenta || cuenta.bajaEn !== null) return null;

  return { sesion, usuario: { id, rol }, ayuntamientoId, cuenta };
}

/**
 * `null` cuando no hay sesion.
 *
 * **La unica excepcion a "no lanza" es el municipio inexistente**: con sesion
 * valida y un subdominio que no existe no hay contexto que devolver, y
 * `exigirAyuntamiento` corta en 404. Sin sesion no se toca tenancy, asi que
 * ese caso sigue siendo `null` y lo decide el borde.
 *
 * **Una cuenta con la clave temporal puesta tampoco resuelve contexto**
 * (S2), y esto es la reja, no un aviso: las paginas, las Server Actions y
 * los Route Handlers del panel piden su contexto por aca, asi que una sesion
 * abierta con la temporal no autoriza ninguna operacion —no hay un segundo
 * lugar donde acordarse de mirarlo—. La unica puerta que queda abierta es
 * `contextoDeCambioDeClave()`, que no alcanza para operar.
 */
export async function contextoActual(): Promise<ContextoActual | null> {
  const activa = await sesionConSuCuenta();

  if (!activa || activa.cuenta.claveTemporalEn !== null) return null;

  return {
    ayuntamientoId: activa.ayuntamientoId,
    usuario: activa.usuario,
    origen: origenDelRequest(await headers()),
  };
}

/**
 * Lo unico que se puede hacer con una sesion abierta con la clave temporal:
 * poner la propia (S2).
 *
 * No devuelve un `ContextoActual`, y esa es la mitad de la garantia: llevar
 * `usuario` haria que un caso de uso cualquiera lo aceptara como actor. Aca
 * solo viajan el tenant, la persona, la sesion desde la que se escribe, la
 * marca que se leyo y su unico consumidor es el cambio de clave.
 *
 * **Exige que la marca siga puesta y que la sesion se haya abierto con
 * ella**: una sesion anterior a la marca la abrio otra clave —una vieja, o la
 * que un restablecimiento reemplazo—, asi que dejarla entrar al cambio
 * obligatorio seria dejar que una cookie que ya no corresponde ponga la clave
 * propia. La comparacion es de instantes y admite el mismo instante. El
 * `claveTemporalEn` del contexto es el valor leido aca: es contra el que el
 * caso de uso vuelve a comparar adentro de su transaccion.
 */
export type ContextoDeCambioDeClave = {
  ayuntamientoId: AyuntamientoId;
  usuarioId: string;
  sesionId: string;
  claveTemporalEn: Date;
  origen: string;
};

export async function contextoDeCambioDeClave(): Promise<ContextoDeCambioDeClave | null> {
  const activa = await sesionConSuCuenta();
  const marca = activa?.cuenta.claveTemporalEn;

  if (!activa || !marca) return null;

  if (activa.sesion.session.createdAt.getTime() < marca.getTime()) return null;

  return {
    ayuntamientoId: activa.ayuntamientoId,
    usuarioId: activa.usuario.id,
    sesionId: activa.sesion.session.id,
    claveTemporalEn: marca,
    origen: origenDelRequest(await headers()),
  };
}
