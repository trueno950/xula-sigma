import { ValidacionError } from "@/shared/lib/errores";
import {
  type EstadoDeReporte,
  esTerminal,
  type MotivoDeRechazo,
  ReporteCerradoError,
  TransicionInvalidaError,
  transicionValida,
} from "../domain";
import type { ReporteGuardado } from "./puertos";

/** `esTerminal`/`transicionValida` de design.md seccion 12, paso 2b. */
export function validarTransicion(
  actual: Pick<ReporteGuardado, "estado">,
  estadoNuevo: EstadoDeReporte,
): void {
  if (esTerminal(actual.estado)) throw new ReporteCerradoError();
  if (!transicionValida(actual.estado, estadoNuevo)) {
    throw new TransicionInvalidaError();
  }
}

/** El par de reglas de design.md seccion 12, paso 2c: un solo motivo posible. */
export function validarMotivo(
  estadoNuevo: EstadoDeReporte,
  motivoDeRechazo: MotivoDeRechazo | null,
): void {
  const exigeMotivo = estadoNuevo === "RECHAZADO";
  if (exigeMotivo === (motivoDeRechazo !== null)) return;

  throw new ValidacionError(
    {
      motivoDeRechazo: exigeMotivo
        ? "Rechazar exige un motivo."
        : "Solo aplica al rechazar.",
    },
    exigeMotivo
      ? "Rechazar un reporte exige un motivo."
      : "El motivo de rechazo solo aplica al rechazar.",
  );
}
