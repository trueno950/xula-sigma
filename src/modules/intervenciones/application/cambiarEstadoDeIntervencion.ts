import { z } from "zod";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoIntervencionId,
  ESTADOS_DE_INTERVENCION,
  type EstadoDeIntervencion,
  esTerminal,
  IntervencionCerradaError,
  type IntervencionId,
  TransicionInvalidaError,
  transicionValida,
} from "../domain";
import type {
  IntervencionGuardada,
  RepositorioDeIntervenciones,
} from "./puertos";
import type { ReportesParaObra } from "./puertosDeReportes";

const esquemaDeEntrada = z.strictObject({
  id: z.string().trim().uuid(),
  estadoNuevo: z.enum(ESTADOS_DE_INTERVENCION),
});

const validarEntrada = (datos: unknown) => {
  const resultado = esquemaDeEntrada.safeParse(datos);
  if (resultado.success) return resultado.data;
  throw new ValidacionError();
};

/**
 * S3: una intervencion ligada a un reporte lo cierra como `RESUELTO` al
 * finalizar, con su movimiento, en la misma transaccion. `CANCELADA` no toca
 * el reporte -lo decide la operadora-, y un reporte que ya estaba cerrado se
 * deja como esta: la obra puede finalizarse igual.
 *
 * Un reporte que dejo de existir para este tenant no deberia poder pasar (el
 * FK compuesto lo impide); si pasa, `NoEncontradoError` revierte la
 * transicion en vez de dejar una obra finalizada sin su reporte.
 */
async function cerrarReporteLigado({
  tx,
  contexto,
  actual,
  estadoNuevo,
  reportes,
}: {
  tx: TransaccionTenant;
  contexto: ContextoActual;
  actual: IntervencionGuardada;
  estadoNuevo: EstadoDeIntervencion;
  reportes: Pick<ReportesParaObra, "mover">;
}): Promise<void> {
  if (estadoNuevo !== "FINALIZADA" || !actual.reporteId) return;

  const movimiento = await reportes.mover(tx, {
    reporteId: actual.reporteId,
    estadoNuevo: "RESUELTO",
    contexto,
  });
  if (movimiento === "AUSENTE") throw new NoEncontradoError();
}

type SolicitudDeCambio = {
  tx: TransaccionTenant;
  contexto: ContextoActual;
  repositorio: Pick<
    RepositorioDeIntervenciones,
    "buscarPorId" | "aplicarTransicion"
  >;
  reportes: Pick<ReportesParaObra, "mover">;
  entrada: { id: string; estadoNuevo: EstadoDeIntervencion };
  id: IntervencionId;
};

/**
 * Lee la fila, valida la transicion contra la tabla del dominio y la aplica.
 * Devuelve la intervencion previa, que es lo que `cerrarReporteLigado`
 * necesita para saber si tenia reporte.
 */
async function transicionar({
  tx,
  repositorio,
  entrada,
  id,
}: Pick<
  SolicitudDeCambio,
  "tx" | "repositorio" | "entrada" | "id"
>): Promise<IntervencionGuardada> {
  const actual = await repositorio.buscarPorId(tx, id);
  if (!actual) throw new NoEncontradoError();

  const estadoActual = actual.estado;
  if (esTerminal(estadoActual)) throw new IntervencionCerradaError();
  if (!transicionValida(estadoActual, entrada.estadoNuevo)) {
    throw new TransicionInvalidaError();
  }

  const aplicada = await repositorio.aplicarTransicion(tx, {
    id,
    estadoAnterior: estadoActual,
    estadoNuevo: entrada.estadoNuevo,
  });
  if (!aplicada) throw new NoEncontradoError();

  return actual;
}

/**
 * El cambio completo dentro de la transaccion de `withTenant`: transicion,
 * cierre del reporte ligado, traza y publicacion del estado nuevo. La guarda
 * de rol y la validacion del borde se quedan en el caso de uso, antes de
 * abrir la transaccion.
 */
async function aplicarElCambio(solicitud: SolicitudDeCambio): Promise<void> {
  const { tx, contexto, repositorio, reportes, entrada, id } = solicitud;
  const actual = await transicionar({ tx, repositorio, entrada, id });

  await cerrarReporteLigado({
    tx,
    contexto,
    actual,
    estadoNuevo: entrada.estadoNuevo,
    reportes,
  });

  await registrar(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    actor: contexto.usuario.id,
    origen: contexto.origen,
    accion: "CAMBIAR_ESTADO_INTERVENCION",
    entidad: "intervenciones",
    entidadId: entrada.id,
  });

  await publicarActualizacion(tx, contexto.ayuntamientoId, {
    tipo: "intervencion",
    id: entrada.id,
    cambio: "estado",
  });
}

export function crearCambiarEstadoDeIntervencion({
  repositorio,
  reportes,
}: {
  repositorio: Pick<
    RepositorioDeIntervenciones,
    "buscarPorId" | "aplicarTransicion"
  >;
  reportes: Pick<ReportesParaObra, "mover">;
}) {
  return async function cambiarEstadoDeIntervencion(
    datos: unknown,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarIntervenciones(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const entrada = validarEntrada(datos);

    return withTenant(contexto.ayuntamientoId, (tx) =>
      aplicarElCambio({
        tx,
        contexto,
        repositorio,
        reportes,
        entrada,
        id: comoIntervencionId(entrada.id),
      }),
    );
  };
}
