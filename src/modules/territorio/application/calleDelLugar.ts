import { NoEncontradoError } from "@/shared/lib/errores";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, LugarId } from "../domain";
import { asentamientoContenedorDe } from "./asentamientoDeLugar";
import type { RepositorioDeCalles, RepositorioDeLugares } from "./puertos";

/**
 * El veredicto de `calleDelLugar`, cerrado y sin excepciones:
 *
 * - `del-lugar`: la calle cuelga del asentamiento que contiene al lugar.
 * - `fuera-del-lugar`: la calle existe en el municipio, pero cuelga del
 *   asentamiento de otro lugar. Es un dato visible para el tenant -las dos
 *   filas estan a la vista-, y por eso el consumidor puede decir que la calle
 *   no es de ese lugar en vez de un 404.
 * - `no-resuelve`: el lugar o la calle no existen, estan de baja, son de otro
 *   municipio, o el lugar no tiene asentamiento en su cadena. Se ven igual a
 *   proposito.
 */
export type CalleEnElLugar = "del-lugar" | "fuera-del-lugar" | "no-resuelve";

export type EntradaDeCalleDelLugar = {
  lugarId: LugarId;
  calleId: CalleId;
};

export type RepositoriosDeCalleDelLugar = {
  repositorioDeLugares: RepositorioDeLugares;
  repositorioDeCalles: RepositorioDeCalles;
};

/**
 * El asentamiento del lugar, o nada si la cadena no llega a uno.
 * `asentamientoContenedorDe` lanza `NoEncontradoError` para un dato corrupto
 * -una colonia sin padre, un ciclo-, y esta lectura responde un veredicto,
 * nunca una excepcion: el consumidor ya sabe que hacer con "no resuelve".
 */
const asentamientoActivo = async (
  repositorio: RepositorioDeLugares,
  tx: TransaccionTenant,
  lugarId: LugarId,
): Promise<LugarId | null> => {
  const lugar = await repositorio.buscarPorId(tx, lugarId);
  if (!lugar) return null;

  try {
    const asentamiento = await asentamientoContenedorDe(repositorio, tx, lugar);
    return asentamiento.id;
  } catch (error) {
    if (error instanceof NoEncontradoError) return null;
    throw error;
  }
};

/**
 * Si una calle es del lugar al que se la quiere colgar. Derivar el
 * asentamiento es lo mismo que hace `verificacionDeDomicilio` con las tres
 * calles de una direccion: la calle se cuelga del asentamiento que contiene al
 * lugar, no del lugar mismo, y por eso una colonia ofrece las calles de su
 * comisaria.
 *
 * Es lectura de camino de escritura: no trae guarda de rol -la decide el
 * consumidor, mismo criterio que `ubicacionDeLugar`- y no reemplaza a
 * `partesDe`, que sigue resolviendo cualquier pareja guardada. Ese es el punto:
 * una colonia reparentada deja la pareja guardada incoherente sin volverla
 * inexistente, y `partesDe` tiene que seguir nombrándola.
 */
export function crearCalleDelLugar({
  repositorioDeLugares,
  repositorioDeCalles,
}: RepositoriosDeCalleDelLugar) {
  return async function calleDelLugar(
    tx: TransaccionTenant,
    entrada: EntradaDeCalleDelLugar,
  ): Promise<CalleEnElLugar> {
    const asentamientoId = await asentamientoActivo(
      repositorioDeLugares,
      tx,
      entrada.lugarId,
    );
    if (!asentamientoId) return "no-resuelve";

    const calle = await repositorioDeCalles.buscarPorId(tx, entrada.calleId);
    if (!calle || calle.bajaEn !== null) return "no-resuelve";

    return calle.lugarId === asentamientoId ? "del-lugar" : "fuera-del-lugar";
  };
}
