import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type {
  AreaResponsable,
  EstadoDeReporte,
  MotivoDeRechazo,
  ReporteId,
  TipoDeIncidencia,
} from "../domain";

/**
 * Las dos formas de una fila de `reportes`: la que se guarda y la que se lee.
 * Viven aparte de `puertos.ts` por la metrica de lineas por archivo
 * (`AGENTS.md`) -el contrato completo del repositorio crecio con los filtros y
 * los conteos de S2 de `gestion-municipal`-, y se re-exportan desde ahi para
 * que `import { ... } from "./puertos"` siga funcionando.
 */

/**
 * Lo que `registrarReporte` guarda en una sola fila (design.md seccion 10).
 * `lugarId`, `calleId` y `personaId` viajan como `string` y nunca como el id
 * marcado del modulo ajeno (design.md seccion 3): el dominio de `reportes` no
 * importa el de `territorio` ni el de `padron`.
 *
 * `estado` y `areaResponsable` viajan aca aunque siempre sean `"RECIBIDO"` y
 * `null` al alta: el paso 4c de design.md seccion 11 los pasa explicitos al
 * `guardar`, y la columna `estado` es NOT NULL sin default, asi que el
 * INSERT no se puede armar sin ellos. El resto del contrato de la tabla
 * (`motivoDeRechazo`, `duplicadoDeReporteId`) nace nulo y no viaja.
 */
export type DatosDeRegistroDeReporte = {
  id: ReporteId;
  ayuntamientoId: AyuntamientoId;
  folio: string;
  anio: number;
  consecutivo: number;
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  areaResponsable: AreaResponsable | null;
  lugarId: string;
  calleId: string | null;
  domicilioId: string | null;
  referencia: string | null;
  descripcion: string;
  personaId: string | null;
  registradoPorUsuarioId: string;
};

/** Lo que devuelve una lectura: los mismos campos mas lo que solo existe una vez guardada. */
export type ReporteGuardado = {
  id: ReporteId;
  folio: string;
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  areaResponsable: AreaResponsable | null;
  lugarId: string;
  calleId: string | null;
  domicilioId?: string | null;
  referencia: string | null;
  descripcion: string;
  personaId: string | null;
  motivoDeRechazo: MotivoDeRechazo | null;
  duplicadoDeReporteId: string | null;
  registradoPorUsuarioId: string;
  registradoEn: Date;
  actualizadoEn: Date;
};
