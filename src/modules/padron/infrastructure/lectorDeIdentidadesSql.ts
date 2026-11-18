import { inArray, or } from "drizzle-orm";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { LectorDeIdentidadesEnLote } from "../application/identidadesDePersonas";
import { comoPersonaId, type PersonaId } from "../domain";
import { personas } from "./esquema";

type FilaDeIdentidad = { id: string; fusionadaEn: string | null };

/**
 * Los ids que colapsan en cada persona pedida: la terminal primero y
 * despues las perdedoras de una fusion. Es el equivalente por lote de
 * `repositorioDePersonasSql.identidadesDe`, que sigue siendo la via de una
 * sola persona; las dos resuelven la misma clase porque `fusionadaEn` ya
 * llega colapsado.
 *
 * Un id que RLS no devuelve -otro municipio- no arma grupo, y su persona
 * queda sin identidades.
 */
const identidadesPorTerminal = (
  filas: readonly FilaDeIdentidad[],
  pedidas: ReadonlySet<string>,
): ReadonlyMap<PersonaId, readonly PersonaId[]> => {
  const grupos = new Map<PersonaId, PersonaId[]>();

  for (const fila of filas) {
    const terminal = fila.fusionadaEn ?? fila.id;
    if (!pedidas.has(terminal)) continue;

    const grupo = grupos.get(comoPersonaId(terminal)) ?? [];
    if (terminal === fila.id) grupo.unshift(comoPersonaId(fila.id));
    else grupo.push(comoPersonaId(fila.id));
    grupos.set(comoPersonaId(terminal), grupo);
  }

  return grupos;
};

/** Una consulta a `personas` -tabla propia-: por id pedido y por `fusionadaEn`. */
export const lectorDeIdentidadesSql: LectorDeIdentidadesEnLote = {
  async deVarias(
    tx: TransaccionTenant,
    ids: readonly PersonaId[],
  ): Promise<ReadonlyMap<PersonaId, readonly PersonaId[]>> {
    const filas = await tx
      .select({ id: personas.id, fusionadaEn: personas.fusionadaEn })
      .from(personas)
      .where(
        or(
          inArray(personas.id, [...ids]),
          inArray(personas.fusionadaEn, [...ids]),
        ),
      );

    return identidadesPorTerminal(filas, new Set<string>(ids));
  },
};
