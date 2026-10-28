import {
  altaDeCalle,
  altaDeDomicilio,
  altaDeLugar,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";

export async function crearDomicilioConColonia(contexto: ContextoActual) {
  const { id: asentamientoId } = await altaDeLugar(
    { tipo: "comisaria", nombre: "Asentamiento buscable T6b", padreId: null },
    contexto,
  );
  const { id: coloniaId } = await altaDeLugar(
    {
      tipo: "colonia",
      nombre: "Colonia buscable T6b",
      padreId: asentamientoId,
    },
    contexto,
  );
  const { id: calleId } = await altaDeCalle(
    { nombre: "Calle buscable T6b", lugarId: asentamientoId },
    contexto,
  );
  const { id } = await altaDeDomicilio(
    {
      lugarId: coloniaId,
      calleId,
      numero: "42-B",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contexto,
  );
  return { id, asentamientoId, coloniaId };
}
