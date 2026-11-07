import { type SQL, sql } from "drizzle-orm";

/**
 * Los recorridos de la jerarquia de `lugares` por `padre_id`, hacia abajo y
 * hacia arriba, para todas las consultas del modulo que los necesitan.
 *
 * `WITH RECURSIVE` en `sql` crudo y no con el builder: Drizzle 0.45.2
 * (verificado, no exporta `withRecursive` ni nada equivalente) no tiene
 * forma de expresar un CTE que se referencia a si mismo. Lo unico que
 * entra como parametro es el arranque; el resto es identificador fijo, sin
 * texto de usuario que concatenar (design.md seccion 12, "SUBARBOL").
 *
 * No filtran por tenant: RLS acota el arranque y la rama recursiva porque
 * corren bajo el `tx` de `withTenant` con `app.tenant` ya fijado.
 *
 * El tope `profundidad < 8` no es un limite de negocio: `tipoDeLugar.ts`
 * modela la jerarquia como rango 0..1 y `puedeContener` exige
 * rango(padre) < rango(hijo), asi que una cadena sana tiene a lo sumo dos
 * niveles. Es una guarda contra un ciclo de `padre_id` por datos malos, que
 * ninguna columna de Postgres prohibe.
 */

/** `descendientes (ancestro, id, profundidad)` desde cada lugar activo que cumple `raices`. */
const descendientesDesde = (raices: SQL) => sql`descendientes AS (
  SELECT id AS ancestro, id, 0 AS profundidad FROM lugares
   WHERE ${raices} AND baja_en IS NULL
  UNION ALL
  SELECT d.ancestro, l.id, d.profundidad + 1
    FROM lugares l
    JOIN descendientes d ON l.padre_id = d.id
   WHERE d.profundidad < 8 AND l.baja_en IS NULL
)`;

/** La raiz y sus descendientes activos. Una raiz nula o inexistente no tiene filas. */
export const cteDescendientes = (raizId: string | null) =>
  sql`WITH RECURSIVE ${descendientesDesde(sql`id = ${raizId}`)}`;

/** Cada lugar activo con sus descendientes, agrupables por `ancestro`. */
export const cteDescendientesDeCadaLugar = sql`WITH RECURSIVE ${descendientesDesde(
  sql`TRUE`,
)}`;

/**
 * `ascendientes (id, nombre, padre_id, profundidad)` desde `lugarId` hacia
 * la raiz; `profundidad` 0 es el propio lugar. `lugarId` es una expresion,
 * no solo un valor: puede ser una subconsulta que lo resuelve.
 */
export const cteAscendientes = (
  lugarId: SQL,
) => sql`WITH RECURSIVE ascendientes AS (
  SELECT l.id, l.nombre, l.padre_id, 0 AS profundidad
    FROM lugares l
   WHERE l.id = ${lugarId} AND l.baja_en IS NULL
  UNION ALL
  SELECT l.id, l.nombre, l.padre_id, a.profundidad + 1
    FROM lugares l
    JOIN ascendientes a ON l.id = a.padre_id
   WHERE a.profundidad < 8 AND l.baja_en IS NULL
)`;
