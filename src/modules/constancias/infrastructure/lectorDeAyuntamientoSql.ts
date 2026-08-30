import { eq } from "drizzle-orm";
import { leerMarca } from "@/shared/marca";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import type { LecturaDeAyuntamiento } from "../application/puertosDeLectura";

/**
 * Implementacion real de `LecturaDeAyuntamiento`, contra `ayuntamientos` de
 * `shared/tenancy` -no de otro modulo, asi que no cruza
 * `modulo-no-importa-interior-de-otro`, mismo precedente que
 * `modules/marca/infrastructure/repositorioDeMarcaSql.ts`, que importa la
 * misma tabla.
 *
 * `leerMarca` -y no el `unknown` crudo de la columna- porque el `escudo` de
 * un valor de `marca` corrupto o inyectado no debe llegar a un `<Image src>`
 * del PDF sin pasar por la misma reja que ya protege `shared/ui/marca.ts`.
 */
export const lectorDeAyuntamientoSql: LecturaDeAyuntamiento = {
  async porId(tx, ayuntamientoId) {
    const [fila] = await tx
      .select({
        nombre: ayuntamientos.nombre,
        subdominio: ayuntamientos.subdominio,
        marca: ayuntamientos.marca,
      })
      .from(ayuntamientos)
      .where(eq(ayuntamientos.id, ayuntamientoId));

    if (!fila) return null;

    // `exactOptionalPropertyTypes`: `escudo` se omite entera, no se asigna
    // `undefined` -son dos formas distintas de "sin escudo" bajo esa opcion.
    const { escudo } = leerMarca(fila.marca);

    return escudo
      ? { nombre: fila.nombre, subdominio: fila.subdominio, escudo }
      : { nombre: fila.nombre, subdominio: fila.subdominio };
  },
};
