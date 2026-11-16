import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { hoyEnMerida } from "@/shared/lib/fecha";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoIntervencionId,
  type IntervencionId,
  ReporteNoProgramableError,
  TIPOS_DE_INTERVENCION,
  type TipoDeIntervencion,
} from "../domain";
import { guardarIntervencionEnTransaccion } from "./altaDeIntervencion";
import type { RepositorioDeIntervenciones } from "./puertos";
import type { ReportesParaObra } from "./puertosDeReportes";

/**
 * Lo que elige la operadora al programar obra desde un reporte (S2). La
 * ubicacion no se elige: se copia del reporte; la fecha de ocurrencia es la de
 * hoy en Merida -una obra programada todavia no ocurrio-, y se corrige despues
 * con `corregirIntervencion`, que ya admite cambiar la fecha.
 */
export type EntradaDeProgramacionDeObra = {
  reporteId: string;
  tipo: TipoDeIntervencion;
  descripcion: string;
};

const esquemaDeEntrada = z.strictObject({
  reporteId: z.string().trim().uuid(),
  tipo: z.enum(TIPOS_DE_INTERVENCION),
  descripcion: z.string().trim().min(10).max(1000),
});

const validarEntrada = (datos: unknown): EntradaDeProgramacionDeObra => {
  const resultado = esquemaDeEntrada.safeParse(datos);
  if (resultado.success) return resultado.data;
  throw new ValidacionError();
};

/**
 * «Programar y luego terminar» (S2): crea la intervencion `PLANIFICADA` ligada
 * al reporte y, en la misma transaccion, lo pasa a `EN_ATENCION` si estaba
 * `RECIBIDO`. Un reporte ya en atencion no se mueve otra vez; uno `RESUELTO` o
 * `RECHAZADO` se rechaza con `ReporteNoProgramableError`, que es un estado
 * terminal (S3 de `intervenciones-trazabilidad`).
 *
 * El permiso es `puedeAdministrarIntervenciones` y no `puedeEscribir`: esta
 * accion mueve ademas la historia de un reporte ciudadano, y la operadora de
 * mostrador no decide eso (`AGENTS.md`, Server Actions).
 */
export function crearProgramarObraDeReporte({
  repositorio,
  reportes,
  hoy = hoyEnMerida,
}: {
  repositorio: Pick<RepositorioDeIntervenciones, "guardar">;
  reportes: ReportesParaObra;
  hoy?: () => string;
}) {
  return async function programarObraDeReporte(
    datos: unknown,
    contexto: ContextoActual,
  ): Promise<IntervencionId> {
    if (!puedeAdministrarIntervenciones(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const entrada = validarEntrada(datos);

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const reporte = await reportes.de(tx, entrada.reporteId);
      if (!reporte) throw new NoEncontradoError();

      const movimiento = await reportes.mover(tx, {
        reporteId: reporte.id,
        estadoNuevo: "EN_ATENCION",
        contexto,
      });
      if (movimiento === "AUSENTE") throw new NoEncontradoError();
      if (movimiento === "CERRADO") throw new ReporteNoProgramableError();

      return guardarIntervencionEnTransaccion({
        tx,
        contexto,
        repositorio,
        accion: "PROGRAMAR_OBRA",
        datos: {
          id: comoIntervencionId(randomUUID()),
          ayuntamientoId: contexto.ayuntamientoId,
          tipo: entrada.tipo,
          estado: "PLANIFICADA",
          fechaDeOcurrencia: hoy(),
          lugarId: reporte.lugarId,
          calleId: reporte.calleId,
          reporteId: reporte.id,
          descripcion: entrada.descripcion,
          registradoPorUsuarioId: contexto.usuario.id,
        },
      });
    });
  };
}
