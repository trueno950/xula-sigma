import { z } from "zod";
import type { ContextoActual } from "@/shared/auth/contexto";
import { ValidacionError } from "@/shared/lib/errores";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import type {
  EstadoDeIntervencion,
  IntervencionId,
  TipoDeIntervencion,
} from "../domain";

/**
 * Una obra ya programada sobre un reporte (S16 de `intervenciones-ux`): lo
 * justo para nombrarla y enlazarla, sin la descripcion ni los ids de otros
 * modulos. La mas reciente va primero, como en la bandeja.
 */
export type ObraDeReporte = {
  id: IntervencionId;
  tipo: TipoDeIntervencion;
  estado: EstadoDeIntervencion;
  fechaDeOcurrencia: string;
};

/**
 * Sin `tx`: el caso de uso abre el `withTenant`, igual que el resto de las
 * lecturas del modulo. El filtro por `reporteId` lo aplica la consulta y el
 * limite entre municipios lo pone la politica de `intervenciones`.
 */
export type LectorDeObrasDeReporte = {
  listar(
    tx: TransaccionTenant,
    reporteId: string,
  ): Promise<readonly ObraDeReporte[]>;
};

const esquemaDeReporteId = z.string().trim().uuid();

/**
 * La obra que confirma el `?obra=` de la URL, o nada. El id de la URL no se
 * cree: solo confirma si esta entre las obras que se leyeron bajo RLS para
 * este reporte, asi que uno inventado, de otro reporte o de otro municipio no
 * produce aviso ni enlace.
 */
export const obraConfirmada = (
  pedida: string | undefined,
  obras: readonly ObraDeReporte[],
): ObraDeReporte | undefined =>
  pedida ? obras.find((obra) => obra.id === pedida) : undefined;

/**
 * «Las obras de este reporte», que es lo que la ficha del reporte necesita
 * para dos cosas de S16: decir que ya hay una -en vez de ofrecer programar a
 * ciegas- y comprobar contra el servidor el `?obra=` que trae la URL, para no
 * pintar un enlace a una intervencion de otro municipio ni a una inventada.
 *
 * Sin guarda de rol, mismo criterio que `listarIntervenciones`: leer no es
 * escribir. Un id que no es uuid no llega a la base.
 */
export function crearObrasDeReporte(lector: LectorDeObrasDeReporte) {
  return async function obrasDeReporte(
    reporteId: string,
    contexto: ContextoActual,
  ): Promise<readonly ObraDeReporte[]> {
    const analisis = esquemaDeReporteId.safeParse(reporteId);
    if (!analisis.success) throw new ValidacionError();

    return withTenant(contexto.ayuntamientoId, (tx) =>
      lector.listar(tx, analisis.data),
    );
  };
}
