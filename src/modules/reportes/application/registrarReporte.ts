import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { anioEnMerida } from "@/shared/lib/fecha";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoReporteId,
  Folio,
  ReportanteDadoDeBajaError,
  type ReporteId,
  type TipoDeIncidencia,
} from "../domain";
import {
  type DatosDeUbicacionDeReporte,
  prepararUbicacionDeReporte,
} from "./prepararUbicacionDeReporte";
import type { RepositorioDeReportes } from "./puertos";
import type { LecturaDeDomicilios } from "./puertosDeDomicilios";
import type {
  LecturaDeReportantes,
  LecturaDeUbicaciones,
} from "./puertosDeLectura";
import type {
  ContadorDeFolios,
  RegistroDeMovimientos,
} from "./puertosDeMovimientos";

/** Lo que el mostrador captura. Ya paso por el Zod del borde (design.md seccion 11). */
export type EntradaDeRegistroDeReporte = {
  tipo: TipoDeIncidencia;
  referencia: string | null;
  descripcion: string;
  personaId: string | null;
} & DatosDeUbicacionDeReporte;

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
 * `guardar`, la fila del alta en `movimientos`, la traza y la publicacion,
 * en una sola transaccion.
 */
export function crearRegistrarReporte({
  repositorio,
  contador,
  movimientos,
  crearLecturaDeUbicaciones,
  crearLecturaDeReportantes,
  crearLecturaDeDomicilios,
}: {
  repositorio: Pick<RepositorioDeReportes, "guardar">;
  contador: ContadorDeFolios;
  movimientos: RegistroDeMovimientos;
  crearLecturaDeUbicaciones: (contexto: ContextoActual) => LecturaDeUbicaciones;
  crearLecturaDeReportantes: (contexto: ContextoActual) => LecturaDeReportantes;
  crearLecturaDeDomicilios?: (contexto: ContextoActual) => LecturaDeDomicilios;
}) {
  return async function registrarReporte(
    datos: EntradaDeRegistroDeReporte,
    contexto: ContextoActual,
  ): Promise<ReporteId> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    // Paso 2: resuelve y valida la direccion bajo tenant antes de tocar
    // el contador.
    const ubicacion = await prepararUbicacionDeReporte({
      datos,
      contexto,
      crearLecturaDeUbicaciones,
      crearLecturaDeDomicilios,
    });

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
        lugarId: ubicacion.lugarId,
        calleId: ubicacion.calleId,
        domicilioId: ubicacion.domicilioId,
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

      await publicarActualizacion(tx, contexto.ayuntamientoId, {
        tipo: "reporte",
        id,
        cambio: "alta",
      });

      return id;
    });
  };
}
