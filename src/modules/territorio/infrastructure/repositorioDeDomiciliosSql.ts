import { eq, sql } from "drizzle-orm";
import type {
  DomicilioGuardado,
  RepositorioDeDomicilios,
} from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import { calles, domicilios, lugares } from "./esquema";

const columnasDeLectura = {
  id: domicilios.id,
  lugarId: domicilios.lugarId,
  calleId: domicilios.calleId,
  numero: domicilios.numero,
  entreCalleAId: domicilios.entreCalleAId,
  entreCalleBId: domicilios.entreCalleBId,
  referencia: domicilios.referencia,
};

type FilaDeDomicilio = {
  id: string;
  lugarId: string;
  calleId: string;
  numero: string | null;
  entreCalleAId: string | null;
  entreCalleBId: string | null;
  referencia: string | null;
};

const aDomicilioGuardado = (fila: FilaDeDomicilio): DomicilioGuardado => ({
  ...fila,
  id: comoDomicilioId(fila.id),
  lugarId: comoLugarId(fila.lugarId),
  calleId: comoCalleId(fila.calleId),
  entreCalleAId: fila.entreCalleAId ? comoCalleId(fila.entreCalleAId) : null,
  entreCalleBId: fila.entreCalleBId ? comoCalleId(fila.entreCalleBId) : null,
});

/**
 * Implementacion real de `RepositorioDeDomicilios` contra `domicilios`.
 * Objeto literal, no clase (precedente `repositorioDeLugaresSql`).
 */
export const repositorioDeDomiciliosSql: RepositorioDeDomicilios = {
  async crear(tx, datos) {
    await tx.insert(domicilios).values(datos);
  },

  async buscarPorId(tx, id) {
    const [fila] = await tx
      .select(columnasDeLectura)
      .from(domicilios)
      .where(eq(domicilios.id, id));

    return fila ? aDomicilioGuardado(fila) : null;
  },

  /**
   * Mismo `WITH RECURSIVE` que `repositorioDeLugaresSql.subarbol`
   * (tasks.md 3.12), con el mismo cinturon de profundidad — no la garantia
   * de aislamiento, que la da RLS sobre las dos ramas del CTE (design.md
   * seccion 12, "SUBARBOL"). Reune el domicilio colgado del lugar raiz
   * mismo y los de todos sus descendientes en una sola consulta.
   */
  async porLugarYSubarbol(tx, lugarId) {
    const filas = await tx.execute<FilaDeDomicilio>(sql`
      WITH RECURSIVE descendientes AS (
        SELECT id, 0 AS profundidad FROM lugares
         WHERE id = ${lugarId} AND baja_en IS NULL
        UNION ALL
        SELECT l.id, d.profundidad + 1
          FROM lugares l
          JOIN descendientes d ON l.padre_id = d.id
         WHERE d.profundidad < 8 AND l.baja_en IS NULL
      )
      SELECT dom.id, dom.lugar_id AS "lugarId", dom.calle_id AS "calleId",
             dom.numero, dom.entre_calle_a_id AS "entreCalleAId",
             dom.entre_calle_b_id AS "entreCalleBId", dom.referencia
        FROM domicilios dom
        JOIN descendientes d ON d.id = dom.lugar_id
    `);

    return filas.map(aDomicilioGuardado);
  },

  async porCalle(tx, calleId) {
    const filas = await tx
      .select(columnasDeLectura)
      .from(domicilios)
      .where(eq(domicilios.calleId, calleId));

    return filas.map(aDomicilioGuardado);
  },

  /**
   * Listado plano del municipio, con los nombres resueltos para la etiqueta
   * del `<select>` de `FormularioDeMudanza`. RLS acota por tenant en la
   * lectura de las tres tablas -no hay `WHERE ayuntamiento_id` a mano-.
   * Orden estable: lugar, calle y numero, para que el select no salte
   * entre corridas.
   */
  async listar(tx) {
    const filas = await tx
      .select({
        id: domicilios.id,
        calle: calles.nombre,
        numero: domicilios.numero,
        lugar: lugares.nombre,
      })
      .from(domicilios)
      .innerJoin(calles, eq(calles.id, domicilios.calleId))
      .innerJoin(lugares, eq(lugares.id, domicilios.lugarId))
      .orderBy(lugares.nombre, calles.nombre, domicilios.numero);

    return filas.map((fila) => ({ ...fila, id: comoDomicilioId(fila.id) }));
  },
};
