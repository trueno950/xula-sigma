import { eq, isNull } from "drizzle-orm";
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
};
