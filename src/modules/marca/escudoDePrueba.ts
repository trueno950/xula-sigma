import { eq } from "drizzle-orm";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import { motul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que comparten los dos archivos de test del caso de uso —el de los
 * rechazos y el del camino de escritura—. Sigue la convencion `*DePrueba.ts`
 * de `genteDePrueba.ts` y `municipiosDePrueba.ts`.
 *
 * Estan separados porque juntos pasaban las 200 lineas por archivo de
 * `AGENTS.md`, y porque provocan cosas distintas: uno prueba que el caso de
 * uso no deja pasar, el otro que lo que pasa queda bien escrito.
 */

/** 80x80, la firma y el IHDR minimos para que `validarPng` lo acepte. */
export function pngValido(): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  bytes.set([0, 0, 0, 80], 16);
  bytes.set([0, 0, 0, 80], 20);
  return bytes;
}

export const marcaDe = async (): Promise<
  Record<string, unknown> | undefined
> => {
  const [fila] = await withTenant(motul, (tx) =>
    tx
      .select({ marca: ayuntamientos.marca })
      .from(ayuntamientos)
      .where(eq(ayuntamientos.id, motul)),
  );

  return fila?.marca as Record<string, unknown> | undefined;
};

export const escribirMarca = (marca: Record<string, unknown>) =>
  withTenant(motul, (tx) =>
    tx.update(ayuntamientos).set({ marca }).where(eq(ayuntamientos.id, motul)),
  );
