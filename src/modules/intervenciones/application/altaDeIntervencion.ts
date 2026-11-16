import type { ContextoActual } from "@/shared/auth/contexto";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { IntervencionId } from "../domain";
import type {
  DatosDeRegistroDeIntervencion,
  RepositorioDeIntervenciones,
} from "./puertos";

/** Que accion queda en la bitacora segun como entro la intervencion. */
export type OrigenDelAltaDeIntervencion =
  | "REGISTRAR_INTERVENCION"
  | "PROGRAMAR_OBRA";

/**
 * Lo que toda alta de intervencion escribe en la transaccion de quien la pide:
 * la fila, su traza de bitacora y su publicacion en vivo. Lo usan el alta de
 * mostrador (`registrarIntervencion`) y la obra programada desde un reporte
 * (`programarObraDeReporte`), para que las dos dejen el mismo rastro.
 *
 * El llamador ya armo el `id`, el `estado` y el `ayuntamientoId`: aca no se
 * decide ninguno de los tres, y por eso no valida referencias ni permisos.
 */
export async function guardarIntervencionEnTransaccion(alta: {
  tx: TransaccionTenant;
  contexto: ContextoActual;
  repositorio: Pick<RepositorioDeIntervenciones, "guardar">;
  accion: OrigenDelAltaDeIntervencion;
  datos: DatosDeRegistroDeIntervencion;
}): Promise<IntervencionId> {
  const { tx, contexto, repositorio, accion, datos } = alta;

  await repositorio.guardar(tx, datos);

  await registrar(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    actor: contexto.usuario.id,
    origen: contexto.origen,
    accion,
    entidad: "intervenciones",
    entidadId: datos.id,
  });

  await publicarActualizacion(tx, contexto.ayuntamientoId, {
    tipo: "intervencion",
    id: datos.id,
    cambio: "alta",
  });

  return datos.id;
}
