import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { normalizarParaBusqueda } from "./domain";

/**
 * Fila lista para `insert(personas).values(...)` en un test de aislamiento
 * que inserta directo, sin pasar por `altaDePersona`. `nombreNormalizado`
 * sale de la misma funcion de dominio que usa el adaptador real -no una
 * constante fija-: la columna no tiene default (decision 6 de
 * proposal.md) y un INSERT que la olvide falla ruidoso.
 */
export type PersonaDePrueba = {
  ayuntamientoId: AyuntamientoId;
  nombres: string;
  primerApellido: string;
  curp?: string;
};

export const personaDePrueba = ({
  ayuntamientoId,
  nombres,
  primerApellido,
  curp,
}: PersonaDePrueba) => ({
  ayuntamientoId,
  nombres,
  primerApellido,
  nombreNormalizado: normalizarParaBusqueda(
    `${nombres} ${primerApellido}`,
    new Map(),
  ),
  curp: curp ?? null,
});
