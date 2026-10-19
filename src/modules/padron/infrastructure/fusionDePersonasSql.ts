import { eq } from "drizzle-orm";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { PersonaId } from "../domain";
import { personas } from "./esquema";

/**
 * Implementacion de `fusionar` de `RepositorioDePersonas`, separada de
 * `repositorioDePersonasSql.ts` solo para no pasar el limite de 200 lineas
 * por archivo (`AGENTS.md`): el resto del repositorio no toca fusion, y esta
 * funcion ya carga su propio comentario largo de design.md decision 3.
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
