import type { ContextoActual } from "@/shared/auth/contexto";
import type {
  CatalogoDeNombres,
  CrearLecturaDeNombres,
  IdsDeUbicacion,
  ModoDeUbicacion,
  UbicacionDeReporte,
} from "./puertosDeUbicacionesDeReporte";

/** Lo minimo de una fila de `reportes` para nombrar su ubicacion. */
export type FilaDeUbicacion = {
  readonly lugarId: string;
  readonly calleId: string | null;
  readonly domicilioId?: string | null;
};

/** `domicilioId` viaja opcional en la fila que lee el repositorio: ausente es «sin domicilio». */
const domicilioDe = (fila: FilaDeUbicacion): string | null =>
  fila.domicilioId === undefined || fila.domicilioId === null
    ? null
    : fila.domicilioId;

const modoDe = (fila: FilaDeUbicacion): ModoDeUbicacion =>
  domicilioDe(fila) === null ? "CALLE" : "DOMICILIO";

/**
 * El reporte dice *donde* ocurrio, con los nombres que resolvio `territorio`.
 * Ningun nombre se inventa: un lugar o una calle que ya no estan en el
 * catalogo quedan en `null` y la pantalla no puede mostrar un nombre ajeno.
 */
export const ubicacionDeReporte = (
  fila: FilaDeUbicacion,
  catalogo: CatalogoDeNombres,
): UbicacionDeReporte => {
  const lugar = catalogo.lugares.get(fila.lugarId) ?? null;
  const domicilioId = domicilioDe(fila);

  return {
    modo: modoDe(fila),
    lugar: lugar?.nombre ?? null,
    calleId: fila.calleId,
    calle:
      fila.calleId === null
        ? null
        : (catalogo.calles.get(fila.calleId) ?? null),
    domicilio:
      domicilioId === null
        ? null
        : (catalogo.domicilios.get(domicilioId) ?? null),
    raizId: lugar?.raizId ?? null,
  };
};

const sinRepetir = (ids: readonly string[]): readonly string[] => [
  ...new Set(ids),
];

export const idsDeUbicacion = (
  filas: readonly FilaDeUbicacion[],
): IdsDeUbicacion => ({
  lugares: sinRepetir(filas.map((fila) => fila.lugarId)),
  calles: sinRepetir(
    filas.flatMap((fila) => (fila.calleId === null ? [] : [fila.calleId])),
  ),
  domicilios: sinRepetir(
    filas.flatMap((fila) => {
      const domicilioId = domicilioDe(fila);
      return domicilioId === null ? [] : [domicilioId];
    }),
  ),
});

/**
 * Adjunta la ubicacion a cada fila con **una sola** lectura de territorio
 * para toda la pagina. Corre despues de que cerro el `withTenant` de
 * `reportes`: el adaptador abre el suyo, y `DB_POOL_MAX=1` en los tests hace
 * que anidar transacciones trabe el pool.
 */
export async function conUbicaciones<T extends FilaDeUbicacion>(
  filas: readonly T[],
  crearLectura: CrearLecturaDeNombres,
  contexto: ContextoActual,
): Promise<readonly (T & { ubicacion: UbicacionDeReporte })[]> {
  if (filas.length === 0) return [];

  const catalogo = await crearLectura(contexto).leer(idsDeUbicacion(filas));

  return filas.map((fila) => ({
    ...fila,
    ubicacion: ubicacionDeReporte(fila, catalogo),
  }));
}
