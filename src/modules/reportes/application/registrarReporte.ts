import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { anioEnMerida } from "@/shared/lib/fecha";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoReporteId,
  Folio,
  ReportanteDadoDeBajaError,
  type ReporteId,
  type TipoDeIncidencia,
  UbicacionInvalidaError,
} from "../domain";
import type {
  ContadorDeFolios,
  RegistroDeMovimientos,
  RepositorioDeReportes,
} from "./puertos";
import type {
  LecturaDeReportantes,
  LecturaDeUbicaciones,
} from "./puertosDeLectura";

/** Lo que el mostrador captura. Ya paso por el Zod del borde (design.md seccion 11). */
export type EntradaDeRegistroDeReporte = {
  tipo: TipoDeIncidencia;
  lugarId: string;
  calleId: string | null;
  referencia: string | null;
  descripcion: string;
  personaId: string | null;
};

/**
 * `registrarReporte`: el orden exacto de design.md seccion 11.
 *
 * Los pasos 2 (ubicacion) y 3 (reportante) corren **fuera** de toda
 * transaccion: los dos adaptadores llaman a casos de uso de otros modulos
 * que abren su propio `withTenant` -anidarlo trabaria el pool con
 * `DB_POOL_MAX=1` y en produccion consumiria dos conexiones por operacion
 * (design.md seccion 11)-. Ese orden obligado converge con lo que el
 * contador necesita: todo lo que puede rechazar el alta ocurre antes del
 * lock, asi que ningun rechazo llega a tocar el contador. El unico paso que
 * entra a `withTenant` es el 4, y adentro van contador, `Folio.crear`,
 * `guardar`, la fila del alta en `movimientos` y la traza, en una sola
 * transaccion.
 */
export function crearRegistrarReporte({
  repositorio,
  contador,
  movimientos,
  crearLecturaDeUbicaciones,
  crearLecturaDeReportantes,
}: {
  repositorio: Pick<RepositorioDeReportes, "guardar">;
  contador: ContadorDeFolios;
  movimientos: RegistroDeMovimientos;
  crearLecturaDeUbicaciones: (contexto: ContextoActual) => LecturaDeUbicaciones;
  crearLecturaDeReportantes: (contexto: ContextoActual) => LecturaDeReportantes;
}) {
  return async function registrarReporte(
    datos: EntradaDeRegistroDeReporte,
    contexto: ContextoActual,
  ): Promise<ReporteId> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    // Paso 2: valida la ubicacion. `ubicacion.texto` se descarta -no hay
    // columna donde escribirlo, y esa es la garantia de que no se congela
    // (design.md seccion 11)-. El efecto es el rechazo, no el valor.
    const ubicacion = await crearLecturaDeUbicaciones(contexto).de(
      datos.lugarId,
      datos.calleId,
    );
    if (!ubicacion) throw new UbicacionInvalidaError();

    // Paso 3: valida al reportante solo si hay vinculo. Con `personaId` nulo
    // no se lee nada y no se guarda ningun contacto suelto (decision 11).
    if (datos.personaId !== null) {
      const reportante = await crearLecturaDeReportantes(contexto).porId(
        datos.personaId,
      );
      if (!reportante) throw new NoEncontradoError();
      if (reportante.bajaEn !== null) throw new ReportanteDadoDeBajaError();
    }

    // Paso 4: una sola transaccion.
    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const anio = anioEnMerida();
      const consecutivo = await contador.siguiente(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        anio,
      });
      const folio = Folio.crear(anio, consecutivo);
      const id = comoReporteId(randomUUID());

      await repositorio.guardar(tx, {
        id,
        ayuntamientoId: contexto.ayuntamientoId,
        folio: folio.toString(),
        anio,
        consecutivo,
        tipo: datos.tipo,
        estado: "RECIBIDO",
        areaResponsable: null,
        lugarId: datos.lugarId,
        calleId: datos.calleId,
        referencia: datos.referencia,
        descripcion: datos.descripcion,
        personaId: datos.personaId,
        registradoPorUsuarioId: contexto.usuario.id,
      });

      // La fila del alta: el unico consumidor de un `estadoAnterior` nulo
      // (design.md seccion 11). Sin ella, la columna seria nullable sin
      // motivo y el historial de un reporte recien creado estaria vacio.
      await movimientos.agregar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        reporteId: id,
        usuarioId: contexto.usuario.id,
        estadoAnterior: null,
        estadoNuevo: "RECIBIDO",
        areaAsignada: null,
        motivo: null,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "REGISTRAR_REPORTE",
        entidad: "reportes",
        entidadId: id,
      });

      return id;
    });
  };
}
