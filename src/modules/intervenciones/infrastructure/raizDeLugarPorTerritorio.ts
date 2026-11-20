import { listarLugares } from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";

/**
 * Tope de saltos al subir por `padreId`: un ciclo en la jerarquia es dato
 * corrupto que ya entro sin pasar por la aplicacion -misma clase de fila que
 * repara `scripts/reparar-raices-huerfanas.sql`- y no puede colgar el
 * request. El mismo tope que `raizDe` de `reportes`, que no se puede importar
 * sin cruzar el limite de modulo.
 */
const MAXIMO_DE_SALTOS = 8;

/**
 * La raiz del lugar, que es lo que piden las dos rutas de S15:
 * `/territorio?raiz=` navega desde una raiz y `/mapa-operativo?lugar=` solo
 * entiende cabecera o comisaria.
 *
 * Se lee la lista de lugares del municipio -una consulta- y se camina en
 * memoria: pedir el padre de cada nivel serian N transacciones para un
 * enlace. `listarLugares` deja fuera los de baja, asi que un lugar dado de
 * baja no produce enlace en vez de producir uno hacia otra parte del arbol.
 */
export const raizDeLugar = async (
  contexto: ContextoActual,
  lugarId: string,
): Promise<string | null> => {
  const lugares = await listarLugares(contexto);
  const indice = new Map(lugares.map((lugar) => [String(lugar.id), lugar]));
  let actual = indice.get(lugarId);
  if (!actual) return null;

  for (let salto = 0; salto < MAXIMO_DE_SALTOS; salto += 1) {
    if (actual.padreId === null) return String(actual.id);
    const padre = indice.get(String(actual.padreId));
    if (!padre) return null;
    actual = padre;
  }

  return null;
};
