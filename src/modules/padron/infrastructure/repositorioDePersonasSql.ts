import { and, eq, isNull, sql } from "drizzle-orm";
import type {
  PersonaGuardada,
  PersonaParaGuardar,
  RepositorioDePersonas,
} from "../application/puertos";
import { normalizarParaBusqueda } from "../domain";
import { personas } from "./esquema";

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
    const [fila] = await tx
      .select(columnasDeLectura)
      .from(personas)
      .where(eq(personas.id, id));

    return fila ?? null;
  },

  async marcarBaja(tx, id, bajaEn) {
    await tx.update(personas).set({ bajaEn }).where(eq(personas.id, id));
  },

  async listar(tx): Promise<readonly PersonaGuardada[]> {
    return tx
      .select(columnasDeLectura)
      .from(personas)
      .where(isNull(personas.bajaEn))
      .orderBy(personas.primerApellido, personas.nombres);
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

    return tx
      .select(columnasDeLectura)
      .from(personas)
      .where(
        and(
          isNull(personas.bajaEn),
          sql`${personas.nombreNormalizado} % ${cadenaExpandida}`,
        ),
      )
      .orderBy(
        sql`similarity(${personas.nombreNormalizado}, ${cadenaExpandida}) desc`,
      );
  },
};
