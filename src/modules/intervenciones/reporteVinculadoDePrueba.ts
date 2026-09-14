import { registrarReporte } from "@/modules/reportes";
import type { ContextoActual } from "@/shared/auth/contexto";

export const registrarReporteDePrueba = (
  lugarId: string,
  contexto: ContextoActual,
) =>
  registrarReporte(
    {
      tipo: "BACHE",
      lugarId,
      calleId: null,
      referencia: null,
      descripcion: "Bache grande frente al parque principal",
      personaId: null,
    },
    contexto,
  );
