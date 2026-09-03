import { z } from "zod";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type ConsultaDeReporte,
  type FilaDeConsulta,
  PREFIJO_DE_REPORTE,
  proyectarConsulta,
} from "../domain";
import type { FilaParaConsultaPublica, RepositorioDeReportes } from "./puertos";

export type EntradaDeConsulta = {
  ayuntamientoId: AyuntamientoId;
  folio: string;
};

/**
 * Misma forma que `Folio.crear` (`domain/folio.ts`): `padStart(6, "0")` sin
 * recorte, asi que el consecutivo puede tener mas de seis digitos.
 */
const esquemaDeFolio = z
  .string()
  .regex(new RegExp(`^${PREFIJO_DE_REPORTE}-\\d{4}-\\d{6,}$`));

/** El puerto guarda `Date`; la proyeccion pura viaja en ISO (design.md seccion 14). */
const aFilaDeConsulta = (fila: FilaParaConsultaPublica): FilaDeConsulta => ({
  tipo: fila.tipo,
  estado: fila.estado,
  registradoEn: fila.registradoEn.toISOString(),
  actualizadoEn: fila.actualizadoEn.toISOString(),
});

/**
 * Caso de uso PUBLICO: sin `ContextoActual`, sin `usuario`, sin `codigo`
 * (design.md seccion 14). Segunda vez que el repo necesita esta firma -la
 * primera es `constancias/application/validarFolio.ts:47-59`-, que la
 * confirma como clase y no como excepcion.
 *
 * Dos `SELECT` como maximo, escrito en la forma del codigo: un `await` mas
 * un `await` condicional. Sin `while`, sin recursion.
 */
export function crearConsultarFolioDeReporte(
  repositorio: Pick<
    RepositorioDeReportes,
    "paraConsultaPublica" | "paraConsultaPublicaPorId"
  >,
) {
  return function consultarFolioDeReporte({
    ayuntamientoId,
    folio,
  }: EntradaDeConsulta): Promise<ConsultaDeReporte> {
    if (!esquemaDeFolio.safeParse(folio).success) {
      return Promise.resolve(proyectarConsulta(null, null));
    }

    return withTenant(ayuntamientoId, async (tx) => {
      const consultado = await repositorio.paraConsultaPublica(tx, folio);
      if (consultado === null) return proyectarConsulta(null, null);

      const original =
        consultado.duplicadoDeReporteId === null
          ? null
          : await repositorio.paraConsultaPublicaPorId(
              tx,
              consultado.duplicadoDeReporteId,
            );

      return proyectarConsulta(
        aFilaDeConsulta(consultado),
        original === null ? null : aFilaDeConsulta(original),
      );
    });
  };
}
