import { type SQL, sql } from "drizzle-orm";
import type {
  LectorDeDirecciones,
  LectorDeDireccionesEnLote,
} from "../application/puertosDeDirecciones";
import { comoDomicilioId, type PartesDeDireccion } from "../domain";

type FilaDeDireccion = {
  domicilioId: string;
  calle: string;
  numero: string | null;
  entreCalleA: string | null;
  entreCalleB: string | null;
  referencia: string | null;
  nombreAncestro: string;
};

/**
 * `ascendientes (domicilio_id, id, nombre, padre_id, profundidad)` desde el
 * lugar de cada domicilio que cumple `condicionDeDomicilio` hasta la raiz;
 * `profundidad` 0 es el propio lugar del domicilio.
 *
 * Lleva `domicilio_id` en cada fila -a diferencia de `cteAscendientes`
 * (`jerarquiaDeLugaresSql.ts`)- porque de eso depende un lote: sin la clave,
 * los ancestros de dos direcciones de la misma consulta se mezclarian en un
 * solo texto.
 *
 * No filtra por tenant: RLS acota el arranque y la rama recursiva porque
 * corren bajo el `tx` de `withTenant` con `app.tenant` ya fijado. El tope
 * `profundidad < 8` es la misma guarda contra un ciclo de `padre_id` que el
 * resto del modulo.
 */
const cteAscendientesPorDomicilio = (condicionDeDomicilio: SQL) =>
  sql`WITH RECURSIVE ascendientes AS (
  SELECT d.id AS domicilio_id, l.id, l.nombre, l.padre_id, 0 AS profundidad
    FROM domicilios d
    JOIN lugares l ON l.id = d.lugar_id
   WHERE ${condicionDeDomicilio} AND l.baja_en IS NULL
  UNION ALL
  SELECT a.domicilio_id, l.id, l.nombre, l.padre_id, a.profundidad + 1
    FROM lugares l
    JOIN ascendientes a ON l.id = a.padre_id
   WHERE a.profundidad < 8 AND l.baja_en IS NULL
)`;

/**
 * Una fila por nivel de ancestro, ordenada del mas profundo al mas
 * superficial (`profundidad ASC`, donde 0 es el propio lugar del domicilio);
 * `calle`, `numero`, `entreCalleA`, `entreCalleB` y `referencia` viajan
 * repetidos en cada fila porque son del domicilio, no del ancestro.
 */
const CONSULTA_DE_DIRECCIONES = (condicionDeDomicilio: SQL) => sql`
  ${cteAscendientesPorDomicilio(condicionDeDomicilio)}
  SELECT
    a.domicilio_id AS "domicilioId",
    calle.nombre AS calle,
    dom.numero,
    entre_a.nombre AS "entreCalleA",
    entre_b.nombre AS "entreCalleB",
    dom.referencia,
    a.nombre AS "nombreAncestro"
    FROM ascendientes a
    JOIN domicilios dom ON dom.id = a.domicilio_id
    JOIN calles calle ON calle.id = dom.calle_id
    LEFT JOIN calles entre_a ON entre_a.id = dom.entre_calle_a_id
    LEFT JOIN calles entre_b ON entre_b.id = dom.entre_calle_b_id
   ORDER BY a.domicilio_id, a.profundidad ASC
`;

const aPartes = (filas: readonly FilaDeDireccion[]): PartesDeDireccion => {
  const primera = filas[0]!;

  return {
    calle: primera.calle,
    numero: primera.numero,
    entreCalleA: primera.entreCalleA,
    entreCalleB: primera.entreCalleB,
    referencia: primera.referencia,
    ancestros: filas.map((fila) => fila.nombreAncestro),
  };
};

const filasPorDomicilio = (filas: readonly FilaDeDireccion[]) => {
  const agrupadas = new Map<string, FilaDeDireccion[]>();

  for (const fila of filas) {
    const grupo = agrupadas.get(fila.domicilioId) ?? [];
    grupo.push(fila);
    agrupadas.set(fila.domicilioId, grupo);
  }

  return agrupadas;
};

/**
 * Implementacion real de `LectorDeDirecciones` y de su lote contra
 * `domicilios`, `calles` y `lugares`, por el CTE de arriba.
 *
 * Nombra `domicilios`, `calles` y `lugares`: ninguno dispara
 * `identidadPorPuerto.test.ts` (design.md seccion 7, la trampa de la
 * decision 6 aplicada aca).
 */
export const lectorDeDireccionesSql: LectorDeDirecciones &
  LectorDeDireccionesEnLote = {
  async partesDe(tx, domicilioId) {
    const filas = await tx.execute<FilaDeDireccion>(
      CONSULTA_DE_DIRECCIONES(sql`d.id = ${domicilioId}`),
    );

    if (filas.length === 0) return null;

    return aPartes(filas);
  },

  async partesDeVarios(tx, domicilioIds) {
    if (domicilioIds.length === 0) return new Map();

    const filas = await tx.execute<FilaDeDireccion>(
      CONSULTA_DE_DIRECCIONES(
        sql`d.id IN (${sql.join(
          domicilioIds.map((domicilioId) => sql`${domicilioId}`),
          sql`, `,
        )})`,
      ),
    );

    return new Map(
      [...filasPorDomicilio(filas)].map(([domicilioId, grupo]) => [
        comoDomicilioId(domicilioId),
        aPartes(grupo),
      ]),
    );
  },
};
