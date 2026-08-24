import { and, eq, isNull, or, sql } from "drizzle-orm";
import type {
  PersonaGuardada,
  PersonaParaGuardar,
  RepositorioDePersonas,
} from "../application/puertos";
import type { PersonaId } from "../domain";
import { comoPersonaId, normalizarParaBusqueda } from "../domain";
import { personas } from "./esquema";
import { fusionarSql, revertirFusionSql } from "./fusionDePersonasSql";

/**
 * Implementacion real de `RepositorioDePersonas` contra `personas`.
 * Objeto literal, no clase (precedente `repositorioDeMarcaSql`).
 *
 * `guardar` y `actualizar` son el unico lugar del sistema que escribe
 * `nombreNormalizado` (decision 6 de proposal.md): la calculan aca, con la
 * misma `normalizarParaBusqueda` que usa la busqueda de la rebanada 3, y
 * nunca la reciben del caso de uso.
 */

const cadenaDeNombre = (persona: PersonaParaGuardar): string =>
  [persona.nombres, persona.primerApellido, persona.segundoApellido]
    .filter((parte): parte is string => Boolean(parte))
    .join(" ");

const columnasDeLectura = {
  id: personas.id,
  nombres: personas.nombres,
  primerApellido: personas.primerApellido,
  segundoApellido: personas.segundoApellido,
  curp: personas.curp,
  bajaEn: personas.bajaEn,
};

/**
 * `personas.id` sale de Postgres como `string` a secas -Drizzle no conoce
 * la marca de `PersonaId`-, y `comoAyuntamientoId` ya fija el precedente
 * de validar incluso lo que viene de una fuente confiable en vez de un
 * `as` (`shared/tenancy/ayuntamientoId.ts`).
 */
const aPersonaGuardada = (fila: {
  id: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  curp: string | null;
  bajaEn: Date | null;
}): PersonaGuardada => ({ ...fila, id: comoPersonaId(fila.id) });

/**
 * `id` cualquiera -ganador o perdedor- resuelto a su terminal (design.md
 * decision 3, invariante: `fusionadaEn` ya llega colapsado, un solo
 * COALESCE alcanza). Compartido por `buscarPorId` e `identidadesDe` para
 * que las dos resuelvan exactamente igual.
 */
const terminalDe = (id: string) =>
  sql`COALESCE((SELECT ${personas.fusionadaEn} FROM ${personas} WHERE ${personas.id} = ${id}), ${id})`;

export const repositorioDePersonasSql: RepositorioDePersonas = {
  async guardar(tx, { id, ayuntamientoId, persona, expansiones }) {
    await tx.insert(personas).values({
      id,
      ayuntamientoId,
      nombres: persona.nombres,
      primerApellido: persona.primerApellido,
      segundoApellido: persona.segundoApellido,
      nombreNormalizado: normalizarParaBusqueda(
        cadenaDeNombre(persona),
        expansiones,
      ),
      curp: persona.curp,
    });
  },

  async actualizar(tx, { id, persona, expansiones }) {
    await tx
      .update(personas)
      .set({
        nombres: persona.nombres,
        primerApellido: persona.primerApellido,
        segundoApellido: persona.segundoApellido,
        nombreNormalizado: normalizarParaBusqueda(
          cadenaDeNombre(persona),
          expansiones,
        ),
        curp: persona.curp,
        actualizadoEn: new Date(),
      })
      .where(eq(personas.id, id));
  },

  async buscarPorId(tx, id): Promise<PersonaGuardada | null> {
    /**
     * La subconsulta de `terminalDe` corre bajo el mismo RLS que la
     * externa -mismo `tx`-, asi que tampoco puede resolver hacia una fila
     * de otro tenant.
     */
    const [fila] = await tx
      .select(columnasDeLectura)
      .from(personas)
      .where(eq(personas.id, terminalDe(id)));

    return fila ? aPersonaGuardada(fila) : null;
  },

  async marcarBaja(tx, id, bajaEn) {
    await tx.update(personas).set({ bajaEn }).where(eq(personas.id, id));
  },

  // `fusionar`/`revertirFusion` viven en `fusionDePersonasSql.ts` (motivo
  // de la separacion en su comentario de cabecera).
  fusionar: fusionarSql,
  revertirFusion: revertirFusionSql,

  async identidadesDe(tx, id): Promise<readonly PersonaId[]> {
    const terminal = terminalDe(id);
    const filas = await tx
      .select({ id: personas.id })
      .from(personas)
      .where(or(eq(personas.id, terminal), eq(personas.fusionadaEn, terminal)));

    return filas.map((fila) => comoPersonaId(fila.id));
  },

  async listar(tx): Promise<readonly PersonaGuardada[]> {
    const filas = await tx
      .select(columnasDeLectura)
      .from(personas)
      // Redirigida por una fusion (rebanada 4): mismo motivo que `buscar`
      // -listarla dejaria un duplicado fantasma con nombre viejo, cuando
      // el puerto de lectura ya tiene su terminal actual con `buscarPorId`.
      .where(and(isNull(personas.bajaEn), isNull(personas.fusionadaEn)))
      .orderBy(personas.primerApellido, personas.nombres);

    return filas.map(aPersonaGuardada);
  },

  async buscar(tx, cadenaExpandida, umbral) {
    /**
     * `%` y no `similarity(...) >= umbral` a secas: es el operador que
     * `gin_trgm_ops` sabe resolver con el indice (test de sargabilidad de
     * la rebanada 3). Su umbral vive en el GUC `pg_trgm.similarity_threshold`,
     * y `set_config(..., true)` en vez de `set_limit()` -su wrapper
     * habitual- es a proposito: `set_limit()` hace un `SET` de sesion
     * completa, sin version `LOCAL`. Un `SET` suelto sobrevive al COMMIT y
     * queda pegado en la conexion del pool para el proximo request -el
     * mismo T2 que documenta `withTenant.ts` para `app.tenant`-, y el `%`
     * de la busqueda de otro municipio heredaria el umbral de este.
     */
    await tx.execute(
      sql`SELECT set_config('pg_trgm.similarity_threshold', ${String(umbral)}, true)`,
    );

    const filas = await tx
      .select(columnasDeLectura)
      .from(personas)
      .where(
        and(
          isNull(personas.bajaEn),
          // Redirigida por una fusion: mismo motivo que `listar`, arriba.
          isNull(personas.fusionadaEn),
          sql`${personas.nombreNormalizado} % ${cadenaExpandida}`,
        ),
      )
      .orderBy(
        sql`similarity(${personas.nombreNormalizado}, ${cadenaExpandida}) desc`,
      );

    return filas.map(aPersonaGuardada);
  },
};
