import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { PersonaId } from "../domain";
import { personas } from "./esquema";

/**
 * Implementacion de `fusionar`/`revertirFusion` de `RepositorioDePersonas`,
 * separada de `repositorioDePersonasSql.ts` solo para no pasar el limite de
 * 200 lineas por archivo (`AGENTS.md`): el resto del repositorio no toca
 * fusion, y estas dos funciones ya cargan sus propios comentarios largos de
 * design.md decision 3.
 */

export async function fusionarSql(
  tx: TransaccionTenant,
  perdedoraId: PersonaId,
  ganadoraId: PersonaId,
): Promise<void> {
  await tx
    .update(personas)
    .set({ fusionadaEn: ganadoraId })
    .where(eq(personas.fusionadaEn, perdedoraId));

  await tx
    .update(personas)
    .set({ fusionadaEn: ganadoraId, fusionadaDirectoEn: ganadoraId })
    .where(eq(personas.id, perdedoraId));
}

export async function revertirFusionSql(
  tx: TransaccionTenant,
  id: PersonaId,
): Promise<boolean> {
  /**
   * `RETURNING` en vez de un `UPDATE` a secas: es la unica forma de saber
   * si RLS dejo pasar la fila. Un `id` de otro tenant o inexistente hace
   * que el `UPDATE` afecte cero filas sin lanzar error -mismo modo de
   * falla silenciosa que documenta AGENTS.md para scripts sueltos-, y sin
   * esto el caso de uso no tendria como distinguirlo de un exito real.
   *
   * `isNotNull(fusionadaEn)` en el WHERE, no solo el `id`: sin esto, revertir
   * una persona que nunca fue fusionada -su `fusionadaEn` ya es NULL- sigue
   * afectando la fila (fijar NULL sobre NULL cuenta como fila tocada) y
   * `filas.length` da 1 igual. El caso de uso registraria en bitacora una
   * reversion que nunca paso. Hallado por la revision del PR.
   */
  const filas = await tx
    .update(personas)
    .set({ fusionadaEn: null, fusionadaDirectoEn: null })
    .where(and(eq(personas.id, id), isNotNull(personas.fusionadaEn)))
    .returning({ id: personas.id });

  if (filas.length === 0) return false;

  /**
   * Recolapsa TODO el subarbol de fusiones directas bajo `id`, no solo
   * los hijos inmediatos. En una cadena A->B->C->D, revertir C reenganchaba
   * a B (`fusionadaDirectoEn = C`) pero dejaba a A -que llego a C a traves
   * de B, con `fusionadaDirectoEn = B`- con `fusionadaEn = D` sin tocar:
   * el invariante "colapsada al terminal" que exige `buscarPorId` se
   * rompia recien a la segunda vuelta de fusion. El arbol lo arma
   * `fusionadaDirectoEn` -la columna ya colapsada, `fusionadaEn`, no
   * distingue un descendiente real de otro fusionado aparte hacia el
   * mismo terminal-. Hallado por la revision del PR.
   */
  await tx.execute(sql`
    WITH RECURSIVE subarbol AS (
      SELECT id FROM personas WHERE fusionada_directo_en = ${id}
      UNION ALL
      SELECT p.id FROM personas p
        JOIN subarbol s ON p.fusionada_directo_en = s.id
    )
    UPDATE personas SET fusionada_en = ${id}
     WHERE id IN (SELECT id FROM subarbol)
  `);

  return true;
}
