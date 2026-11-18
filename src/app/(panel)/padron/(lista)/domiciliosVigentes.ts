import { identidadesDePersonas, type PersonaId } from "@/modules/padron";
import { direccionesVigentesDePersonas } from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";

/**
 * La primera identidad con domicilio legible: la terminal manda sobre sus
 * perdedoras, pero si la terminal no tiene residencia abierta vale la que su
 * perdedora todavia conserva -`fusionarPersonas` no toca `residencias`-.
 */
export function etiquetaPorPersona(
  grupos: ReadonlyMap<string, readonly string[]>,
  etiquetas: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  const direcciones = new Map<string, string>();

  for (const [personaId, identidades] of grupos) {
    const etiqueta = identidades
      .map((identidad) => etiquetas.get(identidad))
      .find((texto) => texto !== undefined);
    if (etiqueta !== undefined) direcciones.set(personaId, etiqueta);
  }

  return direcciones;
}

/**
 * `personaId -> etiqueta de su domicilio vigente` para una pagina del
 * listado (S1 de `padron-ux.md`). Une las dos lecturas en lote: las
 * identidades las expone `padron` y las direcciones `territorio`, de modo
 * que la dependencia entre modulos queda en un solo sentido y esta capa es
 * la que las junta.
 *
 * Dos transacciones secuenciales, nunca anidadas: cada `withTenant` abre la
 * suya y la cierra antes de la siguiente -con `DB_POOL_MAX=1` en
 * integracion, anidarlas traba el pool-.
 */
export async function domiciliosVigentesDe(
  ids: readonly PersonaId[],
  contexto: ContextoActual,
): Promise<ReadonlyMap<string, string>> {
  const grupos = await identidadesDePersonas(ids, contexto);
  if (grupos.size === 0) return new Map();

  const etiquetas = await direccionesVigentesDePersonas(
    [...grupos.values()].flat(),
    contexto,
  );

  return etiquetaPorPersona(grupos, etiquetas);
}
