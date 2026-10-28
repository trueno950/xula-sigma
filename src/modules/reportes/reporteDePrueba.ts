import type { motul } from "@/shared/tenancy/municipiosDePrueba";
import { comoReporteId } from "./domain";

/**
 * Fila cruda de `reportes` para los tests de aislamiento, que insertan
 * directo con `withTenant` + el objeto de tabla — sin pasar por un caso de
 * uso, porque la Fase 4 todavia no existe. Compartido por
 * `reportes.isolation.test.ts` y `reportes.clavesForaneas.isolation.test.ts`
 * (precedente: `territorio/lugarDePrueba.ts`, `padron/personaDePrueba.ts`).
 *
 * No es un `*.test.ts`, asi que vitest no lo recoge como suite.
 */
export const reporteDe = (opciones: {
  ayuntamientoId: typeof motul;
  lugarId: string;
  calleId?: string | null;
  domicilioId?: string | null;
  personaId?: string | null;
  registradoPorUsuarioId: string;
  folio: string;
  consecutivo: number;
  estado?: "RECIBIDO" | "EN_ATENCION" | "RESUELTO" | "RECHAZADO";
  motivoDeRechazo?:
    | "DUPLICADO"
    | "FUERA_DE_COMPETENCIA"
    | "INFORMACION_INSUFICIENTE"
    | null;
  duplicadoDeReporteId?: string | null;
}) => ({
  ayuntamientoId: opciones.ayuntamientoId,
  folio: opciones.folio,
  anio: 2026,
  consecutivo: opciones.consecutivo,
  tipo: "BACHE" as const,
  estado: opciones.estado ?? "RECIBIDO",
  lugarId: opciones.lugarId,
  calleId: opciones.calleId ?? null,
  domicilioId: opciones.domicilioId ?? null,
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: opciones.personaId ?? null,
  motivoDeRechazo: opciones.motivoDeRechazo ?? null,
  // `duplicadoDeReporteId` es el unico de los cuatro (`lugarId`, `calleId`,
  // `personaId`, `duplicadoDeReporteId`) que la columna tipa como
  // `ReporteId`: es un identificador del propio modulo, no de uno ajeno
  // (design.md seccion 3). Estos tests insertan directo con el objeto de
  // tabla, asi que necesitan la marca que `application` recien exigiria en
  // la Fase 4.
  duplicadoDeReporteId: opciones.duplicadoDeReporteId
    ? comoReporteId(opciones.duplicadoDeReporteId)
    : null,
  registradoPorUsuarioId: opciones.registradoPorUsuarioId,
});
