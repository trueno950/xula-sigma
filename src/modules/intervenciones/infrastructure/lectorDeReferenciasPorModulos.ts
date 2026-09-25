import { comoReporteId, reportePorId } from "@/modules/reportes";
import {
  callePorId,
  comoCalleId,
  comoLugarId,
  lugarPorId,
  tipoDeLugarEnFrase,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { LectorDeReferencias } from "../application/puertosDeLectura";

/**
 * Cada lectura abre el `withTenant` de su modulo con el contexto del
 * servidor: RLS decide si el id es visible, y uno ajeno o inexistente vuelve
 * `null` -el mismo `null` que un id ausente-. Nunca se lee `descripcion` ni
 * nada mas que el nombre y el folio.
 */
export const crearLectorDeReferenciasPorModulos = (): LectorDeReferencias => ({
  async leer(contexto, { lugarId, calleId, reporteId }) {
    const [lugar, calle, reporte] = await Promise.all([
      nombreDeLugar(contexto, lugarId),
      calleId === null ? null : nombreDeCalle(contexto, calleId),
      reporteId === null ? null : folioDeReporte(contexto, reporteId),
    ]);

    return { lugar, calle, reporte };
  },
});

async function nombreDeLugar(
  contexto: ContextoActual,
  id: string,
): Promise<string | null> {
  const lugar = await lugarPorId(comoLugarId(id), contexto);
  return lugar ? `${lugar.nombre} (${tipoDeLugarEnFrase(lugar.tipo)})` : null;
}

async function nombreDeCalle(
  contexto: ContextoActual,
  id: string,
): Promise<string | null> {
  const calle = await callePorId(comoCalleId(id), contexto);
  return calle ? calle.nombre : null;
}

async function folioDeReporte(
  contexto: ContextoActual,
  id: string,
): Promise<{ id: string; folio: string } | null> {
  const reporte = await reportePorId(comoReporteId(id), contexto);
  return reporte ? { id: reporte.id, folio: reporte.folio } : null;
}
