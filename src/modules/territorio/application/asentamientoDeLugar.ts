import { NoEncontradoError } from "@/shared/lib/errores";
import { puedeTenerCatalogoDeCalles, TIPOS_DE_LUGAR } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

type Transaccion = Parameters<RepositorioDeLugares["buscarPorId"]>[0];

/** Los eslabones del lugar al asentamiento, en ese orden. */
export const cadenaHastaAsentamiento = async (
  repositorio: RepositorioDeLugares,
  tx: Transaccion,
  lugar: LugarGuardado,
): Promise<readonly LugarGuardado[]> => {
  const cadena: LugarGuardado[] = [lugar];
  let actual = lugar;

  // El tope es contra datos corruptos: un ciclo de `padreId` no puede
  // colgar el request. Esa clase de fila ya llego a la base sin pasar por
  // la aplicacion; ver `scripts/reparar-raices-huerfanas.sql`.
  for (let saltos = 0; saltos < TIPOS_DE_LUGAR.length; saltos += 1) {
    if (puedeTenerCatalogoDeCalles(actual.tipo)) return cadena;

    if (!actual.padreId) throw new NoEncontradoError();

    const padre = await repositorio.buscarPorId(tx, actual.padreId);
    if (!padre) throw new NoEncontradoError();
    cadena.push(padre);
    actual = padre;
  }

  throw new NoEncontradoError();
};

export const asentamientoContenedorDe = async (
  repositorio: RepositorioDeLugares,
  tx: Transaccion,
  lugar: LugarGuardado,
): Promise<LugarGuardado> => {
  const cadena = await cadenaHastaAsentamiento(repositorio, tx, lugar);
  const asentamiento = cadena[cadena.length - 1];

  if (!asentamiento) throw new NoEncontradoError();

  return asentamiento;
};
