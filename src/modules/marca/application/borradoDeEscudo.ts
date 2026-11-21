import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import type { AlmacenDeAssets } from "./puertos";

/**
 * La URL del escudo guardado en una marca cruda, o `undefined` si no hay.
 * `marca` es `jsonb`, o sea `unknown` del lado de TypeScript: el `typeof`
 * no es ceremonia.
 *
 * Vive aca y no en `cambiarEscudo.ts` porque son dos los casos de uso que la
 * necesitan —reemplazar el escudo y quitarlo— y una copia que diverge dejaria
 * un objeto huerfano en el bucket sin que nadie se entere.
 */
export const urlDeEscudo = (
  marca: Record<string, unknown>,
): string | undefined =>
  typeof marca.escudo === "string" ? marca.escudo : undefined;

/**
 * Borra el objeto ya reemplazado o ya desreferenciado, **fuera de la
 * transaccion y best-effort**: la verdad esta en Postgres, no en el bucket, y
 * un borrado que falla no cambia un resultado ya confirmado (decision 7 de
 * `design.md`). El `catch` no traga el error en silencio: lo deja en el log
 * con `datosSegurosDeError`, porque no hay nadie a quien contarselo.
 */
export const borrarEscudoAnterior = (
  almacen: AlmacenDeAssets,
  ayuntamientoId: string,
  url: string,
): Promise<void> =>
  almacen.borrar(ayuntamientoId, url).catch((error: unknown) => {
    console.error(
      "[marca] no se pudo borrar el escudo anterior",
      datosSegurosDeError(error),
    );
  });
