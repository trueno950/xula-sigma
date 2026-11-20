import type { IntervencionGuardada } from "../application/puertos";
import {
  type ConteosDeIntervenciones,
  comoIntervencionId,
  type EstadoDeIntervencion,
} from "../domain";

/**
 * Datos y ayudas de los dos tests de la bandeja (`*.tablero.test.tsx` y
 * `*.filtros.test.tsx`). No es un `*.test.ts`: vitest no lo recoge como suite,
 * y vive al lado de los tests que lo usan, igual que `intervencionDePrueba`.
 */

export const LUGAR = "22222222-2222-4222-8222-222222222222";
export const ID = "3f1c8a90-3333-4333-8333-333333333333";
export const LUGARES = [{ valor: LUGAR, etiqueta: "Centro (colonia)" }];
export const CON_FILAS = { clase: "con-filas" } as const;

export const intervencionDePrueba = (
  datos: Partial<IntervencionGuardada> = {},
): IntervencionGuardada => ({
  id: comoIntervencionId(ID),
  tipo: "OBRA",
  estado: "PLANIFICADA",
  fechaDeOcurrencia: "2026-01-15",
  lugarId: LUGAR,
  calleId: null,
  reporteId: null,
  descripcion:
    "Rehabilitación del parque municipal con juegos nuevos, banquetas de concreto y alumbrado nuevo en el acceso principal por la calle 20",
  registradoPorUsuarioId: "usuario-1",
  capturadoEn: new Date("2026-01-16T15:00:00Z"),
  actualizadoEn: new Date("2026-01-16T15:00:00Z"),
  ...datos,
});

export const conteosDePrueba = (
  porEstado: Partial<Record<EstadoDeIntervencion, number>>,
): ConteosDeIntervenciones => {
  const completo = {
    PLANIFICADA: 0,
    EN_EJECUCION: 0,
    FINALIZADA: 0,
    CANCELADA: 0,
    ...porEstado,
  };

  return {
    porEstado: completo,
    total: Object.values(completo).reduce((suma, conteo) => suma + conteo, 0),
  };
};

/**
 * El HTML de una columna, desde su encabezado hasta su `</section>`: lo que
 * la operadora lee de ese estado. Parte del encabezado y no del listado
 * entero para que el conteo de una columna no se pueda confundir con el de
 * otra ni con el resumen de arriba.
 */
export const cuerpoDeLaColumna = (html: string, etiqueta: string): string => {
  const desde = html.indexOf(etiqueta);
  const hasta = html.indexOf("</section>", desde);

  return desde === -1
    ? ""
    : html.slice(desde, hasta === -1 ? undefined : hasta);
};
