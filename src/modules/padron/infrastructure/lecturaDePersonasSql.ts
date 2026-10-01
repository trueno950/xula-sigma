import { asc, desc } from "drizzle-orm";
import type { PersonaGuardada } from "../application/puertos";
import { comoPersonaId } from "../domain";
import { personas } from "./esquema";

/**
 * Las columnas que devuelven las lecturas de `personas`, compartidas por
 * `buscarPorId`, `listar` y `buscar`. `id` sale de Postgres como `string` a
 * secas -Drizzle no conoce la marca de `PersonaId`-, y `comoAyuntamientoId`
 * ya fija el precedente de validar incluso lo que viene de una fuente
 * confiable en vez de un `as` (`shared/tenancy/ayuntamientoId.ts`).
 */
export const columnasDeLectura = {
  id: personas.id,
  nombres: personas.nombres,
  primerApellido: personas.primerApellido,
  segundoApellido: personas.segundoApellido,
  curp: personas.curp,
  bajaEn: personas.bajaEn,
};

/**
 * Toma solo las columnas de `PersonaGuardada`: `buscar` proyecta ademas la
 * relevancia y el indicador de CURP -el `ORDER BY` de un `UNION` exige que
 * sus expresiones esten en la lista de seleccion-, y esos dos no salen del
 * adaptador.
 */
export const aPersonaGuardada = (fila: {
  id: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  curp: string | null;
  bajaEn: Date | null;
}): PersonaGuardada => ({
  id: comoPersonaId(fila.id),
  nombres: fila.nombres,
  primerApellido: fila.primerApellido,
  segundoApellido: fila.segundoApellido,
  curp: fila.curp,
  bajaEn: fila.bajaEn,
});

/**
 * El unico campo ordenable de `OpcionesDeListado` (`domain/ordenDePersonas.ts`,
 * "persona") es el mismo criterio que ya usa `listar` por defecto:
 * apellido, despues nombre. Compartido por `listar` y `buscar` para que las
 * dos ordenen exactamente igual cuando el operador lo pide.
 */
export const ordenPorPersona = (direccion: "asc" | "desc") => {
  const aplicar = direccion === "desc" ? desc : asc;
  return [aplicar(personas.primerApellido), aplicar(personas.nombres)];
};
