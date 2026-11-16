import { eq } from "drizzle-orm";
import {
  cambiarEstadoDeReporte,
  comoReporteId,
  historialDeReporte,
  registrarReporte,
  reportePorId,
} from "@/modules/reportes";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { motul, sembrar, ticul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  cambiarEstadoDeIntervencion,
  programarObraDeReporte,
} from "./composicion";
import type { EstadoDeIntervencion } from "./domain";
import { intervenciones } from "./infrastructure/esquema";

/**
 * Andamiaje de los dos E2E de la trazabilidad de obra
 * (`programarObra.integration.test.ts` y `cierreDeObra.integration.test.ts`),
 * mismo criterio que `intervencionDePrueba.ts`: vive fuera de los dos porque
 * partirlos por la metrica de lineas por archivo no puede obligar a duplicar
 * el escenario.
 *
 * La gente se siembra una vez por archivo con `prepararFlujoDeObra` y queda
 * guardada aca: asi cada ayudante recibe solo lo que cambia de un caso a otro
 * (municipio, ids, estado) y no repite cuatro parametros.
 */

export type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio | null = null;

const genteDeLaCorrida = (): GentePorMunicipio => {
  if (!gente) throw new Error("Falta prepararFlujoDeObra() en el beforeAll.");
  return gente;
};

export const prepararFlujoDeObra = async (): Promise<void> => {
  await sembrar();
  gente = await sembrarGente();
};

const tenant = (municipio: Municipio) =>
  municipio === "motul" ? motul : ticul;

export const adminDe = (municipio: Municipio) =>
  contextoDe(genteDeLaCorrida(), municipio, "ADMIN_MUNICIPAL");

export const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    adminDe(municipio),
  );
  return id;
};

export const reporteEn = (municipio: Municipio, lugarId: string) =>
  registrarReporte(
    {
      tipo: "BACHE",
      lugarId,
      calleId: null,
      referencia: null,
      descripcion: "Bache grande frente al parque principal",
      personaId: null,
    },
    adminDe(municipio),
  );

export const cambiarReporte = (
  municipio: Municipio,
  reporteId: string,
  estadoNuevo: "EN_ATENCION" | "RESUELTO",
) =>
  cambiarEstadoDeReporte(
    {
      id: comoReporteId(reporteId),
      estadoNuevo,
      motivoDeRechazo: null,
      folioDelOriginal: null,
    },
    adminDe(municipio),
  );

export const estadoDeReporte = async (
  municipio: Municipio,
  id: string,
): Promise<string | null> => {
  const reporte = await reportePorId(comoReporteId(id), adminDe(municipio));
  return reporte?.estado ?? null;
};

/** Los movimientos como pares, del mas viejo al mas nuevo (contrato de `historialDe`). */
export const movimientosDe = async (
  municipio: Municipio,
  reporteId: string,
) => {
  const historial = await historialDeReporte(
    comoReporteId(reporteId),
    adminDe(municipio),
  );
  return historial.map((movimiento) => ({
    estadoAnterior: movimiento.estadoAnterior,
    estadoNuevo: movimiento.estadoNuevo,
  }));
};

/** La obra programada es la que enlaza el reporte, no cualquier fila del municipio. */
export const obrasDe = async (
  municipio: Municipio,
  reporteId: string,
): Promise<readonly { estado: EstadoDeIntervencion; tipo: string }[]> =>
  withTenant(tenant(municipio), (tx) =>
    tx
      .select({ estado: intervenciones.estado, tipo: intervenciones.tipo })
      .from(intervenciones)
      .where(eq(intervenciones.reporteId, reporteId)),
  );

export const programar = (municipio: Municipio, reporteId: string) =>
  programarObraDeReporte(
    {
      reporteId,
      tipo: "BACHE",
      descripcion: "Bacheo de la calle frente al parque",
    },
    adminDe(municipio),
  );

export const moverObra = (
  municipio: Municipio,
  id: string,
  estadoNuevo: EstadoDeIntervencion,
) => cambiarEstadoDeIntervencion({ id, estadoNuevo }, adminDe(municipio));
