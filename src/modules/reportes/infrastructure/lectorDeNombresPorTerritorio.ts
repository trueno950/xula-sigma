import {
  type CalleGuardada,
  callesParaMapa,
  type DomicilioParaListado,
  etiquetaDeDomicilio,
  type LugarGuardado,
  listarDomicilios,
  listarLugares,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import type {
  CatalogoDeNombres,
  CrearLecturaDeNombres,
  NombresDeLugar,
} from "../application/puertosDeUbicacionesDeReporte";

/**
 * Implementacion real de `LecturaDeNombresDeTerritorio` contra la API
 * publica de `territorio`, no contra sus tablas: `lugares`, `calles` y
 * `domicilios` son de ese modulo (antipatron 8 de `AGENTS.md`), y este
 * adaptador es el unico archivo de `reportes` que los nombra -mismo criterio
 * que `buscadorDeDireccionesPorTerritorio`-.
 *
 * Cada lectura abre su propio `withTenant` -el de `territorio`- y se espera
 * una antes de la siguiente: el pool de los tests es de una sola conexion
 * (`DB_POOL_MAX=1`) y las tres lecturas van por el mismo camino.
 *
 * `listarLugares` deja fuera los lugares de baja, y eso es correcto aca: un
 * reporte no se puede registrar en un lugar de baja, y si el lugar se dio de
 * baja despues, la fila queda sin nombre (`null`) en vez de con uno inventado.
 * Las calles si se leen completas -`callesParaMapa` incluye las de baja-: el
 * reporte viejo de una calle renombrada o dada de baja sigue diciendo donde
 * fue.
 */

/**
 * Tope de saltos al subir por `padreId`: un ciclo en la jerarquia es dato
 * corrupto que ya entro sin pasar por la aplicacion (misma clase de fila que
 * repara `scripts/reparar-raices-huerfanas.sql`) y no puede colgar el
 * request.
 */
const MAXIMO_DE_SALTOS = 8;

const raizDe = (
  indice: ReadonlyMap<string, LugarGuardado>,
  lugar: LugarGuardado,
): string | null => {
  let actual = lugar;

  for (let salto = 0; salto < MAXIMO_DE_SALTOS; salto += 1) {
    if (actual.padreId === null) return String(actual.id);
    const padre = indice.get(String(actual.padreId));
    if (!padre) return null;
    actual = padre;
  }

  return null;
};

const nombresDeLugares = (
  lugares: readonly LugarGuardado[],
  pedidos: readonly string[],
): ReadonlyMap<string, NombresDeLugar> => {
  const indice = new Map(lugares.map((lugar) => [String(lugar.id), lugar]));
  const nombres = new Map<string, NombresDeLugar>();

  for (const id of pedidos) {
    const lugar = indice.get(id);
    if (lugar) {
      nombres.set(id, { nombre: lugar.nombre, raizId: raizDe(indice, lugar) });
    }
  }

  return nombres;
};

const nombresDeCalles = (
  calles: readonly CalleGuardada[],
): ReadonlyMap<string, string> =>
  new Map(calles.map((calle) => [String(calle.id), calle.nombre]));

const etiquetasDeDomicilios = (
  domicilios: readonly DomicilioParaListado[],
): ReadonlyMap<string, string> =>
  new Map(
    domicilios.map((domicilio) => [
      String(domicilio.id),
      etiquetaDeDomicilio(domicilio),
    ]),
  );

export const crearLectorDeNombresPorTerritorio: CrearLecturaDeNombres = (
  contexto: ContextoActual,
) => ({
  async leer(ids) {
    const catalogo: CatalogoDeNombres = {
      lugares:
        ids.lugares.length === 0
          ? new Map()
          : nombresDeLugares(await listarLugares(contexto), ids.lugares),
      calles:
        ids.calles.length === 0
          ? new Map()
          : nombresDeCalles(await callesParaMapa(contexto)),
      domicilios:
        ids.domicilios.length === 0
          ? new Map()
          : etiquetasDeDomicilios(await listarDomicilios(contexto)),
    };

    return catalogo;
  },
});
