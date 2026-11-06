import { comoDomicilioId, domicilioPorId } from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { LecturaDeDomicilios } from "../application/puertosDeDomicilios";

/** La API pública de `territorio` aplica su propio `withTenant` y solo lee activos. */
export const crearLectorDeDomiciliosPorTerritorio = (
  contexto: ContextoActual,
): LecturaDeDomicilios => ({
  async porId(domicilioId) {
    const domicilio = await domicilioPorId(
      comoDomicilioId(domicilioId),
      contexto,
    );
    if (!domicilio) return null;

    return { lugarId: domicilio.lugarId, calleId: domicilio.calleId };
  },
});
